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
            const { jogo_id, gol_a_palpite, gol_b_palpite, user_id: target_user_id } = req.body;
            const bolao_id = req.params.id;
            
            // Identidade de quem está fazendo a chamada (via middleware)
            const usuarioLogadoId = req.userId;
            const usuarioLogadoRole = req.userRole;

            // Se o admin enviou um user_id no corpo, usamos ele. 
            // Caso contrário, o usuário está palpitando para si mesmo.
            const final_user_id = target_user_id || usuarioLogadoId;

            // --- VALIDAÇÃO DE SEGURANÇA ---
            // Bloqueia se: Não for o próprio usuário E não for Admin
            if (Number(final_user_id) !== Number(usuarioLogadoId) && usuarioLogadoRole !== 'ADMIN') {
                return res.status(403).json({ 
                    message: "Você não tem permissão para palpitar por outro usuário." 
                });
            }

            if (gol_a_palpite === undefined || gol_b_palpite === undefined) {
                return res.status(400).json({ message: "Os placares são obrigatórios." });
            }

            const [palpite, created] = await Palpite.upsert({
                bolao_id,
                user_id: final_user_id,
                jogo_id,
                gol_a_palpite,
                gol_b_palpite,
                pontos_ganhos: 0
            }, {

                conflictFields: ['bolao_id', 'user_id', 'jogo_id'] 
            });

            return res.status(created ? 201 : 200).json(palpite);

        } catch (error) {
            console.error("Erro no Sequelize:", error);

            if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
                const messages = error.errors.map(err => err.message);
                return res.status(400).json({ message: messages[0] });
            }

            if (error.parent && error.parent.constraint) {
                if (error.parent.constraint === 'check_gol_a_negativo') {
                    return res.status(400).json({ message: "O placar do time A não pode ser negativo." });
                }
                if (error.parent.constraint === 'check_gol_b_negativo') {
                    return res.status(400).json({ message: "O placar do time B não pode ser negativo." });
                }
            }
            
            return res.status(400).json({ 
                message: error.message || "Erro ao processar palpite."
            });
        }
    }
};