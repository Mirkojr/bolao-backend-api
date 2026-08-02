/**
 * Seeder de desenvolvimento.
 *
 * Uso:
 *   node src/seeders/seed.js                          -> volume padrão
 *   node src/seeders/seed.js --reset                  -> limpa tudo antes
 *   node src/seeders/seed.js --times=40 --jogos=1500 --boloes=15 --reset
 *   node src/seeders/seed.js --xl                     -> volume gigante
 */

import bcrypt from 'bcrypt';
import sequelize from '../config/database.js';
import { User, Bolao, Participante, Jogo, Palpite, Time } from '../models/index.js';
import BolaoJogo from '../models/BolaoJogo.js';

// ─────────────────────────────────────────────────────────────
// Config via linha de comando
// ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (nome, padrao) => {
    const achado = args.find((a) => a.startsWith(`--${nome}=`));
    return achado ? Number(achado.split('=')[1]) : padrao;
};
const tem = (nome) => args.includes(`--${nome}`);

const XL = tem('xl');

const CFG = {
    reset: tem('reset'),
    usuarios: flag('usuarios', XL ? 300 : 60),
    jogos: flag('jogos', XL ? 5000 : 800),
    boloes: flag('boloes', XL ? 40 : 10),
    // por bolão
    minParticipantes: 5,
    maxParticipantes: XL ? 25 : 14,
    minJogosPorBolao: 8,
    maxJogosPorBolao: XL ? 60 : 30,
    // % dos jogos passados que já têm placar (o resto vira "pendente")
    percFinalizados: 0.9,
    senhaPadrao: '123456',
};

const LOTE = 500; // insere em blocos p/ não estourar o limite de params do Postgres

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const escolher = (arr) => arr[rnd(0, arr.length - 1)];
const embaralhar = (arr) => [...arr].sort(() => Math.random() - 0.5);
const chance = (p) => Math.random() < p;

const diasAtras = (d) => new Date(Date.now() - d * 86400000);
const diasFrente = (d) => new Date(Date.now() + d * 86400000);

async function inserirEmLotes(Model, registros, label) {
    const criados = [];
    for (let i = 0; i < registros.length; i += LOTE) {
        const bloco = registros.slice(i, i + LOTE);
        const res = await Model.bulkCreate(bloco, { returning: true, validate: false });
        criados.push(...res);
        process.stdout.write(`\r   ${label}: ${criados.length}/${registros.length}`);
    }
    process.stdout.write(`\r   ${label}: ${criados.length}/${registros.length} ✓\n`);
    return criados;
}

/** Placar realista: gols baixos são muito mais prováveis que goleadas */
const golRealista = () => {
    const r = Math.random();
    if (r < 0.28) return 0;
    if (r < 0.60) return 1;
    if (r < 0.82) return 2;
    if (r < 0.93) return 3;
    if (r < 0.98) return 4;
    return rnd(5, 7);
};

/** Regra de pontuação (ajuste se a sua for diferente) */
const calcularPontos = (pa, pb, ra, rb) => {
    if (pa === ra && pb === rb) return 10;                     // placar exato
    const resultado = (a, b) => (a > b ? 'V' : a < b ? 'D' : 'E');
    if (resultado(pa, pb) === resultado(ra, rb)) return 5;     // acertou o vencedor/empate
    return 0;
};

// ─────────────────────────────────────────────────────────────
// Massa de dados
// ─────────────────────────────────────────────────────────────
const TIMES = [
    ['Flamengo', 'FLA'], ['Palmeiras', 'PAL'], ['Corinthians', 'COR'], ['São Paulo', 'SAO'],
    ['Santos', 'SAN'], ['Grêmio', 'GRE'], ['Internacional', 'INT'], ['Cruzeiro', 'CRU'],
    ['Atlético Mineiro', 'CAM'], ['Botafogo', 'BOT'], ['Fluminense', 'FLU'], ['Vasco da Gama', 'VAS'],
    ['Bahia', 'BAH'], ['Vitória', 'VIT'], ['Sport Recife', 'SPT'], ['Náutico', 'NAU'],
    ['Santa Cruz', 'STA'], ['Fortaleza', 'FOR'], ['Ceará', 'CEA'], ['Bragantino', 'RBB'],
    ['Athletico Paranaense', 'CAP'], ['Coritiba', 'CFC'], ['Goiás', 'GOI'], ['Atlético Goianiense', 'ACG'],
    ['Cuiabá', 'CUI'], ['Juventude', 'JUV'], ['Criciúma', 'CRI'], ['Chapecoense', 'CHA'],
    ['Avaí', 'AVA'], ['Figueirense', 'FIG'], ['Ponte Preta', 'PON'], ['Guarani', 'GUA'],
    ['Novorizontino', 'NOV'], ['Mirassol', 'MIR'], ['Ituano', 'ITU'], ['Botafogo-SP', 'BSP'],
    ['América Mineiro', 'AME'], ['Remo', 'REM'], ['Paysandu', 'PAY'], ['CRB', 'CRB'],
    ['CSA', 'CSA'], ['ABC', 'ABC'], ['Sampaio Corrêa', 'SAM'], ['Operário-PR', 'OPE'],
    ['Londrina', 'LON'], ['Vila Nova', 'VIL'], ['Brusque', 'BRU'], ['Amazonas', 'AMA'],
    ['Volta Redonda', 'VOL'], ['Ferroviária', 'FER'], ['Athletic Club', 'ATH'], ['Maringá', 'MAR'],
    ['Náutico-RR', 'NRR'], ['Tombense', 'TOM'], ['Ypiranga', 'YPI'], ['São Bernardo', 'SBE'],
    ['Portuguesa', 'POR'], ['Bangu', 'BAN'], ['Madureira', 'MAD'], ['Boavista', 'BOA'],
    ['Treze', 'TRE'], ['Campinense', 'CAM2'.slice(0, 3)], ['Fluminense-PI', 'FPI'], ['Altos', 'ALT'],
];

const NOMES = ['Marcos', 'Ana', 'Pedro', 'Júlia', 'Lucas', 'Beatriz', 'Rafael', 'Camila', 'Bruno',
    'Larissa', 'Thiago', 'Fernanda', 'Gustavo', 'Mariana', 'Felipe', 'Carla', 'Diego', 'Patrícia',
    'André', 'Vanessa', 'Rodrigo', 'Amanda', 'Leonardo', 'Isabela', 'Vinícius', 'Letícia'];
const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Almeida',
    'Nascimento', 'Araújo', 'Ribeiro', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Barbosa'];

const NOMES_BOLAO = ['Bolão do Brasileirão', 'Copa do Trabalho', 'Bolão da Firma', 'Rodada dos Amigos',
    'Bolão da Família', 'Liga dos Cunhados', 'Copa do Churrasco', 'Bolão da Faculdade',
    'Torneio dos Vizinhos', 'Bolão do Grupo do Zap', 'Copa da Resenha', 'Bolão do Bairro'];

// ─────────────────────────────────────────────────────────────
// Execução
// ─────────────────────────────────────────────────────────────
async function limpar() {
    console.log('🧹 Limpando tabelas...');
    await sequelize.query(`
        TRUNCATE TABLE palpites, participantes_bolao, bolao_jogos, boloes, jogos, times, users
        RESTART IDENTITY CASCADE;
    `);
    console.log('   tabelas zeradas ✓');
}

async function seed() {
    const inicio = Date.now();
    console.log('\n🌱 Iniciando seed...\n');
    console.log(`   config: ${JSON.stringify(CFG)}\n`);

    await sequelize.authenticate();

    if (CFG.reset) {
        if (process.env.NODE_ENV === 'production' && !tem('force')) {
            throw new Error('Recusando --reset em produção. Use --force se tiver MUITA certeza.');
        }
        await limpar();
    }

    // ── 1. TIMES ────────────────────────────────────────────
    console.log('⚽ Times');
    let times = await Time.findAll();
    if (times.length === 0) {
        times = await inserirEmLotes(
            Time,
            TIMES.map(([nome, sigla]) => ({ nome, sigla, escudo_url: null })),
            'times'
        );
    } else {
        console.log(`   ${times.length} times já existiam, reaproveitando ✓`);
    }

    // ── 2. USUÁRIOS ─────────────────────────────────────────
    console.log('\n👤 Usuários');
    // hash calculado UMA vez (bulkCreate não dispara o hook beforeSave)
    const hash = await bcrypt.hash(CFG.senhaPadrao, 10);

    const usuariosPayload = [{
        nome: 'Admin', email: 'admin@bolao.com', senha_hash: hash, role: 'ADMIN', pontuacao_total: 0,
    }];
    for (let i = 0; i < CFG.usuarios; i++) {
        const nome = `${escolher(NOMES)} ${escolher(SOBRENOMES)}`;
        usuariosPayload.push({
            nome,
            email: `user${i + 1}@bolao.com`,
            senha_hash: hash,
            role: 'USER',
            pontuacao_total: 0,
        });
    }
    const usuarios = await inserirEmLotes(User, usuariosPayload, 'usuários');
    const admin = usuarios[0];

    // ── 3. JOGOS ────────────────────────────────────────────
    console.log('\n🏟️  Jogos');
    const jogosPayload = [];
    for (let i = 0; i < CFG.jogos; i++) {
        const [a, b] = embaralhar(times).slice(0, 2);

        // 65% no passado, 35% no futuro
        const passado = chance(0.65);
        const data = passado ? diasAtras(rnd(1, 300)) : diasFrente(rnd(0, 120));
        data.setHours(escolher([16, 18, 19, 20, 21]), escolher([0, 30, 45]), 0, 0);

        const finalizado = passado && chance(CFG.percFinalizados);

        jogosPayload.push({
            time_a_id: a.id,
            time_b_id: b.id,
            data_jogo: data,
            gol_a_real: finalizado ? golRealista() : null,
            gol_b_real: finalizado ? golRealista() : null,
            status: finalizado ? 'FINALIZADO' : 'AGENDADO',
        });
    }
    const jogos = await inserirEmLotes(Jogo, jogosPayload, 'jogos');

    // ── 4. BOLÕES ───────────────────────────────────────────
    console.log('\n🏆 Bolões');
    const boloesPayload = [];
    for (let i = 0; i < CFG.boloes; i++) {
        boloesPayload.push({
            nome: `${escolher(NOMES_BOLAO)} ${2024 + (i % 3)} #${i + 1}`,
            criador_id: admin.id,
            created_at: diasAtras(rnd(30, 300)),
        });
    }
    const boloes = await inserirEmLotes(Bolao, boloesPayload, 'bolões');

    // ── 5. VÍNCULOS, PARTICIPANTES E PALPITES ───────────────
    console.log('\n🔗 Vínculos, participantes e palpites');
    const vinculos = [];
    const participantesPayload = [];
    const mapaBolaoJogos = new Map();   // bolaoId -> [jogo]
    const mapaBolaoParts = new Map();   // bolaoId -> qtd (para fatiar depois)

    for (const bolao of boloes) {
        const qtdJogos = rnd(CFG.minJogosPorBolao, CFG.maxJogosPorBolao);
        const jogosDoBolao = embaralhar(jogos).slice(0, Math.min(qtdJogos, jogos.length));
        mapaBolaoJogos.set(bolao.id, jogosDoBolao);
        jogosDoBolao.forEach((j) => vinculos.push({ bolao_id: bolao.id, jogo_id: j.id }));

        const qtdParts = rnd(CFG.minParticipantes, CFG.maxParticipantes);
        mapaBolaoParts.set(bolao.id, qtdParts);

        const usuariosSorteados = embaralhar(usuarios).slice(0, qtdParts);
        usuariosSorteados.forEach((u, idx) => {
            // ~70% vinculados a um usuário, ~30% "avulsos" (só nome)
            const avulso = chance(0.3);
            participantesPayload.push({
                bolao_id: bolao.id,
                user_id: avulso ? null : u.id,
                nome_avulso: avulso ? `${escolher(NOMES)} ${escolher(SOBRENOMES)}` : u.nome,
                pontuacao_no_bolao: 0,
                data_entrada: diasAtras(rnd(5, 200)),
                _ordem: idx,
            });
        });
    }

    await inserirEmLotes(BolaoJogo, vinculos, 'jogos vinculados');
    const participantes = await inserirEmLotes(
        Participante,
        participantesPayload.map(({ _ordem, ...p }) => p),
        'participantes'
    );

    // agrupa participantes por bolão
    const partsPorBolao = new Map();
    participantes.forEach((p) => {
        const lista = partsPorBolao.get(p.bolao_id) ?? [];
        lista.push(p);
        partsPorBolao.set(p.bolao_id, lista);
    });

    // palpites
    const palpitesPayload = [];
    const pontosPorParticipante = new Map();
    const pontosPorUsuario = new Map();

    for (const bolao of boloes) {
        const jogosDoBolao = mapaBolaoJogos.get(bolao.id) ?? [];
        const partes = partsPorBolao.get(bolao.id) ?? [];

        for (const p of partes) {
            for (const j of jogosDoBolao) {
                // 15% dos palpites simplesmente não foram feitos
                if (chance(0.15)) continue;

                const pa = golRealista();
                const pb = golRealista();
                const temResultado = j.gol_a_real !== null && j.gol_a_real !== undefined;
                const pontos = temResultado ? calcularPontos(pa, pb, j.gol_a_real, j.gol_b_real) : 0;

                palpitesPayload.push({
                    bolao_id: bolao.id,
                    participante_id: p.id,
                    jogo_id: j.id,
                    gol_a_palpite: pa,
                    gol_b_palpite: pb,
                    pontos_ganhos: pontos,
                    data_palpite: diasAtras(rnd(1, 250)),
                });

                pontosPorParticipante.set(p.id, (pontosPorParticipante.get(p.id) ?? 0) + pontos);
                if (p.user_id) {
                    pontosPorUsuario.set(p.user_id, (pontosPorUsuario.get(p.user_id) ?? 0) + pontos);
                }
            }
        }
    }
    await inserirEmLotes(Palpite, palpitesPayload, 'palpites');

    // ── 6. CONSOLIDA PONTUAÇÕES ─────────────────────────────
    console.log('\n🧮 Consolidando pontuações');
    const t = await sequelize.transaction();
    try {
        for (const [participanteId, pontos] of pontosPorParticipante) {
            await Participante.update(
                { pontuacao_no_bolao: pontos },
                { where: { id: participanteId }, transaction: t }
            );
        }
        for (const [userId, pontos] of pontosPorUsuario) {
            await User.update(
                { pontuacao_total: pontos },
                { where: { id: userId }, transaction: t }
            );
        }
        await t.commit();
        console.log('   pontuações atualizadas ✓');
    } catch (e) {
        await t.rollback();
        throw e;
    }

    // ── Resumo ──────────────────────────────────────────────
    const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
    console.log(`
╭──────────────────────────────────────────╮
│  ✅ Seed concluído em ${segundos}s
├──────────────────────────────────────────┤
│  Times ............ ${String(times.length).padStart(6)}
│  Usuários ......... ${String(usuarios.length).padStart(6)}
│  Jogos ............ ${String(jogos.length).padStart(6)}
│  Bolões ........... ${String(boloes.length).padStart(6)}
│  Vínculos ......... ${String(vinculos.length).padStart(6)}
│  Participantes .... ${String(participantes.length).padStart(6)}
│  Palpites ......... ${String(palpitesPayload.length).padStart(6)}
╰──────────────────────────────────────────╯

🔑 Login admin:  admin@bolao.com  /  ${CFG.senhaPadrao}
🔑 Login user:   user1@bolao.com  /  ${CFG.senhaPadrao}
`);
}

seed()
    .then(() => sequelize.close())
    .then(() => process.exit(0))
    .catch(async (err) => {
        console.error('\n❌ Erro no seed:', err);
        await sequelize.close().catch(() => {});
        process.exit(1);
    });