import ExcelJS from 'exceljs';
import pdfmakeModule from 'pdfmake';
import { Bolao, Jogo, Time, Participante, Palpite } from '../models/index.js';
import { PONTUACAO_EXATA, PONTUACAO_PARCIAL } from '../config/game.js';

/*
 * Gera a "planilha do bolão" em Excel (exceljs) e PDF (pdfmake):
 *   - Coluna esquerda  = jogos (nome dos times: "Time A x Time B")
 *   - Linha de cima     = nomes dos jogadores (participantes)
 *   - Células           = palpite do jogador, coloridas por acerto
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
      return res.status(500).json({ message: 'Erro ao gerar o Excel.', error: error.message });
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

const celulaHeader = (texto) => ({
  text: texto,
  bold: true,
  color: CORES.branco.hex,
  fillColor: CORES.header.hex,
  alignment: 'center',
  margin: [2, 4, 2, 4],
});

async function exportPdf(req, res) {
  try {
    const { id } = req.params;
    const dados = await carregarDados(id);
    if (!dados) return res.status(404).json({ message: 'Bolão não encontrado.' });

    const { bolao, participantes, jogos, mapa } = dados;

    // ---- Cabeçalho (linha de cima = jogadores) ----
    const body = [[
      celulaHeader('Jogo'),
      celulaHeader('Resultado'),
      ...participantes.map((p) => celulaHeader(nomeParticipante(p))),
    ]];

    // ---- Linhas dos jogos (coluna esquerda = times) ----
    for (const jogo of jogos) {
      const row = [
        {
          text: labelJogo(jogo),
          bold: true,
          color: CORES.branco.hex,
          fillColor: CORES.timeCol.hex,
          alignment: 'left',
          margin: [3, 3, 3, 3],
        },
        {
          text: resultadoReal(jogo),
          bold: true,
          fillColor: CORES.resultado.hex,
          alignment: 'center',
          margin: [3, 3, 3, 3],
        },
      ];
      for (const p of participantes) {
        const palpite = mapa[`${p.id}_${jogo.id}`];
        row.push({
          text: textoPalpite(palpite),
          alignment: 'center',
          fillColor: CORES[categoriaCelula(palpite, jogo)].hex,
          margin: [3, 3, 3, 3],
        });
      }
      body.push(row);
    }

    // ---- Linha de totais ----
    const totalRow = [
      {
        text: 'TOTAL',
        bold: true,
        color: CORES.branco.hex,
        fillColor: CORES.total.hex,
        alignment: 'left',
        margin: [3, 3, 3, 3],
      },
      { text: '', fillColor: CORES.total.hex },
    ];
    for (const p of participantes) {
      totalRow.push({
        text: String(p.pontuacao_no_bolao || 0),
        bold: true,
        color: CORES.branco.hex,
        fillColor: CORES.total.hex,
        alignment: 'center',
        margin: [3, 3, 3, 3],
      });
    }
    body.push(totalRow);

    const docDefinition = {
      pageOrientation: 'landscape',
      pageSize: 'A4',
      pageMargins: [20, 55, 20, 40],
      defaultStyle: { font: 'Helvetica', fontSize: 9 },
      header: { text: bolao.nome || 'Bolão', style: 'titulo', margin: [20, 20, 20, 0] },
      content: [
        {
          table: {
            headerRows: 1,
            // 1ª e 2ª colunas automáticas; jogadores dividem o resto igualmente
            widths: ['auto', 'auto', ...participantes.map(() => '*')],
            body,
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => CORES.borda.hex,
            vLineColor: () => CORES.borda.hex,
          },
        },
        {
          text:
            'Verde = placar exato · Amarelo = acertou o vencedor · Vermelho = errou · Cinza = sem palpite',
          style: 'legenda',
          margin: [0, 10, 0, 0],
        },
      ],
      styles: {
        titulo: { fontSize: 16, bold: true, color: '#1D4ED8' },
        legenda: { fontSize: 8, italics: true, color: '#6B7280' },
      },
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bolao-${id}.pdf"`);

    const pdfDoc = pdfMake.createPdf(docDefinition);
    const pdfStream = await pdfDoc.getStream();
    pdfStream.pipe(res);
    pdfStream.end();
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Erro ao gerar o PDF.', error: error.message });
    }
    res.end();
  }
}

export { exportExcel, exportPdf };