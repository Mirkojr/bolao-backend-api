import sequelize from '../config/database.js';
import { Palpite, Participante, Jogo } from '../models/index.js';
import BolaoJogo from '../models/BolaoJogo.js';
import { processarPalpiteIndividual, recalcularParticipanteEUsuario } from '../services/rankingService.js';
import { BadRequestError, NotFoundError } from '../errors.js';

export default {
   
    async index(req, res) {
        const palpites = await Palpite.findAll({
            where: { bolao_id: req.params.id },
            attributes: ['gol_a_palpite', 'gol_b_palpite', 'jogo_id', 'participante_id', 'pontos_ganhos']
        });

        return res.json(palpites);
    },

    // Corpo já validado pelo schemaPalpite (ids e placares inteiros)
    async store(req, res) {
        const { id } = req.params; 
        const { participante_id, jogo_id, gol_a_palpite, gol_b_palpite } = req.body;

        const participante = await Participante.findOne({ where: { id: participante_id, bolao_id: id } });
        if (!participante) throw new NotFoundError('Participante não encontrado neste bolão.');

        const jogo = await Jogo.findByPk(jogo_id);
        if (!jogo) throw new NotFoundError('Jogo não encontrado.');

        const jogoNoBolao = await BolaoJogo.findOne({ where: { bolao_id: id, jogo_id } });
        if (!jogoNoBolao) throw new BadRequestError('Este jogo não faz parte do bolão.');

        const [palpite, created] = await sequelize.transaction(async (t) => {
            // Salva o palpite (Upsert)
            const resultado = await Palpite.upsert({
                bolao_id: id,
                participante_id,
                jogo_id,
                gol_a_palpite,
                gol_b_palpite,
                data_palpite: new Date() 
            }, { transaction: t });

            // Se o jogo já foi finalizado, atualiza a pontuação do participante
            if (jogo.status === 'FINALIZADO') {
                await processarPalpiteIndividual(resultado[0], jogo, t);
            }

            return resultado;
        });

        return res.status(created ? 201 : 200).json(palpite);
    },

    async delete(req, res) {
        const { id } = req.params; // ID do Bolão
        const { participante_id, jogo_id } = req.body;

        const deletado = await sequelize.transaction(async (t) => {
            const apagados = await Palpite.destroy({
                where: { bolao_id: id, participante_id, jogo_id },
                transaction: t,
            });

            // Se o jogo já tinha resultado, os pontos desse palpite saem do ranking
            if (apagados > 0) {
                const jogo = await Jogo.findByPk(jogo_id, { attributes: ['status'], transaction: t });
                if (jogo?.status === 'FINALIZADO') {
                    await recalcularParticipanteEUsuario(participante_id, t);
                }
            }

            return apagados;
        });

        if (deletado === 0) throw new NotFoundError('Palpite não encontrado.');

        return res.status(200).json({ message: "Palpite deletado com sucesso." });
    }

};
