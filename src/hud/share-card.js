// The share image, drawn on an offscreen canvas: Story 1080×1920 or Quadrat 1080×1080 (and the 1200×630 social
// preview, public/og.jpg). The logo, a hero render of the mulassa (main.js renderHero(): a render target, never the
// screen's buffer), the stars in the medallion, ENCERTS as the big number, RATXA (the best streak), the level, the record
// ribbon, an optional nickname and the address. No QR, nothing fetched.
import { drawStars } from './stars.js';
import { SITE_LABEL, CARD_FILE } from '../services/share.js';

const FORMATS = { story: { w: 1080, h: 1920 }, square: { w: 1080, h: 1080 }, og: { w: 1200, h: 630 } };
export const PHOTO = { story: [960, 540], square: [992, 360], og: [1560, 630] }; // the hero render's size per format (css = image px)
const BALOO = "'Baloo 2', system-ui, sans-serif", PIXEL = "'Jersey 10', monospace";
const INK = { cream: '#fff3d6', gold: '#f5c518', red: '#c0283c', dark: '#2a1a10', soft: '#e8d8b8', score: '#c9a7ff' }; // score = C.score (sprites.js): points only
const HEAD = { clear: ['BALL COMPLET!', INK.gold], fail: ['TORNEM-HI!', '#6fa8ff'] }; // a collapse is never shared

export async function loadCardFonts(fonts) { // before drawing: a card drawn with the fallback font is shared as is
  try { await Promise.all(['800 80px "Baloo 2"', '600 40px "Baloo 2"', '80px "Jersey 10"'].map(f => fonts?.load(f))); } catch { /* system font */ }
}

function outlined(c, s, x, y, size, fill, stroke, font = BALOO, weight = 800, lw = size * 0.16) {
  c.font = `${font === PIXEL ? '' : weight + ' '}${size}px ${font}`;
  c.lineJoin = 'round'; c.lineWidth = lw; c.strokeStyle = stroke;
  if (lw) c.strokeText(s, x, y);
  c.fillStyle = fill; c.fillText(s, x, y);
}
function fit(c, s, size, maxW, font = BALOO, weight = 800) { // the font size that keeps s within maxW
  c.font = `${font === PIXEL ? '' : weight + ' '}${size}px ${font}`;
  const w = c.measureText(s).width;
  return w > maxW ? size * maxW / w : size;
}
function logo(c, cx, y, s) { // MULASSA (pixel, red, cream outline) over TAP TAP DANCE (gold), as on the title
  c.textAlign = 'center'; c.textBaseline = 'middle';
  outlined(c, 'MULASSA', cx, y, s, INK.red, INK.cream, PIXEL, 0, s * 0.1);
  outlined(c, 'TAP TAP DANCE', cx, y + s * 0.72, s * 0.36, INK.gold, INK.dark);
}
function photo(c, hero, x, y, w, h, r, ax = 0.5) { // the render, framed (cover; ax: which side a wider one keeps); without WebGL a sky and a plaça stand in
  c.save();
  c.beginPath(); c.roundRect(x, y, w, h, r); c.clip();
  if (hero) {
    const k = Math.max(w / hero.width, h / hero.height), hw = hero.width * k, hh = hero.height * k;
    c.drawImage(hero, x + (w - hw) * ax, y + (h - hh) / 2, hw, hh);
  }
  else {
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#8fd3ff'); g.addColorStop(0.62, '#cfeaff'); g.addColorStop(0.63, '#c9a36b'); g.addColorStop(1, '#a8834f');
    c.fillStyle = g; c.fillRect(x, y, w, h);
  }
  const shade = c.createLinearGradient(0, y + h * 0.7, 0, y + h); // the ribbon reads on any background
  shade.addColorStop(0, 'rgba(28,17,10,0)'); shade.addColorStop(1, 'rgba(28,17,10,0.45)');
  c.fillStyle = shade; c.fillRect(x, y, w, h);
  c.restore();
  c.beginPath(); c.roundRect(x, y, w, h, r); c.lineWidth = 6; c.strokeStyle = INK.gold; c.stroke();
}
function ribbon(c, s, cx, cy, size) { // gold pill, dark letters, a star at each end (drawResults' record badge)
  c.font = `800 ${size}px ${BALOO}`;
  const w = c.measureText(s).width + size * 2.6, h = size * 1.7;
  c.save(); c.translate(cx, cy); c.rotate(-0.035);
  c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, h / 2);
  c.fillStyle = INK.gold; c.fill(); c.lineWidth = size * 0.12; c.strokeStyle = INK.dark; c.stroke();
  c.fillStyle = INK.dark; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, 0, size * 0.06);
  for (const sx of [-1, 1]) star(c, sx * (w / 2 - size * 0.75), 0, size * 0.42, INK.dark);
  c.restore();
}
function star(c, x, y, r, col) {
  c.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r; c.lineTo(x + Math.sin(a) * rr, y - Math.cos(a) * rr); }
  c.closePath(); c.fillStyle = col; c.fill();
}
const medallion = (c, stars, x, y, r) => drawStars(c, stars, x, y, r); // settled: the image is a still
function pill(c, s, x, y, size, col, align = 'left') { // a flat tag: coloured strip on the left, no outline (a note, not a button)
  c.font = `800 ${size}px ${BALOO}`;
  const w = c.measureText(s).width + size * 1.1, h = size * 1.6, x0 = align === 'center' ? x - w / 2 : x;
  c.fillStyle = 'rgba(255,243,214,0.08)'; c.beginPath(); c.roundRect(x0, y - h / 2, w, h, 6); c.fill();
  c.fillStyle = col; c.fillRect(x0, y - h / 2, size * 0.18, h);
  c.fillStyle = INK.cream; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(s, x0 + size * 0.6, y + size * 0.05);
  return w;
}
const pillWidth = (c, s, size) => { c.font = `800 ${size}px ${BALOO}`; return c.measureText(s).width + size * 1.1; };
function chips(c, list, cx, y, size, gap) { // the flat tags in one row, centred as a group
  const ws = list.map(([s]) => pillWidth(c, s, size));
  let x = cx - (ws.reduce((a, b) => a + b, 0) + gap * (list.length - 1)) / 2;
  list.forEach(([s, col], i) => { pill(c, s, x, y, size, col); x += ws[i] + gap; });
}
function bunting(c, x0, x1, y, sag, n, size) { // the plaça's garland of flags (banderetes): a sagging string, triangles hanging from it
  const at = t => [x0 + (x1 - x0) * t, y + sag * 4 * t * (1 - t)];
  const cols = ['#f5c518', '#ff7a1a', '#14b8a6', '#ff8fb1', '#c0283c'];
  c.save();
  c.beginPath(); for (let i = 0; i <= 40; i++) c.lineTo(...at(i / 40));
  c.lineWidth = 3; c.strokeStyle = 'rgba(232,216,184,0.45)'; c.stroke();
  for (let i = 0; i < n; i++) {
    const [ax, ay] = at((i + 0.15) / n), [bx, by] = at((i + 0.85) / n), mx = (ax + bx) / 2, my = (ay + by) / 2;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(mx, my + size); c.closePath();
    c.globalAlpha = 0.8; c.fillStyle = cols[i % cols.length]; c.fill();
  }
  c.restore();
}
// ink ascent of a string (cap height for caps/digits): what the layout measures, so gaps are between glyphs, not text boxes
function ascent(c, s, size, font = BALOO, weight = 800) {
  c.font = `${font === PIXEL ? '' : weight + ' '}${size}px ${font}`; c.textBaseline = 'alphabetic'; // ascents are from the baseline
  return c.measureText(s).actualBoundingBoxAscent ?? size * 0.72;
}
// the star medallion and ENCERTS over the % side by side, centred as ONE group (never left-heavy): the label is centred
// over the number, the two-line stack is centred on the medallion's middle
function score(c, d, cx, cy, r, labelSize, pctSize) {
  const p = `${d.pct}%`, gap = r * 0.36, inner = labelSize * 0.32, lw1 = labelSize * 0.16, lw2 = pctSize * 0.085;
  const a1 = ascent(c, 'ENCERTS', labelSize), a2 = ascent(c, p, pctSize);
  const inkOf = (s, size, lw) => { // ink width incl. the outline, and how far the ink's middle sits right of the text origin (side bearings)
    c.font = `800 ${size}px ${BALOO}`; const m = c.measureText(s), l = m.actualBoundingBoxLeft ?? 0, rr = m.actualBoundingBoxRight ?? m.width;
    return [l + rr + lw, (rr - l) / 2];
  };
  const [lw, ldx] = inkOf('ENCERTS', labelSize, lw1), [pw, pdx] = inkOf(p, pctSize, lw2);
  const col = Math.max(lw, pw), x0 = cx - (2 * r + gap + col) / 2, tx = x0 + 2 * r + gap + col / 2;
  medallion(c, d.stars, x0 + r, cy, r);
  const top = cy - (a1 + lw1 + inner + a2 + lw2) / 2, b1 = top + lw1 / 2 + a1, b2 = b1 + lw1 / 2 + inner + lw2 / 2 + a2;
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  outlined(c, 'ENCERTS', tx - ldx, b1, labelSize, INK.cream, INK.dark);
  outlined(c, p, tx - pdx, b2, pctSize, INK.gold, INK.dark, BALOO, 800, lw2);
  c.textBaseline = 'middle';
}
function confetti(c, w, y0, y1, n, seed) { // festive, faint, deterministic: only in the story's covered bands
  const cols = ['#f5c518', '#ff7a1a', '#14b8a6', '#ff8fb1'];
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  c.save();
  for (let i = 0; i < n; i++) {
    c.globalAlpha = 0.18 + rnd() * 0.2; c.fillStyle = cols[i % 4];
    c.save(); c.translate(60 + rnd() * (w - 120), y0 + rnd() * (y1 - y0)); c.rotate(rnd() * Math.PI);
    c.fillRect(-9, -4, 18, 8); c.restore();
  }
  c.restore();
}
function frame(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#3a2414'); g.addColorStop(1, '#1c110a');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.beginPath(); c.roundRect(18, 18, w - 36, h - 36, 34); c.lineWidth = 5; c.strokeStyle = 'rgba(245,197,24,0.55)'; c.stroke();
}
function address(c, cx, y, size) { // the og card's gold pill (same proportions: 34 px text in a 60 px pill)
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `800 ${size}px ${BALOO}`;
  const w = c.measureText(SITE_LABEL).width + size * 1.65, h = size * 1.76;
  c.beginPath(); c.roundRect(cx - w / 2, y - h / 2, w, h, h / 2); c.fillStyle = INK.gold; c.fill();
  c.fillStyle = INK.dark; c.fillText(SITE_LABEL, cx, y + size * 0.06);
}
function dancer(c, alias, cx, y, size, maxW) { // «Ha ballat:» soft, the nickname bold cream; one line, shrunk to fit; y = the baseline
  const pre = 'Ha ballat: ';
  const width = s => { c.font = `600 ${s}px ${BALOO}`; const a = c.measureText(pre).width; c.font = `800 ${s}px ${BALOO}`; return a + c.measureText(alias).width; };
  const s = Math.min(size, size * maxW / width(size)), total = width(s);
  c.font = `600 ${s}px ${BALOO}`; const pw = c.measureText(pre).width, x = cx - total / 2;
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillStyle = INK.soft; c.fillText(pre, x, y);
  c.font = `800 ${s}px ${BALOO}`; c.fillStyle = INK.cream; c.fillText(alias, x + pw, y);
  c.textBaseline = 'middle';
}
// One vertical rhythm per format. Blocks are measured by their ink (glyph edges, not text boxes) and stacked between
// `top` and `bottom` (story: inside the ~250 px the apps cover at both ends): logo · photo · verdict (headline, score,
// chips) · footer (nickname, address). The verdict and footer are tight groups (`near` gaps: headline→score,
// score→chips, nickname→address); the leftover height is shared equally by the gaps between the groups, so the rhythm
// never depends on the record ribbon or the nickname being there.
const LAYOUT = {
  story: {
    top: 246, bottom: 1700, min: 40, logo: 196, photo: [60, 960, 540, 30], ribbon: 46,
    head: 88, score: [108, 48, 190, 560], chips: [50, 22], alias: 48, url: 40, near: { score: 32, chips: 40, url: 32 },
  },
  square: {
    top: 46, bottom: 1034, min: 22, logo: 136, photo: [44, 992, 360, 26], ribbon: 34,
    head: 56, score: [70, 32, 118, 420], chips: [36, 18], alias: 34, url: 30, near: { score: 18, chips: 22, url: 20 },
  },
};

// items: [height, draw(top), fixed gap above (omit = a shared gap)]; the shared gap fills what the fixed ones leave
function stack(top, bottom, min, items) {
  const fixed = items.reduce((a, [h, , g = 0], i) => a + h + (i ? g : 0), 0), flex = items.filter(([, , g], i) => i && g === undefined).length;
  const gap = Math.max(min, (bottom - top - fixed) / Math.max(1, flex));
  let y = top;
  items.forEach(([h, draw, g], i) => { if (i) y += g ?? gap; draw(y); y += h; });
}

// d: { stars, pct, score (comparable points), maxCombo, diffName, reason, newRecord, beaten, alias }
export function drawCard(c, format, d, hero) {
  const { w, h } = FORMATS[format];
  c.canvas.width = w; c.canvas.height = h;
  c.save();
  frame(c, w, h);
  const [head, headCol] = HEAD[d.reason] ?? HEAD.clear;
  const badge = d.newRecord ? 'NOU RÈCORD DE PUNTS!' : d.beaten ? 'REPTE SUPERAT!' : null;
  const L = LAYOUT[format];
  if (L) { // story and square: one centre axis
    const cx = w / 2;
    if (format === 'story') { // the covered bands get the festa (garlands, confetti), never content
      bunting(c, 30, w - 30, 40, 120, 17, 46); confetti(c, w, 60, 230, 14, 7);
      bunting(c, 30, w - 30, 1780, 80, 17, 46); confetti(c, w, 1740, 1880, 16, 11);
    }
    const items = [], N = L.near;
    { // the logo: MULASSA over TAP TAP DANCE, a fixed gap between their outlines
      const big = L.logo, small = big * 0.36, lw1 = big * 0.1, lw2 = small * 0.16, a1 = ascent(c, 'MULASSA', big, PIXEL, 0), a2 = ascent(c, 'TAP TAP DANCE', small), lg = big * 0.12;
      items.push([lw1 + a1 + lg + lw2 + a2, top => {
        const b1 = top + lw1 / 2 + a1;
        c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        outlined(c, 'MULASSA', cx, b1, big, INK.red, INK.cream, PIXEL, 0, lw1);
        outlined(c, 'TAP TAP DANCE', cx, b1 + lw1 / 2 + lg + lw2 / 2 + a2, small, INK.gold, INK.dark);
        c.textBaseline = 'middle';
      }]);
    }
    { // the photo and the record ribbon on its top edge (it overhangs it: its room counts)
      const [px, pw, ph, pr] = L.photo, up = badge ? L.ribbon * 0.25 + 4 : 0;
      items.push([up + ph, top => {
        const py = top + up;
        photo(c, hero, px, py, pw, ph, pr);
        if (badge) ribbon(c, badge, cx, py + L.ribbon * 0.6, L.ribbon);
      }]);
    }
    { // the verdict: headline, then the score group, then the chips
      const hs = fit(c, head, L.head, w - 160), lw = hs * 0.16, a = ascent(c, head, hs);
      items.push([a + lw, top => {
        c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        outlined(c, head, cx, top + lw / 2 + a, hs, headCol, INK.dark);
        c.textBaseline = 'middle';
      }]);
      const [r, label, pct, maxW] = L.score;
      items.push([2 * r, top => score(c, d, cx, top + r, r, label, fit(c, `${d.pct}%`, pct, maxW)), N.score]);
      const [cs, cg] = L.chips;
      items.push([cs * 1.6, top => chips(c, [[d.diffName, INK.gold], [`RATXA ${d.maxCombo}`, '#ff8fb1'], [`${d.score.toLocaleString('ca-ES')} PUNTS`, INK.score]], cx, top + cs * 0.8, cs, cg), N.chips]);
    }
    if (d.alias) { // the footer: nickname (its cap height) over the address, close together
      const a = ascent(c, 'H', L.alias, BALOO, 800);
      items.push([a, top => dancer(c, d.alias, cx, top + a, L.alias, w - 240)]);
    }
    items.push([L.url * 1.76, top => address(c, cx, top + L.url * 0.88, L.url), d.alias ? N.url : undefined]);
    stack(L.top, L.bottom, L.min, items);
  } else { // og (the link preview): the plaça full bleed, her on the right; logo, GUA | PA and the address left
    photo(c, hero, 0, 0, w, h, 0, 0); // a wider render keeps her on the right, clear of the logo
    const g = c.createLinearGradient(0, 0, w * 0.66, 0);
    g.addColorStop(0, 'rgba(28,17,10,0.86)'); g.addColorStop(0.55, 'rgba(28,17,10,0.55)'); g.addColorStop(1, 'rgba(28,17,10,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const cx = 330;
    logo(c, cx, 170, 148);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const [s, col, x] of [['GUA', '#ff7a1a', cx - 92], ['PA', '#14b8a6', cx + 92]]) { // the two halves of the pad
      c.beginPath(); c.roundRect(x - 84, 360, 168, 84, 18); c.fillStyle = col; c.fill(); c.lineWidth = 5; c.strokeStyle = INK.dark; c.stroke();
      outlined(c, s, x, 406, 52, '#ffffff', INK.dark);
    }
    c.font = `800 34px ${BALOO}`;
    const aw = c.measureText(SITE_LABEL).width + 56;
    c.beginPath(); c.roundRect(cx - aw / 2, 492, aw, 60, 30); c.fillStyle = INK.gold; c.fill();
    c.fillStyle = INK.dark; c.fillText(SITE_LABEL, cx, 524);
  }
  c.restore();
  return c.canvas;
}

export const cardAlt = (format, d) => `Imatge per compartir (${format === 'story' ? 'story' : 'quadrada'}): la Mulassa de Valls, ${d.stars} ${d.stars === 1 ? 'estrella' : 'estrelles'}, ${d.pct}% d’encerts a ${d.diffName}, ratxa màxima ${d.maxCombo}, ${d.score.toLocaleString('ca-ES')} punts${d.newRecord ? ' (nou rècord)' : ''}.`;

export function toJpeg(canvas, quality = 0.9) { // -> File (the name the share sheet and the download use)
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(new File([b], CARD_FILE, { type: 'image/jpeg' })) : reject(new Error('card'))), 'image/jpeg', quality));
}
