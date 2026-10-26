// Rig dimensions shared by the builder (models.mjs) and the gallery poses (pose.mjs), in figure units (metres before
// the figure's scale). Changing one moves both the geometry and the contacts that pose.mjs solves for.
import * as THREE from 'three';

// shoulder → elbow; PALM = the grip point in the forearm's frame, where the fingers close (the hand box spans -0.14..-0.28)
export const UPPER = 0.28, PALM = Object.freeze(new THREE.Vector3(0, -0.25, 0));
// the manual wheelchair: rear wheels (R, axle at y R, z axleZ, plane at ±wheelX), the push rim rimOut outboard of the
// wheel's plane (1.7 cm of air between rim and tyre: room for the fingers), the tyre, and the front casters (axle trailing the swivel stem by swivelZ − z)
export const CHAIR = Object.freeze({ R: 0.31, wheelX: 0.275, axleZ: -0.12, rimOut: 0.045, rimR: 0.26, rimTube: 0.008, tyreR: 0.29, tyreTube: 0.02,
  caster: Object.freeze({ x: 0.215, y: 0.07, z: 0.155, r: 0.07, w: 0.03, swivelZ: 0.215 }) });
// palm → tip of the long white cane
export const CANE_LEN = 1.12;
