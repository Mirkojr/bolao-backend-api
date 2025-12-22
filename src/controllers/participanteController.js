import { Bolao, User, Participante } from '../models/index.js';

export default {
    // GET /:id/participantes
    async index(req, res) {
        try {
            const participantes = await Participante.findAll({
                where: { bolao_id: req.params.id },
                include: [{
                    model: User, // Join pra pegar o nome do usuário
                    as: 'usuario',
                    attributes: ['nome', 'email', 'id'] 
                }]
            });

            const formatados = participantes.map(p => {
                const dados = p.toJSON();
                const nomeExibicao = dados.usuario?.nome || dados.nome_avulso || "Participante Anônimo";
                return {
                    ...dados,
                    nome: nomeExibicao,
                    // flagzinha pra dizer se é usuário registrado ou avulso
                    tipo: dados.usuario ? 'REGISTRADO' : 'AVULSO'
                };
            });

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
            const userId = req.params.user_id;

            if(!nome) return res.status(400).json({ message: "O nome do participante é obrigatório." });

            const bolao = await Bolao.findByPk(bolaoId);
            
            if (!bolao) return res.status(404).json({ message: "Bolão não encontrado" });

            let usuarioRegistrado = null;

            if (userId && userId !== 'undefined' && userId !== 'null') {
                usuarioRegistrado = await User.findByPk(userId);
            }

            if(usuarioRegistrado) {   
                
                const jaParticipa = await Participante.findOne({
                    where: { bolao_id: bolaoId, user_id: usuarioRegistrado.id }
                });

                if (jaParticipa) {
                    return res.status(400).json({ message: `O usuário ${nome} já está neste bolão` });
                }

                const novoParticipante = await Participante.create({
                    bolao_id: bolaoId,
                    user_id: usuarioRegistrado.id,
                    nome_avulso: null,
                    pontuacao_no_bolao: 0
                });
                return res.status(201).json(novoParticipante);
            } else {

                const jaParticipaAvulso = await Participante.findOne({
                    where: { bolao_id: bolaoId, nome_avulso: nome }
                });

                if (jaParticipaAvulso) {
                    return res.status(400).json({ message: `Já existe um convidado chamado ${nome} neste bolão!` });
                }

                const novoParticipanteAvulso = await Participante.create({
                    bolao_id: bolaoId,
                    user_id: null,
                    nome_avulso: nome,
                    pontuacao_no_bolao: 0
                });
                return res.status(201).json(novoParticipanteAvulso);
            }
        } catch (error) {
            return res.status(400).json({ message: "Erro ao adicionar participante.", error: error.message });
        }
    },

    async delete (req, res) {
        try{
            const { participanteId } = req.params;


            const deletado = await Participante.destroy({ where: { id: participanteId}});

            if(deletado === 0){
                res.status(404).json({ message: "Participante não encontrado. "});
            }

            return res.status(204).send();
        } catch (error){
            console.error("Erro ao deletar participante:", error);
            return res.status(400).json({ 
                message: "Erro ao remover participante.", 
                error: error.message });
        }
    }
};