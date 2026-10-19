// Preview carrier: the shell and shoes are posed through the game's rig, then independent pelvis hips and a bent
// cloth skin give the human underneath a knee. Feet retain their own world-space contact plan.
import * as THREE from 'three';
import { HIP_BELOW_BODY, FOOT_X, FOOT_Z } from '../../scene/models/drac.js';
import { poseRigid } from '../drac-lab/trial-rig.js';
import { feetAt } from './steps.js';
import { poseCarrierLeg } from './carrier-legs.js';

// The carrier's pelvis under the rigid shell: its hips face the mean of the two feet's headings (unwrapped, so a stride
// never swings it round), not the shell's, and its centre shifts a little towards the ankles' midpoint, saturating
// smoothly at PELVIS.shift (offset = d * L / sqrt(L^2 + |d|^2), horizontal, inside the cloak). Shell-fixed hips made a
// carrier holding a 120 deg torsion over planted feet, or walking with feet turned off the shell, cross his straight
// trousers, and a turned pelvis alone over-reached a leg. The hips keep their height, width and the body's lean. Smooth
// (C1) in t, a pure function of the pose: no clamp, no branch, no state. Model units, root space.
export const PELVIS = { shift: 0.45 };
export function carrierHips(rig, pose, out = [new THREE.Vector3(), new THREE.Vector3()]) {
  const m = rig.body.matrix.elements, rel = (rig.feet[0].yaw + rig.feet[1].yaw) / 2 - pose.yaw, c = Math.cos(rel), n = Math.sin(rel);
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
export function poseCompare(rig, pose) {
  poseRigid(rig, pose, 0, feetAt);
  carrierHips(rig, pose, HIPS);
  const pelvisYaw = (rig.feet[0].yaw + rig.feet[1].yaw) / 2 - pose.yaw;
  for (let i = 0; i < 2; i++) poseCarrierLeg(rig.legs[i], HIPS[i], pelvisYaw);
}
