// Gallery poses for models.mjs figures (the game's animCrowd owns real posing). Same time in, same pose out: nothing
// depends on the previous call. pose() returns how far the cycle has carried the figure forward (world metres along
// its +z): a caller may move the figure by it (real travel) or leave it in place (a treadmill demo: the wheels and
// legs move as if the ground slid under them). Contacts are solved, not offset: two-bone arm IK puts the palm on the
// push rim, on the other palm or round the cane's grip, and the cane is aimed so its tip stays on the ground.
import * as THREE from 'three';
import { UPPER, PALM, CHAIR, CANE_LEN } from './rig.js';

export const MODES = ['repos', 'picar', 'festa', 'moure'];
export const BEATS = 2; // beats per second: claps meet and hops peak on them
export const WALK = { w: 6, swing: 0.38 }; // legs swing sin(w t) × swing about the hip (0.78 above the sole)
export const WALK_SPEED = 0.78 * WALK.swing * WALK.w * 2 / Math.PI; // figure units/s: the stance foot's mean backward speed
// One push of the rims: the hands grip at rim angle `from` (rad from the top, + forward), ride the rim to `to` while
// the wheel turns with them (so the grip never slips), let go and swing back over the tyre while the chair coasts.
export const PUSH = { period: 1.2, grip: 0.45, from: -0.3, to: 0.4, coast: 0.8, lean: [0.04, 0.24] };

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();
const m4 = new THREE.Matrix4(), DOWN = new THREE.Vector3(0, -1, 0), FWD = new THREE.Vector3(0, 0, 1);
const side = i => (i ? -1 : 1);

// The push cycle at time t: wheel angle phi (rad, + rolls forward), whether the hands grip, the hands' rim angle, how
// far they are lifted off the rim (0..1) on the way back, and u, the progress through the grip or the return (0..1).
export function pushAt(t) {
  const { period: P, grip, from, to, coast: c0 } = PUSH, Tp = P * grip, Tr = P - Tp, span = to - from;
  const b = 2 * (span - c0 * Tp) / Tp, n = Math.floor(t / P), s = t - n * P, perCycle = span + c0 * Tr;
  if (s < Tp) { // wheel speed c0 + b(1 − cos)/2: no jump at grip or release, and the hand's angle is the wheel's
    const phi = c0 * s + b / 2 * (s - Tp / (2 * Math.PI) * Math.sin(2 * Math.PI * s / Tp));
    return { phi: n * perCycle + phi, grip: true, hand: from + phi, lift: 0, u: s / Tp };
  }
  // back over the tyre: leaves and catches the rim at the rim's own speed c0 (a cubic Hermite), off it within a few ms
  const u = (s - Tp) / Tr, h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = 1 - h00, h11 = u ** 3 - u ** 2;
  return { phi: n * perCycle + span + c0 * (s - Tp), grip: false, hand: h00 * to + h01 * from + (h10 + h11) * c0 * Tr, lift: Math.sqrt(Math.sin(Math.PI * u)), u };
}

// Two-bone IK for arm i: puts its PALM at T (torso-local), the elbow bending towards pole (torso-local direction).
// Out of reach, the arm points straight at T. Returns the palm's miss distance.
function reach(p, i, T, pole) {
  const a = p.arms[i], f = p.forearms[i], S = a.position, L1 = UPPER, L2 = -PALM.y;
  const n = v1.subVectors(T, S), dist = n.length(), D = Math.min(Math.max(dist, Math.abs(L1 - L2) + 1e-4), L1 + L2 - 1e-4);
  n.divideScalar(dist);
  const a1 = (L1 * L1 - L2 * L2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, L1 * L1 - a1 * a1));
  const m = v2.copy(pole).addScaledVector(n, -pole.dot(n)).normalize();
  const E = v3.copy(S).addScaledVector(n, a1).addScaledVector(m, h);
  const Y = E.sub(S).multiplyScalar(-1 / L1); // the upper arm's +y: elbow → shoulder (E is no longer needed)
  const fd = v2.copy(n).multiplyScalar(D).addScaledVector(Y, L1).normalize(); // elbow → palm: (S + nD) − (S − L1 Y)
  const beta = Math.acos(Math.min(1, Math.max(-1, -Y.dot(fd))));
  const Z = fd.addScaledVector(Y, -Y.dot(fd)); // where the forearm bends to, square to the upper arm
  if (Z.lengthSq() < 1e-8) Z.copy(FWD).addScaledVector(Y, -Y.dot(FWD));
  Z.normalize();
  m4.makeBasis(v1.crossVectors(Y, Z), Y, Z);
  a.quaternion.setFromRotationMatrix(m4);
  // forearm roll (pronation): turn the hand about the forearm so its palm faces the body's side (torso x), as a hand
  // does on a push rim or in a clap
  f.rotation.set(-beta, 0, 0);
  q1.copy(a.quaternion).multiply(f.quaternion).invert();
  const X = v1.set(1, 0, 0).applyQuaternion(q1);
  f.rotation.set(-beta, Math.atan2(-X.z, X.x), 0);
  return Math.max(0, dist - (L1 + L2));
}
// how far the hand box reaches along the torso's x from its centre, and where its centre is (torso-local)
const HX = new THREE.Vector3(1, 0, 0);
function handReachX(p, i, centre) {
  const { c, h } = p.hand, a = p.arms[i], f = p.forearms[i];
  a.updateMatrix(); f.updateMatrix();
  m4.multiplyMatrices(a.matrix, f.matrix);
  centre.copy(c).applyMatrix4(m4);
  q1.setFromRotationMatrix(m4);
  return h.reduce((sum, hk, k) => sum + hk * Math.abs(v1.set(+(k === 0), +(k === 1), +(k === 2)).applyQuaternion(q1).dot(HX)), 0);
}
// Puts arm i's hand box with its inner face on the plane x = s·x0 (torso-local), its palm at (y, z): a clap's two
// palms then touch on the body's middle plane. The box's reach along x
// depends on the arm's solved orientation, so solve, measure, re-aim (it settles in a few passes).
const C0 = new THREE.Vector3(), T1 = new THREE.Vector3();
function reachBeside(p, i, x0, y, z, pole) {
  const s = side(i);
  let x = x0 + s * 0.06;
  for (let n = 0; n < 8; n++) {
    reach(p, i, T1.set(x, y, z), pole);
    const rx = handReachX(p, i, C0);
    x += x0 + s * rx - C0.x;
  }
}
// figure (g-local) point → torso-local, and figure direction → torso-local
const toTorso = (p, v) => { p.torso.updateMatrix(); return v.applyMatrix4(m4.copy(p.torso.matrix).invert()); };
const dirToTorso = (p, v) => v.applyQuaternion(q1.copy(p.torso.quaternion).invert());
// the palm of arm i in figure (g-local) coordinates, from the current rotations
export function palmLocal(p, i, out = new THREE.Vector3()) {
  for (const o of [p.forearms[i], p.arms[i], p.torso]) o.updateMatrix();
  return out.copy(PALM).applyMatrix4(p.forearms[i].matrix).applyMatrix4(p.arms[i].matrix).applyMatrix4(p.torso.matrix);
}

// The cane: tip at ground point T (figure units, y 0), the holding hand as close to `hand` as the cane's length allows
// (on the sphere of radius CANE_LEN round the tip), the arm solved to it and the cane aimed from the palm to the tip.
const T0 = new THREE.Vector3(), H0 = new THREE.Vector3(), H1 = new THREE.Vector3();
function holdCane(p, tip, hand) {
  const i = p.holdArm, s = side(i);
  H1.copy(hand).sub(tip).setLength(CANE_LEN).add(tip);
  reach(p, i, toTorso(p, H1), dirToTorso(p, v1.set(s, 0, -0.6).normalize()).clone());
  const palm = palmLocal(p, i, H1), dir = v2.subVectors(tip, palm).normalize();
  q2.copy(p.torso.quaternion).multiply(p.arms[i].quaternion).multiply(p.forearms[i].quaternion).invert();
  p.cane.quaternion.setFromUnitVectors(DOWN, dir).premultiply(q2);
}
// the cane hand's natural place (beside the hip, a little forward) and the planted tip ahead of it
function caneRest(p) {
  const s = side(p.holdArm), x = p.arms[p.holdArm].position.x;
  H0.set(x + s * 0.03, p.rest.hip + 0.16, 0.2);
  const r = Math.sqrt(CANE_LEN ** 2 - H0.y ** 2);
  T0.set(H0.x + s * r * Math.sin(0.08), 0, H0.z + r * Math.cos(0.08));
  return r;
}

// Re-establish ground contact after a live blend has changed the torso and the step's bob.
export function groundCane(p, time, walk = 0) {
  if (!p.cane) return;
  const r = caneRest(p), s = side(p.holdArm), centre = -s * Math.asin(Math.min(1, Math.abs(H0.x) / r));
  const angle = 0.08 * (1 - walk) + (centre + s * 0.45 * Math.sin(time * WALK.w)) * walk;
  holdCane(p, T0.set(H0.x + r * Math.sin(angle), -p.g.position.y / p.g.scale.x, H0.z + r * Math.cos(angle)), H0);
}

// The skirt panels follow the legs: each is sheared, z += y·tan(angle), by the angle of the leg furthest forward of the
// waist (front panel) or behind it (back panel). The panels share the legs' pivot height, so a panel's face slants
// exactly as its leg does and the leg stays behind it. Call after the legs are posed.
export function openSkirt(p) {
  if (!p.skirt) return;
  const rel = p.legs.map(l => l.rotation.x - p.waist.rotation.x);
  [Math.min(0, ...rel), Math.max(0, ...rel)].forEach((a, i) => {
    p.skirt[i].matrix.elements[6] = Math.tan(a); // row z, column y
    p.skirt[i].matrixWorldNeedsUpdate = true;
  });
}

export function restPose(p) {
  p.g.position.y = 0; p.torso.position.set(0, p.rest.hip, p.rest.back); p.torso.rotation.set(p.lean0, 0, 0);
  for (const l of p.legs) l.rotation.set(0, 0, 0);
  for (const w of [...p.wheels, ...p.casters]) w.rotation.set(0, 0, 0);
  p.arms.forEach((a, i) => { a.rotation.set(-0.1, 0, side(i) * p.armOut); p.forearms[i].rotation.set(-0.15, 0, 0); });
  if (p.cane) { caneRest(p); holdCane(p, T0, H0); }
  openSkirt(p);
}

// mode: 'repos' | 'picar' (clap; a cane user waves the free hand) | 'festa' (arms up and a hop; a chair or cane user
// bounces in the torso and keeps seat or ground) | 'moure' (walk / push). Returns the distance travelled (world m).
export function pose(p, mode, t) {
  restPose(p);
  const beat = t * BEATS, hop = Math.abs(Math.sin(beat * Math.PI)), free = i => i !== p.holdArm;
  let travel = 0;
  if (mode === 'picar') {
    if (p.cane) { // the free hand waves to the beat; the other keeps the cane planted
      const i = 1 - p.holdArm, s = side(i);
      p.arms[i].rotation.set(-2.3, 0, s * (0.3 + 0.15 * Math.sin(beat * Math.PI)));
      p.forearms[i].rotation.set(-0.5 - 0.4 * hop, 0, 0);
    } else { // palms meet in front of the chest on every beat
      const sep = 0.26 * (1 - Math.cos(2 * Math.PI * beat)) / 2, D = p.spec.torsoD;
      for (const i of [0, 1]) reachBeside(p, i, side(i) * sep / 2, 0.36, D / 2 + 0.2, new THREE.Vector3(side(i), -0.5, -0.3).normalize());
    }
  }
  if (mode === 'festa') {
    p.arms.forEach((a, i) => {
      if (!free(i)) return;
      const w = Math.sin(t * 9 + i);
      a.rotation.set(-2.8 + w * 0.25, 0, side(i) * 0.25);
      p.forearms[i].rotation.set(-0.25 - 0.25 * (1 + w) / 2, 0, 0);
    });
    if (p.hop === p.g) p.g.position.y = hop * 0.12;
    else p.torso.rotation.x = p.lean0 + 0.08 * hop; // a forward bounce from the hips: seat and ground stay put
    if (p.cane) {
      p.torso.rotation.z = 0.05 * Math.sin(beat * Math.PI);
      caneRest(p);
      holdCane(p, T0, H0.setY(H0.y + 0.02 * hop));
    }
  }
  if (mode === 'moure') {
    if (p.base) {
      const k = pushAt(t), { R, caster } = CHAIR;
      for (const w of p.wheels) w.rotation.x = k.phi;
      for (const c of p.casters) c.rotation.x = k.phi * R / caster.r; // the casters roll the same ground
      // the trunk follows the stroke: upright at the catch (shoulders over the rim's back), forward by the release
      const [l0, l1] = PUSH.lean, e = k.grip ? k.u : 1 - k.u * k.u * (3 - 2 * k.u);
      p.torso.rotation.x = p.lean0 + l0 + (l1 - l0) * e;
      // the fingers on the rim's circle, the hand beside the tyre (its inner face 6 mm clear of it, so the rim runs through
      // the hand); off the rim it rises 9 cm and swings 3 cm out
      const rr = CHAIR.rimR + 0.09 * k.lift, x = CHAIR.wheelX + CHAIR.tyreTube + 0.006 + p.hand.h[0] + 0.03 * k.lift;
      for (const i of [0, 1]) reach(p, i, toTorso(p, v3.set(side(i) * x, R + rr * Math.cos(k.hand), CHAIR.axleZ + rr * Math.sin(k.hand))).clone(),
        dirToTorso(p, new THREE.Vector3(side(i) * 0.8, 0.2, -1).normalize()));
      travel = k.phi * R;
    } else {
      const sw = Math.sin(t * WALK.w) * WALK.swing;
      p.legs[0].rotation.x = sw; p.legs[1].rotation.x = -sw;
      p.g.position.y = 0.02 * Math.abs(Math.cos(t * WALK.w));
      p.arms.forEach((a, i) => free(i) && (a.rotation.x = -0.1 + (i ? sw : -sw) * 0.8));
      if (p.cane) { // constant contact: the tip sweeps an arc across the body's width, on the side of the leg behind
        const r = caneRest(p), s = side(p.holdArm), c = -s * Math.asin(Math.min(1, Math.abs(H0.x) / r)), a = c + s * 0.45 * Math.sin(t * WALK.w);
        holdCane(p, T0.set(H0.x + r * Math.sin(a), -p.g.position.y / p.g.scale.x, H0.z + r * Math.cos(a)), H0); // y: the ground under the step's bob
      }
      travel = WALK_SPEED * t;
    }
  }
  openSkirt(p);
  return travel * p.g.scale.x;
}

// Invert the prototype's displacement for a simulation-owned path. Bounded bisection preserves the push rim contact
// while matching wheel rotation to travelled distance; turns still use the same distance for both wheels in this trial.
export function timeAtDistance(p, worldDistance) {
  const d = worldDistance / Math.max(p.spec.k, 1e-6);
  if (!p.base) return d / WALK_SPEED;
  const length = pushAt(PUSH.period).phi * CHAIR.R, cycles = Math.floor(d / length);
  let lo = cycles * PUSH.period, hi = lo + PUSH.period;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (pushAt(mid).phi * CHAIR.R < d) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
