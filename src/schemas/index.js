import { z } from 'zod';
import { parseGols } from '../utils/placar.js';

// ---------- blocos comuns ----------

/** id inteiro positivo (aceita "12" vindo como string) */
const id = (mensagem) => z.coerce.number({ error: mensagem }).int(mensagem).positive(mensagem);

/** texto obrigatório, sem espaços nas pontas */
const texto = (mensagem) => z.string({ error: mensagem }).trim().min(1, mensagem);

/** gols: inteiro >= 0, aceitando string numérica (mesma regra do parseGols) */
const gols = (mensagem) => z.any().transform((valor, ctx) => {
    const numero = parseGols(valor);
    if (numero === null) {
        ctx.addIssue({ code: 'custom', message: mensagem });
        return z.NEVER;
    }
    return numero;
});

/** gols ou null (null = sem placar); ausente fica undefined */
const golsOuNulo = (mensagem) => z.any().transform((valor, ctx) => {
    if (valor === undefined || valor === null) return valor;
    const numero = parseGols(valor);
    if (numero === null) {
        ctx.addIssue({ code: 'custom', message: mensagem });
        return z.NEVER;
    }
    return numero;
});

// "" ou null (o frontend usa "" para "a definir") contam como data não informada
const data = z.preprocess(
    (valor) => (valor === '' || valor === null ? undefined : valor),
    z.coerce.date({ error: 'Data do jogo inválida.' }).optional(),
);

// ---------- auth e usuários ----------

const MSG_CADASTRO = 'Nome, e-mail e senha são obrigatórios.';

export const schemaRegistro = z.object({
    nome: texto(MSG_CADASTRO),
    email: z.string({ error: MSG_CADASTRO }).trim().toLowerCase().min(1, MSG_CADASTRO).pipe(z.email('Insira um e-mail válido.')),
    senha: z.string({ error: MSG_CADASTRO }).min(1, MSG_CADASTRO).min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

export const schemaLogin = z.object({
    email: texto('Informe e-mail e senha.'),
    senha: texto('Informe e-mail e senha.'),
});

export const schemaCriarUsuario = schemaRegistro;

export const schemaAtualizarUsuario = z.object({
    nome: texto('O nome não pode ser vazio.').optional(),
    email: z.string().trim().toLowerCase().pipe(z.email('Insira um e-mail válido.')).optional(),
    senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.').optional(),
});

// ---------- bolões, participantes e palpites ----------

export const schemaBolao = z.object({
    nome: texto('O nome do bolão é obrigatório.').max(100, 'O nome do bolão deve ter até 100 caracteres.'),
});

export const schemaParticipante = z.object({
    nome: z.string().trim().optional(),
    user_id: id('Usuário inválido.').optional(),
}).refine((p) => p.user_id || p.nome, { message: 'O nome do participante é obrigatório.' });

const MSG_PALPITE_IDS = 'Participante e Jogo são obrigatórios.';
const MSG_PALPITE_GOLS = 'O palpite deve ter dois placares inteiros, maiores ou iguais a zero.';

export const schemaPalpite = z.object({
    participante_id: id(MSG_PALPITE_IDS),
    jogo_id: id(MSG_PALPITE_IDS),
    gol_a_palpite: gols(MSG_PALPITE_GOLS),
    gol_b_palpite: gols(MSG_PALPITE_GOLS),
});

export const schemaRemoverPalpite = z.object({
    participante_id: id(MSG_PALPITE_IDS),
    jogo_id: id(MSG_PALPITE_IDS),
});

// ---------- jogos e times ----------

const MSG_TIMES = 'Informe os dois times.';

export const schemaCriarJogo = z.object({
    time_a_id: id('Time inválido.').optional(),
    time_b_id: id('Time inválido.').optional(),
    // alternativa aos ids: nomes (o time é criado se não existir)
    timeA: z.string().trim().min(1).optional(),
    timeB: z.string().trim().min(1).optional(),
    data_jogo: data,
})
    .refine((j) => (j.time_a_id || j.timeA) && (j.time_b_id || j.timeB), { message: MSG_TIMES })
    .refine((j) => !(j.time_a_id && j.time_a_id === j.time_b_id), { message: 'Os dois times não podem ser iguais.' });

const MSG_PLACAR = 'Informe os dois placares como inteiros maiores ou iguais a zero (ou os dois como null para desfazer o resultado).';

export const schemaAtualizarJogo = z.object({
    time_a_id: id('Time inválido.').optional(),
    time_b_id: id('Time inválido.').optional(),
    data_jogo: data,
    gol_a_real: golsOuNulo(MSG_PLACAR).optional(),
    gol_b_real: golsOuNulo(MSG_PLACAR).optional(),
}).refine(
    // os dois placares andam juntos: os dois números, os dois null ou os dois ausentes
    (j) => (j.gol_a_real === undefined) === (j.gol_b_real === undefined)
        && (j.gol_a_real === null) === (j.gol_b_real === null),
    { message: MSG_PLACAR },
);

const escudo = z.union([z.url('O campo escudo deve ser uma URL válida.'), z.literal(''), z.null()]);

export const schemaCriarTime = z.object({
    nome: texto('O nome do time é obrigatório.'),
    sigla: z.string().trim().max(3, 'A sigla deve ter até 3 caracteres.').optional(),
    escudo_url: escudo.optional(),
});

export const schemaAtualizarTime = z.object({
    nome: texto('O nome do time é obrigatório.').optional(),
    sigla: z.string().trim().max(3, 'A sigla deve ter até 3 caracteres.').optional(),
    escudo_url: escudo.optional(),
});
