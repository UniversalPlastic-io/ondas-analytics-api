import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import type { DataFormattedForPlots } from './analyses.types';

const W = 900;
const H = 520;
const ML = 72;
const MR = 24;
/** Top margin below header (plot key + title), aligned with frontend PlotCard hierarchy. */
const MT = 56;
const MB = 72;
const IW = W - ML - MR;
const IH = H - MT - MB;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

/** Map value from domain to pixel range [r0, r1] (y grows downward in SVG). */
function scaleLin(v: number, d0: number, d1: number, r0: number, r1: number): number {
  if (d1 === d0) return (r0 + r1) / 2;
  const t = (v - d0) / (d1 - d0);
  return r0 + t * (r1 - r0);
}

function quartiles(sorted: number[]): { min: number; q1: number; med: number; q3: number; max: number } {
  if (sorted.length === 0) return { min: 0, q1: 0, med: 0, q3: 0, max: 0 };
  const q = (p: number) => {
    const pos = (sorted.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] === undefined) return sorted[base];
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  };
  const s = [...sorted].sort((a, b) => a - b);
  return {
    min: s[0],
    q1: q(0.25),
    med: q(0.5),
    q3: q(0.75),
    max: s[s.length - 1],
  };
}

/** Dark theme aligned with frontend/src/App.tsx (MUI dark: #070b16, primary #8fb8ff). */
function wrapSvg(inner: string, title: string, plotKey: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#070b16"/>
  <text x="${ML}" y="22" font-family="Inter,ui-sans-serif,system-ui,sans-serif" font-size="9" font-weight="600" fill="#8fb8ff" opacity="0.92">${esc(
    plotKey,
  )}</text>
  <text x="${ML}" y="42" font-family="Inter,ui-sans-serif,system-ui,sans-serif" font-size="15" font-weight="650" fill="#f1f5f9" letter-spacing="-0.02em">${esc(
    title,
  )}</text>
  ${inner}
</svg>`;
}

function axisFrame(): string {
  return `<rect x="${ML}" y="${MT}" width="${IW}" height="${IH}" fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.10)" stroke-width="1" rx="2"/>`;
}

export type PlotKey = keyof DataFormattedForPlots['plots'];

/** Ordered keys for multi-page PDF / consistent export order. */
export const PLOT_KEYS_ORDER: PlotKey[] = [
  '1_meanMicroplasticsConcentration',
  '2_microplasticsOverTime',
  '3_bcfDistribution',
  '4_waterVsFishMicroplastics',
  '5_polymerCorrelation',
  '6_exposureIndex',
  '7_plasticPressureComposition',
  '8_coastalPressureIndex',
  '9_coastalSourceIndex',
  '10_spatialDistributionOfImpact',
  '11_basicContaminationSummary',
  '12_buoyVsWaterConcordance',
  '13_waterVsFishPolymerSimilarity',
];

export async function savePlotsAsWebp(
  data: DataFormattedForPlots,
  requestId: string,
): Promise<Record<PlotKey, string>> {
  const baseDir = path.join(process.cwd(), 'output', 'plots', requestId);
  await fs.mkdir(baseDir, { recursive: true });

  const svgs = buildPlotSvgs(data);
  const out: Partial<Record<PlotKey, string>> = {};

  for (const key of Object.keys(svgs) as PlotKey[]) {
    const svg = svgs[key];
    const filename = `${key}.webp`;
    const filePath = path.join(baseDir, filename);
    const buf = await sharp(Buffer.from(svg, 'utf-8'), { density: 120 }).webp({ quality: 88 }).toBuffer();
    await fs.writeFile(filePath, buf);
    out[key] = filePath;
  }

  return out as Record<PlotKey, string>;
}

function buildPlotSvgs(data: DataFormattedForPlots): Record<PlotKey, string> {
  const p = data.plots;
  return {
    '1_meanMicroplasticsConcentration': barMeanMp(p['1_meanMicroplasticsConcentration']),
    '2_microplasticsOverTime': lineMpTime(p['2_microplasticsOverTime']),
    '3_bcfDistribution': boxBcf(p['3_bcfDistribution']),
    '4_waterVsFishMicroplastics': scatterWaterFish(p['4_waterVsFishMicroplastics']),
    '5_polymerCorrelation': heatmapPolymer(p['5_polymerCorrelation']),
    '6_exposureIndex': bubbleExposure(p['6_exposureIndex']),
    '7_plasticPressureComposition': stackedPressure(p['7_plasticPressureComposition']),
    '8_coastalPressureIndex': dualLineIpc(p['8_coastalPressureIndex']),
    '9_coastalSourceIndex': scatterCsi(p['9_coastalSourceIndex']),
    '10_spatialDistributionOfImpact': geoImpact(p['10_spatialDistributionOfImpact']),
    '11_basicContaminationSummary': basicSummary(p['11_basicContaminationSummary']),
    '12_buoyVsWaterConcordance': concordancePlot(p['12_buoyVsWaterConcordance']),
    '13_waterVsFishPolymerSimilarity': polySimilarity(p['13_waterVsFishPolymerSimilarity']),
  };
}

function basicSummary(plot: DataFormattedForPlots['plots']['11_basicContaminationSummary']): string {
  const rows = [
    { k: 'mean mp/L', v: plot.meanMpPerL },
    { k: 'std mp/L', v: plot.stdMpPerL },
    { k: 'cv', v: plot.cvMpPerL },
  ];
  const maxV = Math.max(...rows.map((r) => Math.max(0.000001, r.v)), 1e-6) * 1.15;
  const n = rows.length;
  const bw = (IW / n) * 0.55;
  let rects = '';
  for (let i = 0; i < n; i++) {
    const x0 = ML + (i + 0.5) * (IW / n) - bw / 2;
    const h = (rows[i].v / maxV) * IH;
    const y0 = MT + IH - h;
    rects += `<rect x="${x0}" y="${y0}" width="${bw}" height="${h}" fill="#60a5fa" rx="2"/>`;
    rects += `<text x="${x0 + bw / 2}" y="${MT + IH + 18}" text-anchor="middle" font-size="11" fill="#94a3b8">${esc(
      rows[i].k,
    )}</text>`;
  }
  const inner = `${axisFrame()}${rects}`;
  return wrapSvg(inner, plot.title, '11_basicContaminationSummary');
}

function concordancePlot(plot: DataFormattedForPlots['plots']['12_buoyVsWaterConcordance']): string {
  const pct = clamp(plot.overlapPercent, 0, 100);
  const barW = IW * 0.8;
  const x0 = ML + (IW - barW) / 2;
  const y0 = MT + IH / 2 - 18;
  const inner = `${axisFrame()}
    <rect x="${x0}" y="${y0}" width="${barW}" height="36" fill="#1e293b" stroke="rgba(255,255,255,0.12)"/>
    <rect x="${x0}" y="${y0}" width="${(barW * pct) / 100}" height="36" fill="#34d399" fill-opacity="0.9" stroke="#22c55e"/>
    <text x="${ML + IW / 2}" y="${y0 - 10}" text-anchor="middle" font-size="12" fill="#a8b3cf">Overlap ${esc(
      pct.toFixed(1),
    )}%</text>
    <text x="${x0}" y="${y0 + 60}" text-anchor="start" font-size="11" fill="#94a3b8">buoy: ${esc(
      plot.buoyPolymers.join(', ') || '-',
    )}</text>
    <text x="${x0}" y="${y0 + 78}" text-anchor="start" font-size="11" fill="#94a3b8">water: ${esc(
      plot.waterPolymers.join(', ') || '-',
    )}</text>`;
  return wrapSvg(inner, plot.title, '12_buoyVsWaterConcordance');
}

function polySimilarity(plot: DataFormattedForPlots['plots']['13_waterVsFishPolymerSimilarity']): string {
  const xs = plot.waterPercent;
  const ys = plot.fishPercent;
  const labels = plot.polymerLabels;
  if (xs.length === 0) return wrapSvg(axisFrame(), plot.title, '13_waterVsFishPolymerSimilarity');
  let minX = 0;
  let maxX = Math.max(...xs, 1);
  let minY = 0;
  let maxY = Math.max(...ys, 1);
  maxX *= 1.1;
  maxY *= 1.1;
  let marks = '';
  for (let i = 0; i < xs.length; i++) {
    const x = scaleLin(xs[i], minX, maxX, ML, ML + IW);
    const y = scaleLin(ys[i], minY, maxY, MT + IH, MT);
    marks += `<circle cx="${x}" cy="${y}" r="6" fill="#a78bfa" fill-opacity="0.75"/>`;
    marks += `<text x="${x + 10}" y="${y + 4}" font-size="11" fill="#94a3b8">${esc(labels[i] ?? '')}</text>`;
  }
  const diag = `<line x1="${ML}" y1="${MT + IH}" x2="${ML + IW}" y2="${MT}" stroke="#64748b" stroke-width="2" stroke-dasharray="6 4"/>`;
  const inner = `${axisFrame()}${diag}${marks}
    <text x="${ML + IW / 2}" y="${H - 20}" text-anchor="middle" font-size="12" fill="#a8b3cf">Water composition (%)</text>
    <text x="20" y="${MT + IH / 2}" transform="rotate(-90 20 ${MT + IH / 2})" text-anchor="middle" font-size="12" fill="#a8b3cf">Fish composition (%)</text>
    <text x="${ML + 10}" y="${MT + 20}" font-size="12" fill="#a8b3cf">r=${esc(plot.pearson_r.toFixed(2))}, p≈${esc(
      plot.p_value.toFixed(3),
    )}</text>`;
  return wrapSvg(inner, plot.title, '13_waterVsFishPolymerSimilarity');
}

function barMeanMp(plot: DataFormattedForPlots['plots']['1_meanMicroplasticsConcentration']): string {
  const vals = plot.valuesMpPerL;
  const labels = plot.locations;
  const maxV = Math.max(...vals, 1e-6) * 1.15;
  const n = Math.max(vals.length, 1);
  const bw = (IW / n) * 0.55;
  let rects = '';
  for (let i = 0; i < vals.length; i++) {
    const x0 = ML + (i + 0.5) * (IW / n) - bw / 2;
    const h = (vals[i] / maxV) * IH;
    const y0 = MT + IH - h;
    rects += `<rect x="${x0}" y="${y0}" width="${bw}" height="${h}" fill="#3b82f6" rx="2"/>`;
    rects += `<text x="${x0 + bw / 2}" y="${MT + IH + 18}" text-anchor="middle" font-size="11" fill="#94a3b8">${esc(
      labels[i] ?? String(i),
    )}</text>`;
  }
  const inner = `${axisFrame()}${rects}
    <text x="24" y="${MT + IH / 2}" transform="rotate(-90 24 ${MT + IH / 2})" text-anchor="middle" font-size="12" fill="#a8b3cf">mp/L</text>
    <text x="${ML + IW / 2}" y="${H - 16}" text-anchor="middle" font-size="12" fill="#a8b3cf">Location</text>`;
  return wrapSvg(inner, plot.title, '1_meanMicroplasticsConcentration');
}

function lineMpTime(plot: DataFormattedForPlots['plots']['2_microplasticsOverTime']): string {
  const { dates, mpPerL } = plot;
  const n = dates.length;
  if (n === 0) return wrapSvg(axisFrame(), plot.title, '2_microplasticsOverTime');
  let minY = Math.min(...mpPerL);
  let maxY = Math.max(...mpPerL, minY + 1e-6);
  const pad = (maxY - minY) * 0.08 || 0.1;
  minY -= pad;
  maxY += pad;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = ML + (i / Math.max(n - 1, 1)) * IW;
    const y = scaleLin(mpPerL[i], minY, maxY, MT + IH, MT);
    pts.push(`${x},${y}`);
  }
  const path = `<polyline fill="none" stroke="#8fb8ff" stroke-width="2.5" points="${pts.join(' ')}"/>`;
  let lbl = '';
  const step = Math.max(1, Math.ceil(n / 8));
  for (let i = 0; i < n; i += step) {
    const x = ML + (i / Math.max(n - 1, 1)) * IW;
    const short = dates[i].slice(5);
    lbl += `<text x="${x}" y="${MT + IH + 22}" text-anchor="end" font-size="9" fill="#8b9cb8" transform="rotate(-40 ${x} ${MT + IH + 22})">${esc(
      short,
    )}</text>`;
  }
  const inner = `${axisFrame()}${path}${lbl}
    <text x="24" y="${MT + IH / 2}" transform="rotate(-90 24 ${MT + IH / 2})" text-anchor="middle" font-size="12" fill="#a8b3cf">mp/L</text>`;
  return wrapSvg(inner, plot.title, '2_microplasticsOverTime');
}

function boxBcf(plot: DataFormattedForPlots['plots']['3_bcfDistribution']): string {
  const v = plot.bcfValues;
  if (v.length === 0) return wrapSvg(axisFrame(), plot.title, '3_bcfDistribution');
  const q = quartiles(v);
  const minY = q.min - (q.max - q.min) * 0.05;
  const maxY = q.max + (q.max - q.min) * 0.05;
  const cx = ML + IW / 2;
  const y = (val: number) => scaleLin(val, minY, maxY, MT + IH, MT);
  const boxW = Math.min(120, IW * 0.35);
  const x0 = cx - boxW / 2;
  const yMin = y(q.min);
  const yQ1 = y(q.q1);
  const yMed = y(q.med);
  const yQ3 = y(q.q3);
  const yMax = y(q.max);
  const inner = `${axisFrame()}
    <line x1="${cx}" y1="${yMin}" x2="${cx}" y2="${yQ1}" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="${cx}" y1="${yQ3}" x2="${cx}" y2="${yMax}" stroke="#94a3b8" stroke-width="1.5"/>
    <rect x="${x0}" y="${yQ3}" width="${boxW}" height="${yQ1 - yQ3}" fill="#60a5fa" fill-opacity="0.55" stroke="#8fb8ff" stroke-width="1"/>
    <line x1="${x0}" y1="${yMed}" x2="${x0 + boxW}" y2="${yMed}" stroke="#8fb8ff" stroke-width="2"/>
    <text x="24" y="${MT + IH / 2}" transform="rotate(-90 24 ${MT + IH / 2})" text-anchor="middle" font-size="12" fill="#a8b3cf">BCF (L/kg)</text>`;
  return wrapSvg(inner, plot.title, '3_bcfDistribution');
}

function scatterWaterFish(plot: DataFormattedForPlots['plots']['4_waterVsFishMicroplastics']): string {
  const { mpPerL_water: xs, mpPerKg_fish: ys } = plot;
  if (xs.length === 0) return wrapSvg(axisFrame(), plot.title, '4_waterVsFishMicroplastics');
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  const px = (maxX - minX) * 0.05 || 0.01;
  const py = (maxY - minY) * 0.05 || 0.01;
  minX -= px;
  maxX += px;
  minY -= py;
  maxY += py;
  let circles = '';
  for (let i = 0; i < xs.length; i++) {
    const x = scaleLin(xs[i], minX, maxX, ML, ML + IW);
    const y = scaleLin(ys[i], minY, maxY, MT + IH, MT);
    circles += `<circle cx="${x}" cy="${y}" r="3" fill="#34d399" fill-opacity="0.7"/>`;
  }
  const inner = `${axisFrame()}${circles}
    <text x="${ML + IW / 2}" y="${H - 20}" text-anchor="middle" font-size="12" fill="#a8b3cf">mp/L (water)</text>
    <text x="20" y="${MT + IH / 2}" transform="rotate(-90 20 ${MT + IH / 2})" text-anchor="middle" font-size="12" fill="#a8b3cf">mp/kg (fish)</text>`;
  return wrapSvg(inner, plot.title, '4_waterVsFishMicroplastics');
}

function heatColor(t: number): string {
  // t in [-1,1] -> blue to red
  const u = clamp((t + 1) / 2, 0, 1);
  const r = Math.round(255 * u);
  const b = Math.round(255 * (1 - u));
  const g = Math.round(100 + 80 * (1 - Math.abs(u - 0.5) * 2));
  return `rgb(${r},${g},${b})`;
}

function heatmapPolymer(plot: DataFormattedForPlots['plots']['5_polymerCorrelation']): string {
  const { polymerLabels, correlationMatrix: M } = plot;
  const n = M.length;
  if (n === 0) return wrapSvg(axisFrame(), plot.title, '5_polymerCorrelation');
  const cell = Math.min(IW / n, IH / n, 72);
  const ox = ML + (IW - cell * n) / 2;
  const oy = MT + (IH - cell * n) / 2;
  let rects = '';
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const raw = M[i]?.[j];
      const v = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
      const x = ox + j * cell;
      const y = oy + i * cell;
      rects += `<rect x="${x}" y="${y}" width="${cell - 2}" height="${cell - 2}" fill="${heatColor(
        clamp(v, -1, 1),
      )}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>`;
      rects += `<text x="${x + cell / 2 - 1}" y="${y + cell / 2 + 4}" text-anchor="middle" font-size="10" fill="#f8fafc" paint-order="stroke" stroke="#0a0f1e" stroke-width="0.35">${esc(
        v.toFixed(2),
      )}</text>`;
    }
  }
  let lab = '';
  for (let j = 0; j < n; j++) {
    lab += `<text x="${ox + j * cell + cell / 2}" y="${oy - 8}" text-anchor="middle" font-size="10" fill="#94a3b8">${esc(
      polymerLabels[j],
    )}</text>`;
  }
  for (let i = 0; i < n; i++) {
    lab += `<text x="${ox - 6}" y="${oy + i * cell + cell / 2 + 4}" text-anchor="end" font-size="10" fill="#94a3b8">${esc(
      polymerLabels[i],
    )}</text>`;
  }
  const inner = `${rects}${lab}`;
  return wrapSvg(inner, plot.title, '5_polymerCorrelation');
}

function bubbleExposure(plot: DataFormattedForPlots['plots']['6_exposureIndex']): string {
  const { mpPerL: xs, biomass: ys, exposureIndex: sizes } = plot;
  if (xs.length === 0) return wrapSvg(axisFrame(), plot.title, '6_exposureIndex');
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  const px = (maxX - minX) * 0.05 || 0.01;
  const py = (maxY - minY) * 0.05 || 0.01;
  minX -= px;
  maxX += px;
  minY -= py;
  maxY += py;
  const maxS = Math.max(...sizes, 1e-9);
  let circles = '';
  for (let i = 0; i < xs.length; i++) {
    const x = scaleLin(xs[i], minX, maxX, ML, ML + IW);
    const y = scaleLin(ys[i], minY, maxY, MT + IH, MT);
    const area = 20 + (sizes[i] / maxS) * 800;
    const r = Math.sqrt(area / Math.PI);
    circles += `<circle cx="${x}" cy="${y}" r="${clamp(r, 3, 40)}" fill="#a78bfa" fill-opacity="0.5"/>`;
  }
  const inner = `${axisFrame()}${circles}
    <text x="${ML + IW / 2}" y="${H - 20}" text-anchor="middle" font-size="12" fill="#a8b3cf">mp/L</text>
    <text x="20" y="${MT + IH / 2}" transform="rotate(-90 20 ${MT + IH / 2})" text-anchor="middle" font-size="12" fill="#a8b3cf">Biomass</text>`;
  return wrapSvg(inner, plot.title, '6_exposureIndex');
}

function stackedPressure(plot: DataFormattedForPlots['plots']['7_plasticPressureComposition']): string {
  const { waterMpPerL: w, coastKgPerKm: c, location } = plot;
  const total = w + c;
  const maxH = IH * 0.65;
  const hW = total > 0 ? (w / total) * maxH : 0;
  const hC = total > 0 ? (c / total) * maxH : 0;
  const bw = 100;
  const cx = ML + IW / 2;
  const x0 = cx - bw / 2;
  const base = MT + IH;
  const yC = base - hW - hC;
  const yW = base - hW;
  const inner = `${axisFrame()}
    <rect x="${x0}" y="${yC}" width="${bw}" height="${hC}" fill="#f59e0b" stroke="#b45309" stroke-width="1"/>
    <rect x="${x0}" y="${yW}" width="${bw}" height="${hW}" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1"/>
    <text x="${cx}" y="${MT + IH + 36}" text-anchor="middle" font-size="11" fill="#94a3b8">${esc(location)}</text>
    <text x="${MR + IW}" y="${MT + 16}" text-anchor="end" font-size="11" fill="#fbbf24">Coastal kg/km</text>
    <text x="${MR + IW}" y="${MT + 32}" text-anchor="end" font-size="11" fill="#8fb8ff">Water mp/L</text>`;
  return wrapSvg(inner, plot.title, '7_plasticPressureComposition');
}

function dualLineIpc(plot: DataFormattedForPlots['plots']['8_coastalPressureIndex']): string {
  const { ipcDaily, ipc7DayAverage } = plot;
  const n = ipcDaily.length;
  if (n === 0) return wrapSvg(axisFrame(), plot.title, '8_coastalPressureIndex');
  let minY = Math.min(...ipcDaily);
  let maxY = Math.max(...ipcDaily);
  const roll = ipc7DayAverage.filter((x): x is number => x != null);
  if (roll.length) {
    minY = Math.min(minY, ...roll);
    maxY = Math.max(maxY, ...roll);
  }
  const pad = (maxY - minY) * 0.08 || 0.1;
  minY -= pad;
  maxY += pad;
  const ptsD: string[] = [];
  const ptsR: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = ML + (i / Math.max(n - 1, 1)) * IW;
    const y = scaleLin(ipcDaily[i], minY, maxY, MT + IH, MT);
    ptsD.push(`${x},${y}`);
    const rv = ipc7DayAverage[i];
    if (rv != null) {
      const yr = scaleLin(rv, minY, maxY, MT + IH, MT);
      ptsR.push(`${x},${yr}`);
    }
  }
  const pathD = `<polyline fill="none" stroke="#dc2626" stroke-width="2" points="${ptsD.join(' ')}"/>`;
  const pathR =
    ptsR.length > 1
      ? `<polyline fill="none" stroke="#16a34a" stroke-width="2" stroke-dasharray="6 4" points="${ptsR.join(' ')}"/>`
      : '';
  const inner = `${axisFrame()}${pathD}${pathR}
    <text x="${ML + 20}" y="${MT + 20}" font-size="11" fill="#f87171">Daily</text>
    <text x="${ML + 80}" y="${MT + 20}" font-size="11" fill="#34d399">7-day avg</text>
    <text x="22" y="${MT + IH / 2}" transform="rotate(-90 22 ${MT + IH / 2})" text-anchor="middle" font-size="12" fill="#a8b3cf">IPC</text>`;
  return wrapSvg(inner, plot.title, '8_coastalPressureIndex');
}

function scatterCsi(plot: DataFormattedForPlots['plots']['9_coastalSourceIndex']): string {
  const { kgTotal: xs, mpPerL: ys, csi: cs } = plot;
  if (xs.length === 0) return wrapSvg(axisFrame(), plot.title, '9_coastalSourceIndex');
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  const px = (maxX - minX) * 0.05 || 0.01;
  const py = (maxY - minY) * 0.05 || 0.01;
  minX -= px;
  maxX += px;
  minY -= py;
  maxY += py;
  const minC = Math.min(...cs);
  const maxC = Math.max(...cs, minC + 1e-9);
  let circles = '';
  for (let i = 0; i < xs.length; i++) {
    const x = scaleLin(xs[i], minX, maxX, ML, ML + IW);
    const y = scaleLin(ys[i], minY, maxY, MT + IH, MT);
    const t = (cs[i] - minC) / (maxC - minC);
    const col = heatColor(clamp(2 * t - 1, -1, 1));
    circles += `<circle cx="${x}" cy="${y}" r="5" fill="${col}" fill-opacity="0.85"/>`;
  }
  const inner = `${axisFrame()}${circles}
    <text x="${ML + IW / 2}" y="${H - 20}" text-anchor="middle" font-size="12" fill="#a8b3cf">Coastal kg</text>
    <text x="20" y="${MT + IH / 2}" transform="rotate(-90 20 ${MT + IH / 2})" text-anchor="middle" font-size="12" fill="#a8b3cf">mp/L</text>`;
  return wrapSvg(inner, plot.title, '9_coastalSourceIndex');
}

function geoImpact(plot: DataFormattedForPlots['plots']['10_spatialDistributionOfImpact']): string {
  const { lon, lat, impactValues: vals } = plot;
  if (lon.length === 0) return wrapSvg(axisFrame(), plot.title, '10_spatialDistributionOfImpact');
  let minX = Math.min(...lon);
  let maxX = Math.max(...lon);
  let minY = Math.min(...lat);
  let maxY = Math.max(...lat);
  const dx = (maxX - minX) * 0.2 || 0.02;
  const dy = (maxY - minY) * 0.2 || 0.02;
  minX -= dx;
  maxX += dx;
  minY -= dy;
  maxY += dy;
  const maxV = Math.max(...vals, 1e-6);
  let circles = '';
  for (let i = 0; i < lon.length; i++) {
    const x = scaleLin(lon[i], minX, maxX, ML, ML + IW);
    const y = scaleLin(lat[i], minY, maxY, MT + IH, MT);
    const area = 80 + (vals[i] / maxV) * 700;
    const r = Math.sqrt(area / Math.PI);
    circles += `<circle cx="${x}" cy="${y}" r="${clamp(r, 8, 50)}" fill="#ea580c" fill-opacity="0.55"/>`;
  }
  const inner = `${axisFrame()}${circles}
    <text x="${ML + IW / 2}" y="${H - 20}" text-anchor="middle" font-size="12" fill="#a8b3cf">Longitude</text>
    <text x="20" y="${MT + IH / 2}" transform="rotate(-90 20 ${MT + IH / 2})" text-anchor="middle" font-size="12" fill="#a8b3cf">Latitude</text>`;
  return wrapSvg(inner, plot.title, '10_spatialDistributionOfImpact');
}
