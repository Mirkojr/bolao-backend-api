import { fn, col, Op } from 'sequelize';
import { Palpite, Participante, User, Jogo } from '../models/index.js';
import { PONTUACAO_EXATA, PONTUACAO_PARCIAL } from '../config/game.js';

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

export async function aplicarPontosNosPalpites(palpites, golsA, golsB) {
    for (const palpite of palpites) {
        const pontos = calcularPontos(
            palpite.gol_a_palpite,
            palpite.gol_b_palpite,
            golsA,
            golsB
        );

        if (palpite.pontos_ganhos !== pontos) {
            await palpite.update({ pontos_ganhos: pontos });
        }
    }
}

// Recalcula a pontuação dos participantes (SOMA dos pontos_ganhos dos palpites)
export async function recalcularParticipantes(participanteIds) {
    const totais = await Palpite.findAll({
        attributes: ['participante_id', [fn('SUM', col('pontos_ganhos')), 'total']],
        where: participanteIds ? { participante_id: participanteIds } : undefined,
        group: ['participante_id'],
        raw: true,
    });

    const mapa = new Map(totais.map((r) => [r.participante_id, Number(r.total) || 0]));

    // Sem IDs = recalcular TODOS os participantes 
    const alvo = participanteIds ?? (
        await Participante.findAll({ attributes: ['id'], raw: true })
    ).map((p) => p.id);

    for (const id of alvo) {
        await Participante.update(
            { pontuacao_no_bolao: mapa.get(id) ?? 0 },
            { where: { id } }
        );
    }
}

// Recalcula a pontuação total dos usuários (SOMA dos pontuacao_no_bolao dos participantes)
export async function recalcularUsuarios(userIds) {
    const totais = await Participante.findAll({
        attributes: ['user_id', [fn('SUM', col('pontuacao_no_bolao')), 'total']],
        // ignora participantes avulsos (sem user_id)
        where: userIds ? { user_id: userIds } : { user_id: { [Op.ne]: null } },
        group: ['user_id'],
        raw: true,
    });

    const mapa = new Map(totais.map((r) => [r.user_id, Number(r.total) || 0]));

    const alvo = userIds ?? (
        await User.findAll({ attributes: ['id'], raw: true })
    ).map((u) => u.id);

    for (const id of alvo) {
        await User.update(
            { pontuacao_total: mapa.get(id) ?? 0 },
            { where: { id } }
        );
    }
}

// chamado quando um jogo é finalizado / tem o placar alterado
export async function calcularPontuacaoJogo(jogoId, golsA, golsB) {
    const palpites = await Palpite.findAll({ where: { jogo_id: jogoId } });

    // grava os pontos de cada palpite
    await aplicarPontosNosPalpites(palpites, golsA, golsB);

    // descobre quais participantes foram afetados (sem repetir)
    const participanteIds = [...new Set(palpites.map((p) => p.participante_id))];
    if (participanteIds.length === 0) return;

    // recalcula esses participantes
    await recalcularParticipantes(participanteIds);

    // recalcula os usuários donos desses participantes
    const participantes = await Participante.findAll({
        where: { id: participanteIds },
        attributes: ['user_id'],
        raw: true,
    });
    const userIds = [...new Set(participantes.map((p) => p.user_id).filter(Boolean))];
    if (userIds.length > 0) {
        await recalcularUsuarios(userIds);
    }
}

//  Um palpite específico (ex.: palpite feito depois que o jogo já finalizou)
export async function processarPalpiteIndividual(palpite, jogo) {
    await aplicarPontosNosPalpites([palpite], jogo.gol_a_real, jogo.gol_b_real);
    await recalcularParticipantes([palpite.participante_id]);

    const participante = await Participante.findByPk(palpite.participante_id, {
        attributes: ['user_id'],
        raw: true,
    });
    if (participante?.user_id) {
        await recalcularUsuarios([participante.user_id]);
    }
}

// recálculo geral (todos os jogos finalizados / todos os participantes / todos os usuários)
export async function recalcularTudo() {
    const jogosFinalizados = await Jogo.findAll({ where: { status: 'FINALIZADO' } });

    for (const jogo of jogosFinalizados) {
        const palpites = await Palpite.findAll({ where: { jogo_id: jogo.id } });
        await aplicarPontosNosPalpites(palpites, jogo.gol_a_real, jogo.gol_b_real);
    }

    await recalcularParticipantes(); // todos
    await recalcularUsuarios();      // todos
}