import { Palpite, Participante, Jogo } from '../models/index.js';
import { RankingController } from './rankingController.js';

export default {
   
    async index(req, res) {
        try {
            const { id } = req.params; 

            const palpites = await Palpite.findAll({
                where: { bolao_id: id },
                attributes: ['gol_a_palpite', 'gol_b_palpite', 'jogo_id', 'participante_id', 'pontos_ganhos']
            });

            return res.json(palpites);
        } catch (error) {
            console.error("Erro ao buscar palpites:", error);
            return res.status(500).json({ message: "Erro ao buscar palpites." });
        }
    },

    async store(req, res) {
        try {
            const { id } = req.params; 
            const { participante_id, jogo_id, gol_a_palpite, gol_b_palpite } = req.body;

            if (!participante_id || !jogo_id) {
                return res.status(400).json({ message: "Participante e Jogo são obrigatórios." });
            }

            // Busca o Participante
            const participante = await Participante.findOne({
                where: { id: participante_id, bolao_id: id }
            });

            if (!participante) {
                return res.status(404).json({ message: "Participante não encontrado neste bolão." });
            }

            // Busca o Jogo para conferir o status
            const jogo = await Jogo.findByPk(jogo_id);
            if (!jogo) {
                return res.status(404).json({ message: "Jogo não encontrado." });
            }

            // Salva o palpite (Upsert)
            const [palpite, created] = await Palpite.upsert({
                bolao_id: id,
                participante_id: participante_id,
                jogo_id: jogo_id,
                gol_a_palpite: Number(gol_a_palpite),
                gol_b_palpite: Number(gol_b_palpite),
                data_palpite: new Date() 
            });

            // Se o jogo já foi finalizado, atualiza a pontuação do participante
            if (jogo.status === 'FINALIZADO') {
                console.log("Inserindo palpite em jogo finalizado. Calculando pontos...");
                await RankingController.processarPalpiteIndividual(palpite, jogo);
            }

            return res.status(created ? 201 : 200).json(palpite);

        } catch (error) {
            console.error("Erro ao salvar palpite:", error);
            return res.status(500).json({ message: "Erro interno ao salvar palpite.", error: error.message });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params; // ID do Bolão
            const { participante_id, jogo_id } = req.body;

            const deletado = await Palpite.destroy({
                where: { 
                    bolao_id: id,
                    participante_id: participante_id,
                    jogo_id: jogo_id
                }
            });

            if (deletado === 0) {
                return res.status(404).json({ message: "Palpite não encontrado." });
            }

            return res.status(200).json({ message: "Palpite deletado com sucesso." });
        } catch (error) {
            console.error("Erro ao deletar palpite:", error);
            return res.status(500).json({ message: "Erro ao deletar palpite.", error: error.message });
        }
    }

};