// Campanar's pieces in relief (clock.js, portal.js, mouldings.js): the clock's hands tell the time given, every clock
// face fits its bay (short of the quoins and of the arcading over it), and each floor of a motif builds only its own
// heights, so nothing hangs over a floor still in colour.
import assert from 'node:assert/strict';
import { FLOOR } from '../../src/jocs/games/campanar/rules.js';
import { quoinOf } from '../../src/jocs/games/campanar/stone.js';
import { chamberOf } from '../../src/jocs/games/campanar/arches.js';
import { clockOf, clockFaces, clockSlice, handAngles } from '../../src/jocs/games/campanar/clock.js';
import { portalSlice } from '../../src/jocs/games/campanar/portal.js';
import { COURSES, gableOf } from '../../src/jocs/games/campanar/mouldings.js';

const deg = a => Math.round(a * 180 / Math.PI * 1000) / 1000;
for (const [h, m, hour, minute] of [[0, 0, 0, 0], [12, 30, 15, 180], [19, 8, 214, 48], [9, 45, 292.5, 270]]) {
  const a = handAngles(h, m);
  assert.deepEqual([deg(a.hour), deg(a.minute)], [hour, minute], `${h}:${m}`);
}
assert.deepEqual(clockOf('A/rellotge3-02', 13), { n: 3, lo: 12 });
assert.deepEqual(clockOf('C/rellotge-01', 9), { n: 2, lo: 8 });
assert.equal(clockOf('A/arquets', 9), null);

// y range of a geometry's vertices
const span = g => { const p = g.attributes.position; let lo = Infinity, hi = -Infinity; for (let i = 0; i < p.count; i++) { lo = Math.min(lo, p.getY(i)); hi = Math.max(hi, p.getY(i)); } return [lo, hi]; };
const inFloor = (g, y0, what) => {
  if (!g.attributes.position.count) return;
  const [lo, hi] = span(g);
  assert(lo >= y0 - 1e-6 && hi <= y0 + FLOOR + 1e-6, `${what}: ${lo.toFixed(3)}..${hi.toFixed(3)} outside its floor at ${y0.toFixed(2)}`);
};
for (const [set, n, w] of [['A', 3, 2.4], ['A', 3, 1.56], ['C', 2, 0.96], ['C', 2, 1.4]]) {
  const r = { x: 0, z: 0, w, d: w }, o = { n, lo: 12 }; // a square on the axis (rules.js)
  for (const { b, cy, R } of clockFaces(r, o)) {
    const out = R * 1.035; // its shadow's edge
    assert(out <= cy - 0.02 && out <= Math.min(-b.u0, b.u1) - quoinOf(b.u1 - b.u0), `${set} ${w}: the clock in its bay`);
    assert(R >= (set === 'A' ? 0.5 : 0.3), `${set} ${w}: as big as the bay lets it (R ${R.toFixed(2)})`);
  }
  for (let i = 12; i < 12 + n; i++) inFloor(clockSlice(r, i * FLOOR, o), i * FLOOR, `${set} clock floor ${i}`);
  const file = `${set}/portal-0${n}`, p = chamberOf(file, 0), po = { ...p, y0: 0 };
  for (let i = 0; i < n; i++) inFloor(portalSlice(r, i * FLOOR, po), i * FLOOR, `${set} portal floor ${i}`);
}
// the remat's gable stays between the quoins, its trefoil inside the tympanum, and a face too narrow gets none
for (const w of [2.4, 1.5, 0.9, 0.6]) {
  const g = gableOf(w, FLOOR), off = 0.8 * g.lobe * Math.cos(Math.PI / 6) + g.lobe;
  assert(g.hw + 0.025 <= w / 2 - quoinOf(w) + 1e-9, `gable ${w}: clear of the quoins`);
  assert(g.yc - 1.4 * g.lobe >= 0.15 - 1e-9 && g.yc + 1.8 * g.lobe <= FLOOR - g.ct - 0.04 + 1e-9 && off < g.hw * 0.5, `gable ${w}: trefoil in it`);
}
assert.equal(gableOf(0.4, FLOOR), null);
for (const [key, course] of Object.entries(COURSES)) inFloor(course({ x: 0, z: 0, w: 1.5, d: 1.5 }, 7 * FLOOR), 7 * FLOOR, key);
console.log('campanar relief: the hands tell the time, the clock fits its bay, each floor builds only its own heights, the gable fits its face ok');
