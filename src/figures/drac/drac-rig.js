// The Drac carried by one person: the shell and shoes posed through poseDrac (drac-motion.js) as one rigid prop, then an
// independent pelvis and a bent cloth skin (drac-legs.js) give the carrier a knee. Feet keep their own world-space
// contact plan (whatever feetAt poseDrac was given). The game, the photo / menu walkers, the share photo and
// dev/drac-compare all go through here, so they draw the same carrier.
import * as THREE from 'three';
import { HIP_BELOW_BODY, FOOT_X, FOOT_Z } from './drac.js';
import { poseDrac } from './drac-motion.js';
import { newDracPose } from './dance-drac.js';
import { poseCarrierLeg } from './drac-legs.js';

// poseDrac counter-rolls the necks against `roll` and waves the tail with `drive`; the observed beast does neither (one
// carrier, one shell). So the lean goes through `shake` (the body-only roll channel) and `drive` stays out of the rig.
const S = newDracPose();
export function poseRigid(rig, p, front, feetAt) {
  Object.assign(S, p);
  S.shake = p.roll + p.shake; S.roll = 0; S.drive = 0;
  poseDrac(rig, S, front, feetAt);
}

// The carrier's pelvis under the rigid shell: its hips face the mean of the two shoes' headings (unwrapped, so a stride
// never swings it round), not the shell's, and its centre shifts a little towards the ankles' midpoint, saturating
// smoothly at PELVIS.shift (offset = d * L / sqrt(L^2 + |d|^2), horizontal, inside the cloak). Shell-fixed hips made a
// carrier holding a 120 deg torsion over planted feet, or walking with feet turned off the shell, cross his straight
// trousers, and a turned pelvis alone over-reached a leg. The hips keep their height, width and the body's lean. Smooth
// (C1) in t, a pure function of the posed rig: no clamp, no branch, no state. Model units, root space.
export const PELVIS = { shift: 0.45 };
// the pelvis heading relative to the shell (rad): the shoes' rotation.y are already relative to it (poseDrac)
export const pelvisYaw = rig => (rig.legs[0].shoe.rotation.y + rig.legs[1].shoe.rotation.y) / 2;
export function carrierHips(rig, out = [new THREE.Vector3(), new THREE.Vector3()]) {
  const m = rig.body.matrix.elements, rel = pelvisYaw(rig), c = Math.cos(rel), n = Math.sin(rel);
  for (let i = 0; i < 2; i++) {
    const rx = i ? -FOOT_X : FOOT_X, hx = c * rx + n * FOOT_Z, hz = -n * rx + c * FOOT_Z, hy = -HIP_BELOW_BODY;
    out[i].set(m[0] * hx + m[4] * hy + m[8] * hz + m[12], m[1] * hx + m[5] * hy + m[9] * hz + m[13], m[2] * hx + m[6] * hy + m[10] * hz + m[14]);
  }
  const a = rig.legs[0].shoe.position, b = rig.legs[1].shoe.position, L = PELVIS.shift;
  const dx = (a.x + b.x - out[0].x - out[1].x) / 2, dz = (a.z + b.z - out[0].z - out[1].z) / 2, k = L / Math.sqrt(L * L + dx * dx + dz * dz);
  for (const h of out) { h.x += dx * k; h.z += dz * k; }
  return out;
}
const HIPS = [new THREE.Vector3(), new THREE.Vector3()];
// after any poseDrac: bend the cloth trousers from each shoe to the pelvis (poseDrac's straight prisms are replaced)
export function dressCarrier(rig) {
  carrierHips(rig, HIPS);
  const yaw = pelvisYaw(rig);
  for (let i = 0; i < 2; i++) poseCarrierLeg(rig.legs[i], HIPS[i], yaw);
}
// the revised dance's whole rig pose: a rigid shell, its feet on `feetAt`, the carrier dressed
export function poseCarrier(rig, pose, feetAt, front = 0) {
  poseRigid(rig, pose, front, feetAt);
  dressCarrier(rig);
}
