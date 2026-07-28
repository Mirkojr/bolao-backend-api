import { Jogo, Palpite, Participante, User } from '../models/index.js';
import { PONTUACAO_EXATA, PONTUACAO_PARCIAL } from '../config/game.js';
import sequelize from '../config/database.js';

export const RankingController = {
    async calcularPontuacaoJogo(jogoId, golsA, golsB) {
        // Busca TODOS os palpites desse jogo, não importa o bolão
        const palpites = await Palpite.findAll({ 
            where: { jogo_id: jogoId } 
        });

        console.log(`Iniciando atualização global. Encontrados ${palpites.length} palpites para o jogo ${jogoId}.`);

        for (const palpite of palpites) {
            let novosPontos = 0;

            // Lógica de cálculo 
            const pA = palpite.gol_a_palpite;
            const pB = palpite.gol_b_palpite;

            if (pA === golsA && pB === golsB) {
                novosPontos =  PONTUACAO_EXATA; // Placar exato
            } else if (Math.sign(pA - pB) === Math.sign(golsA - golsB)) {
                novosPontos = PONTUACAO_PARCIAL; // Acertou vencedor/empate
            }

            // Lógica para evitar duplicidade em caso de correção de placar
            // Subtraímos o que ele já tinha ganho antes e somamos o novo cálculo
            const pontosAntigos = palpite.pontos_ganhos || 0;
            const diferenca = novosPontos - pontosAntigos;

            // Atualiza o palpite individual com o novo valor
            await palpite.update({ pontos_ganhos: novosPontos });

            // Atualiza o ranking do participante no bolão dele
            // Usamos a 'diferenca' para que, se você mudar o resultado de 2x1 para 2x2,
            // o ranking não fique somando pontos infinitamente.
            await Participante.increment('pontuacao_no_bolao', { 
                by: diferenca, 
                where: { 
                    id: palpite.participante_id,
                    bolao_id: palpite.bolao_id 
                } 
            });
        }
        
        console.log(`Processamento global concluído para o jogo ${jogoId}.`);
    },

    async processarPalpiteIndividual(palpite, jogo) {
        let pontos = 0;
        const pA = palpite.gol_a_palpite;
        const pB = palpite.gol_b_palpite;
        const rA = jogo.gol_a_real;
        const rB = jogo.gol_b_real;

        // Calcula os pontos deste palpite
        if (pA === rA && pB === rB) {
            pontos = PONTUACAO_EXATA;
        } else if (Math.sign(pA - pB) === Math.sign(rA - rB)) {
            pontos = PONTUACAO_PARCIAL;
        }

        // Salva os pontos no Palpite
        await palpite.update({ pontos_ganhos: pontos });

        // ATUALIZAÇÃO DO TOTAL DO PARTICIPANTE
        const totalPontos = await Palpite.sum('pontos_ganhos', {
            where: {
                participante_id: palpite.participante_id,
                bolao_id: palpite.bolao_id
            }
        });

        // Atualiza a tabela de participante com o valor real e correto
        await Participante.update(
            { pontuacao_no_bolao: totalPontos || 0 },
            { where: { id: palpite.participante_id } }
        );
    },

    async recalcularTudo(req, res) {
        try {
            await sequelize.authenticate();
            console.log('Conectado ao banco. Iniciando o recálculo com as regras atuais...\n');

            const jogosFinalizados = await Jogo.findAll({
            where: { status: 'FINALIZADO' }
            });
            console.log(`Encontrados ${jogosFinalizados.length} jogos finalizados.`);

            for (const jogo of jogosFinalizados) {
            const palpites = await Palpite.findAll({ where: { jogo_id: jogo.id } });

            for (const palpite of palpites) {
                let novosPontos = 0;
                const pA = palpite.gol_a_palpite;
                const pB = palpite.gol_b_palpite;
                const rA = jogo.gol_a_real;
                const rB = jogo.gol_b_real;

                if (pA === rA && pB === rB) {
                    novosPontos = PONTUACAO_EXATA;
                } else if (Math.sign(pA - pB) === Math.sign(rA - rB)) {
                    novosPontos = PONTUACAO_PARCIAL;
                }

                await palpite.update({ pontos_ganhos: novosPontos });
            }
            }
            console.log('Todos os Palpites foram recalculados e salvos!');

            const participantes = await Participante.findAll();
            for (const participante of participantes) {
            const totalBolao = await Palpite.sum('pontos_ganhos', {
                where: {
                participante_id: participante.id,
                bolao_id: participante.bolao_id
                }
            });
            await participante.update({ pontuacao_no_bolao: totalBolao || 0 });
            }
            console.log('Tabela participantes_bolao 100% atualizada!');

            const usuarios = await User.findAll();
            for (const user of usuarios) {
            const vinculos = await Participante.findAll({
                where: { user_id: user.id },
                attributes: ['id']
            });

            const idsParticipantes = vinculos.map(v => v.id);

            if (idsParticipantes.length > 0) {
                const totalGeral = await Palpite.sum('pontos_ganhos', {
                where: { participante_id: idsParticipantes }
                });
                await user.update({ pontuacao_total: totalGeral || 0 });
            } else {
                await user.update({ pontuacao_total: 0 });
            }
            }
            console.log('Tabela users 100% atualizada!');

            console.log('\nRECÁLCULO FINALIZADO COM SUCESSO!');

            return res.status(200).json({ message:"Recalculado com sucesso!"});
        } catch (error) {
            console.error('Erro ao recalcular:', error);
            return res.status(500).json({ message: "Erro ao recalcular"});
        }
    }



};