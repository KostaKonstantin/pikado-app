import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ScoresheetMatch {
  id: string;
  homePlayer?: { fullName: string };
  awayPlayer?:  { fullName: string };
}

export interface ScoresheetOptions {
  leagueName:    string;
  sessionNumber: number;
  sessionDate?:  string | null;
  matches:       ScoresheetMatch[];
  setsPerMatch?: number;
  legsPerSet?:   number;
}

async function loadFonts(doc: jsPDF): Promise<void> {
  const { ARIAL_REGULAR, ARIAL_BOLD } = await import('./pdfFonts');
  doc.addFileToVFS('Arial.ttf',      ARIAL_REGULAR);
  doc.addFileToVFS('Arial-Bold.ttf', ARIAL_BOLD);
  doc.addFont('Arial.ttf',      'Arial', 'normal');
  doc.addFont('Arial-Bold.ttf', 'Arial', 'bold');
}

type RGB = [number, number, number];

const C = {
  orange:   [249, 115,  22] as RGB,
  dark:     [ 15,  23,  42] as RGB,
  slate700: [ 51,  65,  85] as RGB,
  slate500: [100, 116, 139] as RGB,
  slate300: [148, 163, 184] as RGB,
  slate200: [226, 232, 240] as RGB,
  slate100: [241, 245, 249] as RGB,
  slate50:  [248, 250, 252] as RGB,
  white:    [255, 255, 255] as RGB,
} as const;

function fmtDate(iso?: string | null): string {
  if (!iso) return new Date().toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return new Date(iso).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Draws a blank write-in score cell: "__ : __"
function scoreLabel(setsPerMatch: number): string {
  return setsPerMatch === 1 ? '______  :  ______' : '___  :  ___';
}

export async function generateScoresheetPDF({
  leagueName,
  sessionNumber,
  sessionDate,
  matches,
  setsPerMatch = 1,
  legsPerSet   = 4,
}: ScoresheetOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW  = 210;
  const PH  = 297;
  const M   = 15;
  const CW  = PW - M * 2;

  await loadFonts(doc);
  doc.setFont('Arial', 'normal');

  // ── 1. Header bar ────────────────────────────────────────────────────────────
  doc.setFillColor(...C.orange);
  doc.rect(0, 0, PW, 20, 'F');

  doc.setFont('Arial', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.white);
  doc.text('PIKADO', M, 13);

  // "RASPORED VEČERI" badge on the right
  doc.setFont('Arial', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text('RASPORED VEČERI', PW - M, 9, { align: 'right' });
  doc.setFontSize(9);
  doc.text(fmtDate(sessionDate), PW - M, 14, { align: 'right' });

  // ── 2. Title block ───────────────────────────────────────────────────────────
  let y = 30;

  doc.setFont('Arial', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...C.dark);
  doc.text(leagueName, M, y);
  y += 7;

  doc.setFont('Arial', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...C.slate500);
  doc.text(`Ligaški Dan  ${sessionNumber}`, M, y);

  // Match count on same line, right-aligned
  doc.setFont('Arial', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.orange);
  doc.text(`${matches.length} mečeva`, PW - M, y, { align: 'right' });
  y += 5;

  // Accent line
  doc.setDrawColor(...C.orange);
  doc.setLineWidth(0.6);
  doc.line(M, y, PW - M, y);
  y += 5;

  // ── 3. Game format hint ──────────────────────────────────────────────────────
  doc.setFont('Arial', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.slate500);
  const formatHint = setsPerMatch === 1
    ? `Format: ${legsPerSet} lega  ·  Upisati broj dobijenih lega`
    : `Format: ${setsPerMatch} seta, ${legsPerSet} lega/set  ·  Upisati broj dobijenih seta`;
  doc.text(formatHint, M, y + 4);
  y += 10;

  // ── 4. Match table ───────────────────────────────────────────────────────────
  if (matches.length === 0) {
    doc.setFont('Arial', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...C.slate500);
    doc.text('Nema mečeva za ovaj ligaški dan.', M, y + 10);
  } else {
    const rows = matches.map((m, i) => [
      String(i + 1),
      m.homePlayer?.fullName ?? '—',
      scoreLabel(setsPerMatch),
      m.awayPlayer?.fullName ?? '—',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Domaćin', 'Rezultat', 'Gost']],
      body: rows,
      margin: { left: M, right: M },
      tableWidth: CW,

      styles: {
        font:        'Arial',
        fontSize:    10.5,
        cellPadding: { top: 5.5, bottom: 5.5, left: 5, right: 5 },
        textColor:   C.dark,
        lineColor:   C.slate200,
        lineWidth:   0.3,
        overflow:    'ellipsize',
      },

      headStyles: {
        font:      'Arial',
        fillColor: C.dark,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize:  9,
        halign:    'center',
      },

      columnStyles: {
        0: { cellWidth: 10,  halign: 'center', cellPadding: { top: 5.5, bottom: 5.5, left: 2, right: 2 } },
        1: { cellWidth: 63,  halign: 'left'  },
        2: { cellWidth: 38,  halign: 'center', fontStyle: 'bold', textColor: C.slate300, fontSize: 10 },
        3: { cellWidth: 63,  halign: 'right' },
      },

      alternateRowStyles: { fillColor: C.slate50 },

      // Draw a subtle bottom border on each row to separate write-in areas
      didDrawCell(data) {
        if (data.section !== 'body') return;
        // Extra bottom rule under score column
        if (data.column.index === 2) {
          const { x, y: cy, width, height } = data.cell;
          doc.setDrawColor(...C.slate300);
          doc.setLineWidth(0.15);
          // Underline the score text area only (inner line)
          const ux = x + 4;
          const uy = cy + height - 2.5;
          doc.line(ux, uy, ux + width - 8, uy);
        }
      },
    });
  }

  // ── 5. Summary footer box ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tableEndY: number = matches.length > 0 ? (doc as any).lastAutoTable.finalY + 6 : y + 20;

  // If summary + instructions block won't fit before the footer, move to a new page
  if (tableEndY > PH - 55) {
    doc.addPage();
    tableEndY = 20;
  }

  doc.setFillColor(...C.slate50);
  doc.setDrawColor(...C.orange);
  doc.setLineWidth(0.4);
  doc.roundedRect(M, tableEndY, CW, 13, 2, 2, 'FD');

  doc.setFont('Arial', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.slate500);

  const parts = [
    `Ukupno mečeva: ${matches.length}`,
    `Potpisano:  _______________________`,
  ];
  doc.text(parts.join('          '), PW / 2, tableEndY + 8.5, { align: 'center' });

  // ── 6. Instructions block (below table) ──────────────────────────────────────
  let iy = tableEndY + 22;
  doc.setFont('Arial', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.dark);
  doc.text('Uputstvo', M, iy);

  doc.setFont('Arial', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.slate500);
  iy += 5;
  doc.text(`· Upisati broj dobijenih ${setsPerMatch === 1 ? 'lega' : 'setova'} za svakog igrača (format: Domaćin : Gost)`, M, iy);
  iy += 4.5;
  doc.text('· Rezultate uneti u aplikaciju nakon završetka ligaškog dana', M, iy);
  iy += 4.5;
  doc.text('· U slučaju nedolaska — označiti WO pored rezultata', M, iy);

  // ── 7. Page footer ───────────────────────────────────────────────────────────
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

  // ── 8. Save ──────────────────────────────────────────────────────────────────
  const safeName = leagueName.replace(/[^a-zA-Z0-9\-_ ćčšžđČĆŠŽĐ]/g, '').trim().replace(/\s+/g, '_').slice(0, 30);
  doc.save(`${safeName}_Vecer_${sessionNumber}_Raspored.pdf`);
}
