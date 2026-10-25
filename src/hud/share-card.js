// On-device poster exports. Geometry is shared by drawing and regression checks.
import { tr } from '../i18n/messages.js';
import { fmtNum } from '../i18n/format.js';
import { fontStack } from '../i18n/fonts.js';
import { wrapLines } from './text-wrap.js';
import { DIFFS } from '../game/chart.js';
import { figThemes } from '../game/figure-theme.js';
import { SITE_LABEL, CARD_FILE } from '../services/share.js';
import { traitsOf } from '../figures/index.js';

export const PHOTO = { story: [1104, 988], feed: [1104, 988], og: [1560, 630] };
const CARD_FONT = fontStack("'Baloo 2', sans-serif");
const PAPER = '#fff4df';
const CARD_THEMES = {
  'mulassa-valls': { name: 'MULASSA', bg: '#8a1628', ray: '#a8283e', ink: '#24050c' },
  'drac-valls': { name: 'DRAC', bg: '#1f8a4c', ray: '#2a9e5a', ink: '#0b2414' },
  'bou-tradicional-valls': { name: 'BOU', sub: 'hud.card.bouSub', bg: figThemes.bou.colors.pa, ray: figThemes.bou.colors.gua, ink: figThemes.bou.colors.paDk, rayA: 0.2 }, // its buttons' MA plum, faint rays of BRA sand (the light sand at 0.5 drowned the title); «Bou Tradicional» is its name
};
// Catalan diacritics always, plus the active language's sample (hud.share.fontSample).
export async function loadCardFonts(fonts) {
  if (!fonts) return;
  // i18n-ok: glyph sample to preload the fonts
  const sample = `MULASSA DRAC BOU DE VALLS FÀCIL DIFÍCIL 0123456789 ${tr('hud.share.fontSample')}`;
  await Promise.all([600, 800].map(weight => fonts.load(`${weight} 80px "Baloo 2"`, sample)));
  await fonts.ready;
  if (fonts.check && ![600, 800].every(weight => fonts.check(`${weight} 80px "Baloo 2"`, sample))) throw new Error('card fonts unavailable');
}
export function cardRank(d) {
  const r = d.rank;
  return Number.isInteger(r?.pos) && Number.isInteger(r?.total)
    && r.pos > 0 && r.total >= r.pos ? r : null;
}
export function cardLayout(format, d) {
  const story = format === 'story', rank = cardRank(d);
  const aliasH = d.alias ? (story ? 36 : 31) : 0;
  const ticketH = (story ? 282 : 236) + aliasH + (rank ? (story ? 88 : 74) : 0);
  const disc = story ? 680 : 540, overlap = story ? 64 : 54;
  const footY = story ? 1652 : 1236, titleBottom = story ? 460 : 295;
  // Include the ticket shadow in the group's bounds. Feed has equal clear space above and below.
  const groupH = disc - overlap + ticketH + 12;
  const discY = story ? 470 : titleBottom + (footY - titleBottom - groupH) / 2;
  return { w: 1080, h: story ? 1920 : 1350, story, disc, discY, ticketY: discY + disc - overlap,
    ticketH, aliasH, footY, titleBottom, groupH, rank, titleY: story ? 310 : 160 };
}
const CJK = /[぀-ヿ㐀-鿿가-힯]/;
function cardText(c, text, x, y, size, color, weight = 800, max = Infinity) {
  c.font = `${weight} ${size}px ${CARD_FONT}`;
  const width = c.measureText(String(text)).width;
  c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
  if (width > max) {
    // Too wide: break it in two lines inside the one-line block (half-size lines, same centre) before shrinking; a single unbreakable run just shrinks.
    const half = size * 0.55, measure = s => c.measureText(s).width;
    c.font = `${weight} ${half}px ${CARD_FONT}`;
    const lines = wrapLines(String(text), measure, max, CJK.test(text));
    if (lines.length > 1) {
      const two = [lines[0], lines.slice(1).join(' ')];
      two.forEach((line, i) => {
        const w = measure(line);
        if (w > max) c.font = `${weight} ${half * max / w}px ${CARD_FONT}`; else c.font = `${weight} ${half}px ${CARD_FONT}`;
        c.fillText(line, x, y + (i - 0.5) * half);
      });
      return;
    }
    c.font = `${weight} ${size * max / width}px ${CARD_FONT}`;
  }
  c.fillText(String(text), x, y);
}
function cardBox(c, x, y, w, h, r, color) {
  c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = color; c.fill();
}
function cardRays(c, w, h, cy, theme) {
  c.fillStyle = theme.bg; c.fillRect(0, 0, w, h);
  c.save(); c.translate(w / 2, cy); c.globalAlpha = theme.rayA ?? 0.5; c.fillStyle = theme.ray;
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12;
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 2400, a, a + Math.PI / 24); c.closePath(); c.fill();
  }
  c.restore();
}
function cardPhoto(c, hero, x, y, diameter, ink) {
  const r = diameter / 2;
  c.beginPath(); c.arc(x + 22, y + 26, r, 0, Math.PI * 2); c.fillStyle = ink; c.fill();
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = PAPER; c.fill();
  c.save(); c.beginPath(); c.arc(x, y, r - 18, 0, Math.PI * 2); c.clip();
  if (hero) {
    const k = (diameter - 36) / Math.min(hero.width, hero.height);
    c.drawImage(hero, x - hero.width * k / 2, y - hero.height * k / 2, hero.width * k, hero.height * k);
  } else {
    c.fillStyle = '#d2bd91'; c.fillRect(x - r, y - r, diameter, diameter);
  }
  c.restore();
}
function cardTitle(c, theme, y, story) {
  c.save(); c.translate(540, y); c.rotate(-Math.PI / 45);
  const size = story ? (theme.name === 'MULASSA' ? 214 : 224) : (theme.name === 'MULASSA' ? 150 : 176); // (the short names fill the same width larger)
  const label = tr(theme.sub || 'hud.card.deValls');
  c.font = `800 ${story ? 82 : 56}px ${CARD_FONT}`;
  const sub = (story ? 82 : 56) * Math.min(1, (story ? 760 : 560) / c.measureText(label).width); // a longer name shrinks to the title's width
  cardText(c, theme.name, 10, 10, size, theme.ink);
  cardText(c, theme.name, 0, 0, size, PAPER);
  cardText(c, label, 6, size * 0.54 + 6, sub, theme.ink);
  cardText(c, label, 0, size * 0.54, sub, PAPER);
  c.restore();
}
function cardFooter(c, y, story, ink) {
  const size = story ? 38 : 32, h = story ? 78 : 68, gap = story ? 26 : 22;
  c.font = `800 ${size}px ${CARD_FONT}`;
  const labels = [SITE_LABEL, 'mulassa_cat'];
  const widths = labels.map(s => c.measureText(s).width + size * 2.94);
  let x = (1080 - widths[0] - widths[1] - gap) / 2;
  labels.forEach((label, i) => {
    const w = widths[i];
    cardBox(c, x + 7, y + 8, w, h, h / 2, ink);
    const grad = c.createLinearGradient(x, y + h, x + w, y);
    [['#fdd56b', 0], ['#f56040', .13], ['#e1306c', .36], ['#c13584', .62], ['#833ab4', .84], ['#5b51d8', 1]].forEach(([col, stop]) => grad.addColorStop(stop, col));
    cardBox(c, x, y, w, h, h / 2, i ? grad : '#f5c518');
    const ix = x + size * 1.14, iy = y + h / 2, color = i ? '#fff' : '#24050c';
    if (i) {
      c.save(); c.translate(ix, iy); c.strokeStyle = color; c.lineWidth = size * .095;
      c.beginPath(); c.roundRect(-size * .43, -size * .43, size * .86, size * .86, size * .23); c.stroke();
      c.beginPath(); c.arc(0, 0, size * .19, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(size * .25, -size * .25, size * .05, 0, Math.PI * 2); c.fillStyle = color; c.fill(); c.restore();
    } else {
      c.beginPath(); c.moveTo(ix - size * .28, iy - size * .36); c.lineTo(ix + size * .35, iy); c.lineTo(ix - size * .28, iy + size * .36); c.closePath(); c.fillStyle = color; c.fill();
    }
    cardText(c, label, x + w / 2 + size * .6, iy + 2, size, color);
    x += w + gap;
  });
}
// the board's «Correu confirmat» check (src/ui/profile-notes.js CHECK_SVG), the same shape: a blue disc, a white tick.
// It proves nothing on an image: it repeats what the game knew when it drew it.
function cardCheck(c, x, y, r) {
  const k = r / 10;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = '#3b9cff'; c.fill();
  c.beginPath(); c.moveTo(x - 4.5 * k, y + 0.3 * k); c.lineTo(x - 1.5 * k, y + 3.3 * k); c.lineTo(x + 4.5 * k, y - 3 * k);
  c.strokeStyle = '#fff'; c.lineWidth = 2.6 * k; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function cardTicket(c, d, L, theme) {
  const { story, ticketY: y, ticketH: h, aliasH, rank } = L;
  const w = story ? 850 : 790, x = (1080 - w) / 2;
  cardBox(c, x, y + 12, w, h, 34, theme.ink);
  cardBox(c, x, y, w, h, 34, PAPER);
  if (aliasH) { // the name as the boards show it: a guest's «nom#1234», or the confirmed address's check after it
    const size = story ? 40 : 34, tick = d.verified ? Math.round(size * 0.8) : 0, gap = tick ? Math.round(size * 0.25) : 0;
    c.font = `600 ${size}px ${CARD_FONT}`;
    let alias = String(d.alias), max = w - 128 - tick - gap;
    while (alias.length && c.measureText(alias).width > max) alias = alias.slice(0, -1);
    if (alias !== String(d.alias)) alias = alias.slice(0, -1) + '…';
    const x = 540 - (tick + gap) / 2, tw = Math.min(max, c.measureText(alias).width);
    cardText(c, alias, x, y + 26, size, theme.ink, 600, max);
    if (tick) cardCheck(c, x + tw / 2 + gap + tick / 2, y + 26, tick / 2);
  }
  const points = Number.isFinite(d.score) ? fmtNum(Math.round(d.score)) : '—';
  cardText(c, points, 540, y + aliasH + (story ? 88 : 72), story ? 150 : 118, theme.ink, 800, w - 100);
  cardText(c, tr('hud.card.points'), 540, y + aliasH + (story ? 170 : 140), story ? 30 : 26, theme.ink);
  const rowY = y + aliasH + (story ? 232 : 194), levelH = story ? 62 : 54;
  const levels = DIFFS.map(l => l.name), level = levels[d.diff] || d.diffName || levels[0];
  const colors = ['#8fd98f', '#f0b04a', '#ef7b6a'];
  const diff = Number.isInteger(d.diff) ? d.diff : levels.indexOf(level);
  // Measure the whole row before drawing: 100%, long streaks and every level stay separated.
  const statSize = story ? 54 : 46, labSize = story ? 31 : 28, gap = story ? 28 : 24;
  const pieces = [[`${d.pct}%`, statSize, 800], [tr('hud.card.hits'), labSize, 600],
    [String(d.maxCombo), statSize, 800], [tr('hud.card.streak'), labSize, 600]];
  const widths = pieces.map(([text, size, weight]) => { c.font = `${weight} ${size}px ${CARD_FONT}`; return c.measureText(text).width; });
  const total = 194 + gap * 3 + 3 + widths.reduce((a, b) => a + b, 0) + 16;
  const rowScale = Math.min(1, (w - 96) / total);
  c.save(); c.translate(540, rowY); c.scale(rowScale, rowScale);
  let cursor = -total / 2;
  cardBox(c, cursor, -levelH / 2, 194, levelH, levelH / 2, colors[diff] || colors[0]);
  cardText(c, level, cursor + 97, 2, story ? 32 : 28, '#2a1a10');
  cursor += 194 + gap;
  pieces.forEach(([text, size, weight], i) => {
    if (i === 2) { c.fillStyle = '#2a1a1030'; c.fillRect(cursor + gap / 2, -21, 3, 42); cursor += gap + 3; }
    cardText(c, text, cursor + widths[i] / 2, weight === 600 ? 6 : 0, size, theme.ink, weight);
    cursor += widths[i] + (i % 2 === 0 ? 8 : gap);
  });
  c.restore();
  if (rank) {
    const lineY = rowY + levelH / 2 + 18;
    c.save(); c.setLineDash([7, 5]); c.lineWidth = 3; c.strokeStyle = theme.ink + '70';
    c.beginPath(); c.moveTo(x + 64, lineY); c.lineTo(x + w - 64, lineY); c.stroke(); c.restore();
    cardText(c, tr('hud.card.best', { pos: fmtNum(rank.pos), total: fmtNum(rank.total) }), 540, lineY + (story ? 42 : 35), story ? 38 : 32, theme.bg, 800, w - 100);
  }
}
export function drawCard(c, format, d, hero) {
  const theme = CARD_THEMES[d.figureId] || CARD_THEMES['mulassa-valls'];
  if (format === 'og') {
    c.canvas.width = 1200; c.canvas.height = 630; c.save();
    cardRays(c, 1200, 630, 315, theme); cardPhoto(c, hero, 900, 315, 540, theme.ink);
    c.translate(-230, 0); cardTitle(c, theme, 210, false);
    cardText(c, SITE_LABEL, 540, 480, 48, PAPER); c.restore(); return c.canvas;
  }
  const L = cardLayout(format, d);
  c.canvas.width = L.w; c.canvas.height = L.h; c.save();
  cardRays(c, L.w, L.h, L.discY + L.disc / 2, theme);
  cardPhoto(c, hero, 540, L.discY + L.disc / 2, L.disc, theme.ink);
  cardTitle(c, theme, L.titleY, L.story);
  cardTicket(c, d, L, theme); cardFooter(c, L.footY, L.story, theme.ink);
  c.restore(); return c.canvas;
}
export const cardAlt = (format, d) => tr('hud.card.alt', { format: tr(format === 'story' ? 'hud.card.altStory' : 'hud.card.altPost'), figure: tr(traitsOf(d.figureId).cardAlt), score: d.score ?? '—', pct: d.pct, level: d.diffName, combo: d.maxCombo });
export function toJpeg(canvas, quality = 0.9, figureId = 'mulassa-valls') {
  const name = traitsOf(figureId).cardFile ?? CARD_FILE;
  return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(new File([b], name, { type: 'image/jpeg' })) : reject(new Error('card')), 'image/jpeg', quality));
}
