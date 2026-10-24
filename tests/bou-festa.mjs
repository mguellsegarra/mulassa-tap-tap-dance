// The Bou's festa, frame by frame (Marc 24/10/2026, from the videos): its colla lifts it over their heads, nose up,
// hands on its flanks, and part of the public lines up right behind it and follows it round. Nobody walks through
// the Bou, an attendant, the capatàs or each other; the hands meet the cloth; the carriers inside fill the gap.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { bouPose, BOU_TIMING, BOU_CARRY, bouFestaAt } from '../src/game/bou-dance.js';
import { buildBou } from '../src/scene/models/bou.js';
import { createBouMotion } from '../src/scene/bou-motion.js';
import { BOU_CAPATAS, bouToWorld, createBouColla, carryColla } from '../src/scene/bou-colla.js';
import { PARADE, PARADE_K, paradeTick, paradeSteer, paradeSlot } from '../src/scene/bou-parade.js';
import { ARM, HELPER_HIP } from '../src/scene/models/colla.js';
import { PROFILES } from '../src/platform/render-quality.js';

const YAW = 0.3; // any compass turn: the test works in the plaça's frame
const rig = buildBou(), motion = createBouMotion(rig), colla = createBouColla(PROFILES[2]);
const frame = new THREE.Group(); frame.rotation.y = YAW; frame.add(rig.root, ...rig.feet, ...rig.legs, ...rig.trunks, ...rig.arms, colla.helpers);
// the shell's own box (body frame), at rest, tail and head included
frame.updateMatrixWorld(true); rig.root.position.set(0, 0, 0); rig.root.rotation.set(0, 0, 0); rig.body.rotation.set(0, 0, 0);
rig.root.updateMatrixWorld(true);
const shell = []; // one box per mesh (a single box would take the horns' span for the whole body)
const toBody = new THREE.Matrix4().copy(rig.body.matrixWorld).invert(), v = new THREE.Vector3();
rig.body.traverse(o => { // from its vertices in the body's frame (a mesh's own box, turned, would swell)
  if (!o.isMesh) return;
  const m = new THREE.Matrix4().multiplyMatrices(toBody, o.matrixWorld), b = new THREE.Box3(), at = o.geometry.attributes.position;
  for (let i = 0; i < at.count; i++) b.expandByPoint(v.fromBufferAttribute(at, i).applyMatrix4(m));
  shell.push(b);
});
const inv = new THREE.Matrix4(), toShell = new THREE.Matrix4(), q = new THREE.Vector3();
const shellGap = (w) => { q.copy(w).applyMatrix4(toShell); return Math.min(...shell.map(b => b.distanceToPoint(q))); }; // 0 = inside or on it
// the moving crowd as crowd-build lays it at medium quality (59 people: 17 in the front row just outside the arena,
// RING.arenaMula 6.7 m, two rows behind it 1.1 m apart); the snake must come out of it, not of an endless front row
const crowd = [];
for (const [row, n] of [[0, 17], [1, 21], [2, 21]]) for (let i = 0; i < n; i++) {
  const a = 2 * Math.PI * (i + row * 0.37) / n, r = 6.9 + row * 1.1, pos = new THREE.Vector2(r * Math.sin(a), r * Math.cos(a));
  crowd.push({ row, pos, vel: new THREE.Vector2(), spot: pos.clone(), qualityScale: 1 });
}
const capatas = bouToWorld(BOU_CAPATAS.x, BOU_CAPATAS.z, YAW);
const C = BOU_CARRY, dt = 1 / 60, pose = { x: 0, z: 0, yaw: 0, beat: 0 }, hand = new THREE.Vector3(), w = new THREE.Vector3();
const beatTime = b => BOU_TIMING.subdivisionTimes[Math.min(BOU_TIMING.subdivisionTimes.length - 1, Math.round(b * BOU_TIMING.subdivision))];
const planted = [];
let formed = null;
let steps = 0, onGrid = 0;
let worst = { shell: 9, hand: 0, crowdShell: 9, crowdHelper: 9, crowdCap: 9, crowdEach: 9, helpers: 9, gap: 0 }, joined = 0, behind = 0;
for (let t = beatTime(C.come - 4); t < beatTime(C.back + 10); t += dt) {
  const P = motion(t, dt); Object.assign(pose, bouPose(t));
  colla.update(P.beat, 1); carryColla(colla, pose, C, dt); frame.updateMatrixWorld(true);
  toShell.copy(inv.copy(rig.body.matrixWorld).invert());
  const helpers = colla.crew.slice(0, 4).map(p => p.g.getWorldPosition(new THREE.Vector3()));
  colla.crew.slice(0, 4).forEach((p, i) => { // its body (a 0.2 m column to the head's top) never inside the shell
    for (let y = 0.1; y <= 1.62; y += 0.1) for (let k = 0; k < 8; k++) {
      const rr = y > 1.4 ? 0.13 : 0.2; // the head, then the jacket
      w.set(Math.sin(k * Math.PI / 4) * rr, y, Math.cos(k * Math.PI / 4) * rr).applyMatrix4(p.g.matrixWorld);
      worst.shell = Math.min(worst.shell, shellGap(w));
    }
    if (pose.beat > C.up && pose.beat < C.lower) for (const { el } of p.arms) { // held up: both hands on the cloth
      hand.set(0, -ARM.fore - 0.06, 0).applyMatrix4(el.matrixWorld); worst.hand = Math.max(worst.hand, shellGap(hand));
    }
    // their feet: a planted sole never slides (m a frame), no sole under the paving, a step on the music's half beat
    p.legs.forEach((leg, k) => {
      const sole = leg.localToWorld(new THREE.Vector3(0, -HELPER_HIP, 0)), f = p.gait.feet[k], was = planted[i * 2 + k];
      worst.under = Math.min(worst.under ?? 9, sole.y);
      if (!f.air) { if (was && !was.air) worst.slide = Math.max(worst.slide ?? 0, Math.hypot(sole.x - was.x, sole.z - was.z), Math.abs(sole.y)); }
      else if (!was?.air) { steps++; if (Math.abs(f.b0 * 4 - Math.round(f.b0 * 4)) < 0.05) onGrid++; }
      planted[i * 2 + k] = f.air ? { air: true } : { x: sole.x, z: sole.z };
    });
    for (let j = 0; j < i; j++) worst.helpers = Math.min(worst.helpers, Math.hypot(helpers[i].x - helpers[j].x, helpers[i].z - helpers[j].z));
  });
  for (const a of rig.arms) if (a.visible) { // the carriers' arms stay inside the shell (never out through its back)
    w.set(0, 1, 0).applyMatrix4(a.matrixWorld); worst.arm = Math.max(worst.arm ?? 0, shellGap(w));
  }
  if (pose.beat > C.up && pose.beat < C.lower) { // the carriers' trunks reach up past the hem: no daylight under it
    for (const tr of rig.trunks) { assert.ok(tr.visible); w.set(0, 1, 0).applyMatrix4(tr.matrixWorld); worst.gap = Math.max(worst.gap, shellGap(w.setY(w.y + 0.55))); }
  }
  PARADE.on = true; PARADE.beat = pose.beat; PARADE.yaw = YAW; PARADE.x = pose.x; PARADE.z = pose.z; PARADE.heading = pose.yaw; PARADE.colla = [...helpers, capatas].map(h => ({ pos: new THREE.Vector2(h.x, h.z) })); paradeTick(crowd); // (as bou-stage.js; the capatàs too: tickColla's obstacles)
  const moving = crowd.filter(p => p.parade);
  for (const p of moving) paradeSteer(p, dt);
  joined = Math.max(joined, moving.length);
  if (formed === null && pose.beat >= C.up + 2) { // lifted (two beats on, while it is carried out to its start): the snake in place behind it (Marc 24/10/2026)
    const run = moving.filter(p => p.parade === 'run'), at = run.filter(p => { const q = paradeSlot(p.paradeSlot, pose.beat, YAW, {}); return Math.hypot(q.x - p.pos.x, q.z - p.pos.y) < 0.6; });
    formed = at.length / Math.max(1, run.length);
  }
  const bx = Math.sin(pose.yaw + YAW), bz = Math.cos(pose.yaw + YAW), mid = new THREE.Vector3(pose.x, 0, pose.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), YAW);
  let near = 9;
  for (const p of moving) {
    const dx = p.pos.x - mid.x, dz = p.pos.y - mid.z, along = dx * bx + dz * bz, side = dx * bz - dz * bx;
    // its floor footprint (flank to flank, muzzle to tail), less a person's half-width (0.2 m)
    worst.crowdShell = Math.min(worst.crowdShell, Math.hypot(Math.max(0, Math.abs(side) - 0.66), Math.max(0, along > 0 ? along - 1.95 : -along - 1.65)) - 0.2);
    if (p.parade === 'run' && p.paradeSlot < PARADE_K.ranks) near = Math.min(near, Math.hypot(along + 1.65, side)); // the first row, from its tail
    for (const h of helpers) worst.crowdHelper = Math.min(worst.crowdHelper, Math.hypot(p.pos.x - h.x, p.pos.y - h.z));
    worst.crowdCap = Math.min(worst.crowdCap, Math.hypot(p.pos.x - capatas.x, p.pos.y - capatas.z));
    for (const o of moving) if (o !== p) worst.crowdEach = Math.min(worst.crowdEach, p.pos.distanceTo(o.pos));
  }
  if (pose.beat > C.lap[0] + 3 && pose.beat < C.lap[1] - 1) behind = Math.max(behind, near); // all the way round, someone right at its tail
}
console.log('bou festa', { joined, formed, behind: +behind.toFixed(2), ...Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, +v.toFixed(3)])) });
assert.ok(worst.shell > 0.02, `an attendant inside the Bou (${worst.shell.toFixed(3)} m)`);
assert.ok(worst.hand < 0.1, `hands ${worst.hand.toFixed(2)} m off its flank`);
assert.ok(worst.gap < 0.05, `daylight between the carriers and the shell (${worst.gap.toFixed(2)} m)`);
assert.ok(worst.arm < 0.01, `a carrier's hand out through its back (${worst.arm.toFixed(2)} m)`);
console.log('attendants\' steps', steps, 'on the music (half or quarter beats)', onGrid);
assert.ok(onGrid / steps > 0.75, 'their steps keep the music'); // (setting off and changing pace leave a few catch-up strides)
assert.ok(worst.slide < 0.004, `an attendant's planted foot slides ${(worst.slide * 1000).toFixed(1)} mm a frame`);
assert.ok(worst.under > -0.005, `an attendant's sole under the paving (${worst.under.toFixed(3)} m)`);
assert.ok(worst.helpers > 0.55, 'two attendants through each other');
assert.ok(worst.crowdShell > 0.1, `the public runs into the Bou (${worst.crowdShell.toFixed(2)} m)`);
assert.ok(worst.crowdHelper > 0.4, `the public runs through an attendant (${worst.crowdHelper.toFixed(2)} m)`);
assert.ok(worst.crowdCap > 0.5, `the public runs through the capatàs (${worst.crowdCap.toFixed(2)} m)`);
assert.ok(worst.crowdEach > 0.4, `two of the public through each other (${worst.crowdEach.toFixed(2)} m)`);
assert.equal(joined, Math.min(PARADE_K.count, Math.floor(crowd.length * PARADE_K.share)), 'the snake fills');
assert.ok(joined >= 18, `a snake of ${joined} at medium quality`);
assert.ok(formed > 0.8, `the snake is not formed when its colla lifts it (${(formed * 100).toFixed(0)}% in place)`);
assert.ok(behind < 1.5, `nobody right at its tail (${behind.toFixed(2)} m)`);
assert.ok(crowd.every(p => !p.parade || p.parade === 'home'), 'everyone heads home');
// at its height: lifted at arm's length, nose up
const top = bouPose(beatTime((C.up + C.lower) / 2));
assert.ok(top.lift > 0.6 && top.pitch < -0.2, `carried ${top.lift.toFixed(2)} m, pitch ${top.pitch.toFixed(2)}`);
// the play camera's hold on the ring (cameras.js FESTA_CAM): none outside the carry, whole while it is held up, eased
// in and out (no step a frame: at most 0.1 per sixteenth of a beat)
assert.equal(bouFestaAt(C.come - 1), 0); assert.equal(bouFestaAt(C.back + 1), 0);
assert.ok(bouFestaAt((C.up + C.lower) / 2) === 1, 'held up: the camera holds the whole ring');
{ let step = 0; for (let b = C.come - 2; b < C.back + 2; b += 1 / 16) step = Math.max(step, Math.abs(bouFestaAt(b + 1 / 16) - bouFestaAt(b)));
  assert.ok(step < 0.1, `the camera's hold jumps (${step.toFixed(3)} a sixteenth)`); }
