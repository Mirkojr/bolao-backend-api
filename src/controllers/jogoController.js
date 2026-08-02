import { Op } from 'sequelize';
import { Jogo, Time } from '../models/index.js';
import { calcularPontuacaoJogo } from '../services/rankingService.js';

export default {

    // LISTAR JOGOS GLOBAIS (com paginação e busca opcionais)
    async index(req, res) {
        try {
            const { page, limit = 10, search = '', status } = req.query;

            const include = [
                { model: Time, as: 'timeA' },
                { model: Time, as: 'timeB' },
            ];

            const baseOptions = {
                include,
                order: [['data_jogo', 'ASC']],
            };

            // Sem "page" => comportamento antigo (retorna array puro,)
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
                // busca por nome de qualquer um dos dois times
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
                distinct: true,   // evita contagem inflada por causa dos includes
                subQuery: false,  // necessário p/ filtrar por coluna de association ($timeA.nome$)
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

    // CRIAR UM NOVO JOGO GLOBAL (Admin)
    async store(req, res) {
        try {
            const { timeA, timeB, data_jogo } = req.body;

            const buscaOuCriaTime = async (nomeTime) => {
                if (!nomeTime) throw new Error('Nome do time obrigatório');
                let time = await Time.findOne({ where: { nome: nomeTime } });
                if (time) return time;
                const sigla = nomeTime.substring(0, 3).toUpperCase();
                return await Time.create({ nome: nomeTime, sigla });
            };

            const timeObjA = await buscaOuCriaTime(timeA);
            const timeObjB = await buscaOuCriaTime(timeB);

            const novoJogo = await Jogo.create({
                time_a_id: timeObjA.id,
                time_b_id: timeObjB.id,
                data_jogo: data_jogo || new Date(),
                status: 'AGENDADO',
            });

            // Retorna já com os times incluídos, p/ o front exibir na hora
            const jogoCompleto = await Jogo.findByPk(novoJogo.id, {
                include: [
                    { model: Time, as: 'timeA' },
                    { model: Time, as: 'timeB' },
                ],
            });

            return res.status(201).json(jogoCompleto);
        } catch (error) {
            console.error(error);
            return res.status(400).json({ message: 'Erro ao criar jogo.' });
        }
    },

    // ATUALIZAR PLACAR E FINALIZAR
    async update(req, res) {
        try {
            const { id } = req.params;
            const { gol_a_real, gol_b_real } = req.body;

            const jogo = await Jogo.findByPk(id);
            if (!jogo) return res.status(404).json({ message: "Jogo não encontrado." });

            jogo.gol_a_real = gol_a_real;
            jogo.gol_b_real = gol_b_real;
            jogo.status = 'FINALIZADO';

            await jogo.save();

            await calcularPontuacaoJogo(jogo.id, gol_a_real, gol_b_real);

            return res.status(200).json({ message: "Jogo atualizado.", jogo });
        } catch (error) {
            return res.status(400).json({ message: "Erro ao atualizar jogo." });
        }
    },

    // DELETAR JOGO GLOBAL
    async delete(req, res) {
        try {
            await Jogo.destroy({ where: { id: req.params.id } });
            res.status(204).send();
        } catch (error) {
            return res.status(500).json({ message: "Erro ao deletar jogo" });
        }
    }
};