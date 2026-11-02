// No two pieces may be mostly the same colour, which is what players confuse (the old orange Lleó and Bou were).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { SEGUICI } from '../../src/jocs/games/crush/levels.js';

// Hue in 30-degree steps, or 'grey' when there is little colour.
function bucket(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (!max || (max - min) / max < .18) return 'grey';
  const h = max === r ? ((g - b) / (max - min) + 6) % 6 : max === g ? (b - r) / (max - min) + 2 : (r - g) / (max - min) + 4;
  return String(Math.round(h * 60 / 30) * 30 % 360);
}

// shortcut: reads only 8-bit RGBA, non-interlaced PNGs, which is what the art is; widen it if the art's format changes.
function dominantColour(path) {
  const png = readFileSync(path), idat = [];
  let w = 0, h = 0;
  for (let at = 8; at < png.length;) {
    const len = png.readUInt32BE(at), type = png.toString('latin1', at + 4, at + 8), data = png.subarray(at + 8, at + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      assert.deepEqual([data[8], data[9], data[12]], [8, 6, 0], `${path}: not 8-bit RGBA`);
    }
    if (type === 'IDAT') idat.push(data);
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = w * 4, prev = new Uint8Array(stride), counts = {};
  let n = 0;
  for (let y = 0; y < h; y++) {
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), f = raw[y * (stride + 1)], out = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? out[i - 4] : 0, b = prev[i], c = i >= 4 ? prev[i - 4] : 0;
      const p = a + b - c, [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      out[i] = row[i] + pred;
    }
    prev.set(out);
    for (let i = 0; i < stride; i += 4) if (out[i + 3] > 128) { const b = bucket(out[i], out[i + 1], out[i + 2]); counts[b] = (counts[b] ?? 0) + 1; n++; }
  }
  const [name, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return { name, share: count / n };
}

const MOSTLY = .6;
const colour = Object.fromEntries(SEGUICI.map(k => [k, dominantColour(new URL(`../../public/jocs/crush/cards/${k}.png`, import.meta.url))]));
for (const [i, a] of SEGUICI.entries()) for (const b of SEGUICI.slice(i + 1)) {
  const same = colour[a].name === colour[b].name && colour[a].share >= MOSTLY && colour[b].share >= MOSTLY;
  assert.ok(!same, `${a} and ${b} are both mostly hue ${colour[a].name}`);
}
console.log('crush colours ok', SEGUICI.map(k => `${k} ${colour[k].name} ${Math.round(colour[k].share * 100)}%`).join(', '));
