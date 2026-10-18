// The mulassa's green blanket: (1) its top panel reaches into both side panels, so no red seam shows at the two
// top corners; (2) no green box shares a coplanar, overlapping face pointing the same way with another body box
// (z-fighting = the blanket blinks).
import assert from 'node:assert/strict';
import { Vox } from '../src/scene/models/voxel.js';

const orig = { box: Vox.prototype.box, mesh: Vox.prototype.mesh };
Vox.prototype.box = function (x, y, z, w, h, d, color, jitter) {
  (this.L ||= []).push({ x, y, z, w, h, d, color });
  return orig.box.call(this, x, y, z, w, h, d, color, jitter);
};
Vox.prototype.mesh = function () { const m = orig.mesh.call(this); m.userData.boxes = this.L; return m; };
const { buildMulassa, C } = await import('../src/scene/models/mulassa.js');
const boxes = buildMulassa().body.children.find(o => o.userData.boxes).userData.boxes;
const lo = b => [b.x - b.w / 2, b.y, b.z - b.d / 2], hi = b => [b.x + b.w / 2, b.y + b.h, b.z + b.d / 2];
const ov = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);
const EPS = 1e-6;

const green = boxes.filter(b => b.color === C.green);
const top = green.find(b => b.x === 0), sides = green.filter(b => b !== top);
assert.equal(sides.length, 2);
for (const s of sides) {
  for (const a of [0, 1, 2]) assert.ok(ov(lo(top)[a], hi(top)[a], lo(s)[a], hi(s)[a]) > 0.005, `blanket top/side joint open on axis ${a} (x ${s.x})`);
}

const faces = b => [0, 1, 2].flatMap(a => [[a, 1, hi(b)[a]], [a, -1, lo(b)[a]]]);
for (const g of green) for (const b of boxes) {
  if (b === g) continue;
  for (const [a, s, p] of faces(g)) for (const [a2, s2, p2] of faces(b)) {
    if (a !== a2 || s !== s2 || Math.abs(p - p2) > 1e-3) continue;
    const [u, v] = [0, 1, 2].filter(k => k !== a);
    assert.ok(!(ov(lo(g)[u], hi(g)[u], lo(b)[u], hi(b)[u]) > EPS && ov(lo(g)[v], hi(g)[v], lo(b)[v], hi(b)[v]) > EPS),
      `coplanar face: green box at x ${g.x} and ${b.color} box at (${b.x}, ${b.y}, ${b.z}), axis ${a}`);
  }
}
console.log('mulassa parts: ok');
