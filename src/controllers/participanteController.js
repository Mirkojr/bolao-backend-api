import { Bolao, User, Participante } from '../models/index.js';

export default {
    // GET /:id/participantes
    async index(req, res) {
        try {
            const participantes = await Participante.findAll({
                where: { bolao_id: req.params.id },
                include: [{
                    model: User,
                    attributes: ['nome'] 
                }]
            });

            const formatados = participantes.map(p => ({
                ...p.toJSON(),
                nome: p.User?.nome 
            }));

            return res.status(200).json(formatados);
        } catch (error) {
            return res.status(500).json({ message: "Erro ao buscar participantes.", error: error.message });
        }
    },

    // POST /:id/participantes
    async store(req, res) {
        try {
            const { nome } = req.body;
            const bolaoId = req.params.id;

            const bolao = await Bolao.findByPk(bolaoId);
            if (!bolao) return res.status(404).json({ message: "Bolão não encontrado" });

            const usuarioEncontrado = await User.findOne({ where: { nome: nome } });
            if (!usuarioEncontrado) {
                return res.status(404).json({ message: "Usuário não encontrado." });
            }

            const jaParticipa = await Participante.findOne({
                where: { bolao_id: bolaoId, user_id: usuarioEncontrado.id }
            });

            if (jaParticipa) {
                return res.status(400).json({ message: "Esse usuário já está no bolão!" });
            }

            const novoParticipante = await Participante.create({
                bolao_id: bolaoId,
                user_id: usuarioEncontrado.id,
                pontuacao_no_bolao: 0
            });
            const resultado = {
                ...novoParticipante.toJSON(),
                nome: usuarioEncontrado.nome 
            };

            return res.status(201).json(resultado);
        } catch (error) {
            return res.status(400).json({ message: "Erro ao adicionar participante.", error: error.message });
        }
    }
};