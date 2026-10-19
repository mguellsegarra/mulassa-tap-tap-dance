// The Drac's rig driven by a dance pose (game/dance-drac.js): body roll/pitch/crouch, two necks that wave in a chain,
// jaws, wings, tail, the carrier's steps and the fire. Everything secondary is locked to the beat (pose.beat), never to
// a wall clock: the same beat always gives the same picture, and every wave has a period of whole bars.
import * as THREE from 'three';
import { BODY_Y, ANKLE, HIP_BELOW_BODY, FOOT_X, FOOT_Z } from './models/drac.js';
import { dracFeet, newDracFeet } from '../game/drac-feet.js';
const REST = [0.3, -0.12, -0.38]; // neck segments' lean (rad, + = forward): out of the shoulders, then up, heads up front
const HEAD_REST = 0.35; // head pitch: looks forward, a little down
const TAU = Math.PI * 2;
const wave = (beat, period, ph = 0) => Math.sin(beat / period * TAU + ph); // period in beats
const TILT_RAD = 0.21, TWIST = 0.5, OWN = 0.3; // trousers: lean limit, share of the shoe's heading, share of their own lean
const easeLimit = a => TILT_RAD * Math.tanh(a / TILT_RAD);
const HIP = new THREE.Vector3(), AIM = new Float64Array(4);

// Keep front constant during playback: it defines the planted feet's world heading.
// Edited timelines pass their own makeDracFeet(dance, end) planner; game callers keep the baseline default.
export function poseDrac(d, p, front = 0, feetAt = dracFeet) {
  const b = p.beat;
  d.root.rotation.y = front + p.yaw;
  d.root.position.set(p.x, 0, p.z);
  d.body.position.y = BODY_Y - p.crouch * 0.9 + p.lift;
  d.body.rotation.set(p.pitch, 0, p.roll + p.shake);
  d.body.scale.set(1 + p.crouch * 0.1, 1 - p.crouch * 0.1, 1 + p.crouch * 0.1);
  // necks: a slow wave up the chain (4 beats), the two a quarter period apart, both leaning the same way with the body
  d.necks.forEach((n, i) => {
    const side = i ? -1 : 1, ph = i * Math.PI / 2, a = p.swing * p.drive;
    const splay = 0.22; // outward, always: the two necks lean together with the body but never toward each other
    n.root.rotation.z = -side * splay - p.roll * 0.8;
    n.root.rotation.x = -p.rear * 0.45 + 0.1 * a * wave(b, 4, ph);
    n.segs.forEach((s, j) => {
      s.rotation.x = REST[j] * (1 - p.rear * 0.9) + p.reach * 0.2 + 0.16 * a * wave(b, 4, ph - j * 0.6);
      s.rotation.z = -side * 0.08 * a * wave(b, 8, ph - j * 0.8);
    });
    n.head.rotation.x = HEAD_REST - p.rear * 0.45 + 0.14 * a * wave(b, 2, ph + 1);
    n.head.rotation.y = 0.12 * a * wave(b, 8, ph + 2);
    n.jaw.rotation.x = 0.32 + p.jaw * 0.45; // never shut: the upper fangs would go through the lower lip
  });
  d.wings.forEach((w, i) => {
    const side = i ? -1 : 1;
    w.root.rotation.z = side * (0.4 + p.flap * 0.4);
    w.root.rotation.y = side * (0.35 + p.flap * 0.4); // swept back, clear of the necks when she rears
  });
  d.tail.base.rotation.x = 0.2 - p.rear * 0.25 + p.crouch * 0.5; // the tail lifts when she crouches
  d.tail.forEach((s, j) => { s.rotation.y = 0.3 * p.whip * wave(b, 4, -j * 0.7); s.rotation.x = 0.12 + 0.06 * p.drive * wave(b, 2, -j * 0.5); }); // curls up
  // Inverse root motion keeps each planted shoe fixed on the floor. Trousers share a restrained lean plus OWN of
  // their individual hip direction: independent full leans collide, while one shared lean opens the far hip seam.
  const feet = feetAt(d.feet ??= newDracFeet(), b, p.practice, front), R = front + p.yaw, c = Math.cos(R), s = Math.sin(R);
  d.legs.forEach(({ shoe, pants }, i) => {
    const f = feet[i], rx = i ? -FOOT_X : FOOT_X, yaw = f.yaw - p.yaw, cy = Math.cos(yaw), sy = Math.sin(yaw);
    const dx = f.x - p.x, dz = f.z - p.z;
    shoe.position.set(c * dx - s * dz + cy * rx + sy * FOOT_Z, f.lift, s * dx + c * dz - sy * rx + cy * FOOT_Z);
    shoe.rotation.y = yaw;
    pants.position.set(shoe.position.x, ANKLE + f.lift, shoe.position.z);
  });
  d.body.updateMatrix();
  d.legs.forEach(({ pants }, i) => { // the straight lean from the ankle to the hip, as x and z tilts
    HIP.set(i ? -FOOT_X : FOOT_X, -HIP_BELOW_BODY, FOOT_Z).applyMatrix4(d.body.matrix).sub(pants.position);
    AIM[2 * i] = Math.atan2(HIP.z, HIP.y); AIM[2 * i + 1] = -Math.atan2(HIP.x, HIP.y);
  });
  const mx = (AIM[0] + AIM[2]) / 2, mz = (AIM[1] + AIM[3]) / 2, ex = easeLimit(mx), ez = easeLimit(mz);
  d.legs.forEach(({ shoe, pants }, i) => {
    const lx = ex + OWN * (AIM[2 * i] - mx), lz = ez + OWN * (AIM[2 * i + 1] - mz);
    const ux = -Math.sin(lz), uy = Math.cos(lz) * Math.cos(lx), uz = Math.cos(lz) * Math.sin(lx); // as a direction
    const ty = shoe.rotation.y * TWIST, ct = Math.cos(ty), st = Math.sin(ty);
    pants.rotation.set(Math.atan2(st * ux + ct * uz, uy), ty, -Math.asin(ct * ux - st * uz), 'YXZ'); // in the trouser's heading
  });
  // fire: the dance's own jet level on each tube (drac-fx.js reads it; drac-fire.js draws the jets)
  for (const f of d.fire) f.userData.level = Math.max(0, p.fire);
}
