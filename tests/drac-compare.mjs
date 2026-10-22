// The Drac video comparison (drac-compare.html, src/dev/drac-compare/), checked on the real rig:
// (1) evidence: the 33 audited phrases (and the JSON, when the gitignored folder is present), every observed / probable /
//     support step inside an audited window and every verified window used once;
// (2) opening and strides: 4 / 8 / 4, 3 + adjust, 5 + 3 probable, 3 + opening, the four long strides twice, gains and
//     closures where the audit puts them, no steps during the torsions;
// (3) headings: observations.json's categorical passes, one CCW turn at 16.7 and 60, the CCW walk-out arcs, three ever
//     quicker CCW turns, the brake, six CW turns;
// (4) rig as the page poses it: every channel finite, a rigid unsquashed shell, planted soles fixed (holds and 120 deg
//     torsions included), actual cloth caps in the trunk and shoe tops inside the deformed cuffs, no shoe boxes
//     through each other in 3D, every leg within 1.18 of its rest reach (planted and swinging, 30/60/120 fps), cuffs
//     above the floor, soles lift before they travel, accelerations converge at 30/60/120 fps;
// (5) determinism (any seek order, a reused rig) and the reference camera (fixed station, the first-frame fit);
// (6) clock: one video clock, muted start, ?mute locks it, range 0-104.8, frame steps, rates;
// (7) page: dev only, no service, the game never reaches it, no feet planner from the game, modules under 600 lines.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, relative, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { buildDrac, FOOT_X, FOOT_Z, DRAC_SCALE, BODY_Y, ANKLE, HIP_BELOW_BODY } from '../src/scene/models/drac.js';
import { Vox } from '../src/scene/models/voxel.js';
import { makeClothProbe, actualClothFloor } from './drac-cloth-probes.mjs';
import { CLOTH } from '../src/scene/drac-legs.js';
import { poseCarrier } from '../src/scene/drac-rig.js';
import { feetAt as planFeetAt } from '../src/game/drac-steps.js';
const poseCompare = (rig, p) => poseCarrier(rig, p, planFeetAt); // the game's carrier on the audited foot plan
import { PHRASES, VERIFIED, PROBABLE, SUPPORT, SOURCE, phraseAt } from '../src/dev/drac-compare/phrases.js';
import { PLAN, feetAt, newFeet, swingAt, stepAt, LEG } from '../src/game/drac-steps.js';
import { poseAt as poseAtBeat } from '../src/game/drac-pose.js';
import { newDracPose as newPose } from '../src/game/dance-drac.js';
import { dracTime } from '../src/game/drac-time.js';
// the game's pose at a reference second, its comic layer on the song's own beat there (game/drac-time.js)
const poseAt = (out, t, g) => poseAtBeat(out, t, dracTime.beatAtRef(t), g);
import { TRACKS, at, END, SPOTS } from '../src/game/drac-path.js';
import { createCameraTrack, newCamera } from '../src/dev/drac-compare/camera.js';
import { createVideoClock } from '../src/dev/drac-compare/clock.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const yawDeg = t => at(TRACKS.yaw, t);

// ---- (1) evidence
assert.equal(PHRASES.length, 33, '33 audited phrases');
assert.equal(PHRASES[0].start, 0); assert.equal(PHRASES[32].end, 104.8); assert.equal(END, 104.8);
PHRASES.forEach((p, i) => { assert.ok(p.end > p.start); if (i) assert.equal(p.start, PHRASES[i - 1].end, `phrase ${i} contiguous`); });
{
  const audit = 'research/bestiari/drac/evidence/steps-v2/phrases-reviewed.json';
  if (existsSync(new URL(`../${audit}`, import.meta.url))) {
    const j = JSON.parse(read(audit)).phrases;
    assert.deepEqual(PHRASES.map(p => [p.start, p.end, p.status, p.action, p.count]), j.map(p => [p.start, p.end, p.status, p.action, p.count]), 'the copy is the audit');
  } else console.log('  (audit JSON absent: copy not cross-checked)');
}
const within = (s, w) => s.down >= w.lo - 1e-9 && s.down <= w.hi + 1e-9;
for (const s of PLAN) {
  const pool = { observed: VERIFIED, probable: PROBABLE, support: SUPPORT }[s.status];
  if (!pool) { assert.equal(s.status, 'adaptation'); continue; }
  const w = pool.find(w => within(s, w) && (w.leg === null || w.leg === s.leg || s.legInferred));
  assert.ok(w, `${s.status} ${s.leg} lands at ${s.down} outside every audited window`);
  if (w.leg === null) assert.ok(s.legInferred, `${s.down}: the audit did not identify this leg`);
}
for (const w of VERIFIED) assert.equal(PLAN.filter(s => s.status === 'observed' && within(s, w)).length, 1, `verified window ${w.lo}-${w.hi} used once`);
for (const w of PROBABLE) assert.equal(PLAN.filter(s => s.status === 'probable' && within(s, w)).length, 1, `probable window ${w.lo}`);

// ---- (2) the counted phrases
const landings = (a, b) => PLAN.filter(s => s.down >= a && s.down < b);
const shoeOf = s => { // the world sole centre (model units) a planted step stands on
  const a = s.anchor, side = s.i ? -a.wide : a.wide, c = Math.cos(a.yaw), n = Math.sin(a.yaw), rx = s.i ? -FOOT_X : FOOT_X, z = FOOT_Z + 0.08;
  const x0 = a.x + c * side, z0 = a.z - n * side;
  return [x0 + c * rx + n * z, z0 - n * rx + c * z];
};
const shoeFrom = s => { const prev = PLAN.filter(p => p.i === s.i && p.down <= s.up).at(-1); return prev ? shoeOf(prev) : shoeOf({ ...s, anchor: s.from }); };
const along = (s, d) => { const a = shoeFrom(s), b = shoeOf(s); return ((b[0] - a[0]) * d[0] + (b[1] - a[1]) * d[1]) / Math.hypot(...d); };
const dir = (p, q) => [q[0] - p[0], q[1] - p[1]];
function phrase(a, b, legs, kinds, statuses) {
  const s = landings(a, b);
  assert.deepEqual(s.map(x => x.leg).join(''), legs, `${a}-${b} legs`);
  assert.deepEqual(s.map(x => x.kind), kinds, `${a}-${b} kinds`);
  assert.deepEqual(s.map(x => x.status), statuses, `${a}-${b} statuses`);
  return s;
}
const rep = (x, n) => Array(n).fill(x);
{
  const O = 'observed';
  let s = phrase(0, 2.2, 'FCFC', ['step', 'step', 'step', 'close'], rep(O, 4));
  const fwd = dir(SPOTS.S0, SPOTS.A);
  s.slice(0, 3).forEach(x => assert.ok(along(x, fwd) > 0.6, `${x.down}: gains ground (${along(x, fwd).toFixed(2)})`));
  const gap = (x, y) => { const p = shoeOf(x), q = shoeOf(y), a = yawDeg(x.down) * Math.PI / 180; return (p[0] - q[0]) * Math.sin(a) + (p[1] - q[1]) * Math.cos(a); }; // along the independently sampled shell heading at touchdown
  assert.ok(Math.abs(s[3].anchor.yaw - yawDeg(s[3].down) * Math.PI / 180) < 1e-9, 'the closing shoe keeps the shell heading');
  assert.ok(Math.abs(gap(s[3], s[2])) < 0.2, `the close lands beside F, not past it (${gap(s[3], s[2]).toFixed(2)})`);
  s = phrase(2.2, 6.4, 'FCFCFCFC', [...rep('back', 7), 'close'], rep(O, 8));
  const back = dir(SPOTS.A, SPOTS.B);
  s.slice(0, 7).forEach(x => assert.ok(along(x, back) > 0.25, `${x.down}: steps back (${along(x, back).toFixed(2)})`)); // the first from a joined base is a half step
  assert.ok(s.slice(1, 7).reduce((n, x) => n + along(x, back), 0) / 6 > 0.8, 'full steps back after the first');
  s = phrase(6.4, 8.4, 'FCFC', ['step', 'step', 'step', 'close'], rep(O, 4));
  s.slice(0, 3).forEach(x => assert.ok(along(x, dir(SPOTS.B, SPOTS.M)) > 0.3, `${x.down}: forward to the middle`));
  s = phrase(8.4, 10.4, 'FCFC', ['step', 'step', 'step', 'adjust'], [O, O, O, 'support']);
  const adj = Math.hypot(...dir(shoeFrom(s[3]), shoeOf(s[3])));
  assert.ok(adj < 0.3, `the 9.9-10.1 adjustment stays almost in place (${adj.toFixed(2)})`);
  s = phrase(10.4, 14.4, 'FCFCFCFC', rep('back', 8), [...rep(O, 5), ...rep('probable', 3)]);
  // Authored distances, not measured by the audit: two shorter steps leave the hold, and the final probable
  // C placement (~14.1) is shorter to brake before the return. The five intervening steps remain full steps.
  const across = dir(SPOTS.L, SPOTS.R);
  s.forEach((x, k) => assert.ok(along(x, across) > (k < 2 || k === 7 ? 0.2 : 0.8), `${x.down}: back across the middle (${along(x, across).toFixed(2)})`));
  phrase(14.4, 16.7, 'FCFCF', ['step', 'step', 'step', 'open', 'adjust'], [O, O, O, 'support', 'support']);
  // the four long strides, both times: the foot hangs forward in the air and gains a long way
  for (const [a, b] of [[28.8, 33], [72.8, 76.5]]) {
    s = landings(a, b).filter(x => x.kind === 'stride');
    assert.deepEqual(s.map(x => x.leg + x.status), ['Fobserved', 'Cobserved', 'Fobserved', 'Cobserved'], `${a}: four strides F C F C`);
    for (const x of s) {
      assert.ok(x.down - x.up >= 0.55, `stride ${x.down} hangs (${(x.down - x.up).toFixed(2)} s)`);
      assert.ok(Math.hypot(...dir(shoeFrom(x), shoeOf(x))) > 1.0, `stride ${x.down} is long`);
    }
  }
  assert.deepEqual(landings(28.2, 28.8).map(x => x.kind + x.legInferred), ['closetrue'], 'the visible closing before the strides');
  assert.deepEqual(landings(39.2, 40.9).map(x => x.status), ['observed', 'observed'], 'two visible supports at 39.8 and 40.7');
  assert.deepEqual(landings(57.3, 59).map(x => x.leg + x.status), ['Fprobable', 'Cobserved', 'Fobserved'], '57.7 probable, 58.3 C, 58.75 F');
  // holds: no new placement while the shell twists (and while it brakes before the strides / the turns)
  for (const [a, b] of [[19.81, 28.2], [63.41, 71.7], [42.0, 44.3], [58.8, 59.95], [93.81, 94.5], [2.11, 2.37], [8.01, 8.29]]) {
    assert.deepEqual(landings(a, b).map(x => x.down), [], `no landing in the hold ${a}-${b}`);
    for (let t = a; t < b; t += 0.01) assert.ok(swingAt(0, t) < 0 && swingAt(1, t) < 0, `both feet down in the hold at ${t.toFixed(2)}`);
  }
  for (const [a, b] of [[19.8, 28.2], [63.4, 71.7]]) {
    let lo = Infinity, hi = -Infinity;
    for (let t = a; t <= b; t += 0.05) { lo = Math.min(lo, yawDeg(t)); hi = Math.max(hi, yawDeg(t)); }
    assert.ok(hi - lo >= 110, `${a}-${b}: the shell twists over planted feet (${(hi - lo).toFixed(0)} deg)`);
  }
}

// ---- (3) headings and turns: observations.json's categorical passes (F-b front biased to HL, F-a biased to HR)
{
  const BAND = { 'F-b': [-45, -10], 'F-a': [10, 45], HR: [65, 115], BACK: [155, 205], HL: [245, 295] };
  const SEEN = [[0, 'F-b'], [5, 'F-b'], [16.8, 'F-a'], [17.6, 'HR'], [18.4, 'BACK'], [19.0, 'HL'], [19.6, 'F-b'], [20.0, 'F-a'], [21, 'F-a'],
    [22.0, 'F-b'], [22.6, 'HL'], [23.5, 'HL'], [25.5, 'F-a'], [27.8, 'HL'], [29.5, 'HL'], [32.8, 'F-b'], [34.0, 'F-a'], [35.2, 'HR'], [36.3, 'HR'],
    [38.0, 'BACK'], [39.8, 'HL'], [41.8, 'F-b'], [43, 'F-b'], [60.0, 'F-a'], [61.0, 'HR'], [61.7, 'BACK'], [62.5, 'HL'], [63.1, 'F-b'], [63.5, 'F-a'],
    [64.5, 'F-a'], [66.8, 'HL'], [68.8, 'F-a'], [71.5, 'HL'], [73.5, 'HL'], [76.1, 'F-b'], [77.1, 'F-a'], [78.7, 'HR'], [79.6, 'HR'], [81.9, 'BACK'],
    [83.3, 'HL'], [84.7, 'HL'], [85.8, 'F-b'], [94.2, 'F-b'], [104.4, 'F-b'],
    // the ending's dense audit (observations.json, checked frame by frame by the parent): every quarter of every turn
    ...[86.6, 89.5, 91.8, 93.8].map(t => [t, 'F-b']), ...[87.8, 90.4, 92.5].map(t => [t, 'HR']), ...[88.5, 90.9, 92.9].map(t => [t, 'BACK']),
    ...[88.9, 91.3, 93.3].map(t => [t, 'HL']), [94.6, 'F-b'], [95.0, 'HL'], [95.2, 'HL'], [95.4, 'BACK'], [95.6, 'BACK'], [95.8, 'HR'], [96.0, 'HR'],
    [96.2, 'F-a'], [96.4, 'F-b'], [96.6, 'F-b'], ...[95.5, 97.2, 98.8, 100.2, 101.6, 103.0].map(t => [t, 'BACK']),
    ...[96.5, 98.0, 99.6, 101.0, 102.4, 104.0].map(t => [t, 'F-b'])];
  for (const [t, cat] of SEEN) {
    const y = ((yawDeg(t) % 360) + 540) % 360 - 180, [lo, hi] = BAND[cat], w = ((y - lo) % 360 + 360) % 360;
    assert.ok(w <= hi - lo, `${t} s: source ${cat}, model heading ${yawDeg(t).toFixed(0)} deg`);
  }
  const dir = (a, b, sign, hold = false) => { for (let t = a; t < b; t += 0.02) assert.ok(sign * at(TRACKS.yaw, t, true) > (hold ? -1e-9 : 0), `${sign > 0 ? 'CCW' : 'CW'} at ${t.toFixed(2)}`); };
  dir(16.7, 19.6, 1); dir(60.0, 63.1, 1); dir(31.02, 41.78, 1, true); dir(74.42, 83.28, 1, true); // the arcs hold HR through the close pass
  dir(85.8, 93.79, 1); dir(94.52, 103.99, -1);
  const turns = (a, b) => (yawDeg(b) - yawDeg(a)) / 360;
  assert.ok(Math.abs(turns(16.5, 19.6) - 1) < 0.05 && Math.abs(turns(59.0, 63.1) - 1) < 0.05, 'one CCW turn at 16.7 and at 60');
  assert.ok(Math.abs(turns(31.0, 41.8) - 430 / 360) < 0.01, 'the walk-out arc turns CCW from HL through the front, HR and the back to F-b');
  const passes = [86.6, 89.5, 91.8, 93.8];
  assert.ok(Math.abs(turns(86.6, 93.8) - 3) < 0.1, 'three CCW turns to the brake');
  for (let k = 1; k < 3; k++) assert.ok(passes[k + 1] - passes[k] < passes[k] - passes[k - 1], 'each CCW turn quicker');
  for (let t = 93.8; t <= 94.6; t += 0.02) assert.ok(Math.abs(yawDeg(t) - yawDeg(93.8)) < (t <= 94.5 ? 1e-9 : 6), 'the brake holds (within 6 deg to 94.6: near-identical samples; the reversal 94.6-94.8)');
  assert.ok(yawDeg(94.8) < yawDeg(94.6) - 20, 'the reversal is under way by 94.8 (3/4 HL)');
  assert.equal(turns(94.5, 104), -6, 'six CW turns');
  const cross = (y, a, b) => { for (let t = a; t < b; t += 0.001) if ((yawDeg(t) - y) * (yawDeg(t + 0.001) - y) <= 0) return t; return Infinity; };
  assert.ok(cross(2500 - 70, 94.6, 104) < cross(2500 - 160, 94.6, 104), 'CW: left profile before the back');
}

// ---- (4) the real rig, as the page poses it (poseCompare), over the whole range
// Keep original Vox boxes for rigid trunk/shoes; the trousers are checked through their deformed triangles.
const orig = { box: Vox.prototype.box, mesh: Vox.prototype.mesh };
Vox.prototype.box = function (x, y, z, w, h, d, color, jitter) { (this.L ||= []).push({ x, y, z, w, h, d }); return orig.box.call(this, x, y, z, w, h, d, color, jitter); };
Vox.prototype.mesh = function () { const m = orig.mesh.call(this); m.userData.boxes = this.L; return m; };
const rig = buildDrac(); rig.feet = newFeet();
Object.assign(Vox.prototype, orig);
const units = new THREE.Group(); units.add(rig.root); // model units; gaps are reported in metres (x DRAC_SCALE)
const pose = newPose();
const V = new THREE.Vector3(), P = new THREE.Vector3(), M = new THREE.Matrix4();
function posed(t) { poseAt(pose, t); poseCompare(rig, pose); units.updateMatrixWorld(true); }
const lo = b => [b.x - b.w / 2, b.y, b.z - b.d / 2], hi = b => [b.x + b.w / 2, b.y + b.h, b.z + b.d / 2];
function topFace(mesh) { // the top face of a mesh's highest box(es), on a 7x7 grid (its root face, as in drac-parts)
  const B = mesh.userData.boxes, y = Math.max(...B.map(b => b.y + b.h)), pts = [];
  for (const b of B.filter(b => Math.abs(b.y + b.h - y) < 1e-6)) for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) pts.push(new THREE.Vector3(lo(b)[0] + b.w * i / 6, y, lo(b)[2] + b.d * j / 6));
  return pts;
}
const gapOf = (p, mesh) => Math.min(...mesh.userData.boxes.map(b => { const a = lo(b), c = hi(b); let q = 0; for (let k = 0; k < 3; k++) { const v = p.getComponent(k), g = Math.max(0, a[k] - 1e-4 - v, v - c[k] - 1e-4); q += g * g; } return Math.sqrt(q); }));
const trunk = rig.body.children[0];
posed(0); // initialise the preview's continuous cloth before reading its actual geometry
const CLOTH_PROBES = rig.legs.map(makeClothProbe);
const SHOE_TOP = rig.legs.map(l => topFace(l.shoe.children[0]));
// a shoe as its two level boxes (sole, upper) in the shoe's frame: [x0, x1, y0, y1, z0, z1]
const SHOE = rig.legs[0].shoe.children[0].userData.boxes.map(b => [lo(b)[0], hi(b)[0], b.y, b.y + b.h, lo(b)[2], hi(b)[2]]);
function shoesTouch() { // 3D: the boxes of two level shoes intersect only if they overlap in height and on the floor
  const S = rig.legs.map(({ shoe }) => shoe);
  for (const a of SHOE) for (const b of SHOE) {
    const ya = [S[0].position.y + a[2], S[0].position.y + a[3]], yb = [S[1].position.y + b[2], S[1].position.y + b[3]];
    if (Math.min(ya[1], yb[1]) - Math.max(ya[0], yb[0]) <= 0) continue;
    const quad = (s, r) => [[r[0], r[4]], [r[1], r[4]], [r[1], r[5]], [r[0], r[5]]].map(([x, z]) => { s.localToWorld(V.set(x, 0, z)); return [V.x, V.z]; });
    const qa = quad(S[0], a), qb = quad(S[1], b);
    let apart = false;
    for (const q of [qa, qb]) for (let k = 0; k < 4 && !apart; k++) {
      const p0 = q[k], p1 = q[(k + 1) % 4], nx = p1[1] - p0[1], nz = p0[0] - p1[0], pr = r => r.map(c => c[0] * nx + c[1] * nz), A = pr(qa), B = pr(qb);
      apart = Math.max(...A) <= Math.min(...B) || Math.max(...B) <= Math.min(...A);
    }
    if (!apart) return true;
  }
  return false;
}
const SOLE = [[0.21, 0.43], [-0.21, 0.43], [-0.21, -0.27], [0.21, -0.27]];
const BODY_PTS = [[1.1, 0, 1.2], [-1.1, 0, 1.2], [1.1, 0, -1.2], [-1.1, 0, -1.2], [0, 0.95, 0]];
// world points that must move smoothly: sole corners (with lift), the trunk's corners and both heads
function points(out) {
  rig.legs.forEach(({ shoe }) => SOLE.forEach(([x, z]) => { shoe.localToWorld(V.set(x, 0, z)); out.push(V.x, V.y, V.z); }));
  BODY_PTS.forEach(([x, y, z]) => { rig.body.localToWorld(V.set(x, y, z)); out.push(V.x, V.y, V.z); });
  rig.necks.forEach(n => { n.head.getWorldPosition(V); out.push(V.x, V.y, V.z); });
  return out;
}
// the carrier's reach: ankle (on the shoe) to hip (on the body) over its rest length, the trousers' own stretch, and the
// lowest point of each trouser (its cuff, slid down the leg when it leans)
const REACH_MAX = 1.18; // authoring bound for this preview (not an anatomical measurement): no leg 18% longer than at rest
const REST_LEG = BODY_Y - HIP_BELOW_BODY - ANKLE, H0 = new THREE.Vector3(), H1 = new THREE.Vector3();
// The carrier's hips under the shell, worked out here from first principles (not rig.js): the pelvis faces the mean of
// the posed feet's headings, its centre shifted horizontally towards the ankles' midpoint by d * L / sqrt(L^2 + |d|^2).
// The posed trousers must aim exactly at these hips, and every reach is measured to them.
const HIP_L = 0.45, PV = new THREE.Vector3(), PU = new THREE.Vector3(), HW = [new THREE.Vector3(), new THREE.Vector3()];
function hips() {
  const rel = (rig.feet[0].yaw + rig.feet[1].yaw) / 2 - pose.yaw, c = Math.cos(rel), n = Math.sin(rel);
  [0, 1].forEach(i => { const rx = i ? -FOOT_X : FOOT_X; HW[i].set(c * rx + n * FOOT_Z, -HIP_BELOW_BODY, -n * rx + c * FOOT_Z).applyMatrix4(rig.body.matrix); });
  const a = rig.legs[0].shoe.position, b = rig.legs[1].shoe.position;
  const dx = (a.x + b.x - HW[0].x - HW[1].x) / 2, dz = (a.z + b.z - HW[0].z - HW[1].z) / 2, k = HIP_L / Math.hypot(HIP_L, dx, dz);
  for (const h of HW) { h.x += dx * k; h.z += dz * k; rig.root.localToWorld(h); }
  return { rel, shift: Math.hypot(dx, dz) * k };
}
const aimMiss = i => { // actual top-cap centre must reach the independently solved pelvis hip + hidden seam
  PV.set(0, 0, 0);
  const caps = CLOTH_PROBES[i].caps.top;
  for (const c of caps) PV.add(c.p);
  PV.multiplyScalar(1 / caps.length);
  PU.copy(HW[i]); PU.y += CLOTH.seam;
  return PV.distanceTo(PU);
};
function reach(i) {
  const { shoe } = rig.legs[i];
  shoe.localToWorld(H0.set(0, ANKLE, 0)); hips();
  return H0.distanceTo(HW[i]) / REST_LEG;
}
const partsOf = () => [...rig.necks.flatMap(n => [n.root, ...n.segs, n.head, n.jaw]), ...rig.wings.map(w => w.root), rig.tail.base, ...rig.tail]
  .map(o => [o.position.x, o.position.y, o.position.z, o.rotation.x, o.rotation.y, o.rotation.z, o.scale.x, o.scale.y, o.scale.z].map(v => +v.toFixed(12)).join());
{ // 60 fps (the parent's probe rate): channels, rigid shell, planted soles, joints, shoe boxes, floor
  posed(0);
  const still = partsOf(), bodyScale = rig.body.scale.toArray().join();
  const open = {}, touch = [], stance = [null, null], far = { planted: [0, 0], swing: [0, 0] };
  let sunk = 0, slide = 0, cuff = Infinity, scale = 0, twist = Infinity;
  for (let f = 0, n = Math.round(END * 60); f <= n; f++) {
    const t = f / 60;
    posed(t);
    for (const [k, v] of Object.entries(pose)) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} at ${t}`);
    if (f % 30 === 0) { assert.deepEqual(partsOf(), still, `the shell is one rigid piece at ${t}`); assert.equal(rig.body.scale.toArray().join(), bodyScale, 'no squash'); }
    for (let i = 0; i < 2; i++) {
      const probe = CLOTH_PROBES[i].update();
      M.copy(trunk.matrixWorld).invert();
      for (const c of probe.caps.top) {
        const g = gapOf(P.copy(c.p).applyMatrix4(M), trunk) * DRAC_SCALE, nm = `pants${i}`;
        if (g > (open[nm]?.gap ?? 0)) open[nm] = { gap: g, t: +t.toFixed(3) };
      }
      for (const p of SHOE_TOP[i]) {
        const g = probe.outside(rig.legs[i].shoe.children[0].localToWorld(P.copy(p))) * DRAC_SCALE, nm = `shoe${i}`;
        if (g > (open[nm]?.gap ?? 0)) open[nm] = { gap: g, t: +t.toFixed(3) };
      }
    }
    if (shoesTouch()) touch.push(+t.toFixed(2));
    for (let i = 0; i < 2; i++) {
      const shoe = rig.legs[i].shoe, C = SOLE.map(([x, z]) => shoe.localToWorld(V.set(x, 0, z)).toArray());
      sunk = Math.max(sunk, -Math.min(...C.map(c => c[1])));
      const r = reach(i), k = swingAt(i, t) < 0 ? 'planted' : 'swing';
      const h = hips(), turn = Math.atan2(Math.sin(h.rel), Math.cos(h.rel));
      assert.ok(aimMiss(i) < 1e-6, `${t}: leg ${i}'s trouser misses its pelvis hip by ${aimMiss(i)}`);
      assert.ok(h.shift <= HIP_L + 1e-9, 'the pelvis centre shifts at most L');
      if (t >= 22.8 && t <= 24.1) twist = Math.min(twist, Math.abs(turn));
      if (r > far[k][0]) far[k] = [r, +t.toFixed(3)];
      scale = Math.max(scale, rig.legs[i].cloth.chainLength / CLOTH.chain);
      cuff = Math.min(cuff, actualClothFloor(rig.legs[i]));
      const id = swingAt(i, t) < 0 ? stepAt(i, t) ?? 'start' : null;
      if (id && stance[i]?.id === id) C.forEach((c, k) => { slide = Math.max(slide, Math.hypot(c[0] - stance[i].c[k][0], c[1] - stance[i].c[k][1], c[2] - stance[i].c[k][2])); });
      else stance[i] = id && { id, c: C };
    }
  }
  console.log(`  joints (m outside): ${Object.entries(open).map(([k, v]) => `${k} ${v.gap.toFixed(4)} at ${v.t}`).join(', ') || 'none'}; shoe boxes touch ${touch.length} frames; planted slide ${slide.toExponential(1)}`);
  assert.deepEqual(Object.entries(open).filter(([, v]) => v.gap >= 0.0005).map(([k, v]) => `${k} ${v.gap.toFixed(4)} m at ${v.t}`), [], 'every trouser stays in the trunk and every shoe in its cuff');
  assert.deepEqual(touch.slice(0, 8), [], 'the shoes never pass through each other');
  assert.ok(slide < 1e-9, 'a planted sole never slides or turns (holds, torsions and turns included)');
  assert.ok(sunk < 1e-9, 'no sole under the floor');
  console.log(`  reach (ankle to hip / rest): planted ${far.planted[0].toFixed(3)} at ${far.planted[1]}, swing ${far.swing[0].toFixed(3)} at ${far.swing[1]}; bone-chain extension ${scale.toFixed(3)}; lowest cuff ${(cuff * DRAC_SCALE).toFixed(3)} m`);
  assert.ok(far.planted[0] <= REACH_MAX && far.swing[0] <= REACH_MAX, `a leg reaches past ${REACH_MAX} of its rest length`);
  assert.ok(scale <= REACH_MAX, 'the soft bone chain extends less than 18 percent of its resting length');
  assert.ok(cuff > 0, 'no trouser cuff under the floor');
  console.log(`  pelvis: turns at least ${(twist * 180 / Math.PI).toFixed(1)} deg off the shell through the 22.8-24.1 torsion hold`);
  assert.ok(twist > 40 * Math.PI / 180, "the carrier's pelvis follows the planted feet while the shell twists over them");
}
{ // second differences of the moving points at 30 / 60 / 120 fps and three frame phases: a step in velocity shows as an
  // acceleration growing with the frame rate; the heavy shell and heads stay under a bound too
  const peak = {};
  for (const fps of [30, 60, 120]) for (const ph of [0, 1 / 3, 2 / 3]) {
    let a = [], b = [], c = [];
    const h = 1 / fps;
    let sole = 0, body = 0, at_ = 0;
    for (let f = 0; (f + ph) * h <= END; f++) {
      const t = (f + ph) * h;
      posed(t); c = points([]);
      for (let i = 0; i < 2; i++) assert.ok(reach(i) <= REACH_MAX, `${fps} fps: leg ${i} reach ${reach(i).toFixed(3)} at ${t.toFixed(3)}`);
      if (a.length) for (let k = 0; k < c.length; k += 3) {
        const acc = Math.hypot(c[k] - 2 * b[k] + a[k], c[k + 1] - 2 * b[k + 1] + a[k + 1], c[k + 2] - 2 * b[k + 2] + a[k + 2]) / (h * h);
        if (k < 24) { if (acc > sole) sole = acc; } else if (acc > body) { body = acc; at_ = t - h; }
      }
      a = b; b = c;
    }
    peak[fps] = { sole: Math.max(peak[fps]?.sole ?? 0, sole), body: Math.max(peak[fps]?.body ?? 0, body), at: at_ };
  }
  console.log(`  peak acceleration (u/s^2): ${Object.entries(peak).map(([f, p]) => `${f} fps sole ${p.sole.toFixed(0)} body ${p.body.toFixed(1)} (at ${p.at.toFixed(2)})`).join(', ')}`);
  assert.ok(peak[120].sole < 1.25 * peak[60].sole && peak[120].body < 1.25 * peak[60].body, 'no velocity steps (accelerations converge with the frame rate)');
  assert.ok(peak[120].body < 60, 'the shell and heads move like a carried weight (under ~30 m/s^2 at their corners)');
}
{ // a moving sole is off the floor: no sliding along it
  let worst = 0;
  for (let t = 0; t < END; t += 1 / 240) {
    const f0 = feetAt(newFeet(), t), f1 = feetAt(newFeet(), t + 1 / 240);
    for (let i = 0; i < 2; i++) if (Math.hypot(f1[i].x - f0[i].x, f1[i].z - f0[i].z) > 1e-6 && Math.min(f0[i].lift, f1[i].lift) < 1e-4) worst = Math.max(worst, t);
  }
  assert.equal(worst, 0, 'every sole lifts before it travels and travels only while lifted');
}
{ // continuity at every phrase seam, and the start / end of the range
  const a = newPose(), b = newPose(), fa = newFeet(), fb = newFeet();
  for (const p of PHRASES) {
    poseAt(a, p.start - 1e-7); poseAt(b, p.start + 1e-7); feetAt(fa, p.start - 1e-7); feetAt(fb, p.start + 1e-7);
    for (const k of Object.keys(a)) if (typeof a[k] === 'number' && k !== 'beat') assert.ok(Math.abs(a[k] - b[k]) < 1e-4, `${k} jumps at ${p.start}`);
    for (let i = 0; i < 2; i++) for (const k of ['x', 'z', 'yaw', 'lift']) assert.ok(Math.abs(fa[i][k] - fb[i][k]) < 1e-4, `foot ${i} ${k} jumps at ${p.start}`);
  }
  poseAt(a, END); poseAt(b, 111.9);
  assert.deepEqual({ ...a, beat: 0 }, { ...b, beat: 0 }, 'past 104.8 the settled pose holds');
  assert.ok(Math.abs(a.x - SPOTS.SPIN104[0]) < 1e-9, 'ends where the reversed spins drift to');
  poseAt(a, 0); assert.ok(Math.abs(a.x - SPOTS.S0[0]) < 1e-9 && Math.abs(a.yaw * 180 / Math.PI + 20) < 1e-9, 'starts F-b at its first spot');
}

// ---- (5) determinism, and the reference camera
{
  const plan = JSON.stringify(PLAN);
  const sample = t => { const p = poseAt(newPose(), t), f = feetAt(newFeet(), t, false, 0); return JSON.stringify([p, f]); };
  let seed = 7;
  const times = Array.from({ length: 400 }, () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * END; });
  const first = times.map(sample);
  for (let t = 0; t <= END; t += 0.37) sample(t); // a sweep in between
  assert.deepEqual([...times].reverse().map(sample).reverse(), first, 'same pose whatever the seek order');
  const fresh = buildDrac(); fresh.feet = newFeet();
  for (const t of times.slice(0, 40)) {
    posed(t);
    poseCompare(fresh, poseAt(newPose(), t));
    rig.legs.forEach((l, i) => assert.ok(l.shoe.position.distanceTo(fresh.legs[i].shoe.position) < 1e-12 && l.pants.quaternion.toArray().every((q, k) => Math.abs(q - fresh.legs[i].pants.quaternion.toArray()[k]) < 1e-12) && l.pants.position.distanceTo(fresh.legs[i].pants.position) < 1e-12, 'history-free legs'));
    rig.legs.forEach((l, i) => assert.deepEqual(l.cloth.mesh.geometry.attributes.position.array, fresh.legs[i].cloth.mesh.geometry.attributes.position.array, 'history-free actual cloth vertices'));
  }
  assert.equal(JSON.stringify(PLAN), plan, 'seeking never changes the plan');
  assert.ok(Object.isFrozen(PLAN) && PLAN.every(s => Object.isFrozen(s) && Object.isFrozen(s.anchor)), 'the plan is frozen');
}
{ // a fixed station that only turns; the first frame is the parent's fit; keys replaceable and refused when broken
  const cams = createCameraTrack(), c = newCamera(), d = newCamera();
  cams.cameraAt(c, 0); const station = [...c.pos];
  assert.ok(Math.abs(c.pos[2] - SPOTS.S0[1] * DRAC_SCALE - 6.256) < 1e-9 && c.pos[1] === 1.55 && c.fov === 44 && c.pan === 0, 'the first frame is the local fit, relative to the first spot');
  for (let t = 0; t <= END; t += 0.5) {
    cams.cameraAt(c, t); cams.cameraAt(d, t);
    assert.deepEqual(c, d); assert.deepEqual(c.pos, station, 'the operator stands still');
    assert.ok([...c.pos, ...c.target, c.fov].every(Number.isFinite));
  }
  for (const v of ['fixa', 'planta']) assert.ok(cams.cameraAt(c, 50, v).fov > 0);
  assert.throws(() => cams.setTrack([[1, 0, 0], [0, 0, 0]]), /not increasing/);
  cams.cameraAt(d, 12); cams.cameraAt(c, 12); assert.deepEqual(c, d, 'a refused track keeps the old one');
  cams.setTune({ follow: 0 });
  assert.deepEqual(cams.cameraAt(c, 12).target, cams.cameraAt(d, 0).target, 'follow 0 is a still camera');
}

// ---- (6) the clock
{
  const fake = () => ({ currentTime: 0, duration: 111.86, paused: true, muted: false, defaultMuted: false, autoplay: true, playbackRate: 1, plays: 0,
    play() { this.paused = false; this.plays++; return Promise.resolve(); }, pause() { this.paused = true; } });
  let v = fake(), c = createVideoClock(v);
  assert.ok(v.muted && v.defaultMuted && !v.autoplay && v.paused && v.plays === 0, 'starts muted, paused, no autoplay');
  c.play(); assert.ok(!v.paused && v.muted, 'playing does not unmute');
  assert.equal(c.setSound(true), true); assert.equal(v.muted, false, 'sound only on request');
  c.setSound(false); assert.equal(v.muted, true);
  assert.equal(c.seek(200), 104.8); assert.equal(c.seek(-3), 0);
  v.currentTime = 1; c.step(1); assert.ok(Math.abs(v.currentTime - 1.021) < 1e-9 && v.paused, 'one 50 fps frame, paused');
  c.step(-2); assert.ok(Math.abs(v.currentTime - 0.981) < 1e-9);
  for (const r of [0.5, 0.25, 1]) assert.equal(c.setRate(r), r); assert.equal(c.setRate(2), 1, 'only 1, 0.5, 0.25');
  c.play(); assert.equal(c.guard(104.85), 104.8); assert.ok(v.paused && v.currentTime === 104.8, 'stops at 104.8');
  c.play(); assert.equal(v.currentTime, 0, 'play from the end starts over');
  c.setFull(true); assert.equal(c.seek(110), 110); assert.equal(c.guard(110), 110);
  c.setFull(false); assert.equal(v.currentTime, 104.8);
  v = fake(); c = createVideoClock(v, { mute: true });
  assert.equal(c.setSound(true), false); assert.ok(v.muted, '?mute locks the sound off');
}

// ---- (7) the page
{
  const html = read('tools/dev/drac-compare.html');
  assert.ok(/<video[^>]*\smuted[\s>]/.test(html) && !/autoplay/.test(html) && /src="\/drac-reference\/pm-lEViiPK0\.mp4"/.test(html), 'local video, muted, no autoplay');
  assert.ok(!read('vite.config.js').includes('drac-compare') && !read('index.html').includes('drac-compare'), 'not a build input');
  const seen = new Set(), bare = new Set(), stack = [fileURLToPath(new URL('../src/dev/drac-compare/main.js', import.meta.url))];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f) || !f.endsWith('.js')) continue;
    seen.add(f);
    for (const m of readFileSync(f, 'utf8').matchAll(/^(?:import|export)\s[^;]*?from\s+'([^']+)'|^import\s+'([^']+)'/gm)) {
      const spec = m[1] ?? m[2];
      if (spec.startsWith('.')) stack.push(resolvePath(dirname(f), spec)); else bare.add(spec);
    }
  }
  const files = [...seen].map(f => relative(ROOT, f));
  assert.deepEqual([...bare].filter(m => m !== 'three' && !m.startsWith('three/addons/')), [], 'three.js is the only package');
  // the page draws through the game's own modules (path, steps, pose, time map, layout, rig, legs, colla), nothing else of the game
  for (const f of files) assert.ok(/^src\/(dev\/drac-compare\/|game\/(dance|dance-drac|drac-feet|drac-path|drac-steps|drac-pose|drac-time|drac-layout)\.js|game\/figures\.js|core\/beat-grid\.js|song-drac\.json|scene\/(drac-motion|drac-rig|drac-legs|drac-colla|models\/[a-z-]+)\.js)/.test(f), `the page reaches ${f}`);
  // drac-feet.js comes in only as poseDrac's default argument; the comparison always passes its own feetAt
  assert.ok(!files.filter(f => f.startsWith('src/dev/drac-compare/')).some(f => /^import[^;]*(makeDracFeet|dracFeet|drac-feet)/m.test(read(f))), 'no game feet planner');
  for (const f of files.filter(f => f.startsWith('src/dev/drac-compare/'))) assert.ok(read(f).split('\n').length <= 600, `${f} under 600 lines`);
  const game = new Set(), todo = [fileURLToPath(new URL('../src/main.js', import.meta.url))];
  while (todo.length) {
    const f = todo.pop();
    if (game.has(f) || !/\.m?js$/.test(f) || !existsSync(f)) continue;
    game.add(f);
    for (const m of readFileSync(f, 'utf8').matchAll(/(?:^(?:import|export)\s[^;]*?from\s+|^import\s+|import\(\s*)'(\.[^']+)'/gm)) todo.push(resolvePath(dirname(f), m[1]));
  }
  assert.ok(game.size > 20 && ![...game].some(f => f.includes('/drac-compare/')), 'the game never reaches the comparison');
  assert.equal(phraseAt(0).i, 0); assert.equal(phraseAt(104.8).i, 32); assert.equal(phraseAt(16.7).i, 6);
  void LEG; void SOURCE;
}
console.log(`drac-compare: ok (${PLAN.length} planned placements: ${['observed', 'probable', 'support', 'adaptation'].map(k => `${PLAN.filter(s => s.status === k).length} ${k}`).join(', ')})`);
