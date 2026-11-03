import { BASE, RECIPES } from './recipes.js';

const file = id => (id === 'gegants' ? 'gegant' : id); // the figure art is named in the singular

export const iconHtml = id => `<img src="/jocs/alquimia/cards/${file(id)}.png" alt="" draggable="false" decoding="sync">`;

// Fetched up front, so art first shown after losing the network still appears.
const ids = [...new Set([...BASE, ...RECIPES.map(r => r[2])])];
export const preloaded = ids.map(id => Object.assign(new Image(), { src: `/jocs/alquimia/cards/${file(id)}.png` }));

// The icon's main colour, for the light behind a discovery: the average of its most colourful pixels.
const tints = new Map();
export function tintOf(id) {
  if (tints.has(id)) return tints.get(id);
  const img = preloaded[ids.indexOf(id)], c = document.createElement('canvas');
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
