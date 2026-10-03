import { Bolao, Jogo, Time } from '../models/index.js';
import { Op } from 'sequelize';
import { NotFoundError } from '../errors.js';
import { termoContem } from '../utils/busca.js';

async function buscarBolao(id) {
    const bolao = await Bolao.findByPk(id);
    if (!bolao) throw new NotFoundError('Bolão não encontrado.');
    return bolao;
}

export default {
    // CRIAR BOLÃO
    async store(req, res) {
        const novoBolao = await Bolao.create({
            nome: req.body.nome,
            criador_id: req.userId
        });
        return res.status(201).json(novoBolao);
    },

    // LISTAR MEUS BOLÕES (com paginação e busca opcionais)
    async index(req, res) {
        const { page, limit = 10, search = '' } = req.query;

        const where = { criador_id: req.userId };
        if (search) where.nome = { [Op.iLike]: termoContem(search) };

        // Sem "page" => comportamento antigo (array puro)
        if (!page) {
            const boloes = await Bolao.findAll({ where, order: [['created_at', 'DESC']] });
            return res.status(200).json(boloes);
        }

        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
        const offset = (pageNum - 1) * limitNum;

        const { rows, count } = await Bolao.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
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

    // DETALHES DE UM BOLÃO
    async show(req, res) {
        return res.status(200).json(await buscarBolao(req.params.id));
    },

    // ATUALIZAR BOLÃO
    async update(req, res) {
        const bolao = await buscarBolao(req.params.id);
        bolao.nome = req.body.nome;
        await bolao.save();
        return res.status(200).json(bolao);
    },

    // DELETAR BOLÃO
    async delete(req, res) {
        await Bolao.destroy({ where: { id: req.params.id } });
        return res.status(204).send();
    },

    // --- MÉTODOS DE RELACIONAMENTO (JOGOS DO BOLÃO) ---

    // LISTAR JOGOS DE UM BOLÃO ESPECÍFICO
    async getJogos(req, res) {
        const bolao = await Bolao.findByPk(req.params.id, {
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

        if (!bolao) throw new NotFoundError('Bolão não encontrado.');

        return res.json(bolao.jogos || []);
    },

    // ADICIONAR UM JOGO EXISTENTE AO BOLÃO
    async addJogo(req, res) {
        const bolao = await buscarBolao(req.params.id);

        const jogo = await Jogo.findByPk(req.params.jogoId, { attributes: ['id'] });
        if (!jogo) throw new NotFoundError('Jogo não encontrado.');

        await bolao.addJogo(jogo.id); // Método gerado pelo Sequelize para relacionamentos N:N

        return res.status(201).json({ message: "Jogo adicionado ao bolão com sucesso!" });
    },

    // REMOVER UM JOGO DO BOLÃO
    async removeJogo(req, res) {
        const bolao = await buscarBolao(req.params.id);
        await bolao.removeJogo(req.params.jogoId); // Método gerado pelo Sequelize para relacionamentos N:N
        return res.status(204).send();
    }
};
