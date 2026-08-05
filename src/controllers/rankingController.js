import { Jogo, Palpite, Participante, User } from '../models/index.js';
import { PONTUACAO_EXATA, PONTUACAO_PARCIAL } from '../config/game.js';
import sequelize from '../config/database.js';
import { fn, col } from 'sequelize';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Regra de pontuação */
export function calcularPontos(golA_palpite, golB_palpite, golA_real, golB_real) {
    if ([golA_palpite, golB_palpite, golA_real, golB_real].some((v) => v == null)) {
        return 0;
    }
    if (golA_palpite === golA_real && golB_palpite === golB_real) {
        return PONTUACAO_EXATA;
    }
    if (Math.sign(golA_palpite - golB_palpite) === Math.sign(golA_real - golB_real)) {
        return PONTUACAO_PARCIAL;
    }
    return 0;
}

async function aplicarPontosNosPalpites(palpites, golsA, golsB, t) {
    for (const palpite of palpites) {
        const pontos = calcularPontos(
            palpite.gol_a_palpite,
            palpite.gol_b_palpite,
            golsA,
            golsB,
        );
        if (palpite.pontos_ganhos !== pontos) {
            await palpite.update({ pontos_ganhos: pontos }, { transaction: t });
        }
    }
}

/**
 * Recalcula pontuacao_no_bolao dos participantes a partir do SUM (idempotente).
 * Se participanteIds for omitido, recalcula todos.
 */
async function recalcularParticipantes(participanteIds, t) {
    const totais = await Palpite.findAll({
        attributes: ['participante_id', [fn('SUM', col('pontos_ganhos')), 'total']],
        where: participanteIds ? { participante_id: participanteIds } : undefined,
        group: ['participante_id'],
        raw: true,
        transaction: t,
    });

    const mapa = new Map(totais.map((r) => [r.participante_id, Number(r.total) || 0]));

    const alvo = participanteIds ?? (
        await Participante.findAll({ attributes: ['id'], raw: true, transaction: t })
    ).map((p) => p.id);

    for (const id of alvo) {
        await Participante.update(
            { pontuacao_no_bolao: mapa.get(id) || 0 },
            { where: { id }, transaction: t },
        );
    };
}

/**
 * Recalcula pontuacao_total dos usuários somando os participantes já recalculados.
 * Se userIds for omitido, recalcula todos.
 */
async function recalcularUsuarios(userIds, t) {
    const totais = await Participante.findAll({
        attributes: ['user_id', [fn('SUM', col('pontuacao_no_bolao')), 'total']],
        where: userIds ? { user_id: userIds } : undefined,
        group: ['user_id'],
        raw: true,
        transaction: t,
    });

    const mapa = new Map(totais.map((r) => [r.user_id, Number(r.total) || 0]));

    const alvo = userIds ?? (
        await User.findAll({ attributes: ['id'], raw: true, transaction: t })
    ).map((u) => u.id);

    for (const id of alvo) {
        await User.update(
            { pontuacao_total: mapa.get(id) || 0 },
            { where: { id }, transaction: t },
        );
    }
}

/* -------------------------------------------------------------------------- */
/* Controller                                                                 */
/* -------------------------------------------------------------------------- */

export const RankingController = {
    /** Recalcula a pontuação de UM jogo (ao definir/corrigir o placar). */
    async calcularPontuacaoJogo(jogoId, golsA, golsB) {
        return sequelize.transaction(async (t) => {
            const palpites = await Palpite.findAll({
                where: { jogo_id: jogoId },
                transaction: t,
            });

            if (palpites.length === 0) return;

            await aplicarPontosNosPalpites(palpites, golsA, golsB, t);

            const participanteIds = [...new Set(palpites.map((p) => p.participante_id))];
            await recalcularParticipantes(participanteIds, t);

            const vinculos = await Participante.findAll({
                where: { id: participanteIds },
                attributes: ['user_id'],
                raw: true,
                transaction: t,
            });
            const userIds = [...new Set(vinculos.map((v) => v.user_id).filter(Boolean))];
            if (userIds.length > 0) {
                await recalcularUsuarios(userIds, t);
            }
        });
    },

    /** Processa um único palpite (ex.: palpite criado após o jogo já finalizado). */
    async processarPalpiteIndividual(palpite, jogo) {
        return sequelize.transaction(async (t) => {
            const pontos = calcularPontos(
                palpite.gol_a_palpite,
                palpite.gol_b_palpite,
                jogo.gol_a_real,
                jogo.gol_b_real,
            );

            await palpite.update({ pontos_ganhos: pontos }, { transaction: t });

            await recalcularParticipantes([palpite.participante_id], t);

            const participante = await Participante.findByPk(palpite.participante_id, {
                attributes: ['user_id'],
                raw: true,
                transaction: t,
            });
            if (participante?.user_id) {
                await recalcularUsuarios([participante.user_id], t);
            }
        });
    },

    /** Recálculo geral (rota administrativa). */
    async recalcularTudo(req, res) {
        try {
            await sequelize.transaction(async (t) => {
                const jogos = await Jogo.findAll({
                    where: { status: 'FINALIZADO' },
                    transaction: t,
                });

                for (const jogo of jogos) {
                    const palpites = await Palpite.findAll({
                        where: { jogo_id: jogo.id },
                        transaction: t,
                    });
                    await aplicarPontosNosPalpites(palpites, jogo.gol_a_real, jogo.gol_b_real, t);
                }

                await recalcularParticipantes(undefined, t);
                await recalcularUsuarios(undefined, t);
            });

            return res.status(200).json({ message: 'Recalculado com sucesso!' });
        } catch (error) {
            console.error('Erro ao recalcular:', error);
            return res.status(500).json({ message: 'Erro ao recalcular.' });
        }
    },
};