import * as fs from 'fs/promises';
import * as path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import sharp from 'sharp';
import type { DataFormattedForPlots } from './analyses.types';
import type { PlotKey } from './analyses-plot-webp';
import { PLOT_KEYS_ORDER } from './analyses-plot-webp';
import { plotIndexDescriptionForPdf } from './analyses-plot-index-texts';

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 36;

/** Frontend dark theme (App.tsx): background.default, primary.main, text tones. */
const COL_BG = rgb(7 / 255, 11 / 255, 22 / 255);
const COL_CARD = rgb(10 / 255, 15 / 255, 30 / 255);
const COL_BORDER = rgb(1, 1, 1);
const COL_KEY = rgb(0.56, 0.72, 1);
const COL_TITLE = rgb(0.95, 0.97, 0.99);
const COL_MUTED = rgb(0.58, 0.64, 0.72);
const COL_JSON_BG = rgb(0, 0, 0);
const BORDER_ALPHA = 0.1;

const DESC_SIZE = 8;
const DESC_LINE_H = DESC_SIZE * 1.45;
const MAX_DESC_LINES = 18;

function yFromTop(pageH: number, distFromTop: number): number {
  return pageH - distFromTop;
}

/** Standard PDF fonts are WinAnsi; replace unsupported chars so drawText does not throw. */
function toPdfSafe(s: string): string {
  return s.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '?');
}

function plotTitle(plot: unknown, key: string): string {
  if (plot && typeof plot === 'object' && 'title' in plot) {
    const t = (plot as { title: unknown }).title;
    if (typeof t === 'string' && t.length > 0) return t;
  }
  return key;
}

function wrapToWidth(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let rest = para;
    while (rest.length > 0) {
      let lo = 0;
      let hi = rest.length;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        const slice = rest.slice(0, mid);
        if (font.widthOfTextAtSize(slice, size) <= maxW) lo = mid;
        else hi = mid - 1;
      }
      const take = Math.max(lo, 1);
      out.push(rest.slice(0, take));
      rest = rest.slice(take);
    }
  }
  return out;
}

async function embedLogoPng(pdfDoc: PDFDocument): Promise<{ img: Awaited<ReturnType<PDFDocument['embedPng']>>; w: number; h: number } | null> {
  const candidates = [
    path.join(process.cwd(), 'public', 'logo-ondas.svg'),
    path.join(process.cwd(), 'frontend', 'public', 'logo-ondas.svg'),
  ];
  const viewAspect = 371.02 / 73.24;
  const logoH = 26;
  const logoW = logoH * viewAspect;
  for (const p of candidates) {
    try {
      const buf = await sharp(p).resize({ height: Math.round(logoH * 2) }).png().toBuffer();
      const img = await pdfDoc.embedPng(buf);
      return { img, w: logoW, h: logoH };
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * One A4 page per plot: ONDAs header, plot key + title, texto de índice (alineado con GET /v1/analyses/indices), gráfica.
 */
export async function savePlotsPdfReport(
  webpPathsByKey: Record<PlotKey, string>,
  requestId: string,
  plotsData: DataFormattedForPlots,
): Promise<{ absolutePath: string }> {
  const baseDir = path.join(process.cwd(), 'output', 'plots', requestId);
  const outPath = path.join(baseDir, 'report.pdf');

  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const logo = await embedLogoPng(pdfDoc);
  const textW = A4_W - 2 * MARGIN;

  for (const key of PLOT_KEYS_ORDER) {
    const webpPath = webpPathsByKey[key];
    if (!webpPath) continue;

    const pngBuf = await sharp(webpPath).png().toBuffer();
    const chartImg = await pdfDoc.embedPng(pngBuf);
    const page = pdfDoc.addPage([A4_W, A4_H]);
    const pageW = page.getWidth();
    const pageH = page.getHeight();

    page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: COL_BG });

    const headerTop = MARGIN;
    const logoX = MARGIN;
    const logoBottomY = yFromTop(pageH, headerTop + (logo?.h ?? 0));

    if (logo) {
      page.drawImage(logo.img, { x: logoX, y: logoBottomY, width: logo.w, height: logo.h });
    }

    const textX = logo ? logoX + logo.w + 10 : MARGIN;
    const titleBaseline = yFromTop(pageH, headerTop + 14);
    page.drawText(toPdfSafe('Analítica ONDAs — Universal Plastic'), {
      x: textX,
      y: titleBaseline,
      size: 11,
      font: fontBold,
      color: COL_TITLE,
    });
    page.drawText(toPdfSafe('Leaflet · indices · plot payload + downloads'), {
      x: textX,
      y: yFromTop(pageH, headerTop + 28),
      size: 8,
      font,
      color: COL_MUTED,
    });

    const ridShort = requestId.length > 52 ? `${requestId.slice(0, 49)}...` : requestId;
    const ridLine = toPdfSafe(`requestId: ${ridShort}`);
    const ridW = fontMono.widthOfTextAtSize(ridLine, 7);
    page.drawText(ridLine, {
      x: Math.max(MARGIN, pageW - MARGIN - ridW),
      y: yFromTop(pageH, headerTop + 10),
      size: 7,
      font: fontMono,
      color: COL_MUTED,
    });

    const dividerY = yFromTop(pageH, headerTop + (logo?.h ?? 26) + 8);
    page.drawLine({
      start: { x: MARGIN, y: dividerY },
      end: { x: pageW - MARGIN, y: dividerY },
      thickness: 0.6,
      color: COL_BORDER,
      opacity: BORDER_ALPHA,
    });

    const metaTop = headerTop + (logo?.h ?? 26) + 20;
    const plot = plotsData.plots[key as keyof typeof plotsData.plots] as unknown;
    const humanTitle = plotTitle(plot, key);

    page.drawText(toPdfSafe(key), {
      x: MARGIN,
      y: yFromTop(pageH, metaTop + 8),
      size: 8,
      font: fontBold,
      color: COL_KEY,
    });
    page.drawText(toPdfSafe(humanTitle), {
      x: MARGIN,
      y: yFromTop(pageH, metaTop + 22),
      size: 12,
      font: fontBold,
      color: COL_TITLE,
    });

    const descFromTop = metaTop + 36;
    const descRaw = plotIndexDescriptionForPdf(key);
    const descWrapped = wrapToWidth(toPdfSafe(descRaw), font, DESC_SIZE, textW);
    const descLines =
      descWrapped.length > MAX_DESC_LINES
        ? [...descWrapped.slice(0, MAX_DESC_LINES - 1), toPdfSafe('… (texto truncado; ver GET /v1/analyses/indices).')]
        : descWrapped;

    let lineY = yFromTop(pageH, descFromTop);
    for (const line of descLines) {
      page.drawText(line.length > 0 ? line : ' ', {
        x: MARGIN,
        y: lineY,
        size: DESC_SIZE,
        font,
        color: COL_MUTED,
      });
      lineY -= DESC_LINE_H;
    }

    const descBlockH = descLines.length * DESC_LINE_H;
    const chartTop = descFromTop + descBlockH + 10;
    const chartBottomPad = MARGIN + 12;
    const maxChartH = pageH - chartTop - chartBottomPad;
    const maxChartW = pageW - 2 * MARGIN;

    const scaled = chartImg.scaleToFit(maxChartW, Math.max(140, maxChartH));
    const imgX = (pageW - scaled.width) / 2;
    const imgBottom = yFromTop(pageH, chartTop + scaled.height);

    page.drawRectangle({
      x: imgX - 2,
      y: imgBottom - 2,
      width: scaled.width + 4,
      height: scaled.height + 4,
      color: COL_JSON_BG,
      opacity: 0.22,
      borderColor: COL_BORDER,
      borderOpacity: BORDER_ALPHA,
      borderWidth: 0.8,
    });

    page.drawImage(chartImg, {
      x: imgX,
      y: imgBottom,
      width: scaled.width,
      height: scaled.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(outPath, pdfBytes);

  return { absolutePath: outPath };
}
