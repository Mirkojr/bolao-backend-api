// Datas "de calendário" (hoje, semana) no fuso dos usuários, não no do
// servidor: no Render o servidor roda em UTC, e às 22h de Brasília já seria
// "amanhã".
export const FUSO_PADRAO = process.env.APP_TIMEZONE || 'America/Sao_Paulo';

const formatadores = new Map();
function partesNoFuso(instante, timeZone) {
    if (!formatadores.has(timeZone)) {
        formatadores.set(timeZone, new Intl.DateTimeFormat('en-US', {
            timeZone, hourCycle: 'h23',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        }));
    }
    const partes = {};
    for (const { type, value } of formatadores.get(timeZone).formatToParts(instante)) partes[type] = Number(value);
    return partes;
}

/** Diferença (ms) entre o relógio do fuso e o UTC naquele instante */
function deslocamento(instante, timeZone) {
    const p = partesNoFuso(instante, timeZone);
    const comoSeFosseUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return comoSeFosseUTC - Math.floor(instante.getTime() / 1000) * 1000;
}

/**
 * Instante da meia-noite (no fuso) do dia de `instante`, deslocado em `dias`.
 * Ex.: inicioDoDia(agora) = começo de hoje; inicioDoDia(agora, 1) = de amanhã.
 */
export function inicioDoDia(instante, dias = 0, timeZone = FUSO_PADRAO) {
    const { year, month, day } = partesNoFuso(instante, timeZone);
    const meiaNoiteComoUTC = Date.UTC(year, month - 1, day + dias);

    // o deslocamento pode mudar perto de horário de verão: recalcula uma vez
    const aproximado = new Date(meiaNoiteComoUTC - deslocamento(new Date(meiaNoiteComoUTC), timeZone));
    return new Date(meiaNoiteComoUTC - deslocamento(aproximado, timeZone));
}
