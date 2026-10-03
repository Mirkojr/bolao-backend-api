/**
 * Termo para busca "contém" com LIKE/ILIKE. Escapa os curingas digitados pelo
 * usuário (% e _) e a barra, para que "50%" procure o texto literal.
 */
export function termoContem(texto) {
    const escapado = String(texto).trim().replace(/[\\%_]/g, '\\$&');
    return `%${escapado}%`;
}
