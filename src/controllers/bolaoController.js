import { Bolao } from '../models/index.js';

export default {
    // POST /
    async store(req, res) {
        try {
            const novoBolao = await Bolao.create({
                nome: req.body.nome,
                criador_id: req.userId
            });
            return res.status(201).json(novoBolao);
        } catch (error) {
            return res.status(400).json({ message: "Falha ao criar Bolão.", error: error.message });
        }
    },

    // GET /
    async index(req, res) {
        try {
            const boloes = await Bolao.findAll({ where: { criador_id: req.userId } });
            return res.status(200).json(boloes);
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao buscar os bolões do usuário.' });
        }
    },

    // GET /:id
    async show(req, res) {
        try {
            const bolao = await Bolao.findByPk(req.params.id);
            if (!bolao) return res.status(404).json({ message: "Bolão não encontrado." });
            return res.status(200).json(bolao);
        } catch (error) {
            return res.status(400).json({ message: "Busca de Bolão falhou.", error: error.message });
        }
    },

    // PUT /:id
    async update(req, res) {
        try {
            await Bolao.update(req.body, { where: { id: req.params.id } });
            return res.status(200).json("Bolão atualizado com sucesso.");
        } catch (error) {
            return res.status(400).json({ message: "Alteração do Bolão falhou.", error: error.message });
        }
    },

    // DELETE /:id
    async delete(req, res) {
        try {
            await Bolao.destroy({ where: { id: req.params.id } });
            return res.status(204).send();
        } catch (error) {
            return res.status(400).json({ message: "Falha ao apagar Bolão.", error: error.message });
        }
    }
};