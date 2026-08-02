import { Op } from "sequelize";
import Time from "../models/Time.js";

// Gera sigla a partir do nome (garante 2 a 3 caracteres)
const gerarSigla = (nome = "") => {
    const limpo = nome.replace(/[^a-zA-ZÀ-ÿ0-9]/g, "");
    return limpo.substring(0, 3).toUpperCase().padEnd(2, "X");
};

export default {
    // LISTAR TIMES (paginação e busca opcionais)
    async index(req, res) {
        try {
            const { page, limit = 10, search = "" } = req.query;

            const where = {};
            if (search) where.nome = { [Op.iLike]: `%${search}%` };

            // Sem "page" => array puro (compatibilidade)
            if (!page) {
                const times = await Time.findAll({ where, order: [["nome", "ASC"]] });
                return res.status(200).json(times);
            }

            const pageNum = Math.max(1, Number(page) || 1);
            const limitNum = Math.max(1, Number(limit) || 10);
            const offset = (pageNum - 1) * limitNum;

            const { rows, count } = await Time.findAndCountAll({
                where,
                order: [["nome", "ASC"]],
                limit: limitNum,
                offset,
            });

            return res.status(200).json({
                data: rows,
                pagination: {
                    total: count,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(count / limitNum),
                },
            });
        } catch (error) {
            console.error(error);
            res.status(400).json({ message: "Busca de times falhou" });
        }
    },

    async show(req, res) {
        try {
            const time = await Time.findByPk(req.params.id);
            if (!time) return res.status(404).json({ message: "Time não encontrado" });
            res.status(200).json(time);
        } catch (error) {
            res.status(400).json({ message: "Busca de time falhou" });
        }
    },

    async searchByName(req, res) {
        try {
            const times = await Time.findAll({
                where: { nome: { [Op.iLike]: `%${req.params.nome}%` } },
            });
            res.status(200).json(times);
        } catch (error) {
            res.status(400).json({ message: "Busca de time falhou" });
        }
    },

    // CRIAR TIME (sigla opcional -> gerada do nome)
    async store(req, res) {
        try {
            const { nome, sigla, escudo_url } = req.body;
            if (!nome || !nome.trim()) {
                return res.status(400).json({ message: "O nome do time é obrigatório." });
            }

            const dados = {
                nome: nome.trim(),
                sigla: sigla && sigla.trim() ? sigla.trim().toUpperCase() : gerarSigla(nome),
            };
            if (escudo_url) dados.escudo_url = escudo_url;

            const novoTime = await Time.create(dados);
            res.status(201).json(novoTime);
        } catch (error) {
            console.error(error);
            res.status(400).json({ message: "Criação de time falhou", detail: error.message });
        }
    },

    // ATUALIZAR TIME (retorna o time atualizado)
    async update(req, res) {
        try {
            const { nome, sigla, escudo_url } = req.body;
            const time = await Time.findByPk(req.params.id);
            if (!time) return res.status(404).json({ message: "Time não encontrado" });

            if (nome !== undefined) time.nome = nome.trim();
            if (sigla !== undefined) {
                time.sigla = sigla && sigla.trim() ? sigla.trim().toUpperCase() : gerarSigla(nome ?? time.nome);
            }
            if (escudo_url !== undefined) time.escudo_url = escudo_url || null;

            await time.save();
            res.status(200).json(time);
        } catch (error) {
            console.error(error);
            res.status(400).json({ message: "Atualização de time falhou", detail: error.message });
        }
    },

    async delete(req, res) {
        try {
            await Time.destroy({ where: { id: req.params.id } });
            res.status(204).send();
        } catch (error) {
            res.status(400).json({ message: "Deleção de time falhou" });
        }
    },
};