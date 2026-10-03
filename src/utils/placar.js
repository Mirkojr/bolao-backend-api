/**
 * Converte um valor de placar vindo da requisição em inteiro >= 0.
 * Aceita número ou string numérica ("2"); devolve null se for inválido.
 */
export function parseGols(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    if (typeof valor !== 'number' && typeof valor !== 'string') return null;

    const numero = Number(valor);
    return Number.isInteger(numero) && numero >= 0 ? numero : null;
}
