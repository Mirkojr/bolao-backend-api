import { Palpite, Participante } from '../models/index.js';

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
                novosPontos = 25; // Placar exato
            } else if (Math.sign(pA - pB) === Math.sign(golsA - golsB)) {
                novosPontos = 10; // Acertou vencedor/empate
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
            pontos = 25;
        } else if (Math.sign(pA - pB) === Math.sign(rA - rB)) {
            pontos = 10;
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
    }
};