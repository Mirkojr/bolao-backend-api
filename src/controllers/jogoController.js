import { Op } from 'sequelize';
import { Jogo, Time } from '../models/index.js';
import { calcularPontuacaoJogo } from '../services/rankingService.js';

export default {

    // LISTAR JOGOS (paginação e busca opcionais)
    async index(req, res) {
        try {
            const { page, limit = 10, search = '', status } = req.query;

            const include = [
                { model: Time, as: 'timeA' },
                { model: Time, as: 'timeB' },
            ];
            const baseOptions = { include, order: [['data_jogo', 'ASC']] };

            if (!page) {
                const jogos = await Jogo.findAll(baseOptions);
                return res.json(jogos);
            }

            const pageNum = Math.max(1, Number(page) || 1);
            const limitNum = Math.max(1, Number(limit) || 10);
            const offset = (pageNum - 1) * limitNum;

            const where = {};
            if (status) where.status = status;
            if (search) {
                where[Op.or] = [
                    { '$timeA.nome$': { [Op.iLike]: `%${search}%` } },
                    { '$timeB.nome$': { [Op.iLike]: `%${search}%` } },
                ];
            }

            const { rows, count } = await Jogo.findAndCountAll({
                ...baseOptions,
                where,
                limit: limitNum,
                offset,
                distinct: true,
                subQuery: false,
            });

            return res.json({
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
            res.status(500).json({ message: 'Erro ao buscar jogos' });
        }
    },

    // CRIAR JOGO (preferência por time_a_id/time_b_id; fallback por nome)
    async store(req, res) {
        try {
            const { time_a_id, time_b_id, timeA, timeB, data_jogo } = req.body;

            let idA = time_a_id;
            let idB = time_b_id;

            if (!idA || !idB) {
                const buscaOuCriaTime = async (nomeTime) => {
                    if (!nomeTime) throw new Error('Informe os dois times.');
                    let time = await Time.findOne({ where: { nome: nomeTime } });
                    if (time) return time;
                    const sigla = nomeTime.substring(0, 3).toUpperCase().padEnd(2, 'X');
                    return await Time.create({ nome: nomeTime, sigla });
                };
                if (!idA) idA = (await buscaOuCriaTime(timeA)).id;
                if (!idB) idB = (await buscaOuCriaTime(timeB)).id;
            }

            if (String(idA) === String(idB)) {
                return res.status(400).json({ message: 'Os dois times não podem ser iguais.' });
            }

            const novoJogo = await Jogo.create({
                time_a_id: idA,
                time_b_id: idB,
                data_jogo: data_jogo || new Date(),
                status: 'AGENDADO',
            });

            const jogoCompleto = await Jogo.findByPk(novoJogo.id, {
                include: [{ model: Time, as: 'timeA' }, { model: Time, as: 'timeB' }],
            });

            return res.status(201).json(jogoCompleto);
        } catch (error) {
            console.error(error);
            return res.status(400).json({ message: 'Erro ao criar jogo.', detail: error.message });
        }
    },

    // ATUALIZAR JOGO (edita confronto/data e/ou lança placar)
    async update(req, res) {
        try {
            const { id } = req.params;
            const { gol_a_real, gol_b_real, time_a_id, time_b_id, data_jogo, status } = req.body;

            const jogo = await Jogo.findByPk(id);
            if (!jogo) return res.status(404).json({ message: 'Jogo não encontrado.' });

            if (time_a_id !== undefined) jogo.time_a_id = time_a_id;
            if (time_b_id !== undefined) jogo.time_b_id = time_b_id;
            if (data_jogo !== undefined) jogo.data_jogo = data_jogo;
            if (status !== undefined) jogo.status = status;

            const lancouPlacar =
                gol_a_real !== undefined && gol_b_real !== undefined &&
                gol_a_real !== null && gol_b_real !== null;

            if (lancouPlacar) {
                jogo.gol_a_real = gol_a_real;
                jogo.gol_b_real = gol_b_real;
                jogo.status = 'FINALIZADO';
            }

            await jogo.save();

            if (lancouPlacar) {
                await calcularPontuacaoJogo(jogo.id, gol_a_real, gol_b_real);
            }

            const jogoCompleto = await Jogo.findByPk(jogo.id, {
                include: [{ model: Time, as: 'timeA' }, { model: Time, as: 'timeB' }],
            });

            return res.status(200).json(jogoCompleto);
        } catch (error) {
            console.error(error);
            return res.status(400).json({ message: 'Erro ao atualizar jogo.', detail: error.message });
        }
    },

    // DELETAR JOGO
    async delete(req, res) {
        try {
            await Jogo.destroy({ where: { id: req.params.id } });
            res.status(204).send();
        } catch (error) {
            return res.status(500).json({ message: 'Erro ao deletar jogo' });
        }
    }
};