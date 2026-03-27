import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StandingRow {
  position:    number;
  player?:     { fullName: string };
  played:      number;
  won:         number;
  drawn:       number;
  lost:        number;
  postponed:   number;
  setsFor:     number;
  setsAgainst: number;
  points:      number;
}

export interface StandingsPdfOptions {
  leagueName: string;
  standings:  StandingRow[];
  stats?: {
    completedMatches:     number;
    expectedTotalMatches: number;
    progressPct:          number;
  } | null;
}

// ─── Palette ─────────────────────────────────────────────────────────────────
type RGB = [number, number, number];

const C = {
  orange:   [249, 115,  22] as RGB,
  dark:     [ 15,  23,  42] as RGB,
  slate700: [ 51,  65,  85] as RGB,
  slate500: [100, 116, 139] as RGB,
  slate200: [226, 232, 240] as RGB,
  slate50:  [248, 250, 252] as RGB,
  white:    [255, 255, 255] as RGB,

  // result colours (text)
  green:    [ 34, 197,  94] as RGB,   // win
  yellow:   [234, 179,   8] as RGB,   // draw
  red:      [239,  68,  68] as RGB,   // loss

  // top-3 row backgrounds
  gold1Bg:   [255, 251, 230] as RGB,  // amber-50
  silver2Bg: [248, 250, 252] as RGB,  // slate-50  (same as alt — border does the work)
  bronze3Bg: [255, 247, 237] as RGB,  // orange-50

  // medal badge fills (drawn as small filled rect in # cell)
  goldFill:   [234, 179,   8] as RGB,
  silverFill: [148, 163, 184] as RGB,
  bronzeFill: [180,  83,   9] as RGB,
} as const;

// ─── Font loader (same Arial bundle used by roundPdf) ────────────────────────
async function loadFonts(doc: jsPDF): Promise<void> {
  const { ARIAL_REGULAR, ARIAL_BOLD } = await import('./pdfFonts');
  doc.addFileToVFS('Arial.ttf',      ARIAL_REGULAR);
  doc.addFileToVFS('Arial-Bold.ttf', ARIAL_BOLD);
  doc.addFont('Arial.ttf',      'Arial', 'normal');
  doc.addFont('Arial-Bold.ttf', 'Arial', 'bold');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function today(): string {
  return new Date().toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function nowFull(): string {
  return new Date().toLocaleString('sr-RS', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Column layout (total = 180 mm for A4 with 15 mm margins each side)
// #   Igrač   M    P    R    G   L+   L-  Bod.
// 10   68     13   13   13   13   13   13   24  → 180
const COL_WIDTHS = [10, 68, 13, 13, 13, 13, 13, 13, 24] as const;

// ─── Main export ─────────────────────────────────────────────────────────────
export async function generateStandingsPDF({
  leagueName,
  standings,
  stats,
}: StandingsPdfOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = 210;
  const M  = 15;
  const CW = PW - M * 2;

  await loadFonts(doc);
  doc.setFont('Arial', 'normal');

  // ── 1. Header bar ───────────────────────────────────────────────────────────
  doc.setFillColor(...C.orange);
  doc.rect(0, 0, PW, 20, 'F');

  doc.setFont('Arial', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.white);
  doc.text('PIKADO', M, 13);

  doc.setFont('Arial', 'normal');
  doc.setFontSize(9);
  doc.text(today(), PW - M, 13, { align: 'right' });

  // ── 2. Title block ──────────────────────────────────────────────────────────
  let y = 30;

  doc.setFont('Arial', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...C.dark);
  doc.text(leagueName, M, y);
  y += 7;

  doc.setFont('Arial', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...C.slate500);
  doc.text('Trenutna tabela', M, y);
  y += 5;

  // Progress info
  if (stats && stats.expectedTotalMatches > 0) {
    const info = `Odigrano: ${stats.completedMatches} / ${stats.expectedTotalMatches} mečeva  (${stats.progressPct}%)`;
    doc.setFontSize(8.5);
    doc.text(info, M, y);
    y += 4;
  }

  // Accent line
  doc.setDrawColor(...C.orange);
  doc.setLineWidth(0.6);
  doc.line(M, y, PW - M, y);
  y += 5;

  // ── 3. Empty state ──────────────────────────────────────────────────────────
  if (standings.length === 0) {
    doc.setFont('Arial', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...C.slate500);
    doc.text('Nema podataka — dodajte igrače i generišite raspored.', M, y + 10);
    finaliseFooter(doc, PW, M);
    savePdf(doc, leagueName);
    return;
  }

  // ── 4. Standings table ──────────────────────────────────────────────────────
  const rows = standings.map((s) => [
    String(s.position),
    s.player?.fullName ?? '—',
    String(s.played),
    String(s.won),
    String(s.drawn),
    String(s.lost),
    String(s.setsFor),
    String(s.setsAgainst),
    String(s.points),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Igrač', 'M', 'P', 'R', 'G', 'L+', 'L-', 'Bod.']],
    body: rows,
    margin: { left: M, right: M },
    tableWidth: CW,

    styles: {
      font:        'Arial',
      fontSize:    9.5,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      textColor:   C.dark,
      lineColor:   C.slate200,
      lineWidth:   0.2,
      overflow:    'ellipsize',
    },

    headStyles: {
      font:       'Arial',
      fillColor:  C.dark,
      textColor:  C.white,
      fontStyle:  'bold',
      fontSize:   8,
      halign:     'center',
    },

    columnStyles: {
      0: { cellWidth: COL_WIDTHS[0], halign: 'center',
           cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } },
      1: { cellWidth: COL_WIDTHS[1], halign: 'left'   },
      2: { cellWidth: COL_WIDTHS[2], halign: 'center' },
      3: { cellWidth: COL_WIDTHS[3], halign: 'center' },
      4: { cellWidth: COL_WIDTHS[4], halign: 'center' },
      5: { cellWidth: COL_WIDTHS[5], halign: 'center' },
      6: { cellWidth: COL_WIDTHS[6], halign: 'center' },
      7: { cellWidth: COL_WIDTHS[7], halign: 'center' },
      8: { cellWidth: COL_WIDTHS[8], halign: 'center' },
    },

    // Per-cell dynamic styling
    didParseCell(data) {
      if (data.section !== 'body') return;
      const rowIdx = data.row.index;
      const col    = data.column.index;
      const s      = standings[rowIdx];
      if (!s) return;

      // ── Row background for top-3
      if (rowIdx === 0) {
        data.cell.styles.fillColor = C.gold1Bg;
      } else if (rowIdx === 1) {
        data.cell.styles.fillColor = C.silver2Bg;
      } else if (rowIdx === 2) {
        data.cell.styles.fillColor = C.bronze3Bg;
      } else if (rowIdx % 2 === 1) {
        data.cell.styles.fillColor = C.slate50;
      }

      // ── Column-specific colours
      switch (col) {
        case 0: // # — bold for top-3
          if (rowIdx <= 2) data.cell.styles.fontStyle = 'bold';
          break;
        case 1: // player name — bold for top-3
          if (rowIdx <= 2) data.cell.styles.fontStyle = 'bold';
          break;
        case 3: // wins — green
          data.cell.styles.textColor = C.green;
          data.cell.styles.fontStyle = 'bold';
          break;
        case 4: // draws — yellow
          data.cell.styles.textColor = C.yellow;
          break;
        case 5: // losses — red
          data.cell.styles.textColor = C.red;
          break;
        case 8: // points — orange bold, larger
          data.cell.styles.textColor   = C.orange;
          data.cell.styles.fontStyle   = 'bold';
          data.cell.styles.fontSize    = 11;
          break;
      }
    },

    // Draw medal dot in # cell for top-3
    didDrawCell(data) {
      if (data.section !== 'body') return;
      if (data.column.index !== 0) return;
      const rowIdx = data.row.index;
      if (rowIdx > 2) return;

      const fill: RGB =
        rowIdx === 0 ? C.goldFill :
        rowIdx === 1 ? C.silverFill : C.bronzeFill;

      const dotR  = 2.2;
      const cx    = data.cell.x + data.cell.width / 2;
      const cy    = data.cell.y + data.cell.height / 2;

      doc.setFillColor(...fill);
      doc.circle(cx, cy, dotR, 'F');
      doc.setFont('Arial', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...C.white);
      doc.text(String(rowIdx + 1), cx, cy + 0.7 * 7 / 4, { align: 'center' });
    },
  });

  // ── 5. Legend strip ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableBottom: number = (doc as any).lastAutoTable.finalY + 6;

  const legendItems = [
    { fill: C.goldFill,   label: '1. mesto'  },
    { fill: C.silverFill, label: '2. mesto'  },
    { fill: C.bronzeFill, label: '3. mesto'  },
  ];

  doc.setFont('Arial', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.slate500);

  let lx = M;
  for (const item of legendItems) {
    doc.setFillColor(...item.fill);
    doc.setDrawColor(...C.slate200);
    doc.setLineWidth(0.2);
    doc.circle(lx + 1.8, tableBottom + 2, 1.8, 'F');
    doc.text(item.label, lx + 5.5, tableBottom + 2.8);
    lx += 32;
  }

  // column key
  const keys = [
    'M – Mečevi',
    'P – Pobeda',
    'R – Remi',
    'G – Gubitak',
    'L – Lopte (za/protiv)',
    'Bod. – Bodovi',
  ];
  doc.setFontSize(7.5);
  doc.setTextColor(...C.slate500);
  const keyY = tableBottom + 10;
  keys.forEach((k, i) => {
    doc.text(k, M + (i % 3) * 62, keyY + Math.floor(i / 3) * 5);
  });

  // ── 6. Footer ───────────────────────────────────────────────────────────────
  finaliseFooter(doc, PW, M);
  savePdf(doc, leagueName);
}

// ─── Shared helpers ──────────────────────────────────────────────────────────
function finaliseFooter(doc: jsPDF, PW: number, M: number): void {
  const PH = 297;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(M, PH - 14, PW - M, PH - 14);

  doc.setFont('Arial', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Pikado App', M, PH - 8);
  doc.text(nowFull(), PW - M, PH - 8, { align: 'right' });
}

function savePdf(doc: jsPDF, leagueName: string): void {
  const safe = leagueName
    .replace(/[^a-zA-Z0-9\-_ ćčšžđČĆŠŽĐ]/g, '')
    .trim().replace(/\s+/g, '_').slice(0, 30);
  doc.save(`${safe}_Tabela.pdf`);
}
