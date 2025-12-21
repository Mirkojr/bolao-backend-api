import { Palpite } from '../models/index.js';

export default {
    // GET /:id/palpites
    async index(req, res) {
        try {
            const palpites = await Palpite.findAll({
                where: { bolao_id: req.params.id }
            });
            return res.status(200).json(palpites);
        } catch (error) {
            return res.status(500).json({ message: "Erro ao buscar palpites.", error: error.message });
        }
    },

    // POST /:id/palpites
    async store(req, res) {
        try {
            const { jogo_id, gol_a_palpite, gol_b_palpite } = req.body;
            const bolao_id = req.params.id;
            const user_id = req.userId; 

            if (gol_a_palpite === undefined || gol_b_palpite === undefined) {
                return res.status(400).json({ message: "Os placares são obrigatórios." });
            }

            const palpiteExistente = await Palpite.findOne({
                where: { bolao_id, user_id, jogo_id }
            });

            if (palpiteExistente) {
                palpiteExistente.gol_a_palpite = gol_a_palpite;
                palpiteExistente.gol_b_palpite = gol_b_palpite;
                await palpiteExistente.save();
                return res.status(200).json(palpiteExistente);
            } 
            
            const novoPalpite = await Palpite.create({
                bolao_id, user_id, jogo_id,
                gol_a_palpite, gol_b_palpite,
                pontos_ganhos: 0
            });
            return res.status(201).json(novoPalpite);

        } catch (error) {
            return res.status(400).json({ message: "Erro ao processar palpite.", error: error.message });
        }
    }
};