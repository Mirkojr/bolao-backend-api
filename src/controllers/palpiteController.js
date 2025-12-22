import { Palpite, Participante, Jogo } from '../models/index.js';

export default {
   
    async index(req, res) {
        try {
            const { id } = req.params; // ID do Bolão

            const palpites = await Palpite.findAll({
                where: { bolao_id: id },
                attributes: ['id', 'gol_a_palpite', 'gol_b_palpite', 'jogo_id', 'participante_id']
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

            const participante = await Participante.findOne({
                where: { id: participante_id, bolao_id: id }
            });

            if (!participante) {
                return res.status(404).json({ message: "Participante não encontrado neste bolão." });
            }

            const [palpite, created] = await Palpite.findOrCreate({
                where: {
                    bolao_id: id,
                    participante_id: participante_id, 
                    jogo_id: jogo_id
                },
                defaults: {
                    gol_a_palpite: Number(gol_a_palpite),
                    gol_b_palpite: Number(gol_b_palpite)
                }
            });

            if (!created) {
                palpite.gol_a_palpite = Number(gol_a_palpite);
                palpite.gol_b_palpite = Number(gol_b_palpite);
                await palpite.save();
            }

            return res.json(palpite);

        } catch (error) {
            console.error("Erro ao salvar palpite:", error);
            return res.status(500).json({ 
                message: "Erro interno ao salvar palpite.", 
                error: error.message 
            });
        }
    }
};