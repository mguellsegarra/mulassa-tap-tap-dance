// Where the Drac's dance sits: the four clapping helpers who orient its carrier and the one frame that carries the
// whole dance into the plaça. Pure (no three.js); the scene and dev/drac-compare both read it.
// The owner\'s dance convention (validated): S follows the opening advance, SPOTS.S0 -> SPOTS.A; N is its opposite, W / E the
// perpendicular axis. Not the camera's axes, not a geographic bearing. APPROXIMATE: the centre (SPOTS.S0) and the radius
// are chosen to frame the inferred path, not measured in the source. Radius 5.1 m (was 4.5 provisional): the smallest that
// keeps every helper 0.3 m clear of the Drac's footprint (wings and tail included) over the whole path; at 4.5 the close
// pass towards the camera (34.4 s) ran through S (tests/figures/drac/drac-colla.mjs, the colla's clearance sweep).
// Units: the path (figures/drac/drac-path.js) is model units; everything here is metres (model units x DRAC_SCALE, once).
import { SPOTS } from './drac-path.js';
import { DRAC_SCALE } from './drac.js';

export const HELPER_CENTRE = Object.freeze(SPOTS.S0.map(v => v * DRAC_SCALE)), HELPER_RADIUS = 5.1;
const southYaw = Math.atan2(SPOTS.A[0] - SPOTS.S0[0], SPOTS.A[1] - SPOTS.S0[1]);
const southX = Math.sin(southYaw), southZ = Math.cos(southYaw);
// each helper: its spot in the dance frame (m) and the heading that faces the centre (rotation.y; local +z inwards)
export const HELPERS = Object.freeze([['W', -southZ, southX], ['N', -southX, -southZ], ['S', southX, southZ], ['E', southZ, -southX]].map(([id, dx, dz]) => Object.freeze({
  id, x: HELPER_CENTRE[0] + dx * HELPER_RADIUS, z: HELPER_CENTRE[1] + dz * HELPER_RADIUS, yaw: Math.atan2(-dx, -dz),
})));

// Which way the dance frame faces in the game: the play camera looks in between two helpers (S 45 deg round from it),
// never over one's shoulder (with the frame at the Drac's FRONT the S helper stood in the shot on phones). The opening
// pose (yaw -20 deg) then faces 26 deg off the camera: three-quarter, as FRONT intends for the Mulassa.
export const danceYaw = camAz => camAz - Math.PI / 4 - southYaw;
// The dance frame in the plaça: turned by `yaw` (the dance's front, +z, faces that heading) and moved so the helpers'
// centre stands on the plaça's centre. Set it on the Drac's parent group (scaled by DRAC_SCALE: the path is model units)
// and on the helpers' group (metres): one transform for the path, the feet, the helpers and any debug layer.
export function placeDance(obj, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw), [x, z] = HELPER_CENTRE;
  obj.position.set(-(c * x + s * z), 0, -(-s * x + c * z));
  obj.rotation.set(0, yaw, 0);
  return obj;
}
// a dance-frame point (m) in the plaça (m), with the same transform as placeDance
export function danceToWorld(out, x, z, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw), dx = x - HELPER_CENTRE[0], dz = z - HELPER_CENTRE[1];
  out.x = c * dx + s * dz; out.z = -s * dx + c * dz;
  return out;
}
