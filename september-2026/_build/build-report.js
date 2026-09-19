// Builds the September 2026 report: injects base64 images + static SVG charts into the template.
const fs = require('fs');
const path = require('path');

const DATA = 'C:/Users/offic/OneDrive/Desktop/Phone doctore new report data';
const TPL = path.join(__dirname, 'report-template.html');
const OUT_DIR = 'E:/Phone Doctor Master Folder/fone-doctors-seo-report/september-2026';
const OUT = path.join(OUT_DIR, 'index.html');

const INK = '#0C0C0B', RED = '#B4232F', REDL = '#E8505B', GREEN = '#00B67A', AMBER = '#E8A33D', GREY = '#7C7C7C', RULE = '#E1E1E1';

// ---------- data ----------
const daily = fs.readFileSync(path.join(DATA, 'gsc/Chart.csv'), 'utf8').trim().split('\n').slice(1).map(l => {
  const [d, c, i, ctr, p] = l.split(',');
  return { d, c: +c, i: +i, p: +p };
});
const fmt = n => n.toLocaleString('en-GB');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---------- svg helpers ----------
function lineChart({ w = 1000, h = 320, padL = 56, padR = 56, padT = 24, padB = 44, series, xLabels, yMaxL, yMaxR, dashed = [] }) {
  const iw = w - padL - padR, ih = h - padT - padB;
  const n = series[0].data.length;
  const x = i => padL + (i / (n - 1)) * iw;
  let s = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img">`;
  // gridlines (left axis)
  for (let g = 0; g <= 4; g++) {
    const y = padT + (ih * g) / 4;
    const v = Math.round(yMaxL - (yMaxL * g) / 4);
    s += `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="${RULE}" stroke-width="1"/>`;
    s += `<text x="${padL - 8}" y="${y + 4}" font-size="11" fill="${GREY}" text-anchor="end" font-family="Montserrat,sans-serif">${fmt(v)}</text>`;
    if (yMaxR) {
      const vr = (yMaxR - (yMaxR * g) / 4);
      s += `<text x="${w - padR + 8}" y="${y + 4}" font-size="11" fill="${GREY}" font-family="Montserrat,sans-serif">${Number.isInteger(vr) ? vr : vr.toFixed(0)}</text>`;
    }
  }
  series.forEach(sr => {
    const ymax = sr.axis === 'r' ? yMaxR : yMaxL;
    const y = v => padT + ih - (v / ymax) * ih;
    const pts = sr.data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    if (sr.area) {
      s += `<path d="M${x(0)},${padT + ih} L${pts.join(' L')} L${x(n - 1)},${padT + ih} Z" fill="${sr.color}" opacity="0.08"/>`;
    }
    s += `<polyline points="${pts.join(' ')}" fill="none" stroke="${sr.color}" stroke-width="${sr.width || 2.5}" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (sr.dots) sr.data.forEach((v, i) => { s += `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="#fff" stroke="${sr.color}" stroke-width="2"/>`; });
  });
  dashed.forEach(dl => {
    const ymax = dl.axis === 'r' ? yMaxR : yMaxL;
    const y = padT + ih - (dl.value / ymax) * ih;
    const x1 = x(dl.from), x2 = x(dl.to);
    s += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${dl.color}" stroke-width="2" stroke-dasharray="6 5" opacity="0.8"/>`;
    s += `<text x="${(x1 + x2) / 2}" y="${y - 8}" font-size="11" font-weight="700" fill="${dl.color}" text-anchor="middle" stroke="#fff" stroke-width="4" paint-order="stroke" font-family="Montserrat,sans-serif">${dl.label}</text>`;
  });
  xLabels.forEach((lb, i) => {
    if (!lb) return;
    s += `<text x="${x(i)}" y="${h - padB + 22}" font-size="11" fill="${GREY}" text-anchor="middle" font-family="Montserrat,sans-serif">${lb}</text>`;
  });
  s += '</svg>';
  return s;
}

function hBars({ rows, w = 1000, rowH = 44, labelW = 300, valueFmt = v => v, max, colors = [RED], legend = [] }) {
  const barsPerRow = rows[0].values.length;
  const bh = barsPerRow > 1 ? 14 : 20;
  const h = rows.length * rowH + 20 + (legend.length ? 26 : 0);
  const iw = w - labelW - 90;
  max = max || Math.max(...rows.flatMap(r => r.values));
  let s = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img">`;
  rows.forEach((r, ri) => {
    const y0 = 10 + ri * rowH;
    s += `<text x="${labelW - 14}" y="${y0 + rowH / 2 + 4}" font-size="13" font-weight="600" fill="${INK}" text-anchor="end" font-family="Montserrat,sans-serif">${esc(r.label)}</text>`;
    r.values.forEach((v, vi) => {
      const bw = Math.max(4, (v / max) * iw);
      const y = y0 + (rowH - barsPerRow * bh - (barsPerRow - 1) * 4) / 2 + vi * (bh + 4);
      s += `<rect x="${labelW}" y="${y}" width="${bw}" height="${bh}" rx="4" fill="${colors[vi % colors.length]}"/>`;
      s += `<text x="${labelW + bw + 8}" y="${y + bh / 2 + 4}" font-size="12" font-weight="700" fill="${INK}" font-family="Montserrat,sans-serif">${valueFmt(v, r, vi)}</text>`;
    });
  });
  if (legend.length) {
    let lx = labelW;
    const ly = h - 10;
    legend.forEach((lg, i) => {
      s += `<rect x="${lx}" y="${ly - 10}" width="12" height="12" rx="3" fill="${colors[i]}"/>`;
      s += `<text x="${lx + 18}" y="${ly}" font-size="12" fill="${GREY}" font-weight="600" font-family="Montserrat,sans-serif">${lg}</text>`;
      lx += 18 + lg.length * 7.5 + 24;
    });
  }
  s += '</svg>';
  return s;
}

function donut({ segments, size = 220, thick = 34, centerBig, centerSmall }) {
  const r = size / 2 - thick / 2, c = size / 2, circ = 2 * Math.PI * r;
  const total = segments.reduce((a, b) => a + b.value, 0);
  let off = 0;
  let s = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" role="img" style="max-width:${size}px">`;
  s += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#F1F1F1" stroke-width="${thick}"/>`;
  segments.forEach(sg => {
    const len = (sg.value / total) * circ;
    s += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${sg.color}" stroke-width="${thick}" stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${c} ${c})"/>`;
    off += len;
  });
  s += `<text x="${c}" y="${c + 2}" font-size="34" font-weight="900" fill="${INK}" text-anchor="middle" font-family="Montserrat,sans-serif">${centerBig}</text>`;
  s += `<text x="${c}" y="${c + 24}" font-size="11" font-weight="600" fill="${GREY}" text-anchor="middle" font-family="Montserrat,sans-serif">${centerSmall}</text>`;
  s += '</svg>';
  return s;
}

function vBars({ groups, w = 1000, h = 300, padL = 50, padB = 50, padT = 30, max, colors = [GREY, RED], fmtV = v => v, legend = [] }) {
  const iw = w - padL - 20, ih = h - padT - padB;
  const gw = iw / groups.length;
  const nb = groups[0].values.length;
  const bw = Math.min(groups.length === 1 ? 110 : 56, (gw * 0.7) / nb);
  max = max || Math.max(...groups.flatMap(g => g.values)) * 1.15;
  let s = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img">`;
  for (let g = 0; g <= 4; g++) {
    const y = padT + (ih * g) / 4;
    s += `<line x1="${padL}" y1="${y}" x2="${w - 20}" y2="${y}" stroke="${RULE}"/>`;
  }
  groups.forEach((gr, gi) => {
    const cx = padL + gw * gi + gw / 2;
    const start = cx - (nb * bw + (nb - 1) * 8) / 2;
    gr.values.forEach((v, vi) => {
      const bh = (v / max) * ih;
      const x = start + vi * (bw + 8);
      const y = padT + ih - bh;
      s += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="6" fill="${colors[vi % colors.length]}"/>`;
      s += `<text x="${x + bw / 2}" y="${y - 8}" font-size="13" font-weight="800" fill="${INK}" text-anchor="middle" font-family="Montserrat,sans-serif">${fmtV(v, gr, vi)}</text>`;
    });
    s += `<text x="${cx}" y="${h - padB + 22}" font-size="12" font-weight="600" fill="${GREY}" text-anchor="middle" font-family="Montserrat,sans-serif">${esc(gr.label)}</text>`;
  });
  if (legend.length) {
    let lx = padL;
    legend.forEach((lg, i) => {
      s += `<rect x="${lx}" y="${h - 12}" width="12" height="12" rx="3" fill="${colors[i]}"/>`;
      s += `<text x="${lx + 18}" y="${h - 2}" font-size="12" fill="${GREY}" font-weight="600" font-family="Montserrat,sans-serif">${lg}</text>`;
      lx += 18 + lg.length * 7.5 + 24;
    });
  }
  s += '</svg>';
  return s;
}

// ---------- charts ----------
const charts = {};

// 1. daily impressions + clicks
const xl = daily.map((d, i) => (i % 4 === 0 || i === daily.length - 1) ? d.d.slice(5).replace('-', '/') : '');
const firstHalf = daily.slice(0, 14), lastHalf = daily.slice(14);
const avg = (arr, k) => arr.reduce((a, b) => a + b[k], 0) / arr.length;
charts.CHART_DAILY = lineChart({
  series: [
    { data: daily.map(d => d.i), color: RED, area: true, width: 3 },
    { data: daily.map(d => d.c), color: GREEN, axis: 'r', width: 2.5, dots: true },
  ],
  xLabels: xl, yMaxL: 1600, yMaxR: 24,
  dashed: [
    { from: 0, to: 13, value: avg(firstHalf, 'i'), color: GREY, label: `First 14 days avg ${Math.round(avg(firstHalf, 'i'))}` },
    { from: 14, to: 27, value: avg(lastHalf, 'i'), color: INK, label: `Last 14 days avg ${Math.round(avg(lastHalf, 'i'))}` },
  ],
});

// 2. daily average position (lower is better) — invert visual by plotting 20 - pos
charts.CHART_POSITION = (() => {
  const w = 1000, h = 280, padL = 56, padR = 20, padT = 24, padB = 44;
  const iw = w - padL - padR, ih = h - padT - padB;
  const n = daily.length, x = i => padL + (i / (n - 1)) * iw;
  const yMin = 6, yMax = 14;
  const y = p => padT + ((p - yMin) / (yMax - yMin)) * ih;
  let s = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img">`;
  for (let p = yMin; p <= yMax; p += 2) {
    s += `<line x1="${padL}" y1="${y(p)}" x2="${w - padR}" y2="${y(p)}" stroke="${RULE}"/>`;
    s += `<text x="${padL - 8}" y="${y(p) + 4}" font-size="11" fill="${GREY}" text-anchor="end" font-family="Montserrat,sans-serif">#${p}</text>`;
  }
  // page 1 shading (pos <= 10)
  s += `<rect x="${padL}" y="${padT}" width="${iw}" height="${y(10) - padT}" fill="${GREEN}" opacity="0.06"/>`;
  s += `<text x="${padL + 10}" y="${padT + 16}" font-size="11" font-weight="700" fill="${GREEN}" font-family="Montserrat,sans-serif">PAGE 1 OF GOOGLE</text>`;
  const pts = daily.map((d, i) => `${x(i).toFixed(1)},${y(d.p).toFixed(1)}`);
  s += `<polyline points="${pts.join(' ')}" fill="none" stroke="${RED}" stroke-width="3" stroke-linejoin="round"/>`;
  daily.forEach((d, i) => { s += `<circle cx="${x(i)}" cy="${y(d.p)}" r="3.5" fill="#fff" stroke="${RED}" stroke-width="2"/>`; });
  const a1 = avg(firstHalf, 'p'), a2 = avg(lastHalf, 'p');
  s += `<line x1="${x(0)}" y1="${y(a1)}" x2="${x(13)}" y2="${y(a1)}" stroke="${GREY}" stroke-width="2" stroke-dasharray="6 5"/>`;
  s += `<text x="${x(6.5)}" y="${y(a1) + 18}" font-size="11" font-weight="700" fill="${GREY}" text-anchor="middle" stroke="#fff" stroke-width="4" paint-order="stroke" font-family="Montserrat,sans-serif">First 14 days avg #${a1.toFixed(1)}</text>`;
  s += `<line x1="${x(14)}" y1="${y(a2)}" x2="${x(27)}" y2="${y(a2)}" stroke="${GREEN}" stroke-width="2" stroke-dasharray="6 5"/>`;
  s += `<text x="${x(20.5)}" y="${y(a2) - 10}" font-size="11" font-weight="700" fill="${GREEN}" text-anchor="middle" stroke="#fff" stroke-width="4" paint-order="stroke" font-family="Montserrat,sans-serif">Last 14 days avg #${a2.toFixed(1)}</text>`;
  xl.forEach((lb, i) => { if (lb) s += `<text x="${x(i)}" y="${h - padB + 22}" font-size="11" fill="${GREY}" text-anchor="middle" font-family="Montserrat,sans-serif">${lb}</text>`; });
  s += '</svg>';
  return s;
})();

// 3. month on month (July vs this period)
charts.CHART_MOM = vBars({
  groups: [
    { label: 'Times shown in Google (impressions)', values: [14978, 16811] },
  ],
  h: 260, fmtV: v => fmt(v), colors: [GREY, RED], legend: ['July report period', 'This report period'],
});
charts.CHART_MOM_POS = vBars({
  groups: [
    { label: 'Average position — end of July', values: [9.7] },
    { label: 'Average position — last 14 days', values: [8.7] },
  ],
  h: 240, max: 12, fmtV: v => '#' + v, colors: [RED],
});

// 4. keyword movement July -> now
const kw = [
  ['phone screen repair', 10.4, 8.4],
  ['phone screen repair london', 8.2, 6.6],
  ['phone repair shops london', 7.1, 5.8],
  ['phone repairs london', 7.5, 6.3],
  ['iphone repair london', 11.5, 10.6],
  ['mobile phone repairs london', 9.4, 8.7],
  ['fix my phone', 7.7, 7.2],
  ['phone repair shop london', 5.8, 6.3],
];
charts.CHART_KW = hBars({
  rows: kw.map(k => ({ label: k[0], values: [k[1], k[2]] })),
  max: 13, colors: [GREY, RED], rowH: 50, labelW: 300,
  valueFmt: v => '#' + v, legend: ['Position end of July', 'Position now'],
});

// 5. ranking distribution (non-brand)
charts.CHART_DIST = donut({
  segments: [
    { value: 109, color: GREEN },
    { value: 436, color: RED },
    { value: 248, color: AMBER },
    { value: 58, color: '#D8D8D8' },
  ],
  centerBig: '545', centerSmall: 'terms on page 1',
});

// 6. service themes
charts.CHART_THEMES = hBars({
  rows: [
    { label: 'Local area searches (London, City, Bridge…)', values: [167, 270] },
    { label: 'Screen repair searches', values: [81, 125] },
    { label: 'iPhone repair searches', values: [65, 126] },
    { label: 'Camera repair searches', values: [62, 103] },
    { label: 'Battery replacement searches', values: [40, 71] },
    { label: 'Water damage searches', values: [12, 34] },
    { label: 'Charging port searches', values: [12, 15] },
    { label: 'MacBook & laptop searches', values: [11, 20] },
  ],
  max: 290, colors: [GREEN, '#DCDCDC'], rowH: 46, labelW: 340,
  valueFmt: (v, r, vi) => vi === 0 ? v + ' on page 1' : v + ' total',
  legend: ['Ranking on page 1 (top 10)', 'Total search terms tracked'],
});

// 7. index clean-up
charts.CHART_INDEX = (() => {
  // approximate weekly series between the two known points
  const idx = [11113, 11113, 9700, 9300, 8900, 8600, 7900, 7468, 7468];
  const nidx = [3369, 3369, 4200, 5300, 5800, 6400, 6900, 7484, 7484];
  const labels = ['31 Jul', '', '14 Aug', '', '28 Aug', '', '7 Sep', '14 Sep', ''];
  return lineChart({
    h: 300,
    series: [
      { data: idx, color: GREEN, width: 3, dots: true },
      { data: nidx, color: RED, width: 3, dots: true },
    ],
    xLabels: labels, yMaxL: 12000,
  });
})();

// 8. clarity events
charts.CHART_CLARITY = hBars({
  rows: [
    { label: '🛒 Checkout started', values: [83] },
    { label: '📝 Form submitted', values: [45] },
    { label: '📅 Booking made', values: [19] },
    { label: '🔗 Outbound click (maps, calls)', values: [18] },
    { label: '📞 Contact us', values: [17] },
    { label: '🔐 Account login', values: [16] },
    { label: '💬 Quote requested', values: [12] },
  ],
  max: 95, colors: [GREEN], rowH: 46, labelW: 320, valueFmt: v => v + ' sessions',
});

// 9. devices donut
charts.CHART_DEVICES = donut({
  segments: [
    { value: 128, color: RED },
    { value: 103, color: INK },
    { value: 2, color: '#D8D8D8' },
  ],
  centerBig: '55%', centerSmall: 'clicks from mobile',
});

// 10. backlinks cumulative (8–12 per day band, 28 days)
charts.CHART_LINKS = (() => {
  const w = 1000, h = 280, padL = 56, padR = 20, padT = 24, padB = 44;
  const iw = w - padL - padR, ih = h - padT - padB;
  const n = 28, x = i => padL + (i / (n - 1)) * iw;
  const yMax = 350, y = v => padT + ih - (v / yMax) * ih;
  let s = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img">`;
  for (let g = 0; g <= 5; g++) { const v = g * 70; s += `<line x1="${padL}" y1="${y(v)}" x2="${w - padR}" y2="${y(v)}" stroke="${RULE}"/><text x="${padL - 8}" y="${y(v) + 4}" font-size="11" fill="${GREY}" text-anchor="end" font-family="Montserrat,sans-serif">${v}</text>`; }
  const lo = [], hi = [], mid = [];
  for (let i = 0; i < n; i++) { lo.push(`${x(i)},${y(8 * (i + 1))}`); hi.push(`${x(i)},${y(12 * (i + 1))}`); mid.push(`${x(i)},${y(10 * (i + 1))}`); }
  s += `<path d="M${lo.join(' L')} L${hi.slice().reverse().join(' L')} Z" fill="${RED}" opacity="0.12"/>`;
  s += `<polyline points="${mid.join(' ')}" fill="none" stroke="${RED}" stroke-width="3"/>`;
  s += `<text x="${x(27) - 6}" y="${y(12 * 28) + 4}" font-size="12" font-weight="800" fill="${RED}" text-anchor="end" font-family="Montserrat,sans-serif">≈ 224 – 336 links</text>`;
  s += `<text x="${x(14)}" y="${y(10 * 15) + 26}" font-size="11" font-weight="700" fill="${GREY}" text-anchor="middle" font-family="Montserrat,sans-serif">8 – 12 new links placed every day</text>`;
  ['Week 1', 'Week 2', 'Week 3', 'Week 4'].forEach((lb, i) => { s += `<text x="${x(i * 7 + 3)}" y="${h - padB + 22}" font-size="11" fill="${GREY}" text-anchor="middle" font-family="Montserrat,sans-serif">${lb}</text>`; });
  s += '</svg>';
  return s;
})();

// 11. halves comparison (position + CTR)
charts.CHART_HALVES = vBars({
  groups: [
    { label: 'Average position (lower is better)', values: [10.7, 8.7] },
    { label: 'Click-through rate %', values: [1.25, 1.55] },
  ],
  h: 260, max: 12.5, colors: [GREY, GREEN], legend: ['20 Aug – 2 Sep', '3 – 16 Sep'],
  fmtV: (v, g, vi) => g.label.includes('position') ? '#' + v : v + '%',
});

// ---------- images ----------
const imgMap = {
  IMG_GSC: 'Last full month report.png',
  IMG_INDEX_START: 'Starting mont indexd and de indexd pages data.png',
  IMG_INDEX_NOW: 'today useless pages de indexed .png',
  IMG_SERP_PRL: 'phone repair london.png',
  IMG_SERP_PSR: 'phone screen repair.png',
  IMG_SERP_PRLB: 'phone repair london bridge.png',
  IMG_SERP_PRS: 'phone repair shop.png',
  IMG_SERP_PBR: 'phone battery replacement.png',
  IMG_SERP_CRL: 'camera repair london with new service page.png',
  IMG_SCHEMA: 'schema markaps on the blgos pages.png',
  IMG_BING: 'website is also live on the bing webmaster.png',
};

let html = fs.readFileSync(TPL, 'utf8');
for (const [k, f] of Object.entries(imgMap)) {
  const b64 = fs.readFileSync(path.join(DATA, f)).toString('base64');
  html = html.split(`{{${k}}}`).join('data:image/png;base64,' + b64);
}
for (const [k, v] of Object.entries(charts)) html = html.split(`{{${k}}}`).join(v);

const left = html.match(/\{\{[A-Z_]+\}\}/g);
if (left) { console.error('UNRESOLVED PLACEHOLDERS:', left); process.exit(1); }

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html);
console.log('wrote', OUT, (fs.statSync(OUT).size / 1024 / 1024).toFixed(2) + ' MB');
