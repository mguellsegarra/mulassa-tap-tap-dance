// The Bou Tradicional's group, on the Drac's colla bodies (drac-colla.js), dressed in the UAF's garnet (models/colla.js
// BOU_SUIT): four attendants on W/N/S/E round its dance and the capatàs; no one seated (the Bou's colla is a
// few people, the Drac's and the Mulassa's seated rings read as too many here). GAME ADAPTATION, like the Mulassa's: the
// sources show the colla round the figure, not a fixed four-point formation. The dance frame and the compass are one,
// turned by `yaw` (stage.js BOU_COLLA_YAW): the dance's W is the W attendant's; the play camera looks in between W and
// S, never over an attendant's shoulder.
import * as THREE from 'three';
import { createColla } from '../common/colla.js';
import { HELPER_HIP } from '../../scene/models/colla.js';
import { BOU_HELPER_LOOKS } from './bou-suit.js';
import { bouPose, BOU_TIMING } from './bou-dance.js';

// Its dance travels ≤ 1.1 m from the plaça's centre with a 2.7 m body (its ends ~1.6 m from its middle): the
// attendants 5.5 m out, as hers (4.6 put W and S in the play shot's corners), keep 2.5 m of air (tests/figures/bou/bou-colla.mjs).
export const BOU_HELPER_RADIUS = 5.5;
// each attendant in the compass frame (x = sin heading, z = cos heading; local +z faces the centre)
export const BOU_HELPERS = Object.freeze([['W', 0], ['N', 1.5 * Math.PI], ['S', 0.5 * Math.PI], ['E', Math.PI]].map(([id, a]) =>
  Object.freeze({ id, x: Math.sin(a) * BOU_HELPER_RADIUS, z: Math.cos(a) * BOU_HELPER_RADIUS, yaw: a + Math.PI })));
// The capatàs (near the dance, never one of the four marks, further back, almost against the public): on the far
// side between E and N, 6.4 m out (the crowd keeps beyond RING.arenaMula 6.7 m), facing the centre, so the play camera
// sees him beside the Bou; his look is the last of BOU_HELPER_LOOKS.
export const BOU_CAPATAS = Object.freeze({ id: 'C', x: Math.sin(3.55) * 6.4, z: Math.cos(3.55) * 6.4, yaw: 3.55 + Math.PI });
// a compass-frame point in the plaça, the compass turned to `yaw`
export const bouToWorld = (x, z, yaw) => ({ x: x * Math.cos(yaw) + z * Math.sin(yaw), z: -x * Math.sin(yaw) + z * Math.cos(yaw) });
export const createBouColla = profile => createColla({ profile, spots: [...BOU_HELPERS, BOU_CAPATAS], seats: [],
  helperLooks: BOU_HELPER_LOOKS, name: 'bou-colla' });

// The festa's carry (figures/bou/bou-dance.js BOU_CARRY): the four attendants run in from their marks to its
// flanks (W and S to the rear and front of its right side as it stands then, N and E to its left: no one crosses), push
// it up over their heads at arm's length, hands on the flank (the videos), carry it round the lap and walk back to their
// marks. A pure function of the dance's pose and song beat (seekable). Their bodies are rigid: a jog is a hop on the
// beat. The capatàs keeps his place.
// m in its frame: `side` = its flank (0.61) + the reach of arms raised ARM_LIFT forward of straight up, so the hands
// meet the cloth and the heads stay out from under the hem; `along` from its middle
export const CARRY_SLOT = { side: 1.02, along: 0.7 };
const ARM_LIFT = [0.1, -2.55, -0.12]; // shoulder roll out, pitch (up, a little forward), elbow
const SLOT_SIGN = { W: [-1, -1], S: [-1, 1], N: [1, -1], E: [1, 1] };
const carryRamp = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
// Where attendant `h` stands (compass frame) and how far into the carry (w: 0 at its mark, 1 at its flank; grip: arms up)
export function carryAt(h, pose, C, out = {}) {
  const b = pose.beat, w = carryRamp(C.come, C.grip, b) * (1 - carryRamp(C.down, C.back, b));
  // worked round it (its frame, polar): they swing round to their side as they come (the angle linear) and close in
  // late (the distance eased in); going back they step out first and turn for their mark after (it may have turned), so the ones coming from its head or tail (E, W) pass wide of the horns (2.7 m across) and the tail
  // set down, they walk off in the frame it had then: its turn into the final disco must not swing them round with it
  const yaw = b > C.down ? (carryDownYaw ??= bouPose(BOU_TIMING.subdivisionTimes[Math.round(C.down * BOU_TIMING.subdivision)]).yaw) : pose.yaw;
  const [sx, sz] = SLOT_SIGN[h.id], c = Math.cos(yaw), s = Math.sin(yaw), dx = h.x - pose.x, dz = h.z - pose.z;
  const hx = dx * c - dz * s, hz = dx * s + dz * c, tx = sx * CARRY_SLOT.side, tz = sz * CARRY_SLOT.along;
  const a0 = Math.atan2(hx, hz), r0 = Math.hypot(hx, hz), r1 = Math.hypot(tx, tz);
  let da = Math.atan2(tx, tz) - a0; da -= Math.round(da / (2 * Math.PI)) * 2 * Math.PI;
  const a = a0 + da * (b > C.down ? 1 - (1 - w) * (1 - w) : w), r = r0 + (r1 - r0) * w * w * w, lx = r * Math.sin(a), lz = r * Math.cos(a);
  out.x = pose.x + lx * c + lz * s; out.z = pose.z - lx * s + lz * c;
  out.w = w; out.grip = carryRamp(C.grip - 1.5, C.grip, b) * (1 - carryRamp(C.down - 0.5, C.down + 1, b));
  // facing the point of its flank beside them; turned from their mark's heading as they set off
  let face = Math.atan2(pose.x + tz * s - out.x, pose.z + tz * c - out.z) - h.yaw;
  face -= Math.round(face / (2 * Math.PI)) * 2 * Math.PI;
  out.yaw = h.yaw + face * carryRamp(0, 0.15, w);
  return out;
}
const CARRY_AT = {};
let carryDownYaw = null; // (its heading as it was set down: a pure function of the dance)
// Their run: each sole is planted on the paving (the colla's frame) and
// stays put until it steps; a step starts on the music's half beat (quarter, sprinting) when that foot has fallen `due`
// m behind where the body wants it, the other foot planted, and lands on the next where the hip will be half way through its
// stance (lifted `lift` m on the way); a foot left past `reach` steps at once, even with the other up (a running
// stride's flight). Each leg is rigid from hip to sole; the
// body sinks as far as the planted legs lean (a bouncy, comic run) and a swinging leg folds (shortens) to clear the
// paving. A seek (a jump over `seek` m) puts the feet back under them.
const GAIT = { due: 0.12, run: 0.25, sprint: 1.1, reach: 0.4, lift: 0.12, lead: 0.75, seek: 0.6, rise: 0.06 };
const LEG_V = new THREE.Vector3(), DOWN = new THREE.Vector3(0, -1, 0);
function stepColla(p, x, z, yaw, beat, moved, dt) {
  const g = p.gait ??= { feet: [0, 1].map(() => ({ x: 0, z: 0, fx: 0, fz: 0, tx: 0, tz: 0, b0: 0, air: false })), vx: 0, vz: 0, px: 0, pz: 0, beat, y: 0, init: false };
  const db = beat - g.beat, c = Math.cos(yaw), s = Math.sin(yaw);
  g.beat = beat;
  const home = (k, ax, az, out) => { const side = k ? -0.1 : 0.1; out[0] = ax + side * c; out[1] = az - side * s; return out; }; // its sole under its hip
  if (!g.init || moved < 0 || db < 0) { // first time or a seek: under the hips, at rest
    g.feet.forEach((f, k) => { home(k, x, z, HOME); f.x = HOME[0]; f.z = HOME[1]; f.air = false; }); g.vx = g.vz = 0; g.init = true;
  } else if (db > 1e-6) { // its travel in m a beat, eased
    const e = Math.min(1, dt / 0.15); g.vx += ((x - g.px) / db - g.vx) * e; g.vz += ((z - g.pz) / db - g.vz) * e;
  }
  g.px = x; g.pz = z;
  // running: a step every half beat, every quarter when sprinting (the outer flank of the carried laps runs ~4.5 m/s)
  const v = Math.hypot(g.vx, g.vz), run = v > GAIT.run, q = v > GAIT.sprint ? 0.25 : 0.5, half = Math.floor(beat / q) !== Math.floor((beat - db) / q);
  for (const f of g.feet) if (f.air && beat >= f.b0 + f.q) { f.air = false; f.x = f.tx; f.z = f.tz; } // land first
  for (let k = 0; k < 2; k++) { // then a step: on the half beat (timed from it, so it lands on the next), or at once if left far behind
    const f = g.feet[k], o = g.feet[k ^ 1];
    if (f.air) continue;
    home(k, x, z, HOME);
    const off = Math.hypot(f.x - HOME[0], f.z - HOME[1]);
    // the trailing foot steps: further back along its travel (running), else further from where it should be
    const behind = run ? (o.x - f.x) * g.vx + (o.z - f.z) * g.vz : off - Math.hypot(o.x - HOME[0], o.z - HOME[1]);
    // (left past `reach` it goes even with the other foot up: a running stride's moment in the air)
    if (off > GAIT.reach || !o.air && half && (off > GAIT.due || run) && behind >= 0) {
      home(k, x + g.vx * GAIT.lead * q * 2, z + g.vz * GAIT.lead * q * 2, HOME); f.tx = HOME[0]; f.tz = HOME[1];
      f.fx = f.x; f.fz = f.z; f.b0 = half ? Math.floor(beat / q) * q : beat; f.q = q; f.air = true;
    }
  }
  // the hip height the planted soles allow (never above standing); down at once, back up eased
  let hipY = HELPER_HIP;
  for (let k = 0; k < 2; k++) { const f = g.feet[k]; if (!f.air) { home(k, x, z, HOME); const h = Math.hypot(f.x - HOME[0], f.z - HOME[1]); hipY = Math.min(hipY, Math.sqrt(Math.max(0, HELPER_HIP ** 2 - h * h))); } }
  const drop = hipY - HELPER_HIP;
  g.y = drop < g.y ? drop : g.y + (drop - g.y) * Math.min(1, dt / GAIT.rise);
  p.g.position.y += g.y;
  for (let k = 0; k < 2; k++) { // each rigid leg from its hip to its sole (the colla's frame -> the person's)
    const f = g.feet[k], leg = p.legs[k];
    let fx = f.x, fz = f.z, fy = 0;
    if (f.air) { const u = Math.min(1, (beat - f.b0) / f.q), e = u * u * (3 - 2 * u); fx = f.fx + (f.tx - f.fx) * e; fz = f.fz + (f.tz - f.fz) * e; fy = GAIT.lift * Math.sin(Math.PI * u); }
    const lx = fx - x, lz = fz - z;
    LEG_V.set(lx * c - lz * s - leg.position.x, fy - p.g.position.y - leg.position.y, lx * s + lz * c); // (the body's height: its sink and any hop)
    const len = LEG_V.length();
    leg.quaternion.setFromUnitVectors(DOWN, LEG_V.divideScalar(len || 1));
    leg.scale.y = Math.min(1, len / HELPER_HIP); // a planted leg reaches its sole exactly; a swinging one folds
  }
}
const HOME = [0, 0];
export function carryColla(colla, pose, C, dt) {
  for (let i = 0; i < 4; i++) {
    const p = colla.crew[i], { w, grip, x, z, yaw } = carryAt(p.g.userData.helper, pose, C, CARRY_AT);
    const d = Math.hypot(x - p.g.position.x, z - p.g.position.z);
    p.g.position.x = x; p.g.position.z = z; p.g.rotation.y = yaw;
    if (p.legs.length) stepColla(p, x, z, yaw, pose.beat, d < GAIT.seek ? d : -1, dt);
    if (w <= 0) continue;
    if (grip > 0) for (let k = 0; k < 2; k++) {
      const { sh, el } = p.arms[k], side = k ? -1 : 1;
      sh.rotation.x += (ARM_LIFT[1] - sh.rotation.x) * grip; sh.rotation.z += (side * ARM_LIFT[0] - sh.rotation.z) * grip;
      el.rotation.x += (ARM_LIFT[2] - el.rotation.x) * grip; el.rotation.y *= 1 - grip;
    }
  }
}
