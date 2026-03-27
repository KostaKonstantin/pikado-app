import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerSheetMatch {
  homePlayerId: string;
  awayPlayerId: string;
  homePlayer?: { fullName: string };
  awayPlayer?: { fullName: string };
  status: string;
  homeSets: number;
  awaySets: number;
  isWalkover?: boolean;
}

export interface PlayerSheetOptions {
  leagueName: string;
  players: Array<{ id: string; fullName: string }>;
  fixtures: PlayerSheetMatch[];
}

// ─── Palette ─────────────────────────────────────────────────────────────────

type RGB = [number, number, number];

const C = {
  orange:    [249, 115,  22] as RGB,
  dark:      [ 15,  23,  42] as RGB,
  slate700:  [ 51,  65,  85] as RGB,
  slate500:  [100, 116, 139] as RGB,
  slate400:  [148, 163, 184] as RGB,
  slate200:  [226, 232, 240] as RGB,
  slate100:  [241, 245, 249] as RGB,
  slate50:   [248, 250, 252] as RGB,
  white:     [255, 255, 255] as RGB,
  green600:  [ 22, 163,  74] as RGB,
  greenBg:   [220, 252, 231] as RGB,
  greenBg2:  [187, 247, 208] as RGB,
  blueDk:    [ 37,  99, 235] as RGB,
  purpleDk:  [109,  40, 217] as RGB,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loadFonts(doc: jsPDF): Promise<void> {
  const { ARIAL_REGULAR, ARIAL_BOLD } = await import('./pdfFonts');
  doc.addFileToVFS('Arial.ttf',      ARIAL_REGULAR);
  doc.addFileToVFS('Arial-Bold.ttf', ARIAL_BOLD);
  doc.addFont('Arial.ttf',      'Arial', 'normal');
  doc.addFont('Arial-Bold.ttf', 'Arial', 'bold');
}

function fmtDate(): string {
  return new Date().toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtNow(): string {
  return new Date().toLocaleString('sr-RS', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Draw a printable checkbox square, optionally with a checkmark. */
function drawCheckbox(doc: jsPDF, cx: number, cy: number, size: number, checked: boolean): void {
  const x = cx - size / 2;
  const y = cy - size / 2;

  if (checked) {
    doc.setFillColor(...C.greenBg);
    doc.setDrawColor(...C.green600);
  } else {
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.slate400);
  }
  doc.setLineWidth(0.45);
  doc.roundedRect(x, y, size, size, 0.6, 0.6, 'FD');

  if (checked) {
    // Checkmark stroke
    doc.setDrawColor(...C.green600);
    doc.setLineWidth(0.7);
    doc.line(x + size * 0.18, cy + size * 0.06, x + size * 0.42, y + size * 0.78);
    doc.line(x + size * 0.42, y + size * 0.78, x + size * 0.85, y + size * 0.18);
  }
}

function pageFooter(doc: jsPDF, PW: number, PH: number, M: number): void {
  doc.setDrawColor(...C.slate200);
  doc.setLineWidth(0.25);
  doc.line(M, PH - 14, PW - M, PH - 14);
  doc.setFont('Arial', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.slate500);
  doc.text('Pikado App', M, PH - 8);
  doc.text(fmtNow(), PW - M, PH - 8, { align: 'right' });
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generatePlayerSheetPDF({
  leagueName,
  players,
  fixtures,
}: PlayerSheetOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = 210;
  const PH = 297;
  const M  = 15;
  const CW = PW - M * 2;

  await loadFonts(doc);

  // ══ PAGE 1: Summary ═══════════════════════════════════════════════════════

  // Header bar
  doc.setFillColor(...C.orange);
  doc.rect(0, 0, PW, 20, 'F');
  doc.setFont('Arial', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.white);
  doc.text('PIKADO', M, 13);
  doc.setFont('Arial', 'normal');
  doc.setFontSize(9);
  doc.text(fmtDate(), PW - M, 13, { align: 'right' });

  let y = 32;

  // Title
  doc.setFont('Arial', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...C.dark);
  doc.text(leagueName, M, y);
  y += 8;

  doc.setFont('Arial', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...C.slate500);
  doc.text('Lista mečeva po igraču', M, y);
  y += 7;

  // Stats pills
  const totalMatches     = fixtures.length;
  const completedMatches = fixtures.filter(f => f.status === 'completed').length;
  const pendingMatches   = totalMatches - completedMatches;

  const pillData = [
    { label: 'Igrača',    value: String(players.length) },
    { label: 'Mečeva',    value: String(totalMatches) },
    { label: 'Odigrano',  value: String(completedMatches) },
    { label: 'Preostalo', value: String(pendingMatches) },
  ];

  let px = M;
  for (const pill of pillData) {
    const w = 38;
    doc.setFillColor(...C.slate100);
    doc.setDrawColor(...C.slate200);
    doc.setLineWidth(0.2);
    doc.roundedRect(px, y, w, 12, 1.5, 1.5, 'FD');
    doc.setFont('Arial', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...C.dark);
    doc.text(pill.value, px + w / 2, y + 7, { align: 'center' });
    doc.setFont('Arial', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.slate500);
    doc.text(pill.label, px + w / 2, y + 11, { align: 'center' });
    px += w + 4;
  }
  y += 18;

  // Orange accent line
  doc.setDrawColor(...C.orange);
  doc.setLineWidth(0.6);
  doc.line(M, y, PW - M, y);
  y += 8;

  // Player list header
  doc.setFont('Arial', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.slate700);
  doc.text(`Svi igrači (${players.length})`, M, y);
  y += 7;

  // Player list — 2 columns
  const sorted = [...players].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, 'sr')
  );
  const colW = CW / 2;
  const rowH = 7;

  sorted.forEach((p, i) => {
    const col  = i % 2;
    const row  = Math.floor(i / 2);
    const rx   = M + col * colW;
    const ry   = y + row * rowH;

    // Number circle
    doc.setFillColor(...C.orange);
    doc.circle(rx + 2.8, ry - 1.6, 2.8, 'F');
    doc.setFont('Arial', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.white);
    doc.text(String(i + 1), rx + 2.8, ry - 0.7, { align: 'center' });

    // Name
    doc.setFont('Arial', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...C.dark);
    doc.text(p.fullName, rx + 7.5, ry);
  });

  pageFooter(doc, PW, PH, M);

  // ══ Per-player pages ══════════════════════════════════════════════════════

  for (let pi = 0; pi < sorted.length; pi++) {
    const player = sorted[pi];

    doc.addPage();

    // Slim dark header strip
    doc.setFillColor(...C.dark);
    doc.rect(0, 0, PW, 11, 'F');
    doc.setFont('Arial', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.slate400);
    doc.text(`PIKADO  ·  ${leagueName}`, M, 7.5);
    doc.text(`${pi + 1} / ${sorted.length}`, PW - M, 7.5, { align: 'right' });

    y = 22;

    // Orange left accent bar behind player name
    doc.setFillColor(...C.orange);
    doc.rect(M, y - 6, 3, 14, 'F');

    // Player name
    doc.setFont('Arial', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...C.dark);
    doc.text(player.fullName, M + 7, y + 2);
    y += 12;

    // Collect & sort matches: uncompleted first, then completed
    const playerMatches = fixtures
      .filter(m => m.homePlayerId === player.id || m.awayPlayerId === player.id)
      .sort((a, b) => {
        // Pending first
        const aD = a.status === 'completed' ? 1 : 0;
        const bD = b.status === 'completed' ? 1 : 0;
        if (aD !== bD) return aD - bD;
        // Then by opponent name
        const aIsHome = a.homePlayerId === player.id;
        const bIsHome = b.homePlayerId === player.id;
        const aOpp = (aIsHome ? a.awayPlayer?.fullName : a.homePlayer?.fullName) ?? '';
        const bOpp = (bIsHome ? b.awayPlayer?.fullName : b.homePlayer?.fullName) ?? '';
        return aOpp.localeCompare(bOpp, 'sr');
      });

    const totalP    = playerMatches.length;
    const doneP     = playerMatches.filter(m => m.status === 'completed').length;
    const remainP   = totalP - doneP;

    // Progress bar + stats
    doc.setFont('Arial', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.slate500);
    doc.text(
      `${totalP} mečeva  ·  ${doneP} odigrano  ·  ${remainP} preostalo`,
      M, y,
    );
    y += 4;

    // Progress bar
    if (totalP > 0) {
      const barW = CW;
      doc.setFillColor(...C.slate200);
      doc.roundedRect(M, y, barW, 2.5, 1.25, 1.25, 'F');
      if (doneP > 0) {
        doc.setFillColor(...C.orange);
        doc.roundedRect(M, y, barW * (doneP / totalP), 2.5, 1.25, 1.25, 'F');
      }
      y += 6;
    }

    // Divider
    doc.setDrawColor(...C.slate200);
    doc.setLineWidth(0.4);
    doc.line(M, y, PW - M, y);
    y += 4;

    if (playerMatches.length === 0) {
      doc.setFont('Arial', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...C.slate500);
      doc.text('Nema mečeva — raspored još nije generisan.', M, y + 8);
      pageFooter(doc, PW, PH, M);
      continue;
    }

    // Build table rows
    type RowMeta = {
      completed: boolean;
      isHome: boolean;
      myScore: number;
      oppScore: number;
      isWalkover: boolean;
    };
    const rowMeta: RowMeta[] = [];

    const tableRows = playerMatches.map((m, idx) => {
      const isHome   = m.homePlayerId === player.id;
      const oppName  = isHome
        ? (m.awayPlayer?.fullName ?? '—')
        : (m.homePlayer?.fullName ?? '—');
      const type     = isHome ? 'Domaćin' : 'Gost';
      const completed = m.status === 'completed';
      const myScore   = isHome ? m.homeSets : m.awaySets;
      const oppScore  = isHome ? m.awaySets : m.homeSets;

      rowMeta.push({ completed, isHome, myScore, oppScore, isWalkover: !!m.isWalkover });

      return [
        '',                    // col 0 — checkbox (drawn in didDrawCell)
        String(idx + 1),       // col 1 — #
        oppName,               // col 2 — opponent
        type,                  // col 3 — Domaćin / Gost
        completed
          ? `${myScore} : ${oppScore}${m.isWalkover ? ' WO' : ''}`
          : '__ : __',        // col 4 — score
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['', '#', 'Protivnik', 'Tip', 'Rezultat']],
      body: tableRows,
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
        minCellHeight: 9,
      },

      headStyles: {
        font:      'Arial',
        fillColor: C.dark,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize:  8,
        halign:    'center',
      },

      columnStyles: {
        0: { cellWidth: 10, halign: 'center', cellPadding: { top: 4, bottom: 4, left: 1, right: 1 } },
        1: { cellWidth: 9,  halign: 'center' },
        2: { cellWidth: 85, halign: 'left'   },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 50, halign: 'center' },
      },

      didParseCell(data) {
        if (data.section !== 'body') return;
        const meta = rowMeta[data.row.index];
        if (!meta) return;

        if (meta.completed) {
          // Subtle green tint for completed rows
          data.cell.styles.fillColor = data.row.index % 2 === 0 ? C.greenBg : C.greenBg2;
        } else {
          data.cell.styles.fillColor = data.row.index % 2 === 0 ? C.white : C.slate50;
        }

        // Type column colour
        if (data.column.index === 3) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = meta.isHome ? C.blueDk : C.purpleDk;
        }

        // Score column — bold if completed, grey-italic if pending
        if (data.column.index === 4) {
          if (meta.completed) {
            data.cell.styles.fontStyle = 'bold';
            const won = meta.myScore > meta.oppScore;
            const lost = meta.myScore < meta.oppScore;
            data.cell.styles.textColor = won
              ? [22, 101, 52] as RGB
              : lost
              ? [153, 27, 27] as RGB
              : [113, 63, 18] as RGB;
          } else {
            data.cell.styles.textColor = C.slate400;
          }
        }
      },

      didDrawCell(data) {
        if (data.section !== 'body' || data.column.index !== 0) return;
        const meta = rowMeta[data.row.index];
        if (!meta) return;

        const boxSize = 4.8;
        const cx = data.cell.x + data.cell.width / 2;
        const cy = data.cell.y + data.cell.height / 2;
        drawCheckbox(doc, cx, cy, boxSize, meta.completed);
      },
    });

    pageFooter(doc, PW, PH, M);
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  const safeName = leagueName
    .replace(/[^a-zA-Z0-9\-_ ćčšžđČĆŠŽĐ]/g, '')
    .trim().replace(/\s+/g, '_').slice(0, 30);
  doc.save(`${safeName}_Lista_meceva.pdf`);
}
