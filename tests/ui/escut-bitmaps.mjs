// The selector pills' arms become bitmaps once (their vectors cost the GPU ~300 ms on the selector's first paint);
// an arm that cannot be drawn keeps its vector, and nothing happens without a canvas.
import assert from 'node:assert/strict';
import { escutBitmaps } from '../../src/ui/escuts.js';

const svg = (town, bad = false) => ({ town, bad, cls: 'escut', outerHTML: `<svg class="escut" viewBox="0 0 24 24"><path d="M0 0h1"/></svg>`,
  getAttribute(k) { return k === 'class' ? this.cls : null; }, replaceWith(n) { this.replaced = n; } });
const arms = [svg('valls'), svg('berga', true), svg('reus')];
let drawn = 0;
const doc = { createElement: () => ({ getContext: () => ({ drawImage() { drawn++; } }), toBlob: done => done({ blob: true }) }) };
const root = { ownerDocument: doc, querySelectorAll: sel => (assert.equal(sel, 'svg.escut'), arms) };

class FakeImage { decode() { return /berga/.test(decodeURIComponent(this.src)) ? Promise.reject(new Error('decode')) : Promise.resolve(); } }
arms[1].outerHTML = arms[1].outerHTML.replace('<svg', '<svg data-town="berga"');
const win = { devicePixelRatio: 3, Image: FakeImage, URL: { createObjectURL: () => 'blob:x' } };
await escutBitmaps(root, win);
assert.equal(drawn, 2, 'the two that decode are drawn');
assert(arms[0].replaced && arms[2].replaced && !arms[1].replaced, 'a decode error keeps that arm a vector');
assert.equal(arms[0].replaced.className, 'escut'); assert.equal(arms[0].replaced.alt, ''); assert.equal(arms[0].replaced.src, 'blob:x');
// drawn at 2x the density: 22 px × 2 × 3
const sized = []; class SizeImage extends FakeImage { set src(v) { sized.push(v); } get src() { return sized.at(-1); } }
await escutBitmaps({ ownerDocument: doc, querySelectorAll: () => [svg('valls')] }, { ...win, Image: SizeImage });
assert.match(decodeURIComponent(sized[0]), /^data:image\/svg\+xml,<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="132" height="132" class="escut"/);
// no canvas (a test DOM, an old browser): the vectors stay
const plain = [svg('valls')];
await escutBitmaps({ ownerDocument: { createElement: () => ({}) }, querySelectorAll: () => plain }, win);
assert(!plain[0].replaced);
console.log('escut bitmaps: drawn once at 2x density, a failed arm stays a vector, no canvas no change ok');
