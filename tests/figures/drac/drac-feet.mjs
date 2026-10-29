// The carrier's feet stay planted (figures/drac/drac-feet.js, figures/drac/drac-motion.js), measured on the posed rig in the world:
// (1) a grounded shoe never slides or turns: its sole corners stay where it touched down until it lifts, in the song and
//     the practice, at 30/60/120 fps, for several `front` headings (the root's travel is not turned by `front`);
// (2) a shoe only travels in the air: whenever a sole corner moves, the whole sole is at least 3 mm up;
// (3) the legs never cross or cut into each other: the shoes' boxes and the trousers' cream boxes stay apart (exact
//     box-vs-box), and the left foot stays on the left;
// (4) pure: shuffled seeks on two rigs give the same picture as a fresh pose, negative beats included; the practice
//     wraps every 16 beats onto the same feet; after the final hit both feet stand still under the settled root;
// (5) the root is dracRoot's, bit for bit, and the planner's rest spot and sole match the model.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Vox } from '../../../src/scene/models/voxel.js';

const orig = Vox.prototype.box, boxes = new Map(); // each mesh's biggest box, to find the trousers' cream box
Vox.prototype.box = function (x, y, z, w, h, d, ...rest) { (this.L ||= []).push({ x, y, z, w, h, d }); return orig.call(this, x, y, z, w, h, d, ...rest); };
const origMesh = Vox.prototype.mesh;
Vox.prototype.mesh = function () { const m = origMesh.call(this); boxes.set(m, this.L.reduce((a, b) => (b.w * b.h * b.d > a.w * a.h * a.d ? b : a))); return m; };
const { buildDrac, FOOT_X, FOOT_Z } = await import('../../../src/figures/drac/drac.js');
const { poseDrac } = await import('../../../src/figures/drac/drac-motion.js');
const { dracPose, dracPractice, dracRoot, newDracPose, END_BEAT } = await import('../../../src/figures/drac/dance-drac.js');
const { REST, SOLE } = await import('../../../src/figures/drac/drac-feet.js');
const { timeAtBeat, beatAtTime } = await import('../../../src/core/beat-grid.js');
const song = JSON.parse((await import('node:fs')).readFileSync(new URL('../../../src/song-drac.json', import.meta.url)));

const drac = buildDrac(), pose = newDracPose(), FRONTS = [0, 0.7, Math.PI / 2];
const shoeMesh = drac.legs.map(l => l.shoe.children[0]), pantsMesh = drac.legs.map(l => l.pants.children[0]);
shoeMesh[0].geometry.computeBoundingBox();
const bb = shoeMesh[0].geometry.boundingBox;
assert.deepEqual([REST.x, REST.z], [FOOT_X, FOOT_Z], 'the planner plans on the model\'s rest spots');
assert.ok(Math.abs(SOLE.toe - bb.max.z) < 1e-6 && Math.abs(SOLE.heel + bb.min.z) < 1e-6 && Math.abs(SOLE.side - bb.max.x) < 1e-6 && Math.abs(bb.min.x + bb.max.x) < 1e-6 && Math.abs(bb.min.y) < 1e-6, 'the planner knows the sole');
const SOLE_PTS = [bb.min.x, bb.max.x].flatMap(x => [bb.min.z, bb.max.z].map(z => new THREE.Vector3(x, 0, z)));
const W = new THREE.Vector3();
const pose3 = (fn, b, front, d = drac) => { fn(pose, b); poseDrac(d, pose, front); d.root.updateMatrixWorld(true); };
const sole = (i, out, d = drac) => SOLE_PTS.forEach((p, k) => out[k].copy(p).applyMatrix4(d.legs[i].shoe.children[0].matrixWorld));
const pts = () => SOLE_PTS.map(() => new THREE.Vector3());

// ---- (1) + (2): planted shoes stay put, moving shoes are up. Real frames: the song's through its tempo map (song
// seconds -> beat), the practice's at the base tempo
for (const [label, fn, b0, b1] of [['song', dracPose, -4, END_BEAT + 6], ['practice', dracPractice, -20, 36]]) for (const front of FRONTS) for (const fps of [30, 60, 120]) {
  const step = song.bpm / 60 / fps, down = [pts(), pts()], now = [pts(), pts()], grounded = [false, false], seen = [false, false], peak = [0, 0];
  const t0 = timeAtBeat(song.beats, b0), next = label === 'song' ? (b, i) => beatAtTime(song.beats, t0 + i / fps) : b => b + step;
  let contacts = 0, slide = 0, low = Infinity; // low: the least peak of a step whose sole travels over 0.6 m
  for (let b = b0, i = 1; b <= b1; b = next(b, i++)) {
    pose3(fn, b, front);
    for (let i = 0; i < 2; i++) {
      sole(i, now[i]);
      const y = Math.min(...now[i].map(p => p.y)), on = Math.abs(y) < 1e-9;
      if (on && !grounded[i]) {
        if (seen[i] && Math.max(...now[i].map((p, k) => p.distanceTo(down[i][k]))) > 0.6) low = Math.min(low, peak[i]);
        contacts++; seen[i] = true; peak[i] = 0; down[i].forEach((p, k) => p.copy(now[i][k]));
      }
      peak[i] = Math.max(peak[i], y);
      if (on) slide = Math.max(slide, ...now[i].map((p, k) => p.distanceTo(down[i][k])));
      grounded[i] = on;
    }
  }
  assert.ok(contacts > (label === 'song' ? 1.3 * END_BEAT : 40), `${label}: steps (${contacts} touchdowns)`); // ~1.4 a beat
  assert.ok(slide < 1e-6, `${label} front ${front} ${fps} fps: a planted shoe slides ${slide} m`);
  // a long step at 1.4 cm read as a skate on screen
  assert.ok(label === 'practice' || (low >= 0.03 && low < Infinity), `${label} front ${front} ${fps} fps: a step over 0.6 m lifts only ${(low * 100).toFixed(1)} cm`);
}
{ // the travel starts and stops high: at fine steps no corner moves while the sole is under 3 mm at either end of the step
  const was = [pts(), pts()], now = [pts(), pts()];
  for (const front of FRONTS) for (let t = -2, first = true; t < END_BEAT + 2; t += 0.004, first = false) {
    pose3(dracPose, t, front);
    for (let i = 0; i < 2; i++) {
      sole(i, now[i]);
      const moved = now[i].some((p, k) => Math.hypot(p.x - was[i][k].x, p.z - was[i][k].z) > 1e-6), y = Math.min(...now[i].map(p => p.y), ...was[i].map(p => p.y));
      assert.ok(first || !moved || y >= 3e-3, `a sole scrapes the floor at ${t.toFixed(3)} (front ${front}): ${(y * 1000).toFixed(2)} mm up`);
      was[i].forEach((p, k) => p.copy(now[i][k]));
    }
  }
}

// ---- (3): no crossing, no overlap (oriented boxes, separating axes)
const obb = (m, b) => { const e = m.matrixWorld.elements; return { c: new THREE.Vector3(b.x, b.y + b.h / 2, b.z).applyMatrix4(m.matrixWorld),
  e: [0, 1, 2].map(k => new THREE.Vector3(e[4 * k], e[4 * k + 1], e[4 * k + 2]).normalize().multiplyScalar([b.w, b.h, b.d][k] / 2)) }; };
const reach = (o, n) => o.e.reduce((r, v) => r + Math.abs(v.dot(n)), 0);
const gap = (a, b) => { // > 0: apart along some axis
  const d = new THREE.Vector3().subVectors(b.c, a.c), axes = [...a.e, ...b.e].map(v => v.clone().normalize());
  for (const u of a.e) for (const v of b.e) { const c = new THREE.Vector3().crossVectors(u, v); if (c.lengthSq() > 1e-12) axes.push(c.normalize()); }
  return Math.max(...axes.map(n => Math.abs(d.dot(n)) - reach(a, n) - reach(b, n)));
};
const SHOE = [{ x: 0, y: 0, z: (bb.min.z + bb.max.z) / 2, w: bb.max.x - bb.min.x, h: 0.14, d: bb.max.z - bb.min.z }, { x: 0, y: 0.1, z: 0, w: 0.36, h: 0.24, d: 0.36 }];
const cream = pantsMesh.map(m => boxes.get(m));
assert.ok(cream.every(b => Math.abs(b.w - 0.5) < 1e-9), 'the trousers\' cream box found');
let worst = { shoe: Infinity, pants: Infinity };
// Since the long D.S. the game dances the song with figures/drac/drac-pose.js and its cloth carrier (tests/drac-compare*.mjs);
// this beat dance and its straight trousers only serve the selector walker (beats 42-114) and the practice, so its
// leg-collision / joint sweep stops at A3 (beat 128): its untouched D3 row crossed the legs at 164-170, never played.
const SHOWN_END = 128;
for (const [fn, b0, b1] of [[dracPose, -2, SHOWN_END], [dracPractice, 0, 16]]) for (const front of FRONTS) for (let b = b0; b < b1; b += 0.01) {
  pose3(fn, b, front);
  const s = Math.min(...SHOE.flatMap(x => SHOE.map(y => gap(obb(shoeMesh[0], x), obb(shoeMesh[1], y)))));
  const p = gap(obb(pantsMesh[0], cream[0]), obb(pantsMesh[1], cream[1]));
  if (s < worst.shoe) worst.shoe = s;
  if (p < worst.pants) worst.pants = p;
  const l = drac.root.worldToLocal(drac.legs[0].shoe.getWorldPosition(W)).x, r = drac.root.worldToLocal(drac.legs[1].shoe.getWorldPosition(W)).x;
  assert.ok(l - r > 0.42, `the feet cross or touch side by side at ${b.toFixed(2)} (front ${front})`);
  assert.ok(s > 0 && p > 0, `legs cut into each other at ${b.toFixed(2)} (front ${front}): shoes ${s.toFixed(3)} m, trousers ${p.toFixed(3)} m`);
}

// ---- (4): pure and seekable
const snap = d => d.legs.flatMap(({ shoe, pants }) => [...shoe.matrixWorld.elements, ...pants.matrixWorld.elements]);
const fresh = (fn, b, front) => { const d = buildDrac(); pose3(fn, b, front, d); return snap(d); };
const close = (a, b, eps, what) => a.forEach((v, k) => assert.ok(Math.abs(v - b[k]) < eps, `${what} (${v} vs ${b[k]})`));
{
  const other = buildDrac(), seeks = [76.25, -3, 231.5, 12, 300, 170.1, -0.5, 128.9, 76.25, 229.4, 42.07, 3, 127.9, 225.4, 124.6];
  seeks.forEach((b, k) => for2(b, k));
  function for2(b, k) {
    const front = FRONTS[k % 3], d = k % 2 ? other : drac;
    pose3(dracPose, b, front, d); close(snap(d), fresh(dracPose, b, front), 1e-12, `song seek to ${b} differs from a fresh pose`);
    pose3(dracPractice, b, front, d); close(snap(d), fresh(dracPractice, b, front), 1e-12, `practice seek to ${b} differs from a fresh pose`);
  }
}
for (let b = -24.3; b < 40; b += 0.37) close(fresh(dracPractice, b, 0.7), fresh(dracPractice, b + 16, 0.7), 1e-9, `the practice wraps onto other feet at ${b.toFixed(2)}`);
{ // the practice's seam, 36 -> 20, from either side: no jump in the shoes
  const a = fresh(dracPractice, 16 - 1e-6, 0), b = fresh(dracPractice, 16, 0), c = fresh(dracPractice, -1e-6, 0);
  close(a, b, 1e-4, 'the practice jumps at its wrap'); close(c, b, 1e-4, 'the practice jumps at its wrap (negative side)');
}
{ // the end: the last steps are down by the final hit's settle, then nothing moves
  const end = fresh(dracPose, END_BEAT + 1, 0);
  for (let b = END_BEAT - 1; b <= 300; b += 0.25) close(fresh(dracPose, b, 0).slice(0, 16), end.slice(0, 16), 1e-9, `the left shoe moves after the end, at ${b}`);
  for (let b = END_BEAT - 1; b <= 300; b += 0.25) close(fresh(dracPose, b, 0).slice(32, 48), end.slice(32, 48), 1e-9, `the right shoe moves after the end, at ${b}`);
}

// ---- (5): one root
const r = { x: 0, z: 0, yaw: 0 };
for (let b = -20; b < 240; b += 0.093) {
  dracPose(pose, b); dracRoot(r, b, false);
  assert.ok(r.x === pose.x && r.z === pose.z && r.yaw === pose.yaw && pose.practice === false, `dracRoot is the song's root at ${b}`);
  dracPractice(pose, b); dracRoot(r, pose.beat, true);
  assert.ok(r.x === pose.x && r.z === pose.z && r.yaw === 0 && pose.practice === true, `dracRoot is the practice's root at ${b}`);
}
console.log('drac feet ok', `shoes ${worst.shoe.toFixed(3)} m, trousers ${worst.pants.toFixed(3)} m apart at the closest`);
