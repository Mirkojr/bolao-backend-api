import { Op } from "sequelize";
import Time from "../models/Time.js";
import { ConflictError, NotFoundError } from "../errors.js";
import { termoContem } from "../utils/busca.js";

// Gera sigla a partir do nome (garante 2 a 3 caracteres)
const gerarSigla = (nome = "") => {
    const limpo = nome.replace(/[^a-zA-ZÀ-ÿ0-9]/g, "");
    return limpo.substring(0, 3).toUpperCase().padEnd(2, "X");
};

async function buscarTime(id) {
    const time = await Time.findByPk(id);
    if (!time) throw new NotFoundError("Time não encontrado.");
    return time;
}

export default {
    // LISTAR TIMES (paginação e busca opcionais)
    async index(req, res) {
        const { page, limit = 10, search = "" } = req.query;

        const where = {};
        if (search) where.nome = { [Op.iLike]: termoContem(search) };

        // Sem "page" => array puro (compatibilidade)
        if (!page) {
            const times = await Time.findAll({ where, order: [["nome", "ASC"]] });
            return res.status(200).json(times);
        }

        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
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
    },

    async show(req, res) {
        return res.status(200).json(await buscarTime(req.params.id));
    },

    async searchByName(req, res) {
        const times = await Time.findAll({
            where: { nome: { [Op.iLike]: termoContem(req.params.nome) } },
        });
        return res.status(200).json(times);
    },

    // CRIAR TIME (sigla opcional -> gerada do nome); corpo validado pelo schemaCriarTime
    async store(req, res) {
        const { nome, sigla, escudo_url } = req.body;

        const novoTime = await Time.create({
            nome,
            sigla: sigla ? sigla.toUpperCase() : gerarSigla(nome),
            escudo_url: escudo_url || null,
        });
        return res.status(201).json(novoTime);
    },

    // ATUALIZAR TIME (retorna o time atualizado)
    async update(req, res) {
        const { nome, sigla, escudo_url } = req.body;
        const time = await buscarTime(req.params.id);

        if (nome !== undefined) time.nome = nome;
        if (sigla !== undefined) time.sigla = sigla ? sigla.toUpperCase() : gerarSigla(nome ?? time.nome);
        if (escudo_url !== undefined) time.escudo_url = escudo_url || null;

        await time.save();
        return res.status(200).json(time);
    },

    async delete(req, res) {
        try {
            const apagados = await Time.destroy({ where: { id: req.params.id } });
            if (apagados === 0) throw new NotFoundError("Time não encontrado.");
            return res.status(204).send();
        } catch (error) {
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                throw new ConflictError("Este time está em jogos cadastrados e não pode ser excluído.");
            }
            throw error;
        }
    },
};
