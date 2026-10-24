// The Bou Tradicional's group, on the Drac's colla bodies (drac-colla.js), dressed in the UAF's garnet (models/colla.js
// BOU_SUIT): four attendants on W/N/S/E round its dance and the capatàs; no one seated (Marc: the Bou's colla is a
// few people, the Drac's and the Mulassa's seated rings read as too many here). GAME ADAPTATION, like the Mulassa's: the
// sources show the colla round the figure, not a fixed four-point formation. The dance frame and the compass are one,
// turned by `yaw` (stage.js BOU_COLLA_YAW): the dance's W is the W attendant's; the play camera looks in between W and
// S, never over an attendant's shoulder.
import { createColla } from './drac-colla.js';
import { BOU_HELPER_LOOKS } from './models/colla.js';

// Its dance travels ≤ 1.1 m from the plaça's centre with a 2.7 m body (its ends ~1.6 m from its middle): the
// attendants 5.5 m out, as hers (4.6 put W and S in the play shot's corners), keep 2.5 m of air (tests/bou-colla.mjs).
export const BOU_HELPER_RADIUS = 5.5;
// each attendant in the compass frame (x = sin heading, z = cos heading; local +z faces the centre)
export const BOU_HELPERS = Object.freeze([['W', 0], ['N', 1.5 * Math.PI], ['S', 0.5 * Math.PI], ['E', Math.PI]].map(([id, a]) =>
  Object.freeze({ id, x: Math.sin(a) * BOU_HELPER_RADIUS, z: Math.cos(a) * BOU_HELPER_RADIUS, yaw: a + Math.PI })));
// The capatàs (Marc: near the dance, never one of the four marks, further back, almost against the public): on the far
// side between E and N, 6.4 m out (the crowd keeps beyond RING.arenaMula 6.7 m), facing the centre, so the play camera
// sees him beside the Bou; his look is the last of BOU_HELPER_LOOKS.
export const BOU_CAPATAS = Object.freeze({ id: 'C', x: Math.sin(3.55) * 6.4, z: Math.cos(3.55) * 6.4, yaw: 3.55 + Math.PI });
// a compass-frame point in the plaça, the compass turned to `yaw`
export const bouToWorld = (x, z, yaw) => ({ x: x * Math.cos(yaw) + z * Math.sin(yaw), z: -x * Math.sin(yaw) + z * Math.cos(yaw) });
export const createBouColla = profile => createColla({ profile, spots: [...BOU_HELPERS, BOU_CAPATAS], seats: [],
  helperLooks: BOU_HELPER_LOOKS, name: 'bou-colla' });

// The festa's carry (Marc 24/10/2026; game/bou-dance.js BOU_CARRY): the four attendants run in from their marks to its
// flanks (W and S to the rear and front of its right side as it stands then, N and E to its left: no one crosses), grip
// it with both arms reaching up the flank, carry it round the lap and walk back to their marks. A pure function of the
// dance's pose and song beat (seekable). Their bodies are rigid: a jog is a hop on the beat. The capatàs keeps his place.
const CARRY_SLOT = { side: 1.25, along: .65 }, ARM_LIFT = [0.12, -1.95, -0.35]; // m in its frame; shoulder z, x, elbow x
const SLOT_SIGN = { W: [-1, -1], S: [-1, 1], N: [1, -1], E: [1, 1] };
const carryRamp = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
export function carryColla(colla, pose, C) {
  const b = pose.beat, w = carryRamp(C.come, C.grip, b) * (1 - carryRamp(C.down, C.back, b));
  const grip = carryRamp(C.grip - 1.5, C.grip, b) * (1 - carryRamp(C.down - 0.5, C.down + 1, b));
  const run = Math.max(w * (1 - w) * 4, b > C.grip && b < C.down ? 0.6 : 0), c = Math.cos(pose.yaw), s = Math.sin(pose.yaw);
  for (let i = 0; i < 4; i++) {
    const p = colla.crew[i], h = p.g.userData.helper, [sx, sz] = SLOT_SIGN[h.id], lx = sx * CARRY_SLOT.side, lz = sz * CARRY_SLOT.along;
    const x = h.x + (pose.x + lx * c + lz * s - h.x) * w, z = h.z + (pose.z - lx * s + lz * c - h.z) * w;
    p.g.position.x = x; p.g.position.z = z;
    if (w <= 0) { p.g.rotation.y = h.yaw; continue; }
    // facing the point of its flank beside them; turned from their mark's heading as they set off
    let face = Math.atan2(pose.x + lz * s - x, pose.z + lz * c - z) - h.yaw;
    face -= Math.round(face / (2 * Math.PI)) * 2 * Math.PI;
    p.g.rotation.y = h.yaw + face * carryRamp(0, 0.15, w);
    p.g.position.y += 0.07 * run * Math.abs(Math.sin(Math.PI * b));
    if (grip > 0) for (let k = 0; k < 2; k++) {
      const { sh, el } = p.arms[k], side = k ? -1 : 1;
      sh.rotation.x += (ARM_LIFT[1] - sh.rotation.x) * grip; sh.rotation.z += (side * ARM_LIFT[0] - sh.rotation.z) * grip;
      el.rotation.x += (ARM_LIFT[2] - el.rotation.x) * grip; el.rotation.y *= 1 - grip;
    }
  }
}
