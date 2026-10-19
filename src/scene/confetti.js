// Confetti: one instanced mesh of paper pieces, thrown in bursts and swept away.
// Every piece lives its own life (thrown, flutters down, rests, shrinks away) so throws overlap: a new one takes only
// parked pieces, and when the pool runs short it asks the oldest to shrink away early; no visible piece is ever reused.
import * as THREE from 'three';
import { rnd } from './models.js';
import { renderProfile, scene } from './stage.js';
import { smooth01 } from '../core/anim.js';
import { CALM } from '../core/env.js';
import { M } from './mula-motion.js';

const CONF = renderProfile.confetti;
// a flat sheet, lit on both faces (2 triangles a piece); the shapes come from a per-piece scale below
export const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), CONF);
const SHAPES = [[1, 1], [1.2, 0.65], [1.8, 0.5], [0.8, 0.8], [1.25, 0.7]]; // square, rectangle, streamer strip, small square, rectangle
const conf = Array.from({ length: CONF }, (_, i) => ({
  p: new THREE.Vector3(0, -9, 0), v: new THREE.Vector3(), axis: new THREE.Vector3(), q0: new THREE.Quaternion(), qf: new THREE.Quaternion(),
  ang: rnd(0, 6), spin: 0, amp: 0, w: 0, ph: 0, dir: 0, k: 0, age: 0, // ang: where its tumble (or heading) starts, each throw carries on
  flutter: false, tilt: 0, // most fall like paper (rocking about lying flat, w: its rock and sway), the rest tumble about axis
  lay: -1, // s on the floor (-1: parked or in the air)
  out: -1, dur: 1, gust: false, // out: s into shrinking away (-1: not leaving) over dur s; gust: blown off by sweepConfetti
  sx: SHAPES[i % 5][0], sy: SHAPES[i % 5][1],
}));
['#d62828', '#f5c518', '#2f62d6', '#3a9d4b', '#ffffff', '#ff8fb1'].forEach((c, k) => conf.forEach((_, i) => i % 6 === k && confetti.setColorAt(i, new THREE.Color(c))));
const PARKED = new THREE.Matrix4().makeScale(0, 0, 0).setPosition(0, -9, 0);
conf.forEach((_, i) => confetti.setMatrixAt(i, PARKED));
confetti.count = 0; confetti.visible = false; // drawn up to the last piece in use only
confetti.frustumCulled = false;
confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(confetti);
export const dummy = new THREE.Object3D();
const flat = new THREE.Euler(-Math.PI / 2, 0, 0, 'YXZ');
// The Drac throws no confetti: drac-show.js uses the reason to light rodes de foc only at selected combo milestones (true = taken)
let confettiDivert = null;
export const setConfettiDivert = f => (confettiDivert = f);
export function burst(x, z, reason = 'burst') {
  if (confettiDivert?.(4, reason)) return;
  confettiSettled = false;
  ox = x; oz = z; // a share of the pool, so a second throw finds pieces of its own; what's short follows as the oldest shrink away
  owed = spawnConfetti(Math.round(renderProfile.confetti * (CALM.matches ? 0.35 : 0.7)), throwUp, true);
}
let ox = 0, oz = 0, owed = 0; // the last burst's spot and the pieces it is still owed
function throwUp(c) { // up from above her back in a wide fountain, its top (~5 m) well under the note lane
  const a = rnd(0, 2 * Math.PI), s = rnd(2.5, 7);
  c.p.set(ox + rnd(-0.5, 0.5), rnd(2.2, 2.8), oz + rnd(-0.5, 0.5));
  c.v.set(Math.cos(a) * s, rnd(5, 8), Math.sin(a) * s);
}
const GROW = 0.12, RETIRE = 0.5; // s a thrown piece takes to open up; s an old one takes to shrink away when the pool runs short
let cursor = 0; // the ring's next slot: pieces are thrown in ring order, so the slots after it hold the oldest ones
// Throws up to n pieces, parked ones only. Short of pieces, the oldest ones lying on the floor shrink away quickly, ready
// for the next throw (air: a burst also takes the oldest still in the air; null: they already are): the pool never grows,
// and nothing on screen jumps or vanishes in one frame. Returns how many it couldn't throw yet.
export function spawnConfetti(n, place, air = false) {
  if (confettiDivert?.(1.5)) return 0; // the Drac also suppresses the finale's confetti puffs
  const N = renderProfile.confetti, calm = CALM.matches;
  let left = Math.min(n, N);
  const from = cursor % N;
  for (let j = 0; j < N && left > 0; j++) {
    const i = (from + j) % N, c = conf[i];
    if (c.p.y >= -1) continue;
    c.v.set(0, 0, 0); place(c);
    c.axis.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize();
    if (c.axis.lengthSq() < 0.5) c.axis.set(1, 0, 0); // (a zero draw)
    c.flutter = calm || i % 7 < 4; // (reduced motion: they all rock gently, none tumbles)
    c.spin = (c.flutter ? rnd(0.5, 2) : rnd(4, 9)) * (i & 1 ? 1 : -1) * (calm ? 0.3 : 1); c.tilt = rnd(0.5, 1.1) * (calm ? 0.4 : 1);
    c.amp = rnd(0.25, 0.6) * (calm ? 0.3 : 1); c.w = rnd(3, 6); c.ph = rnd(0, 6.3); c.dir = rnd(0, 6.3); c.k = rnd(2, 3);
    c.age = 0; c.lay = -1; c.out = -1; c.gust = false;
    left--; cursor = (i + 1) % N;
  }
  const missing = left;
  if (air !== null) for (const onFloor of air ? [true, false] : [true]) for (let j = 0; j < N && left > 0; j++) {
    const c = conf[(cursor + j) % N];
    if (c.p.y >= -1 && c.out < 0 && c.age > 0 && (c.lay >= 0) === onFloor) { retire(c, RETIRE); left--; } // (age 0: just thrown)
  }
  return missing;
}
const retire = (c, dur, gust = false) => { c.out = 0; c.dur = dur; c.gust = gust; };
export let confettiSettled = false;
export const setConfettiSettled = v => (confettiSettled = v);
// a new game (or the menu) starts with a clean plaça: a quick gust lifts the leftover confetti,
// blows it off to the side and shrinks it away, done well before BALLA! (reduced motion: it only shrinks away)
const SWEEP = 0.9, CONF_LAY = 5, CONF_FADE = 1, SETTLE = 0.2, UNDER = 0.6; // s: the gust; a piece rests on the floor, then shrinks away; it lies flat; one under her goes
const FALL = 5; // m/s², with each piece's drag k: it falls at FALL / k (1.7-2.5 m/s), paper, not a stone
// Each piece lands a step above the one before (16 steps, 2.5 mm: far above the depth buffer's resolution at the camera's
// distance): overlapping papers never share a plane (they used to z-fight, winking as the camera drifts), the last one on top.
const CONF_LAND = 0.01, CONF_STEP = 0.0025, CONF_STEPS = 16;
let confLanded = 0;
export function sweepConfetti() {
  let any = false;
  owed = 0;
  for (const c of conf) if (c.p.y >= -1 && c.out < 0) { // (one already shrinking away just finishes)
    retire(c, SWEEP, !CALM.matches); any = true;
    if (c.gust && c.lay >= 0) { // lifted off the floor: it tumbles on from the pose it lies in
      c.lay = -1; c.age = 1; c.flutter = false; c.ang = 2 * Math.acos(Math.min(1, Math.abs(c.qf.w)));
      c.axis.set(c.qf.x, c.qf.y, c.qf.z).multiplyScalar(Math.sign(c.qf.w) || 1).normalize();
    }
  }
  if (any) confettiSettled = false;
}
export function animConfetti(dt) {
  if (confettiSettled) return;
  let top = -1, dirty = false, freed = false;
  const cy = Math.cos(M.yaw), sy = Math.sin(M.yaw);
  for (let i = 0; i < conf.length; i++) {
    const c = conf[i];
    if (c.p.y < -1) continue; // parked: its matrix already is
    top = i;
    if (c.lay > SETTLE && c.out < 0) { // lying flat on the floor: nothing to redraw until it starts to shrink away
      c.lay += dt;
      const dx = c.p.x - M.pos.x, dz = c.p.z - M.pos.y; // under her skirt (the crowd's body box) her dancing edge would
      if (Math.abs(dx * cy - dz * sy) < 0.75 && Math.abs(dx * sy + dz * cy) < 2.3) retire(c, UNDER); // cover and bare it on and off
      else if (c.lay < CONF_LAY) continue;
      else retire(c, CONF_FADE);
    }
    dirty = true;
    if (c.out >= 0 && (c.out += dt) >= c.dur) { c.p.set(0, -9, 0); c.lay = -1; c.out = -1; confetti.setMatrixAt(i, PARKED); freed = true; continue; }
    if (c.lay < 0) { // in the air: falls at its paper's terminal speed, sways side to side and tumbles round its own axis
      c.age += dt;
      if (c.gust) { c.v.x += (10 + (i % 5) * 2) * dt; c.v.z -= (i % 3 - 1) * 3 * dt; c.v.y += (9 + (i % 4) * 2) * dt; }
      c.v.y -= FALL * dt;
      c.v.multiplyScalar(Math.exp(-c.k * dt));
      const sway = c.amp * c.w * Math.cos(c.w * c.age + c.ph) * Math.min(1, Math.max(0, -c.v.y)); // only once it drifts down
      c.p.x += (c.v.x + Math.cos(c.dir) * sway) * dt; c.p.y += c.v.y * dt; c.p.z += (c.v.z + Math.sin(c.dir) * sway) * dt;
      c.ang += c.spin * dt * (c.gust ? 2.5 : 1);
      if (c.flutter) { const r = c.tilt * Math.sin(c.w * c.age + c.ph); dummy.quaternion.setFromEuler(flat.set(-Math.PI / 2 + r, c.ang, r * 0.5)); }
      else dummy.quaternion.setFromAxisAngle(c.axis, c.ang);
      if (c.p.y <= CONF_LAND) { // landed: it settles flat over SETTLE s (no snap), rests CONF_LAY s, then shrinks away
        c.p.y = CONF_LAND + (confLanded = (confLanded + 1) % CONF_STEPS) * CONF_STEP; c.v.set(0, 0, 0); c.lay = 0;
        const q = c.q0.copy(dummy.quaternion), up = q.y * q.z + q.w * q.x >= 0; // its face's normal points up (else down)
        c.qf.setFromEuler(flat.set(up ? -Math.PI / 2 : Math.PI / 2, c.ang, 0)); // so it lies on the nearer face
      }
    } else {
      if (c.lay <= SETTLE) c.lay += dt;
      dummy.quaternion.slerpQuaternions(c.q0, c.qf, smooth01(Math.min(1, c.lay / SETTLE)));
    }
    const x = c.out < 0 ? 0 : c.out / c.dur, s = Math.min(1, c.age / GROW) * (c.gust ? 1 - x * x : 1 - smooth01(x));
    dummy.position.copy(c.p);
    dummy.scale.set(c.sx * s, c.sy * s, 1);
    dummy.updateMatrix();
    confetti.setMatrixAt(i, dummy.matrix);
  }
  if (freed && owed) owed = spawnConfetti(owed, throwUp, null); // (drawn from the next frame)
  dummy.scale.setScalar(1); dummy.quaternion.identity(); // (fx.js shares the dummy)
  if (dirty) confetti.instanceMatrix.needsUpdate = true;
  confetti.count = top + 1;
  confetti.visible = top >= 0;
  confettiSettled = top < 0 && !freed;
}
