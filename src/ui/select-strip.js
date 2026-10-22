// The selector's strip and pills as HTML strings, plus the pixel-art portrait and the scrolling rows' peeking gap (split from select-ui.js).
import { townOf, playable, portraitArt, portraitPalette, portraitStand } from '../game/figures.js';
import { escutSvg } from './escuts.js';
import { entityLabel, cardEntityHtml } from './figure-entities.js';
import { SELECTOR_PORTRAITS, pendingSilhouette } from './selector-portraits.js';
import { tr } from '../i18n/messages.js';

// pixel art as an SVG: each cell a square, the cells round the shape a dark rim
export function pixelSvg(art, palette, rim) {
  // One path per colour, not a rect per pixel: ~200 nodes a card made every selector restyle walk thousands of elements.
  const h = art.length, w = art[0].length, on = (x, y) => (art[y]?.[x] ?? '.') !== '.', paths = new Map([[rim, '']]);
  const cell = (fill, x, y) => paths.set(fill, (paths.get(fill) ?? '') + `M${x + 1} ${y + 1}h1.02v1.02h-1.02z`);
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) cell(rim, x, y);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) cell(palette[art[y][x]], x, y);
  return `<svg viewBox="0 0 ${w + 2} ${h + 2}" shape-rendering="crispEdges" aria-hidden="true">${[...paths].filter(([, d]) => d).map(([fill, d]) => `<path fill="${fill}" d="${d}"/>`).join('')}</svg>`;
}
export const pillHtml = t => `<button type="button" class="btn btn-secondary sel-pill" data-town="${t.id}" tabindex="0" aria-pressed="false"${t.color ? ` style="--c:${t.color}"` : ''}>${escutSvg(t.id) || '<i aria-hidden="true"></i>'}${t.name}</button>`;
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const portraitHtml = f => f.thumbnail ? `<img src="${escapeHtml(f.thumbnail)}" alt="" width="96" height="96" loading="lazy" decoding="async">` : pixelSvg(portraitArt(f), portraitPalette(f), '#2a1a10');
export function stripHtml(figures, later = false, last = null) { // later: what the fold hides; last: the town before (no banner twice)
  let html = '';
  for (const f of figures) {
    const t = townOf(f);
    if (t !== last) html += `<span class="sel-banner${later ? ' later' : ''}" data-town="${t.id}"${(t.short ?? t.name).length > 9 ? ' data-long' : ''} aria-hidden="true"><span>${(t.short ?? t.name).toUpperCase()}</span></span>`;
    last = t;
    const name = f.name || tr('ui.select.aviat'), entity = f.entity || t.name;
    const ok = playable(f), art = f.thumbnail ? null : portraitArt(f); // the portrait's grid with its rim: whole-pixel sizing (select.css)
    html += `<button type="button" class="btn btn-secondary sel-card${ok ? '' : ' aviat'}${later ? ' later' : ''}" role="option" data-id="${escapeHtml(f.id)}" data-town="${t.id}" tabindex="-1" aria-selected="false" aria-label="${escapeHtml(f.invite ? tr('ui.select.cardInvite', { name, entity: entity.toLowerCase() }) : tr(ok ? 'ui.select.card' : 'ui.select.cardSoon', { name, entity: entityLabel(f), town: t.name }))}"${art ? ` style="--gw:${art[0].length + 2};--gh:${art.length + 2};--s:${portraitStand(f)}"` : ''}><span class="por">${SELECTOR_PORTRAITS[f.id] || (ok || f.thumbnail ? portraitHtml(f) : pendingSilhouette(art))}</span><span class="nb"><span class="sel-card-name">${escapeHtml(name)}</span>${cardEntityHtml(f)}</span></button>`;
  }
  return html;
}
// the fold between the playable figures and the rest: › folded, ‹ unfolded
export const moreHtml = () => `<button type="button" class="btn btn-secondary sel-card sel-more" data-more="1" role="option" tabindex="-1" aria-selected="false" aria-expanded="false" aria-label="${tr('ui.select.soon')}"><span class="sel-more-flag" aria-hidden="true"><svg viewBox="0 0 24 24"><path class="open" d="m9 5 7 7-7 7"/><path class="close" d="m15 5-7 7 7 7"/></svg></span></button>`;
// the pills' last one: the arms of the towns with nothing to play yet, fanned out; unfolded, «Amaga»
export const soonPillHtml = towns => `<button type="button" class="btn btn-secondary sel-pill sel-soon" data-soon="1" tabindex="0" aria-expanded="false"><span class="sel-fan" aria-hidden="true">${towns.map(t => escutSvg(t.id)).join('')}</span><span class="sel-soon-text">${tr('ui.select.soon')}</span></button>`;

// The gap for a row that scrolls (item widths, its room from the first item to the right edge) that leaves the item at
// that edge near half shown (a fifth to four fifths), the cue that there is more: the one nearest `base` within 0.6-2x; `base` when all fit.
export function peekGap(widths, room, base) {
  if (widths.reduce((s, w) => s + w, 0) + base * (widths.length - 1) <= room) return base;
  let best = base, worst = Infinity;
  for (let g = base * 0.6; g <= base * 2; g += 0.25) {
    let x = 0, f = 0;
    for (const w of widths) { if (x + w > room) { f = Math.max(0, (room - x) / w); break; } x += w + g; }
    const off = Math.abs(f - 0.5), miss = (off > 0.3 ? 1000 : 0) + off * 40 + Math.abs(g - base); // 1 px of gap = 2.5% of the cut
    if (miss < worst) { worst = miss; best = g; }
  }
  return best;
}
// The arrows' capsule stands at the screen's middle, but never on a town pill sharing its band (a 667×375 window: the pills'
// own row sits just above the strip): then it moves right of them, as far as the screen allows. Screen px in, carousel px out.
export function navX(win, towns, carousel, z) {
  const c = carousel.getBoundingClientRect(), mid = win.innerWidth / 2, half = 60 * z, top = c.top - 48 * z;
  const under = [...towns.children].map(p => p.getBoundingClientRect()).filter(b => b.width && b.bottom > top && b.top < c.top && b.left < mid + half && b.right > mid - half);
  return Math.min(under.length ? Math.max(...under.map(b => b.right)) + 8 * z + half : mid, win.innerWidth - half - 4 * z) - c.left;
}
