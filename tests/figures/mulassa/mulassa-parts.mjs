// The mulassa's green blanket: (1) its top panel reaches into both side panels, so no red seam shows at the two
// top corners; (2) no green box shares a coplanar, overlapping face pointing the same way with another body box
// (z-fighting = the blanket blinks).
import assert from 'node:assert/strict';
import { lo, hi, ov, coplanar } from '../common/coplanar.mjs';
import { Vox } from '../../../src/scene/models/voxel.js';

const orig = { box: Vox.prototype.box, mesh: Vox.prototype.mesh };
Vox.prototype.box = function (x, y, z, w, h, d, color, jitter) {
  (this.L ||= []).push({ x, y, z, w, h, d, color });
  return orig.box.call(this, x, y, z, w, h, d, color, jitter);
};
Vox.prototype.mesh = function () { const m = orig.mesh.call(this); m.userData.boxes = this.L; return m; };
const { buildMulassa, C } = await import('../../../src/figures/mulassa/mulassa.js');
const boxes = buildMulassa().body.children.find(o => o.userData.boxes).userData.boxes;

const green = boxes.filter(b => b.color === C.green);
const top = green.find(b => b.x === 0), sides = green.filter(b => b !== top);
assert.equal(sides.length, 2);
for (const s of sides) {
  for (const a of [0, 1, 2]) assert.ok(ov(lo(top)[a], hi(top)[a], lo(s)[a], hi(s)[a]) > 0.005, `blanket top/side joint open on axis ${a} (x ${s.x})`);
}

for (const g of green) for (const b of boxes) {
  if (b === g) continue;
  for (const f of coplanar(g, b)) assert.fail(`coplanar face: green box at x ${g.x} and ${b.color} box at (${b.x}, ${b.y}, ${b.z}), axis ${f.axis}`);
}
console.log('mulassa parts: ok');
