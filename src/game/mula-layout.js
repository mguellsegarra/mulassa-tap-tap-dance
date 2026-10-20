// Where the Mulassa's dance sits: the fixed rehearsal compass, the four attendants on it, and the one frame that carries
// the dance's coordinates (the 2017 reference's: x right of its camera, z towards it) into the plaça.
// Marc's convention (validated): W is the heading she opens with, E its opposite; positive yaw goes W -> S -> E -> N.
// Script labels for the floor, not geographic north, never tied to a camera. Pure (no three.js); the scene, the colla,
// the crowd and dev/bestiari-compare read it.
// GAME ADAPTATION: the four standing attendants on W/N/S/E. Her four carriers are under the cloth (UAF); the recordings
// show similarly dressed people round the dance space, not a fixed four-point formation.
import { mulaMotion } from './mula-path.js';

export const MULA_W = mulaMotion.pose(0).yaw; // the opening heading (rad, reference frame)
// The compass in the reference frame: each mark's direction from the centre ({x, z} unit) and its heading.
export const MULA_COMPASS = Object.freeze(['W', 'S', 'E', 'N'].map((id, i) => {
  const yaw = MULA_W + i * Math.PI / 2;
  return Object.freeze({ id, yaw, x: Math.sin(yaw), z: Math.cos(yaw) });
}));
// The centre her figures are danced round (game/mula-figures.js; the plaça's centre), how far her swept footprint
// reaches from it (her floor box at every pose, MULA_REACH m; tests/mula-dance.mjs), and the attendants' radius: W and
// E, where she runs out and turns, stay over 0.75 m clear of the footprint (spot 0.45 + 0.3 m of air).
export const MULA_CENTRE = Object.freeze([-0.09, 0.5]), MULA_REACH = 4.4, MULA_HELPER_RADIUS = 5.5;
// each attendant: its spot in the dance frame (m) and the heading that faces the centre (rotation.y; local +z inwards)
export const MULA_HELPERS = Object.freeze(['W', 'N', 'S', 'E'].map(id => {
  const m = MULA_COMPASS.find(c => c.id === id);
  return Object.freeze({ id, x: MULA_CENTRE[0] + m.x * MULA_HELPER_RADIUS, z: MULA_CENTRE[1] + m.z * MULA_HELPER_RADIUS, yaw: m.yaw + Math.PI });
}));
// The seated members (the 2021 recording: people of the group sitting or squatting round the open space; count and
// spots are adaptation): beyond the footprint, between the marks, never in the W-S gap the play camera looks through.
// [angle from W (rad, + towards S), radius (m), posture (models/colla.js SEATED), look]
export const MULA_SEATS = [
  [2.36, 6.1, 0, 0], [3.93, 6.1, 1, 1], [5.5, 6.1, 2, 2],
  [2.0, 6.15, 1, 3], [4.3, 6.15, 0, 4], [5.15, 6.15, 2, 3], [2.72, 6.15, 0, 2],
];

// Which way the dance frame turns in the plaça: the play camera looks in between W and S (never over an attendant's
// shoulder), so she opens three-quarter on (W 45 deg off the lens) and the first half turn passes S, facing it, as it
// faces the 2017 camera.
export const mulaDanceYaw = camAz => camAz - Math.PI / 4 - MULA_W;
// The dance frame in the plaça: turned by `yaw` and moved so the centre stands on the plaça's centre. One transform for
// the path, the shoes, the attendants and any debug layer.
export function placeMulaDance(obj, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw), [x, z] = MULA_CENTRE;
  obj.position.set(-(c * x + s * z), 0, -(-s * x + c * z));
  obj.rotation.set(0, yaw, 0);
  return obj;
}
// a dance-frame point (m) in the plaça (m), with the same transform as placeMulaDance
export function mulaToWorld(out, x, z, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw), dx = x - MULA_CENTRE[0], dz = z - MULA_CENTRE[1];
  out.x = c * dx + s * dz; out.z = -s * dx + c * dz;
  return out;
}
