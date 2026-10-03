import { Op, literal } from 'sequelize';
import sequelize from '../config/database.js';
import { Jogo, Time, Palpite } from '../models/index.js';
import { calcularPontuacaoJogo } from '../services/rankingService.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors.js';
import { termoContem } from '../utils/busca.js';
import { inicioDoDia } from '../utils/datas.js';

const INCLUDE_TIMES = [
    { model: Time, as: 'timeA' },
    { model: Time, as: 'timeB' },
];

// O status é derivado do placar (e garantido por uma CHECK no banco)
const STATUS = { agendado: 'AGENDADO', finalizado: 'FINALIZADO' };

export default {

    /**
     * GET /jogos
     * Query params (todos opcionais):
     *   page, limit          -> paginação (opt-in: só pagina se vier ?page)
     *   search               -> nome/sigla de um dos times
     *   status               -> agendado | finalizado
     *   periodo              -> hoje | semana | futuros | passados (dias no fuso de APP_TIMEZONE)
     *   time_id              -> jogos em que o time joga (mandante ou visitante)
     *   sort                 -> proximos (padrão) | data_asc | data_desc | recentes
     */
    async index(req, res) {
        const { search, status, periodo, time_id, sort } = req.query;

        const filtros = [];

        // --- busca por nome do time -------------------------------------
        if (search && String(search).trim()) {
            const termo = termoContem(search);
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
        if (time_id && Number.isInteger(Number(time_id))) {
            filtros.push({
                [Op.or]: [{ time_a_id: Number(time_id) }, { time_b_id: Number(time_id) }],
            });
        }

        // --- período (hoje/semana no fuso dos usuários, não no do servidor) ---
        const agora = new Date();
        const hoje = inicioDoDia(agora);

        const periodos = {
            hoje: { data_jogo: { [Op.gte]: hoje, [Op.lt]: inicioDoDia(agora, 1) } },
            semana: { data_jogo: { [Op.gte]: hoje, [Op.lt]: inicioDoDia(agora, 7) } },
            futuros: { data_jogo: { [Op.gte]: agora } },
            passados: { data_jogo: { [Op.lt]: agora } },
        };
        if (periodo && periodos[periodo]) filtros.push(periodos[periodo]);

        // where SEM o status (usado para calcular as contagens dos chips)
        const whereBase = filtros.length ? { [Op.and]: filtros } : {};

        // --- status --------------------------------------------------------
        const where = status && STATUS[status]
            ? { [Op.and]: [...filtros, { status: STATUS[status] }] }
            : whereBase;

        // --- ordenação -----------------------------------------------------
        const ordenacoes = {
            data_asc: [literal('"Jogo"."data_jogo" ASC NULLS LAST')],
            data_desc: [literal('"Jogo"."data_jogo" DESC NULLS LAST')],
            recentes: [['id', 'DESC']],
            // padrão: os que estão por vir primeiro, do mais próximo ao mais distante,
            // depois os já realizados (mais recentes antes)
            proximos: [
                literal('CASE WHEN "Jogo"."data_jogo" >= NOW() THEN 0 ELSE 1 END ASC'),
                literal('ABS(EXTRACT(EPOCH FROM ("Jogo"."data_jogo" - NOW()))) ASC'),
                ['id', 'DESC'],
            ],
        };
        const order = ordenacoes[sort] || ordenacoes.proximos;

        // --- sem paginação (compatibilidade com telas antigas) -------------
        if (!req.query.page) {
            const jogos = await Jogo.findAll({ where, include: INCLUDE_TIMES, order });
            return res.status(200).json(jogos);
        }

        // --- com paginação --------------------------------------------------
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const offset = (page - 1) * limit;

        const { count, rows } = await Jogo.findAndCountAll({
            where,
            include: INCLUDE_TIMES,
            order,
            limit,
            offset,
            distinct: true,
        });

        // contagens para os chips (respeitam busca/período, ignoram o status ativo)
        const [agendados, finalizados, pendentes] = await Promise.all([
            Jogo.count({ where: { [Op.and]: [whereBase, { status: 'AGENDADO' }] } }),
            Jogo.count({ where: { [Op.and]: [whereBase, { status: 'FINALIZADO' }] } }),
            // já aconteceram e ainda não têm placar
            Jogo.count({ where: { [Op.and]: [whereBase, { status: 'AGENDADO' }, { data_jogo: { [Op.lt]: agora } }] } }),
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
    },

    // CRIAR JOGO (preferência por time_a_id/time_b_id; fallback por nome)
    // Corpo validado pelo schemaCriarJogo.
    async store(req, res) {
        const { time_a_id, time_b_id, timeA, timeB, data_jogo } = req.body;

        const buscaOuCriaTime = async (nomeTime) => {
            const time = await Time.findOne({ where: { nome: nomeTime } });
            if (time) return time;
            const sigla = nomeTime.substring(0, 3).toUpperCase().padEnd(2, 'X');
            return Time.create({ nome: nomeTime, sigla });
        };

        const idA = time_a_id ?? (await buscaOuCriaTime(timeA)).id;
        const idB = time_b_id ?? (await buscaOuCriaTime(timeB)).id;

        if (idA === idB) throw new BadRequestError('Os dois times não podem ser iguais.');

        const novoJogo = await Jogo.create({
            time_a_id: idA,
            time_b_id: idB,
            data_jogo: data_jogo ?? new Date(),
            status: 'AGENDADO',
        });

        const jogoCompleto = await Jogo.findByPk(novoJogo.id, { include: INCLUDE_TIMES });
        return res.status(201).json(jogoCompleto);
    },

    /**
     * ATUALIZAR JOGO (corpo validado pelo schemaAtualizarJogo)
     *   - time_a_id, time_b_id, data_jogo: editam o confronto
     *   - gol_a_real + gol_b_real (números): lançam/corrigem o placar -> FINALIZADO
     *   - gol_a_real + gol_b_real (null): desfazem o placar -> AGENDADO
     * Placar e pontuação são gravados na mesma transação.
     */
    async update(req, res) {
        const { gol_a_real, gol_b_real, time_a_id, time_b_id, data_jogo } = req.body;

        const jogo = await Jogo.findByPk(req.params.id);
        if (!jogo) throw new NotFoundError('Jogo não encontrado.');

        if (time_a_id !== undefined) jogo.time_a_id = time_a_id;
        if (time_b_id !== undefined) jogo.time_b_id = time_b_id;
        if (data_jogo !== undefined) jogo.data_jogo = data_jogo;

        if (String(jogo.time_a_id) === String(jogo.time_b_id)) {
            throw new BadRequestError('Os dois times não podem ser iguais.');
        }

        // o schema garante que os dois placares vêm juntos (ou nenhum)
        const mexeuNoPlacar = gol_a_real !== undefined;
        if (mexeuNoPlacar) {
            jogo.gol_a_real = gol_a_real;
            jogo.gol_b_real = gol_b_real;
            jogo.status = gol_a_real === null ? 'AGENDADO' : 'FINALIZADO';
        }

        await sequelize.transaction(async (t) => {
            await jogo.save({ transaction: t });

            // com placar null, todos os palpites voltam a 0 ponto
            if (mexeuNoPlacar) {
                await calcularPontuacaoJogo(jogo.id, gol_a_real, gol_b_real, t);
            }
        });

        const jogoCompleto = await Jogo.findByPk(jogo.id, { include: INCLUDE_TIMES });
        return res.status(200).json(jogoCompleto);
    },

    // DELETAR JOGO
    async delete(req, res) {
        const palpites = await Palpite.count({ where: { jogo_id: req.params.id } });
        if (palpites > 0) {
            throw new ConflictError(`Este jogo já tem ${palpites} palpite(s) registrado(s) e não pode ser excluído.`);
        }

        const apagados = await Jogo.destroy({ where: { id: req.params.id } });
        if (apagados === 0) throw new NotFoundError('Jogo não encontrado.');
        return res.status(204).send();
    }
};
