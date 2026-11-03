import { BASE, RECIPES, VALLS } from './recipes.js';
import { COPY } from './copy.js';

const file = id => (id === 'gegants' ? 'gegant' : id); // the figure art is named in the singular

export const iconHtml = id => `<img src="/alchemy/cards/${file(id)}.png" alt="" draggable="false" decoding="sync">`;

// Valls' arms (a lozenge, gules a fess argent; the crown left off, too fine at this size): the mark of an element only known there.
export const ESCUT = '<svg viewBox="2 14 36 38" aria-hidden="true"><path d="M20 15 37 33 20 51 3 33z" fill="#c0262b" stroke="#7a4a10" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.2 29.4h23.6l3.4 3.6-3.4 3.6H8.2L4.8 33z" fill="#fff2d5"/></svg>';
export const orbHtml = id => `<span class="orb">${iconHtml(id)}${VALLS.has(id) ? `<span class="alq-seal" role="img" aria-label="${COPY.alquimia.vallsSeal}">${ESCUT}</span>` : ''}</span>`; // i18n-ok: markup; the label comes from copy.js

const ids = [...new Set([...BASE, ...RECIPES.map(r => r[2])])];
const images = new Map();
const imageOf = id => images.get(id) ?? images.set(id, Object.assign(new Image(), { src: `/alchemy/cards/${file(id)}.png` })).get(id);

// Every icon fetched ahead, so art first shown after losing the network still appears. The player's own first, decoded
// (the board waits for them: no half-drawn icons); then the rest a few at a time, as all 178 at once took the menu's bandwidth.
export function warmIcons(first = []) {
  const mine = [...new Set([...BASE, ...first.filter(id => ids.includes(id))])];
  const decoded = id => imageOf(id).decode().catch(() => {});
  const ready = Promise.all(mine.map(decoded));
  const queue = ids.filter(id => !mine.includes(id));
  const next = async () => { while (queue.length) await decoded(queue.shift()); };
  ready.then(() => Array.from({ length: 4 }, next));
  return ready;
}

// The icon's main colour, for the light behind a discovery: the average of its most colourful pixels.
const tints = new Map();
export function tintOf(id) {
  if (tints.has(id)) return tints.get(id);
  const img = imageOf(id), c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d', { willReadFrequently: true });
  let tint = null;
  try {
    g.drawImage(img, 0, 0, 32, 32);
    const d = g.getImageData(0, 0, 32, 32).data, sum = [0, 0, 0];
    let w = 0, solid = 0;
    for (let i = 0; i < d.length; i += 4) {
      solid += d[i + 3] / 255;
      const max = Math.max(d[i], d[i + 1], d[i + 2]), sat = max ? (max - Math.min(d[i], d[i + 1], d[i + 2])) / max : 0, k = d[i + 3] / 255 * sat * sat * max / 255;
      sum[0] += d[i] * k; sum[1] += d[i + 1] * k; sum[2] += d[i + 2] * k; w += k;
    }
    // grey and white art (smoke, clouds, stone): a pale light, not a muddy colour; the rest as bright as it goes
    if (w > solid * .08) { const avg = sum.map(v => v / w), top = Math.max(...avg); tint = `rgb(${avg.map(v => Math.round(v * 255 / top)).join(' ')})`; } else if (solid) tint = '#dfe8f2';
  } catch { /* not loaded yet: the default gold */ }
  if (tint) tints.set(id, tint);
  return tint;
}
