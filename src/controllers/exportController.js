import ExcelJS from 'exceljs';
import pdfmakeModule from 'pdfmake';
import { Bolao, Jogo, Time, Participante, Palpite } from '../models/index.js';
import { PONTUACAO_EXATA, PONTUACAO_PARCIAL } from '../config/game.js';

/*
 * Gera a "planilha do bolão" em Excel (exceljs) e PDF (pdfmake):
 *   - Coluna esquerda  = jogos (nome dos times: "Time A x Time B")
 *   - Linha de cima     = nomes dos jogadores (participantes)
 *   - Células           = palpite do jogador, coloridas por acerto
 *
 * PDF tem 3 formatos (?formato=):
 *   - unico (padrão) : uma página só, do tamanho exato da tabela
 *   - a4             : blocos de participantes em folhas A4 paisagem
 *   - lista          : relatório vertical (ranking + palpites por jogo)
 */

// ---- Paleta de cores (Excel usa ARGB "FFrrggbb"; pdfmake usa "#rrggbb") ----
const CORES = {
  header:    { argb: 'FF2563EB', hex: '#2563EB' }, // azul  (topo = jogadores)
  timeCol:   { argb: 'FF1E293B', hex: '#1E293B' }, // escuro (esquerda = times)
  resultado: { argb: 'FFFDE68A', hex: '#FDE68A' }, // âmbar  (placar real)
  exato:     { argb: 'FFBBF7D0', hex: '#BBF7D0' }, // verde
  vencedor:  { argb: 'FFFEF08A', hex: '#FEF08A' }, // amarelo
  errado:    { argb: 'FFFECACA', hex: '#FECACA' }, // vermelho
  pendente:  { argb: 'FFDBEAFE', hex: '#DBEAFE' }, // azul claro (jogo não finalizado)
  vazio:     { argb: 'FFF3F4F6', hex: '#F3F4F6' }, // cinza (sem palpite)
  total:     { argb: 'FF1D4ED8', hex: '#1D4ED8' }, // azul forte (linha de totais)
  branco:    { argb: 'FFFFFFFF', hex: '#FFFFFF' },
  borda:     { argb: 'FFD1D5DB', hex: '#D1D5DB' },
};

// ---------- Helpers de dados ----------
async function carregarDados(bolaoId) {
  const bolao = await Bolao.findByPk(bolaoId, {
    include: [{
      model: Jogo,
      as: 'jogos',
      include: [
        { model: Time, as: 'timeA' },
        { model: Time, as: 'timeB' },
      ],
    }],
    order: [[{ model: Jogo, as: 'jogos' }, 'data_jogo', 'ASC']],
  });

  if (!bolao) return null;

  const participantes = await Participante.findAll({
    where: { bolao_id: bolaoId },
    order: [['pontuacao_no_bolao', 'DESC']],
  });

  const palpites = await Palpite.findAll({ where: { bolao_id: bolaoId } });

  // Mapa de acesso rápido: "participanteId_jogoId" -> palpite
  const mapa = {};
  for (const p of palpites) mapa[`${p.participante_id}_${p.jogo_id}`] = p;

  return { bolao, participantes, jogos: bolao.jogos || [], mapa };
}

const nomeParticipante = (p) => p.nome_avulso || 'Anônimo';
const labelJogo = (j) => `${j.timeA ? j.timeA.nome : 'Time A'} x ${j.timeB ? j.timeB.nome : 'Time B'}`;
const resultadoReal = (j) =>
  j.gol_a_real != null && j.gol_b_real != null ? `${j.gol_a_real} x ${j.gol_b_real}` : '—';
const textoPalpite = (p) => (p ? `${p.gol_a_palpite} x ${p.gol_b_palpite}` : '—');

// Retorna a chave de cor da célula do palpite
function categoriaCelula(palpite, jogo) {
  if (!palpite) return 'vazio';
  const finalizado =
    jogo.status === 'FINALIZADO' || (jogo.gol_a_real != null && jogo.gol_b_real != null);
  if (!finalizado) return 'pendente';
  const pts = palpite.pontos_ganhos || 0;
  if (pts >= PONTUACAO_EXATA) return 'exato';
  if (pts >= PONTUACAO_PARCIAL) return 'vencedor';
  return 'errado';
}

// ==========================================================
//  EXCEL (exceljs)
// ==========================================================
function bordaFina() {
  const c = { style: 'thin', color: { argb: CORES.borda.argb } };
  return { top: c, left: c, bottom: c, right: c };
}

async function exportExcel(req, res) {
  try {
    const { id } = req.params;
    const dados = await carregarDados(id);
    if (!dados) return res.status(404).json({ message: 'Bolão não encontrado.' });

    const { bolao, participantes, jogos, mapa } = dados;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Bolão';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet((bolao.nome || 'Bolão').substring(0, 28), {
      // congela a coluna dos times + resultado e a linha de cabeçalho
      views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }],
    });

    // ---- Cabeçalho (linha de cima = jogadores) ----
    const headerRow = sheet.addRow(['Jogo', 'Resultado', ...participantes.map(nomeParticipante)]);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CORES.header.argb } };
      cell.font = { bold: true, color: { argb: CORES.branco.argb } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = bordaFina();
    });

    // ---- Linhas dos jogos (coluna esquerda = times) ----
    for (const jogo of jogos) {
      const linha = [labelJogo(jogo), resultadoReal(jogo)];
      for (const p of participantes) linha.push(textoPalpite(mapa[`${p.id}_${jogo.id}`]));

      const row = sheet.addRow(linha);
      row.height = 20;
      row.eachCell((cell, col) => {
        cell.border = bordaFina();
        cell.alignment = { horizontal: 'center', vertical: 'middle' };

        if (col === 1) {
          // coluna dos times
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CORES.timeCol.argb } };
          cell.font = { bold: true, color: { argb: CORES.branco.argb } };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (col === 2) {
          // placar real
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CORES.resultado.argb } };
          cell.font = { bold: true };
        } else {
          // palpite do participante
          const p = participantes[col - 3];
          const cat = categoriaCelula(mapa[`${p.id}_${jogo.id}`], jogo);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CORES[cat].argb } };
        }
      });
    }

    // ---- Linha de totais ----
    const totalRow = sheet.addRow([
      'TOTAL DE PONTOS',
      '',
      ...participantes.map((p) => p.pontuacao_no_bolao || 0),
    ]);
    totalRow.height = 22;
    totalRow.eachCell((cell, col) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CORES.total.argb } };
      cell.font = { bold: true, color: { argb: CORES.branco.argb } };
      cell.alignment = { horizontal: col === 1 ? 'left' : 'center', vertical: 'middle' };
      cell.border = bordaFina();
    });

    // ---- Larguras ----
    sheet.getColumn(1).width = 26; // times
    sheet.getColumn(2).width = 12; // resultado
    participantes.forEach((_, i) => (sheet.getColumn(3 + i).width = 14));

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="bolao-${id}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Erro ao gerar o Excel.'});
    }
    res.end();
  }
}

// ==========================================================
//  PDF (pdfmake)
// ==========================================================
// Usa as fontes padrão do PDF (Helvetica) — não precisa de arquivos .ttf
const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};
const pdfMake = pdfmakeModule.default || pdfmakeModule;
pdfMake.setFonts(fonts);

// ---- Métricas de layout (em pontos; 1pt = 1/72 pol) ----
const FS = 9;                 // fonte da tabela
const PAD_H = 8;              // margem horizontal da célula (3 + 3) + folga
const BORDA = 0.5;            // espessura das linhas da tabela
const ALTURA_LINHA = 20;      // 9pt * 1.25 + margens verticais (4 + 4)
const ALTURA_HEADER = 26;
const MARGEM = 20;
const ESPACO_TITULO = 34;
const ESPACO_LEGENDA = 34;
const FOLGA = 24;             // segurança contra arredondamento do pdfmake

/** Largura aproximada de um texto em Helvetica (0,50em normal / 0,55em bold) */
const larguraTexto = (txt, fs = FS, bold = false) =>
  String(txt ?? '').length * fs * (bold ? 0.55 : 0.5) + PAD_H;

const limitar = (valor, min, max) => Math.max(min, Math.min(max, valor));

const celulaHeader = (texto) => ({
  text: texto,
  bold: true,
  color: CORES.branco.hex,
  fillColor: CORES.header.hex,
  alignment: 'center',
  noWrap: true,
  margin: [3, 5, 3, 5],
});

const celulaJogo = (jogo) => ({
  text: labelJogo(jogo),
  bold: true,
  color: CORES.branco.hex,
  fillColor: CORES.timeCol.hex,
  alignment: 'left',
  noWrap: true,
  margin: [3, 4, 3, 4],
});

const celulaResultado = (jogo) => ({
  text: resultadoReal(jogo),
  bold: true,
  fillColor: CORES.resultado.hex,
  alignment: 'center',
  noWrap: true,
  margin: [3, 4, 3, 4],
});

const celulaPalpite = (palpite, jogo) => ({
  text: textoPalpite(palpite),
  alignment: 'center',
  fillColor: CORES[categoriaCelula(palpite, jogo)].hex,
  noWrap: true,
  margin: [3, 4, 3, 4],
});

const celulaTotal = (texto, alinhamento = 'center') => ({
  text: String(texto),
  bold: true,
  color: CORES.branco.hex,
  fillColor: CORES.total.hex,
  alignment: alinhamento,
  noWrap: true,
  margin: [3, 4, 3, 4],
});

const LAYOUT_BORDA = {
  hLineWidth: () => BORDA,
  vLineWidth: () => BORDA,
  hLineColor: () => CORES.borda.hex,
  vLineColor: () => CORES.borda.hex,
  // ZERA o padding padrão (4pt de cada lado). Sem isso, cada coluna ocupa
  // 8pt a mais do que o declarado em `widths` e o pdfmake CORTA o excesso.
  paddingLeft: () => 0,
  paddingRight: () => 0,
  paddingTop: () => 0,
  paddingBottom: () => 0,
};

/** Largura real ocupada pela tabela, já contando as linhas verticais */
const larguraTotalTabela = (widths) =>
  widths.reduce((a, b) => a + b, 0) + (widths.length + 1) * BORDA;

const LEGENDA =
  'Verde = placar exato · Amarelo = acertou o vencedor · Vermelho = errou · Azul = jogo pendente · Cinza = sem palpite';

/** Calcula a largura ideal de cada coluna a partir do conteúdo real */
function calcularLarguras(jogos, participantes) {
  const colJogo = limitar(
    Math.max(60, ...jogos.map((j) => larguraTexto(labelJogo(j), FS, true))),
    110,
    240,
  );
  const colResultado = limitar(larguraTexto('Resultado', FS, true), 52, 70);
  const colsParticipantes = participantes.map((p) =>
    limitar(larguraTexto(nomeParticipante(p), FS, true), 40, 90),
  );
  return { colJogo, colResultado, colsParticipantes };
}

/** Monta o corpo da matriz para um subconjunto de participantes */
function montarCorpo(jogos, participantes, mapa) {
  const body = [[
    celulaHeader('Jogo'),
    celulaHeader('Resultado'),
    ...participantes.map((p) => celulaHeader(nomeParticipante(p))),
  ]];

  for (const jogo of jogos) {
    body.push([
      celulaJogo(jogo),
      celulaResultado(jogo),
      ...participantes.map((p) => celulaPalpite(mapa[`${p.id}_${jogo.id}`], jogo)),
    ]);
  }

  body.push([
    celulaTotal('TOTAL', 'left'),
    { text: '', fillColor: CORES.total.hex, margin: [3, 4, 3, 4] },
    ...participantes.map((p) => celulaTotal(p.pontuacao_no_bolao || 0)),
  ]);

  return body;
}

// ----------------------------------------------------------
//  Formato "unico": uma página só, do tamanho exato da planilha
// ----------------------------------------------------------
function docPaginaUnica({ bolao, jogos, participantes, mapa }) {
  const { colJogo, colResultado, colsParticipantes } = calcularLarguras(jogos, participantes);
  const widths = [colJogo, colResultado, ...colsParticipantes];

  const totalLinhas = jogos.length + 1; // jogos + linha de TOTAL
  const larguraTabela = larguraTotalTabela(widths);
  const alturaTabela =
    ALTURA_HEADER + totalLinhas * ALTURA_LINHA + (totalLinhas + 2) * BORDA;

  const pageWidth = larguraTabela + MARGEM * 2 + FOLGA;
  const pageHeight =
    alturaTabela + MARGEM * 2 + ESPACO_TITULO + ESPACO_LEGENDA + FOLGA;

  // limite físico do formato PDF: 200 polegadas = 14400pt
  if (pageWidth > 14400 || pageHeight > 14400) {
    return docA4({ bolao, jogos, participantes, mapa });
  }

  return {
    pageSize: { width: pageWidth, height: pageHeight },
    pageMargins: [MARGEM, MARGEM, MARGEM, MARGEM],
    defaultStyle: { font: 'Helvetica', fontSize: FS },
    content: [
      { text: bolao.nome || 'Bolão', style: 'titulo', margin: [0, 0, 0, 8] },
      {
        table: {
          headerRows: 1,
          widths,
          heights: (i) => (i === 0 ? ALTURA_HEADER : ALTURA_LINHA),
          body: montarCorpo(jogos, participantes, mapa),
        },
        layout: LAYOUT_BORDA,
      },
      { text: LEGENDA, style: 'legenda', margin: [0, 8, 0, 0] },
    ],
    styles: {
      titulo: { fontSize: 15, bold: true, color: '#1D4ED8' },
      legenda: { fontSize: 7.5, italics: true, color: '#6B7280' },
    },
  };
}

// ----------------------------------------------------------
//  Formato "a4": blocos de participantes, repetindo a coluna dos jogos
// ----------------------------------------------------------
function docA4({ bolao, jogos, participantes, mapa }) {
  const { colJogo, colResultado, colsParticipantes } = calcularLarguras(jogos, participantes);

  // A4 paisagem = 842pt; desconta margens, bordas e as 2 colunas fixas
  const disponivel =
    842 - MARGEM * 2 - colJogo - colResultado - (participantes.length + 3) * BORDA;

  // quebra os participantes em blocos que caibam na largura da página
  const blocos = [];
  let atual = [];
  let usado = 0;
  participantes.forEach((p, i) => {
    const w = colsParticipantes[i];
    if (atual.length > 0 && usado + w > disponivel) {
      blocos.push(atual);
      atual = [];
      usado = 0;
    }
    atual.push({ p, w });
    usado += w;
  });
  if (atual.length) blocos.push(atual);

  const content = [];
  blocos.forEach((bloco, idx) => {
    content.push({
      text: `${bolao.nome || 'Bolão'}${blocos.length > 1 ? ` — parte ${idx + 1}/${blocos.length}` : ''}`,
      style: 'titulo',
      margin: [0, 0, 0, 8],
      pageBreak: idx > 0 ? 'before' : undefined,
    });
    content.push({
      table: {
        headerRows: 1,
        widths: [colJogo, colResultado, ...bloco.map((b) => b.w)],
        body: montarCorpo(jogos, bloco.map((b) => b.p), mapa),
      },
      layout: LAYOUT_BORDA,
    });
  });
  content.push({ text: LEGENDA, style: 'legenda', margin: [0, 8, 0, 0] });

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [MARGEM, MARGEM, MARGEM, 30],
    defaultStyle: { font: 'Helvetica', fontSize: FS },
    content,
    footer: (pagina, total) => ({
      text: `${pagina} / ${total}`,
      alignment: 'center',
      fontSize: 8,
      color: '#9CA3AF',
      margin: [0, 8, 0, 0],
    }),
    styles: {
      titulo: { fontSize: 15, bold: true, color: '#1D4ED8' },
      legenda: { fontSize: 7.5, italics: true, color: '#6B7280' },
    },
  };
}

// ----------------------------------------------------------
//  Formato "lista": relatório vertical, pensado pra ler no celular
// ----------------------------------------------------------
function docLista({ bolao, jogos, participantes, mapa }) {
  const content = [
    { text: bolao.nome || 'Bolão', style: 'titulo' },
    {
      text: `${jogos.length} jogo(s) · ${participantes.length} participante(s)`,
      style: 'legenda',
      margin: [0, 2, 0, 12],
    },

    { text: 'Classificação', style: 'secao' },
    {
      table: {
        headerRows: 1,
        widths: [30, '*', 60],
        body: [
          [celulaHeader('#'), celulaHeader('Jogador'), celulaHeader('Pontos')],
          ...participantes.map((p, i) => [
            { text: String(i + 1), alignment: 'center', margin: [3, 4, 3, 4] },
            { text: nomeParticipante(p), bold: i < 3, margin: [3, 4, 3, 4] },
            {
              text: String(p.pontuacao_no_bolao || 0),
              bold: true,
              alignment: 'center',
              margin: [3, 4, 3, 4],
            },
          ]),
        ],
      },
      layout: LAYOUT_BORDA,
      margin: [0, 0, 0, 16],
    },

    { text: 'Palpites por jogo', style: 'secao' },
  ];

  for (const jogo of jogos) {
    const data = jogo.data_jogo
      ? new Date(jogo.data_jogo).toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : 'Data a definir';

    content.push({
      unbreakable: true,
      margin: [0, 0, 0, 10],
      stack: [
        {
          table: {
            widths: ['*', 'auto'],
            body: [[
              {
                text: labelJogo(jogo),
                bold: true,
                color: CORES.branco.hex,
                fillColor: CORES.timeCol.hex,
                margin: [5, 4, 5, 4],
              },
              {
                text: resultadoReal(jogo),
                bold: true,
                fillColor: CORES.resultado.hex,
                alignment: 'center',
                margin: [8, 4, 8, 4],
              },
            ]],
          },
          layout: LAYOUT_BORDA,
        },
        { text: data, style: 'legenda', margin: [2, 2, 0, 4] },
        {
          table: {
            widths: ['*', 60],
            body: participantes.map((p) => {
              const palpite = mapa[`${p.id}_${jogo.id}`];
              return [
                { text: nomeParticipante(p), margin: [3, 3, 3, 3] },
                {
                  text: textoPalpite(palpite),
                  alignment: 'center',
                  bold: true,
                  fillColor: CORES[categoriaCelula(palpite, jogo)].hex,
                  margin: [3, 3, 3, 3],
                },
              ];
            }),
          },
          layout: LAYOUT_BORDA,
        },
      ],
    });
  }

  content.push({ text: LEGENDA, style: 'legenda', margin: [0, 10, 0, 0] });

  return {
    pageSize: 'A4',
    pageMargins: [MARGEM, MARGEM, MARGEM, 30],
    defaultStyle: { font: 'Helvetica', fontSize: FS },
    content,
    footer: (pagina, total) => ({
      text: `${pagina} / ${total}`,
      alignment: 'center',
      fontSize: 8,
      color: '#9CA3AF',
      margin: [0, 8, 0, 0],
    }),
    styles: {
      titulo: { fontSize: 17, bold: true, color: '#1D4ED8' },
      secao: { fontSize: 12, bold: true, color: '#1E293B', margin: [0, 0, 0, 6] },
      legenda: { fontSize: 7.5, italics: true, color: '#6B7280' },
    },
  };
}

const GERADORES = { unico: docPaginaUnica, a4: docA4, lista: docLista };

async function exportPdf(req, res) {
  try {
    const { id } = req.params;
    const formato = GERADORES[req.query.formato] ? req.query.formato : 'unico';

    const dados = await carregarDados(id);
    if (!dados) return res.status(404).json({ message: 'Bolão não encontrado.' });
    if (!dados.jogos.length || !dados.participantes.length) {
      return res
        .status(400)
        .json({ message: 'O bolão precisa ter ao menos um jogo e um participante.' });
    }

    const docDefinition = GERADORES[formato](dados);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bolao-${id}-${formato}.pdf"`);

    const pdfDoc = pdfMake.createPdf(docDefinition);
    const pdfStream = await pdfDoc.getStream();
    pdfStream.pipe(res);
    pdfStream.end();
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Erro ao gerar o PDF.' });
    }
    res.end();
  }
}

export { exportExcel, exportPdf };