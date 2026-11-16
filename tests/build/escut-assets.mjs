// The selector pills' arms are PNGs made at build time (tools/ui/build-escuts.mjs): every town has its files, at every density, drawn
// from the arms as they are now (the hash in the names), nothing stale left behind; a file that does not load leaves the vector.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { ESCUT_DPR, escutFallback, escutFile, escutImg, escutPx, escutSvg } from '../../src/ui/escuts.js';
import { ESCUT_HASH } from '../../src/ui/escut-files.js';
import { escutHash, escutIds } from '../../tools/ui/build-escuts.mjs';

const ids = escutIds(), dir = new URL('../../public/escuts/', import.meta.url);
assert(ids.length >= 33, 'every town with arms');
assert.deepEqual(Object.keys(ESCUT_HASH).sort(), [...ids].sort(), 'the generated hashes cover exactly the towns with arms');
const want = new Set();
for (const id of ids) {
  assert.equal(ESCUT_HASH[id], escutHash(id), `${id}: the arms changed, run node tools/ui/build-escuts.mjs`);
  for (const d of ESCUT_DPR) {
    const name = escutFile(id, d).slice('/escuts/'.length); want.add(name);
    const png = readFileSync(new URL(name, dir)); // (a missing file throws)
    assert.equal(png.subarray(1, 4).toString(), 'PNG', name);
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [escutPx(d), escutPx(d)], `${name}: 22 px at 2x the density`);
  }
}
assert.deepEqual(readdirSync(dir).sort(), [...want].sort(), 'no file of an old drawing left in public/escuts');
assert.equal(escutPx(1), 44); assert.equal(escutPx(3.5), 154, 'the Galaxy S10 gets the size the boot used to draw');

const img = escutImg('valls');
assert.match(img, /^<img class="escut" src="\/escuts\/valls\.[0-9a-f]{8}\.44\.png" srcset="[^"]*\.154\.png 3\.5x[^"]*" data-arms="valls" alt="" decoding="async">$/);
assert.match(escutImg('nowhere'), /^$/, 'no arms, nothing');

let onError = null;
escutFallback({ addEventListener: (type, fn, capture) => { assert.equal(type, 'error'); assert(capture, 'error does not bubble'); onError = fn; } });
const failed = { dataset: { arms: 'berga' }, set outerHTML(v) { this.html = v; } };
onError({ target: failed }); assert.match(failed.html, /^<svg class="escut"/); assert.equal(failed.html.includes('esc-berga'), true);
const other = { dataset: {}, set outerHTML(v) { this.html = v; } };
onError({ target: other }); assert.equal(other.html, undefined, 'only an arm falls back');
assert.equal(escutSvg('berga').length > 0, true);
console.log('escut assets: a PNG per town and density, in step with the arms, a failed file keeps its vector ok');
