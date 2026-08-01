import { Bolao, Jogo, Time } from '../models/index.js';

export default {
    // CRIAR BOLÃO
    async store(req, res) {
        try {
            const novoBolao = await Bolao.create({
                nome: req.body.nome,
                criador_id: req.userId
            });
            return res.status(201).json(novoBolao);
        } catch (error) {
            console.error(error);
            return res.status(400).json({ message: "Falha ao criar Bolão."});
        }
    },

    // LISTAR MEUS BOLÕES
    async index(req, res) {
        try {
            const boloes = await Bolao.findAll({ where: { criador_id: req.userId } });
            return res.status(200).json(boloes);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Erro ao buscar os bolões do usuário.' });
        }
    },

    // DETALHES DE UM BOLÃO
    async show(req, res) {
        try {
            const bolao = await Bolao.findByPk(req.params.id);
            if (!bolao) return res.status(404).json({ message: "Bolão não encontrado." });
            return res.status(200).json(bolao);
        } catch (error) {
            console.error(error);
            return res.status(400).json({ message: "Busca de Bolão falhou."});
        }
    },

    // ATUALIZAR BOLÃO
    async update(req, res) {
        try {
            await Bolao.update(req.body, { where: { id: req.params.id } });
            return res.status(200).json({ message: "Bolão atualizado com sucesso." });
        } catch (error) {
            console.error(error);
            return res.status(400).json({ message: "Alteração do Bolão falhou."});
        }
    },

    // DELETAR BOLÃO
    async delete(req, res) {
        try {
            await Bolao.destroy({ where: { id: req.params.id } });
            return res.status(204).send();
        } catch (error) {
            console.error(error);
            return res.status(400).json({ message: "Falha ao apagar Bolão."});
        }
    },

    // --- MÉTODOS DE RELACIONAMENTO (JOGOS DO BOLÃO) ---

    // LISTAR JOGOS DE UM BOLÃO ESPECÍFICO
    async getJogos(req, res) {
        try {
            const { id } = req.params;

            const bolao = await Bolao.findByPk(id, {
                include: [{
                    model: Jogo,
                    as: 'jogos',
                    include: [
                        { model: Time, as: 'timeA' },
                        { model: Time, as: 'timeB' }
                    ]
                }],
                order: [
                    [{ model: Jogo, as: 'jogos' }, 'data_jogo', 'ASC']
                ]
            });

            if (!bolao) return res.status(404).json({ message: "Bolão não encontrado" });

            return res.json(bolao.jogos || []);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Erro ao buscar jogos do bolão."});
        }
    },

    // ADICIONAR UM JOGO EXISTENTE AO BOLÃO
    async addJogo(req, res) {
        try {
            const { id, jogoId } = req.params;

            const bolao = await Bolao.findByPk(id);
            if (!bolao) return res.status(404).json({ message: "Bolão não encontrado." });

            await bolao.addJogo(jogoId); // Método gerado pelo Sequelize para relacionamentos N:N

            return res.status(201).json({ message: "Jogo adicionado ao bolão com sucesso!" });
        } catch (error) {
            console.error("Erro em addJogo:", error);
            return res.status(400).json({ message: "Erro ao adicionar jogo ao bolão."});
        }
    },

    // REMOVER UM JOGO DO BOLÃO
    async removeJogo(req, res) {
        try {
            const { id, jogoId } = req.params;

            const bolao = await Bolao.findByPk(id);
            if (!bolao) return res.status(404).json({ message: "Bolão não encontrado." });

            await bolao.removeJogo(jogoId); // Método gerado pelo Sequelize para relacionamentos N:N

            return res.status(204).send();
        } catch (error) {
            console.error(error);
            return res.status(400).json({ message: "Erro ao remover jogo."});
        }
    }
};