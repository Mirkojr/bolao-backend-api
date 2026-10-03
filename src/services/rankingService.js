import { fn, col, Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Palpite, Participante, User, Jogo } from '../models/index.js';
import { PONTUACAO_EXATA, PONTUACAO_PARCIAL } from '../config/game.js';

/*
 * Única fonte da regra de pontuação e do ranking.
 *
 * As funções de escrita recebem a transação (`t`) e a repassam a todas as
 * queries. As operações completas (calcularPontuacaoJogo,
 * processarPalpiteIndividual, recalcularParticipanteEUsuario, recalcularTudo)
 * abrem a própria transação quando nenhuma é passada; quem chama pode passar
 * uma para incluir outras escritas (ex.: salvar o placar do jogo) no mesmo
 * "tudo ou nada".
 */

// Regra pura de pontuação
export function calcularPontos(golA_p, golB_p, golA_r, golB_r) {
    // Se faltar qualquer placar, não dá pra pontuar
    if (golA_p == null || golB_p == null || golA_r == null || golB_r == null) {
        return 0;
    }
    // Cravou o placar exato
    if (golA_p === golA_r && golB_p === golB_r) {
        return PONTUACAO_EXATA;
    }
    // Acertou o resultado (vitória A / vitória B / empate), mas não o placar
    if (Math.sign(golA_p - golB_p) === Math.sign(golA_r - golB_r)) {
        return PONTUACAO_PARCIAL;
    }
    return 0;
}

// Usa a transação recebida ou abre uma nova
const emTransacao = (t, operacao) => (t ? operacao(t) : sequelize.transaction(operacao));

export async function aplicarPontosNosPalpites(palpites, golsA, golsB, t) {
    for (const palpite of palpites) {
        const pontos = calcularPontos(
            palpite.gol_a_palpite,
            palpite.gol_b_palpite,
            golsA,
            golsB
        );

        if (palpite.pontos_ganhos !== pontos) {
            await palpite.update({ pontos_ganhos: pontos }, { transaction: t });
        }
    }
}

// Recalcula a pontuação dos participantes (SOMA dos pontos_ganhos dos palpites)
export async function recalcularParticipantes(participanteIds, t) {
    const totais = await Palpite.findAll({
        attributes: ['participante_id', [fn('SUM', col('pontos_ganhos')), 'total']],
        where: participanteIds ? { participante_id: participanteIds } : undefined,
        group: ['participante_id'],
        raw: true,
        transaction: t,
    });

    const mapa = new Map(totais.map((r) => [r.participante_id, Number(r.total) || 0]));

    // Sem IDs = recalcular TODOS os participantes
    const alvo = participanteIds ?? (
        await Participante.findAll({ attributes: ['id'], raw: true, transaction: t })
    ).map((p) => p.id);

    for (const id of alvo) {
        await Participante.update(
            { pontuacao_no_bolao: mapa.get(id) ?? 0 },
            { where: { id }, transaction: t }
        );
    }
}

// Recalcula a pontuação total dos usuários (SOMA dos pontuacao_no_bolao dos participantes)
export async function recalcularUsuarios(userIds, t) {
    const totais = await Participante.findAll({
        attributes: ['user_id', [fn('SUM', col('pontuacao_no_bolao')), 'total']],
        // ignora participantes avulsos (sem user_id)
        where: userIds ? { user_id: userIds } : { user_id: { [Op.ne]: null } },
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
            { pontuacao_total: mapa.get(id) ?? 0 },
            { where: { id }, transaction: t }
        );
    }
}

// chamado quando um jogo é finalizado / tem o placar alterado
export function calcularPontuacaoJogo(jogoId, golsA, golsB, t) {
    return emTransacao(t, async (t) => {
        const palpites = await Palpite.findAll({ where: { jogo_id: jogoId }, transaction: t });

        // grava os pontos de cada palpite
        await aplicarPontosNosPalpites(palpites, golsA, golsB, t);

        // descobre quais participantes foram afetados (sem repetir)
        const participanteIds = [...new Set(palpites.map((p) => p.participante_id))];
        if (participanteIds.length === 0) return;

        // recalcula esses participantes
        await recalcularParticipantes(participanteIds, t);

        // recalcula os usuários donos desses participantes
        const participantes = await Participante.findAll({
            where: { id: participanteIds },
            attributes: ['user_id'],
            raw: true,
            transaction: t,
        });
        const userIds = [...new Set(participantes.map((p) => p.user_id).filter(Boolean))];
        if (userIds.length > 0) {
            await recalcularUsuarios(userIds, t);
        }
    });
}

// Recalcula um participante e o usuário vinculado a ele (se houver)
export function recalcularParticipanteEUsuario(participanteId, t) {
    return emTransacao(t, async (t) => {
        await recalcularParticipantes([participanteId], t);

        const participante = await Participante.findByPk(participanteId, {
            attributes: ['user_id'],
            raw: true,
            transaction: t,
        });
        if (participante?.user_id) {
            await recalcularUsuarios([participante.user_id], t);
        }
    });
}

//  Um palpite específico (ex.: palpite feito depois que o jogo já finalizou)
export function processarPalpiteIndividual(palpite, jogo, t) {
    return emTransacao(t, async (t) => {
        await aplicarPontosNosPalpites([palpite], jogo.gol_a_real, jogo.gol_b_real, t);
        await recalcularParticipanteEUsuario(palpite.participante_id, t);
    });
}

// recálculo geral (todos os jogos finalizados / todos os participantes / todos os usuários)
export function recalcularTudo(t) {
    return emTransacao(t, async (t) => {
        const jogosFinalizados = await Jogo.findAll({ where: { status: 'FINALIZADO' }, transaction: t });

        for (const jogo of jogosFinalizados) {
            const palpites = await Palpite.findAll({ where: { jogo_id: jogo.id }, transaction: t });
            await aplicarPontosNosPalpites(palpites, jogo.gol_a_real, jogo.gol_b_real, t);
        }

        await recalcularParticipantes(undefined, t); // todos
        await recalcularUsuarios(undefined, t);      // todos
    });
}
