import {
  ReportData, ReportDetail, ReportInclude, ReportType, REPORT_TYPE_TITLES, THEME,
} from './reports.types';
import { CampaignScope } from './reports-campaign-map';

export interface ReportMeta {
  reportId: string; generatedAt: string; detail: ReportDetail; country: string;
}

const W = 794;
const H = 1123;
const M = 68;          // content side margin (~18mm @ 96dpi)
const FONT = "'Inter', Arial, Helvetica, sans-serif";

// Universal Plastic white horizontal logo — verbatim from docs/report-template.html.
const UNIVERSAL_PLASTIC_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 264.4 82.68" width="180" height="56"><defs><style>.cls-1{fill:#ffffff}.cls-2{fill:#ffffff}</style></defs><g><g><path class="cls-2" d="M84.91,31.82l-13.05-22.6C68.74,3.81,62.92.45,56.67.45h-26.1c-6.25,0-12.06,3.36-15.19,8.77L2.34,31.82c-3.12,5.41-3.12,12.13,0,17.54l13.05,22.6c3.12,5.41,8.94,8.77,15.19,8.77h26.1c6.25,0,12.06-3.36,15.19-8.77l13.05-22.6c3.12-5.41,3.12-12.13,0-17.54ZM79.2,52.12l-2.89,5.01c-.02-2.95-.81-5.85-2.29-8.4l-15.63-26.97,6.06-.02,12.94,22.32c1.18,2.04,1.81,4.37,1.81,6.73v1.32ZM49.06,77.17h-3.23c2.54-1.49,4.66-3.63,6.13-6.18l15.36-26.71,3.1,5.36-11.21,19.58c-1.18,2.05-2.88,3.75-4.93,4.94l-5.23,3.02ZM17.67,66l-2.42-1.4-2-3.46.05.03c2.58,1.49,5.52,2.28,8.5,2.28h.03l30.41-.08-2.5,4.35-25.34.09h-.02c-2.35,0-4.68-.62-6.71-1.8ZM34.44,4.33l.55-.32h5.88c-2.54,1.49-4.66,3.63-6.13,6.18l-15.13,26.3-2.89-4.99,12.79-22.24c1.18-2.05,2.88-3.75,4.93-4.93ZM70.63,14.21l3.59,6.22c-2.57-1.47-5.54-2.25-8.46-2.24l-31.56.08,2.8-4.88,28.77-.09h.02c1.66,0,3.29.31,4.84.91ZM54.29,59.8l-21.13.06-11.48-19.81,10.47-18.21h3.04s0,0,0,0l19.1-.05,10.98,18.94-10.97,19.09ZM13.16,32.45l15.9,27.42-6.43.02-14.78-25.5c-.52-.9-.94-1.86-1.24-2.85l4.26-7.38c.04,2.91.83,5.77,2.29,8.29ZM68.07,9.9c-.75-.1-1.51-.16-2.28-.16h-.03l-26.41.08c.97-1.11,2.12-2.06,3.4-2.8l5.23-3.02h8.69c4.54,0,8.8,2.23,11.4,5.89ZM18.47,11c2.22-3.85,6.16-6.4,10.52-6.9-.99,1.01-1.85,2.15-2.56,3.38l-11.52,20.03c-.32-1.16-.49-2.37-.49-3.58v-5.92l4.04-7.01ZM4.46,35.62c.1.19.2.37.31.55l13.46,23.23c-1.1-.3-2.16-.74-3.15-1.31l-5.39-3.11-4.27-7.4c-2.11-3.66-2.43-8.07-.96-11.95ZM18.56,70.33c1.86.68,3.83,1.03,5.83,1.03h.03l23-.08c-.98,1.14-2.15,2.11-3.46,2.87l-5.23,3.02h-8.14c-4.92,0-9.51-2.62-12.02-6.84ZM68.78,70.18c-2.49,4.31-7.13,6.99-12.11,6.99h-.5c2.54-1.49,4.66-3.63,6.13-6.18l9.95-17.37c.33,1.18.5,2.4.5,3.64v6.04l-3.98,6.89ZM82.27,46.75c-.38-1.56-.99-3.07-1.8-4.47l-11.71-20.21c1.31.3,2.58.79,3.75,1.47l5.27,3.04,4.05,7.01c2.33,4.04,2.48,9,.44,13.15Z"/><g><path class="cls-1" d="M115.71,33.35c1.73,0,3.2.26,4.41.76,1.22.5,2.2,1.17,2.97,1.99.76.82,1.32,1.77,1.66,2.83.35,1.06.52,2.16.52,3.29s-.17,2.2-.52,3.27c-.35,1.07-.91,2.02-1.66,2.84-.76.82-1.75,1.49-2.97,1.99-1.22.5-2.69.76-4.41.76h-6.38v9.91h-6.08v-27.63h12.46ZM114.05,46.35c.7,0,1.37-.05,2.01-.16.64-.11,1.21-.3,1.7-.6.49-.3.88-.72,1.18-1.26.3-.54.44-1.25.44-2.12s-.15-1.59-.44-2.12c-.3-.54-.69-.96-1.18-1.26-.49-.3-1.06-.49-1.7-.6-.64-.1-1.32-.16-2.01-.16h-4.72v8.29h4.72Z"/><path class="cls-1" d="M135.15,33.35v22.53h13.47v5.11h-19.54v-27.63h6.08Z"/><path class="cls-1" d="M166.94,33.35l10.34,27.63h-6.31l-2.09-6.15h-10.34l-2.17,6.15h-6.12l10.45-27.63h6.23ZM167.28,50.3l-3.48-10.14h-.07l-3.6,10.14h7.16Z"/><path class="cls-1" d="M184.32,54.17c.34.64.78,1.17,1.33,1.57.55.4,1.2.7,1.95.89.75.19,1.52.29,2.32.29.54,0,1.12-.04,1.74-.13.62-.09,1.2-.26,1.74-.52.54-.26,1-.61,1.36-1.06.36-.45.54-1.03.54-1.72,0-.75-.24-1.35-.72-1.82-.48-.46-1.1-.85-1.88-1.16-.77-.31-1.66-.58-2.64-.82-.98-.23-1.98-.49-2.98-.77-1.03-.26-2.03-.58-3.02-.95-.98-.37-1.86-.86-2.64-1.45-.77-.59-1.4-1.33-1.88-2.22-.48-.89-.72-1.97-.72-3.23,0-1.42.3-2.65.91-3.7.61-1.05,1.4-1.92,2.38-2.61.98-.7,2.09-1.21,3.33-1.55,1.24-.34,2.48-.5,3.71-.5,1.44,0,2.83.16,4.16.49,1.33.32,2.51.85,3.54,1.56,1.03.72,1.85,1.65,2.45,2.77.61,1.12.91,2.49.91,4.09h-5.88c-.05-.82-.22-1.51-.52-2.05-.3-.54-.69-.96-1.18-1.28-.49-.31-1.05-.53-1.68-.66-.63-.13-1.33-.2-2.07-.2-.49,0-.98.05-1.47.16-.49.11-.94.29-1.33.54-.4.26-.73.58-.99.96-.26.39-.39.88-.39,1.47,0,.54.1.98.31,1.32.21.34.61.64,1.22.93.61.29,1.44.57,2.51.85,1.07.28,2.47.64,4.2,1.09.52.11,1.24.29,2.15.56.91.27,1.83.7,2.73,1.29.91.59,1.68,1.38,2.34,2.38.66,1,.99,2.26.99,3.81,0,1.27-.25,2.44-.73,3.53-.49,1.09-1.22,2.02-2.19,2.81-.97.79-2.17,1.4-3.6,1.84-1.43.44-3.09.66-4.97.66-1.52,0-3-.19-4.43-.56-1.43-.37-2.69-.96-3.8-1.76-1.1-.8-1.97-1.82-2.61-3.06-.64-1.24-.96-2.71-.93-4.41h5.88c0,.93.16,1.71.5,2.36l.03-.02Z"/><path class="cls-1" d="M202.62,38.46v-5.11h22.64v5.11h-8.29v22.53h-6.08v-22.53h-8.29,0Z"/><path class="cls-1" d="M234.52,33.35v27.63h-6.08v-27.63h6.08Z"/><path class="cls-1" d="M257.59,40.72c-.36-.58-.82-1.09-1.36-1.53-.54-.44-1.15-.78-1.84-1.03-.68-.25-1.4-.37-2.15-.37-1.37,0-2.53.26-3.48.79-.96.53-1.73,1.24-2.32,2.12-.59.89-1.03,1.9-1.29,3.04-.27,1.14-.4,2.31-.4,3.53s.13,2.29.4,3.38c.27,1.1.7,2.08,1.29,2.96.59.88,1.37,1.58,2.32,2.11.96.53,2.12.79,3.48.79,1.86,0,3.31-.57,4.36-1.71,1.05-1.14,1.68-2.64,1.92-4.49h5.88c-.16,1.73-.55,3.29-1.2,4.69-.64,1.39-1.5,2.58-2.55,3.56-1.06.98-2.3,1.73-3.71,2.25-1.42.52-2.98.77-4.69.77-2.12,0-4.02-.37-5.71-1.1-1.69-.73-3.11-1.75-4.27-3.04-1.16-1.29-2.05-2.81-2.67-4.55-.62-1.74-.93-3.62-.93-5.63s.31-3.98.93-5.75c.62-1.77,1.51-3.31,2.67-4.63,1.16-1.32,2.59-2.35,4.27-3.1s3.59-1.12,5.71-1.12c1.52,0,2.96.22,4.32.66,1.35.44,2.57,1.08,3.64,1.92,1.07.84,1.95,1.88,2.65,3.11.7,1.24,1.14,2.66,1.32,4.26h-5.88c-.11-.7-.34-1.33-.7-1.92v.02Z"/></g></g></g></svg>`;

function esc(s: unknown): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}
function cap(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS_SHORT[Number(m[2]) - 1]} ${m[1]}`;
}

function universalPlasticLogo(x: number, y: number): string {
  return `<g transform="translate(${x},${y})">${UNIVERSAL_PLASTIC_LOGO_SVG}</g>`;
}

function page(inner: string, bg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
${inner}
</svg>`;
}

function sectionBadge(n: string, label: string, y: number): string {
  return `<g>
    <rect x="${M}" y="${y - 12}" width="18" height="18" rx="4" fill="${THEME.accent}"/>
    <text x="${M + 9}" y="${y + 1}" font-family="${FONT}" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">${esc(n)}</text>
    <text x="${M + 28}" y="${y + 1}" font-family="${FONT}" font-size="11" font-weight="700" letter-spacing="0.8" fill="${THEME.accent}">${esc(label.toUpperCase())}</text>
  </g>`;
}

// ---- Cover (page 1) ---- (ports report-template.html .cover)
function coverPage(data: ReportData, type: ReportType, campaign: CampaignScope, meta: ReportMeta): string {
  const title = REPORT_TYPE_TITLES[type];
  const scope = data.scopeLabel;
  const metaRows: Array<[string, string]> = [
    ['PERIOD', data.period.label],
    ['GENERATED', fmtDate(meta.generatedAt)],
    ['DETAIL LEVEL', meta.detail.charAt(0).toUpperCase() + meta.detail.slice(1)],
    ['REPORT ID', meta.reportId],
  ];
  let metaSvg = '';
  let my = 858;
  for (const [k, v] of metaRows) {
    metaSvg += `<text x="${M}" y="${my}" font-family="${FONT}" font-size="11" font-weight="500" letter-spacing="0.6" fill="${THEME.muted2}">${esc(k)}</text>
      <text x="${M + 130}" y="${my}" font-family="${FONT}" font-size="13" font-weight="500" fill="#ffffff">${esc(v)}</text>`;
    my += 26;
  }
  const inner = `
    ${universalPlasticLogo(M - 4, 60)}
    <text x="${M}" y="760" font-family="${FONT}" font-size="34" font-weight="700" fill="#ffffff">${esc(title)}</text>
    <rect x="${M}" y="780" width="64" height="2" fill="${THEME.accent}"/>
    <text x="${M}" y="820" font-family="${FONT}" font-size="16" font-weight="600" fill="${THEME.accent}">${esc(scope)} · ${esc(meta.country)}</text>
    ${metaSvg}
    <text x="${M}" y="1010" font-family="${FONT}" font-size="11" letter-spacing="0.4" fill="${THEME.muted2}">Universal Plastic · Blue Resilience</text>`;
  return page(inner, THEME.ink);
}

// ---- KPI cards ----
function kpiCards(data: ReportData, include: Required<ReportInclude>, y: number): string {
  const cards: Array<{ value: string; unit: string; label: string }> = [
    { value: fmtInt(data.kpis.kg), unit: 'kg', label: 'Total collected' },
    { value: String(data.kpis.co2eqTonnes), unit: 't CO₂eq', label: 'Carbon equivalent' },
    { value: String(data.kpis.cleanups), unit: 'events', label: 'Cleanup events' },
  ];
  if (include.impactIndex) cards.push({ value: String(data.kpis.impactIndex), unit: '/ 100', label: 'Impact Index' });
  else cards.push({ value: String(data.kpis.volunteers), unit: 'people', label: 'Volunteers' });

  const gap = 12;
  const cw = (W - 2 * M - gap * (cards.length - 1)) / cards.length;
  const ch = 88;
  let svg = '';
  for (let i = 0; i < cards.length; i++) {
    const x = M + i * (cw + gap);
    svg += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="8" fill="#ffffff" stroke="${THEME.cardBorder}"/>
      <rect x="${x}" y="${y}" width="${cw}" height="3" rx="1.5" fill="${THEME.accent}"/>
      <text x="${x + 16}" y="${y + 44}" font-family="${FONT}" font-size="26" font-weight="700" fill="${THEME.ink}">${esc(cards[i].value)}</text>
      <text x="${x + 16}" y="${y + 62}" font-family="${FONT}" font-size="11" font-weight="500" fill="${THEME.accent}">${esc(cards[i].unit)}</text>
      <text x="${x + 16}" y="${y + 80}" font-family="${FONT}" font-size="11" fill="${THEME.muted}">${esc(cards[i].label)}</text>`;
  }
  return svg;
}

// ---- Plastic-type horizontal bars ---- (ports template SVG viewBox 0 0 348 196)
function plasticTypeBars(data: ReportData, y: number): string {
  const rows = data.plasticTypes.filter((p) => p.pct > 0);
  const rowH = 30;
  const panelH = 24 + rows.length * rowH;
  const labelX = M + 60;
  const barX = labelX + 8;
  const pxPerPct = 2.6;
  let svg = `<rect x="${M}" y="${y}" width="${W - 2 * M}" height="${panelH}" rx="8" fill="${THEME.panel}"/>`;
  let ry = y + 28;
  for (const r of rows) {
    const bw = Math.max(2, r.pct * pxPerPct);
    svg += `<text x="${labelX}" y="${ry + 4}" font-family="${FONT}" font-size="10" fill="${THEME.ink}" text-anchor="end">${esc(r.type)}</text>
      <rect x="${barX}" y="${ry - 8}" width="${bw.toFixed(1)}" height="14" rx="3" fill="${esc(r.color)}" opacity="0.85"/>
      <text x="${(barX + bw + 6).toFixed(1)}" y="${ry + 4}" font-family="${FONT}" font-size="10" fill="${THEME.muted}">${esc(r.pct)}%</text>`;
    ry += rowH;
  }
  return svg;
}

// ---- Trend line chart ---- (ports template SVG viewBox 0 0 480 160)
function trendLineChart(data: ReportData, y: number): string {
  const pts = data.series;
  const panelW = W - 2 * M;
  const panelH = 200;
  const plotX = M + 44;
  const plotY = y + 20;
  const plotW = panelW - 70;
  const plotH = panelH - 64;
  const baseY = plotY + plotH;
  const maxKg = Math.max(1, ...pts.map((p) => p.kg));
  const n = Math.max(pts.length, 1);
  let svg = `<rect x="${M}" y="${y}" width="${panelW}" height="${panelH}" rx="8" fill="${THEME.panel}"/>
    <line x1="${plotX}" y1="${plotY}" x2="${plotX}" y2="${baseY}" stroke="${THEME.cardBorder}" stroke-width="1"/>
    <line x1="${plotX}" y1="${baseY}" x2="${plotX + plotW}" y2="${baseY}" stroke="${THEME.cardBorder}" stroke-width="1"/>
    <text x="${plotX - 6}" y="${plotY + 6}" font-family="${FONT}" font-size="9" fill="${THEME.muted}" text-anchor="end">${esc(fmtInt(maxKg))}</text>
    <text x="${plotX - 6}" y="${baseY + 4}" font-family="${FONT}" font-size="9" fill="${THEME.muted}" text-anchor="end">0</text>`;
  const coords = pts.map((p, i) => {
    const px = n === 1 ? plotX + plotW / 2 : plotX + (i / (n - 1)) * plotW;
    const py = baseY - (p.kg / maxKg) * plotH;
    return { px, py, label: p.label };
  });
  if (coords.length > 1) {
    const poly = coords.map((c) => `${c.px.toFixed(1)},${c.py.toFixed(1)}`).join(' ');
    svg += `<polyline points="${poly}" fill="none" stroke="${THEME.accent}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  for (const c of coords) {
    svg += `<circle cx="${c.px.toFixed(1)}" cy="${c.py.toFixed(1)}" r="3" fill="${THEME.accent}" stroke="#ffffff" stroke-width="1.5"/>
      <text x="${c.px.toFixed(1)}" y="${baseY + 18}" font-family="${FONT}" font-size="9" fill="${THEME.muted}" text-anchor="middle">${esc(cap(c.label, 7))}</text>`;
  }
  return svg;
}

// ---- Cleanup events table ----
function eventsTable(rows: ReportData['cleanups'], y: number, maxRows: number): { svg: string; rendered: number } {
  const cols = [
    { label: 'DATE', x: M },
    { label: 'LOCATION', x: M + 90 },
    { label: 'CITY', x: M + 250 },
    { label: 'COLLECTED', x: M + 400 },
    { label: 'VOLUNTEERS', x: M + 490 },
    { label: 'STATUS', x: M + 580 },
  ];
  let svg = '';
  for (const c of cols) {
    svg += `<text x="${c.x}" y="${y}" font-family="${FONT}" font-size="9" letter-spacing="0.5" fill="${THEME.muted}">${esc(c.label)}</text>`;
  }
  let ry = y + 12;
  const slice = rows.slice(0, maxRows);
  for (let i = 0; i < slice.length; i++) {
    const r = slice[i];
    ry += 28;
    if (i % 2 === 1) svg += `<rect x="${M}" y="${ry - 18}" width="${W - 2 * M}" height="26" fill="${THEME.panel}"/>`;
    svg += `<text x="${cols[0].x}" y="${ry}" font-family="${FONT}" font-size="10" fill="${THEME.ink}">${esc(r.date)}</text>
      <text x="${cols[1].x}" y="${ry}" font-family="${FONT}" font-size="10" fill="${THEME.ink}">${esc(cap(r.location, 24))}</text>
      <text x="${cols[2].x}" y="${ry}" font-family="${FONT}" font-size="10" fill="${THEME.ink}">${esc(cap(r.city, 22))}</text>
      <text x="${cols[3].x}" y="${ry}" font-family="${FONT}" font-size="10" fill="${THEME.ink}">${esc(r.kg)} kg</text>
      <text x="${cols[4].x}" y="${ry}" font-family="${FONT}" font-size="10" fill="${THEME.ink}">${esc(r.volunteers)}</text>`;
    const isV = r.status === 'verified';
    const fg = isV ? THEME.verifiedFg : THEME.pendingFg;
    const bg = isV ? THEME.verifiedBg : THEME.pendingBg;
    svg += `<rect x="${cols[5].x}" y="${ry - 11}" width="56" height="16" rx="8" fill="${bg}"/>
      <text x="${cols[5].x + 28}" y="${ry}" font-family="${FONT}" font-size="9" font-weight="600" fill="${fg}" text-anchor="middle">${esc(r.status)}</text>`;
  }
  return { svg, rendered: slice.length };
}

// ---- Impact gauge ---- (ports template SVG viewBox 0 0 240 185)
function gauge(data: ReportData, y: number): string {
  const score = Math.max(0, Math.min(100, data.kpis.impactIndex));
  const rating = data.kpis.impactRating;
  const nRot = (score / 100) * 180 - 180;
  const [s0, s1, s2] = THEME.gaugeStops;
  const gw = 260;
  const textX = M + gw + 24;
  return `<svg x="${M}" y="${y}" width="${gw}" height="${gw * 185 / 240}" viewBox="0 0 240 185">
      <defs>
        <linearGradient id="gauge-grad" gradientUnits="userSpaceOnUse" x1="32" y1="0" x2="208" y2="0">
          <stop offset="0" stop-color="${s0}"/><stop offset="0.5" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/>
        </linearGradient>
      </defs>
      <path d="M 32,108 A 88,88 0 0,1 120,20 A 88,88 0 0,1 208,108" fill="none" stroke="url(#gauge-grad)" stroke-width="26" stroke-linecap="round"/>
      <g transform="rotate(${nRot.toFixed(1)} 120 108)">
        <line x1="126" y1="108" x2="189" y2="108" stroke="${THEME.ink}" stroke-width="1.5" stroke-linecap="round"/>
      </g>
      <circle cx="120" cy="108" r="5" fill="${THEME.ink}"/>
      <circle cx="120" cy="108" r="2.5" fill="#ffffff"/>
      <text x="19" y="114" text-anchor="end" font-family="${FONT}" font-size="8" fill="${THEME.muted2}">0</text>
      <text x="221" y="114" text-anchor="start" font-family="${FONT}" font-size="8" fill="${THEME.muted2}">100</text>
      <text x="120" y="152" text-anchor="middle" font-family="${FONT}" font-size="44" font-weight="700" fill="${THEME.ink}">${esc(score)}</text>
      <text x="120" y="171" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="600" fill="${THEME.accent}">${esc(rating)} impact</text>
    </svg>
    <text x="${textX}" y="${y + 70}" font-family="${FONT}" font-size="12" font-weight="600" fill="${THEME.ink}">Score: ${esc(score)} / 100</text>
    <text x="${textX}" y="${y + 92}" font-family="${FONT}" font-size="11" fill="${THEME.body}">The Impact Index combines kg recovered, volunteer</text>
    <text x="${textX}" y="${y + 108}" font-family="${FONT}" font-size="11" fill="${THEME.body}">hours, verified evidence, and campaign consistency</text>
    <text x="${textX}" y="${y + 124}" font-family="${FONT}" font-size="11" fill="${THEME.body}">into a single score. Scores above 76 are rated ${esc(rating)}.</text>`;
}

function mapPlaceholder(y: number): string {
  const w = W - 2 * M;
  return `<rect x="${M}" y="${y}" width="${w}" height="120" rx="8" fill="${THEME.panel}" stroke="${THEME.cardBorder}" stroke-dasharray="4 4"/>
    <text x="${M + w / 2}" y="${y + 66}" font-family="${FONT}" font-size="11" fill="${THEME.muted}" text-anchor="middle">Interactive map available in Blue Resilience OS dashboard</text>`;
}

function contentHeader(data: ReportData, type: ReportType): string {
  const t = `${REPORT_TYPE_TITLES[type]} — ${data.period.label}`;
  return `<text x="${M}" y="${M}" font-family="${FONT}" font-size="11" font-weight="600" fill="${THEME.ink}">Universal Plastic · Blue Resilience</text>
    <text x="${M + 230}" y="${M}" font-family="${FONT}" font-size="11" fill="${THEME.muted}">· ${esc(t)}</text>
    <text x="${W - M}" y="${M}" font-family="${FONT}" font-size="10" fill="${THEME.muted}" text-anchor="end">${esc(data.scopeLabel)}</text>
    <line x1="${M}" y1="${M + 12}" x2="${W - M}" y2="${M + 12}" stroke="${THEME.cardBorder}"/>`;
}

function contentFooter(meta: ReportMeta): string {
  return `<line x1="${M}" y1="${H - 70}" x2="${W - M}" y2="${H - 70}" stroke="${THEME.cardBorder}"/>
    <text x="${M}" y="${H - 52}" font-family="${FONT}" font-size="10" fill="${THEME.muted}">Universal Plastic · Blue Resilience · ${esc(meta.reportId)}</text>
    <text x="${W - M}" y="${H - 52}" font-family="${FONT}" font-size="10" fill="${THEME.muted}" text-anchor="end">Generated ${esc(fmtDate(meta.generatedAt))}</text>`;
}

export function buildReportPages(opts: {
  data: ReportData;
  type: ReportType;
  detail: ReportDetail;
  include: Required<ReportInclude>;
  campaign: CampaignScope;
  meta: ReportMeta;
}): string[] {
  const { data, type, detail, include, campaign, meta } = opts;
  const pages: string[] = [];

  // Page 1 — cover.
  pages.push(coverPage(data, type, campaign, meta));

  // Page 2 — KPIs + plastic types + trend.
  {
    let body = contentHeader(data, type);
    let y = 110;
    if (include.kpis) {
      body += sectionBadge('01', 'KPIs & metrics', y);
      body += kpiCards(data, include, y + 16);
      y += 140;
    }
    if (include.plasticTypes) {
      body += sectionBadge('02', 'Plastic types', y);
      body += plasticTypeBars(data, y + 16);
      y += 16 + (24 + data.plasticTypes.filter((p) => p.pct > 0).length * 30) + 30;
    }
    if (include.charts && detail !== 'summary') {
      body += sectionBadge('03', type === 'annual' ? 'Monthly trend' : 'Trend', y);
      body += trendLineChart(data, y + 16);
    }
    pages.push(page(body + contentFooter(meta), THEME.bg));
  }

  // Page 3 — events table + gauge + map (skipped in summary detail).
  if (detail !== 'summary') {
    const rowsThisPage = detail === 'detailed' ? 12 : 10;
    let body = contentHeader(data, type);
    let y = 110;
    if (include.cleanupsList) {
      body += sectionBadge('04', 'Cleanup events', y);
      const { svg } = eventsTable(data.cleanups, y + 30, rowsThisPage);
      body += svg;
      y += 30 + 12 + Math.min(data.cleanups.length, rowsThisPage) * 28 + 40;
    }
    if (include.impactIndex && type !== 'evidence') {
      body += sectionBadge('05', 'Impact index', y);
      body += gauge(data, y + 16);
      y += 320;
    }
    if (include.map) {
      body += sectionBadge('06', 'Location overview', y);
      body += mapPlaceholder(y + 16);
    }
    pages.push(page(body + contentFooter(meta), THEME.bg));

    // Detailed: overflow remaining events onto extra pages.
    if (detail === 'detailed' && data.cleanups.length > rowsThisPage) {
      let offset = rowsThisPage;
      while (offset < data.cleanups.length) {
        let ob = contentHeader(data, type);
        ob += sectionBadge('04', 'Cleanup events (cont.)', 110);
        const { svg, rendered } = eventsTable(data.cleanups.slice(offset), 140, 24);
        ob += svg;
        pages.push(page(ob + contentFooter(meta), THEME.bg));
        offset += rendered;
        if (rendered === 0) break;
      }
    }
  }

  return pages;
}
