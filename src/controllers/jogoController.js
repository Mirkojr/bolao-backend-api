import { Op, literal } from 'sequelize';
import { Jogo, Time } from '../models/index.js';
import { calcularPontuacaoJogo } from '../services/rankingService.js';

export default {

    /**
     * GET /jogos
     * Query params (todos opcionais):
     *   page, limit          -> paginação (opt-in: só pagina se vier ?page)
     *   search               -> nome/sigla de um dos times
     *   status               -> agendado | finalizado
     *   periodo              -> hoje | semana | futuros | passados | sem_data
     *   time_id              -> jogos em que o time joga (mandante ou visitante)
     *   sort                 -> proximos (padrão) | data_asc | data_desc | recentes
     */
    async index(req, res) {
        try {
            const { search, status, periodo, time_id, sort } = req.query;

            const filtros = [];

            // --- busca por nome do time -------------------------------------
            if (search && String(search).trim()) {
                const termo = `%${String(search).trim()}%`;
                const timesEncontrados = await Time.findAll({
                    attributes: ['id'],
                    where: {
                        [Op.or]: [
                            { nome: { [Op.iLike]: termo } },
                            { sigla: { [Op.iLike]: termo } },
                        ],
                    },
                });
                const ids = timesEncontrados.map((t) => t.id);
                // nenhum time bate com a busca -> resultado vazio
                if (ids.length === 0) {
                    return res.status(200).json({
                        data: [],
                        pagination: { total: 0, page: 1, limit: 0, totalPages: 0 },
                        counts: { todos: 0, agendados: 0, finalizados: 0, pendentes: 0 },
                    });
                }
                filtros.push({
                    [Op.or]: [{ time_a_id: { [Op.in]: ids } }, { time_b_id: { [Op.in]: ids } }],
                });
            }

            // --- filtro por time específico ---------------------------------
            if (time_id) {
                filtros.push({
                    [Op.or]: [{ time_a_id: Number(time_id) }, { time_b_id: Number(time_id) }],
                });
            }

            // --- período ------------------------------------------------------
            const agora = new Date();
            const inicioDoDia = new Date(agora); inicioDoDia.setHours(0, 0, 0, 0);
            const fimDoDia = new Date(agora); fimDoDia.setHours(23, 59, 59, 999);
            const daquiUmaSemana = new Date(inicioDoDia);
            daquiUmaSemana.setDate(daquiUmaSemana.getDate() + 7);

            const periodos = {
                hoje: { data_jogo: { [Op.between]: [inicioDoDia, fimDoDia] } },
                semana: { data_jogo: { [Op.between]: [inicioDoDia, daquiUmaSemana] } },
                futuros: { data_jogo: { [Op.gte]: agora } },
                passados: { data_jogo: { [Op.lt]: agora } },
                sem_data: { data_jogo: { [Op.is]: null } },
            };
            if (periodo && periodos[periodo]) filtros.push(periodos[periodo]);

            // where SEM o status (usado para calcular as contagens dos chips)
            const whereBase = filtros.length ? { [Op.and]: filtros } : {};

            // --- status --------------------------------------------------------
            const statusWhere = {
                agendado: { gol_a_real: { [Op.is]: null } },
                finalizado: { gol_a_real: { [Op.not]: null } },
            };
            const where = status && statusWhere[status]
                ? { [Op.and]: [...filtros, statusWhere[status]] }
                : whereBase;

            // --- ordenação -----------------------------------------------------
            const ordenacoes = {
                data_asc: [literal('"Jogo"."data_jogo" ASC NULLS LAST')],
                data_desc: [literal('"Jogo"."data_jogo" DESC NULLS LAST')],
                recentes: [['id', 'DESC']],
                // padrão: os que estão por vir primeiro, do mais próximo ao mais distante,
                // depois os já realizados (mais recentes antes) e por fim os sem data
                proximos: [
                    literal('CASE WHEN "Jogo"."data_jogo" IS NULL THEN 1 ELSE 0 END ASC'),
                    literal('CASE WHEN "Jogo"."data_jogo" >= NOW() THEN 0 ELSE 1 END ASC'),
                    literal('ABS(EXTRACT(EPOCH FROM (COALESCE("Jogo"."data_jogo", NOW()) - NOW()))) ASC'),
                    ['id', 'DESC'],
                ],
            };
            const order = ordenacoes[sort] || ordenacoes.proximos;

            const includes = [
                { model: Time, as: 'timeA' },
                { model: Time, as: 'timeB' },
            ];

            // --- sem paginação (compatibilidade com telas antigas) -------------
            if (!req.query.page) {
                const jogos = await Jogo.findAll({ where, include: includes, order });
                return res.status(200).json(jogos);
            }

            // --- com paginação --------------------------------------------------
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
            const offset = (page - 1) * limit;

            const { count, rows } = await Jogo.findAndCountAll({
                where,
                include: includes,
                order,
                limit,
                offset,
                distinct: true,
            });

            // contagens para os chips (respeitam busca/período, ignoram o status ativo)
            const [agendados, finalizados, pendentes] = await Promise.all([
                Jogo.count({ where: { [Op.and]: [whereBase, statusWhere.agendado] } }),
                Jogo.count({ where: { [Op.and]: [whereBase, statusWhere.finalizado] } }),
                Jogo.count({
                    where: {
                        [Op.and]: [
                            whereBase,
                            { gol_a_real: { [Op.is]: null } },
                            { data_jogo: { [Op.lt]: agora } },
                        ],
                    },
                }),
            ]);

            return res.status(200).json({
                data: rows,
                pagination: {
                    total: count,
                    page,
                    limit,
                    totalPages: Math.ceil(count / limit) || 1,
                },
                counts: {
                    todos: agendados + finalizados,
                    agendados,
                    finalizados,
                    pendentes,
                },
            });
        } catch (error) {
            console.error('Erro ao listar jogos:', error);
            return res.status(500).json({ error: 'Erro ao listar jogos.' });
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