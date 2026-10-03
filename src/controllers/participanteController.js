import { Bolao, User, Participante } from '../models/index.js';
import { BadRequestError, NotFoundError } from '../errors.js';

export default {
    // GET /:id/participantes (já na ordem do ranking)
    async index(req, res) {
        const participantes = await Participante.findAll({
            where: { bolao_id: req.params.id },
            include: [{
                model: User,
                as: 'usuario',
                attributes: ['id', 'nome'],
            }],
            order: [['pontuacao_no_bolao', 'DESC']]
        });

        const formatados = participantes.map(p => {
            const dados = p.toJSON();
            return { ...dados, nome: dados.nome_avulso || "Participante Anônimo" };
        });

        return res.status(200).json(formatados);
    },

    // POST /:id/participantes
    // body: { nome } para convidado avulso, ou { user_id } para vincular uma conta
    async store(req, res) {
        const { nome, user_id: userId } = req.body;
        const bolaoId = req.params.id;

        const bolao = await Bolao.findByPk(bolaoId, { attributes: ['id'] });
        if (!bolao) throw new NotFoundError('Bolão não encontrado.');

        if (userId) {
            const usuarioRegistrado = await User.findByPk(userId);
            if (!usuarioRegistrado) throw new NotFoundError('Usuário não encontrado.');

            const jaParticipa = await Participante.findOne({
                where: { bolao_id: bolaoId, user_id: usuarioRegistrado.id }
            });
            if (jaParticipa) throw new BadRequestError(`O usuário ${usuarioRegistrado.nome} já está neste bolão`);

            const novoParticipante = await Participante.create({
                bolao_id: bolaoId,
                user_id: usuarioRegistrado.id,
                nome_avulso: usuarioRegistrado.nome,
                pontuacao_no_bolao: 0
            });
            return res.status(201).json(novoParticipante);
        }

        const jaParticipaAvulso = await Participante.findOne({
            where: { bolao_id: bolaoId, nome_avulso: nome }
        });
        if (jaParticipaAvulso) throw new BadRequestError(`Já existe um convidado chamado ${nome} neste bolão!`);

        const novoParticipanteAvulso = await Participante.create({
            bolao_id: bolaoId,
            user_id: null,
            nome_avulso: nome,
            pontuacao_no_bolao: 0
        });
        return res.status(201).json(novoParticipanteAvulso);
    },

    async delete (req, res) {
        const deletado = await Participante.destroy({
            where: { id: req.params.participanteId, bolao_id: req.params.id },
        });

        if (deletado === 0) throw new NotFoundError('Participante não encontrado.');

        return res.status(204).send();
    }
};
