import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PdfMatch {
  id: string;
  homePlayer?: { fullName: string };
  awayPlayer?:  { fullName: string };
  homeSets:  number;
  awaySets:  number;
  status:    string;
  isWalkover?: boolean;
  scheduledDate?: string | null;
}

export interface RoundPdfOptions {
  leagueName:  string;
  roundNumber: number;
  matches:     PdfMatch[];
}

// ─── Font loader ──────────────────────────────────────────────────────────────
// Arial is pre-encoded in pdfFonts.ts (run scripts/encode-fonts.mjs to
// regenerate). Loaded via dynamic import so the 2.6 MB font data is only
// fetched when the user actually clicks "Download PDF", not on page load.
async function loadFonts(doc: jsPDF): Promise<void> {
  const { ARIAL_REGULAR, ARIAL_BOLD } = await import('./pdfFonts');
  doc.addFileToVFS('Arial.ttf',      ARIAL_REGULAR);
  doc.addFileToVFS('Arial-Bold.ttf', ARIAL_BOLD);
  doc.addFont('Arial.ttf',      'Arial', 'normal');
  doc.addFont('Arial-Bold.ttf', 'Arial', 'bold');
}

// ─── Palette ─────────────────────────────────────────────────────────────────
type RGB = [number, number, number];

const C = {
  orange:    [249, 115,  22] as RGB,
  dark:      [ 15,  23,  42] as RGB,
  slate700:  [ 51,  65,  85] as RGB,
  slate500:  [100, 116, 139] as RGB,
  slate200:  [226, 232, 240] as RGB,
  slate50:   [248, 250, 252] as RGB,
  white:     [255, 255, 255] as RGB,

  winBg:     [220, 252, 231] as RGB,  // green-100
  winText:   [ 22, 101,  52] as RGB,  // green-800
  lossBg:    [254, 226, 226] as RGB,  // red-100
  lossText:  [153,  27,  27] as RGB,  // red-800
  drawBg:    [254, 249, 195] as RGB,  // yellow-100
  drawText:  [113,  63,  18] as RGB,  // yellow-900
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(iso?: string | null): string {
  if (!iso) return new Date().toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return new Date(iso).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtScore(m: PdfMatch): string {
  if (m.status !== 'completed') return '—';
  const wo = m.isWalkover ? ' WO' : '';
  return `${m.homeSets} : ${m.awaySets}${wo}`;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function generateRoundPDF({ leagueName, roundNumber, matches }: RoundPdfOptions): Promise<void> {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW   = 210;   // page width  (A4)
  const M    = 15;    // left/right margin
  const CW   = PW - M * 2;  // content width = 180mm

  await loadFonts(doc);
  doc.setFont('Arial', 'normal');

  // Date: use first available scheduled date from the round, else today
  const roundDate = matches.find(m => m.scheduledDate)?.scheduledDate ?? null;

  // ── 1. Header bar ───────────────────────────────────────────────────────────
  doc.setFillColor(...C.orange);
  doc.rect(0, 0, PW, 20, 'F');

  doc.setFont('Arial', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.white);
  doc.text('PIKADO', M, 13);

  doc.setFont('Arial', 'normal');
  doc.setFontSize(9);
  doc.text(fmtDate(roundDate), PW - M, 13, { align: 'right' });

  // ── 2. League name + round label ────────────────────────────────────────────
  let y = 30;

  doc.setFont('Arial', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...C.dark);
  doc.text(leagueName, M, y);
  y += 7;

  doc.setFont('Arial', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...C.slate500);
  doc.text(`Ligaški Dan  ${roundNumber}`, M, y);
  y += 5;

  // Accent line under heading
  doc.setDrawColor(...C.orange);
  doc.setLineWidth(0.6);
  doc.line(M, y, PW - M, y);
  y += 5;

  // ── 3. Match table ───────────────────────────────────────────────────────────
  const completed = matches.filter(m => m.status === 'completed');
  const hasAny    = matches.length > 0;

  if (!hasAny) {
    doc.setFont('Arial', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...C.slate500);
    doc.text('Nema mečeva za ovaj ligaški dan.', M, y + 10);
  } else {
    const rows = matches.map((m, i) => [
      String(i + 1),
      m.homePlayer?.fullName ?? '—',
      fmtScore(m),
      m.awayPlayer?.fullName  ?? '—',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Domaćin', 'Rezultat', 'Gost']],
      body: rows,
      margin: { left: M, right: M },
      tableWidth: CW,

      // ── Global cell style
      styles: {
        font:        'Arial',
        fontSize:    10,
        cellPadding: { top: 4.5, bottom: 4.5, left: 5, right: 5 },
        textColor:   C.dark,
        lineColor:   C.slate200,
        lineWidth:   0.25,
        overflow:    'ellipsize',
      },

      // ── Header row
      headStyles: {
        font:       'Arial',
        fillColor:  C.dark,
        textColor:  C.white,
        fontStyle:  'bold',
        fontSize:   9,
        halign:     'center',
      },

      // ── Column widths + alignment
      columnStyles: {
        0: { cellWidth: 12,    halign: 'center', cellPadding: { top: 4.5, bottom: 4.5, left: 2, right: 2 } },
        1: { cellWidth: 66,    halign: 'left'   },
        2: { cellWidth: 28,    halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 66,    halign: 'right'  },
      },

      // ── Alternate row background
      alternateRowStyles: { fillColor: C.slate50 },

      // ── Per-cell dynamic styles (win / draw / loss coloring)
      didParseCell(data) {
        if (data.section !== 'body') return;
        const m = matches[data.row.index];
        if (!m || m.status !== 'completed') return;

        const homeWon = m.homeSets > m.awaySets;
        const awayWon = m.awaySets > m.homeSets;
        const isDraw  = m.homeSets === m.awaySets;

        switch (data.column.index) {
          case 1: // home player
            if (homeWon) {
              data.cell.styles.fillColor = C.winBg;
              data.cell.styles.textColor = C.winText;
              data.cell.styles.fontStyle = 'bold';
            } else if (awayWon) {
              data.cell.styles.fillColor = C.lossBg;
              data.cell.styles.textColor = C.lossText;
            } else if (isDraw) {
              data.cell.styles.fillColor = C.drawBg;
              data.cell.styles.textColor = C.drawText;
            }
            break;

          case 2: // score
            if (homeWon || awayWon) {
              data.cell.styles.textColor = C.dark;
            } else if (isDraw) {
              data.cell.styles.textColor = C.drawText;
            }
            break;

          case 3: // away player
            if (awayWon) {
              data.cell.styles.fillColor = C.winBg;
              data.cell.styles.textColor = C.winText;
              data.cell.styles.fontStyle = 'bold';
            } else if (homeWon) {
              data.cell.styles.fillColor = C.lossBg;
              data.cell.styles.textColor = C.lossText;
            } else if (isDraw) {
              data.cell.styles.fillColor = C.drawBg;
              data.cell.styles.textColor = C.drawText;
            }
            break;
        }
      },
    });
  }

  // ── 4. Summary bar ───────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableEndY: number = hasAny ? (doc as any).lastAutoTable.finalY + 6 : y + 20;

  const wins  = completed.filter(m => m.homeSets !== m.awaySets).length;
  const draws = completed.filter(m => m.status === 'completed' && m.homeSets === m.awaySets).length;
  const wos   = completed.filter(m => m.isWalkover).length;
  const pending = matches.length - completed.length;

  // Summary pill
  doc.setFillColor(...C.slate50);
  doc.setDrawColor(...C.orange);
  doc.setLineWidth(0.4);
  doc.roundedRect(M, tableEndY, CW, 13, 2, 2, 'FD');

  doc.setFont('Arial', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.slate500);

  const parts: string[] = [
    `Odigrano: ${completed.length} / ${matches.length}`,
    `Pobede: ${wins}`,
    `Remija: ${draws}`,
    ...(pending > 0 ? [`Čeka: ${pending}`] : []),
    ...(wos > 0     ? [`WO: ${wos}`]       : []),
  ];
  doc.text(parts.join('   ·   '), PW / 2, tableEndY + 8.5, { align: 'center' });

  // ── 5. Legend ────────────────────────────────────────────────────────────────
  const legendY = tableEndY + 20;
  const legendItems: Array<{ bg: RGB; text: RGB; label: string }> = [
    { bg: C.winBg,  text: C.winText,  label: 'Pobednik' },
    { bg: C.lossBg, text: C.lossText, label: 'Poraženi' },
    { bg: C.drawBg, text: C.drawText, label: 'Remi'     },
  ];

  let lx = M;
  for (const item of legendItems) {
    doc.setFillColor(...item.bg);
    doc.setDrawColor(...C.slate200);
    doc.setLineWidth(0.2);
    doc.roundedRect(lx, legendY, 4, 4, 0.5, 0.5, 'FD');
    doc.setFont('Arial', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.slate500);
    doc.text(item.label, lx + 6, legendY + 3.2);
    lx += 30;
  }

  // ── 6. Footer ────────────────────────────────────────────────────────────────
  const PH = 297; // A4 page height
  doc.setDrawColor(...C.slate200);
  doc.setLineWidth(0.25);
  doc.line(M, PH - 14, PW - M, PH - 14);

  doc.setFont('Arial', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.slate500);
  doc.text('Pikado App', M, PH - 8);
  doc.text(
    new Date().toLocaleString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    PW - M, PH - 8, { align: 'right' },
  );

  // ── 7. Save ──────────────────────────────────────────────────────────────────
  const safeName = leagueName.replace(/[^a-zA-Z0-9\-_ ćčšžđČĆŠŽĐ]/g, '').trim().replace(/\s+/g, '_').slice(0, 30);
  doc.save(`${safeName}_Dan_${roundNumber}.pdf`);
}
