// The Drac's motion off the Mulassa's own: the splash's Drac beside her (PAIR), the Drac picked on the selector or driven
// in free play, and its song dance on the reactive springs it shares with her (scene/figure-springs.js).
import { PHOTO } from '../../game/photo-control.js';
import { CALM } from '../../core/env.js';
import { CAM_AZ, FRONT } from '../../scene/stage.js';
import { drac } from './drac-objects.js';
import { newDracPose } from './dance-drac.js';
import { poseDrac } from './drac-motion.js';
import { dressCarrier } from './drac-rig.js';
import { dogDrac } from './drac-groove.js';
import { danceDrac } from './drac-dance.js';
import { DRAC_SCALE } from './drac.js';
import { newWalker, resetWalker, demoStep, turn, manualDracStep, resumeWalker } from './drac-demo.js';
import { G, clock } from '../../game/state.js';
import { REEL } from '../../game/showreel.js';
import { smooth, easeIn } from '../../core/math.js';
import { PIVOT, S, M, CAP, stepSprings, capSpring, holdGesture } from '../../scene/figure-springs.js';
import { stepManualJump, beginManualFlight, manualContact } from '../../scene/manual-jump.js';

const DOG_TAME = 0.75; // the walkers' happy dog (drac-groove.js), as tame as their dance (drac-demo.js SHOW.tame)
const DRAC_POSE = newDracPose(), DRAC_ACC = { roll: 0, pitch: 0, lift: 0, col: 0, vigor: 1 };
// The splash: the Drac wanders and dances beside her (drac-demo.js), round a spot across the shot from the camera; each
// slows down short of the other, and a last push keeps her head, centre and rear out of its footprint.
// The selector shows its selected figure with HUD on, and this same pair in photo mode.
export const PAIR = { k: 0, x: Math.cos(CAM_AZ) * 2.6 - Math.sin(CAM_AZ) * 2.2, z: -Math.sin(CAM_AZ) * 2.6 - Math.cos(CAM_AZ) * 2.2, clear: 2.5, avoid: 4.2 };
PAIR.w = newWalker(PAIR.x, PAIR.z, FRONT, 1.3);
PAIR.hx = -Math.cos(CAM_AZ) * 1.6; PAIR.hz = Math.sin(CAM_AZ) * 1.6; // her own wandering middle: to the shot's left
const SOLO = newWalker(); // the Drac picked on the selector
let soloOn = false;
export function takeSolo(x, z, yaw) { // the selector's Drac walker starts from here, wandering round the middle
  resetWalker(SOLO, x, z, yaw); SOLO.hx = SOLO.hz = 0; soloOn = true;
  return SOLO;
}
function placeLife(x, z, yaw, y = 0) { // the rig's parent: where it walks and which way it faces (0, 0, 0 in the song)
  const life = drac.root.parent;
  life.position.set(x, y, z); life.rotation.set(0, yaw, 0); // quaternion restores may leave x/z rotated
  life.scale.setScalar(DRAC_SCALE);
}
export function keepClear() {
  const sx = Math.sin(M.yaw), cz = Math.cos(M.yaw);
  for (const back of [0, PIVOT, 2 * PIVOT]) { // her head, centre and rear
    const px = M.pivot.x - sx * back - PAIR.x, pz = M.pivot.y - cz * back - PAIR.z, d = Math.hypot(px, pz) || 1;
    if (d < PAIR.clear) { const k = (PAIR.clear - d) / d; M.pivot.x += px * k; M.pivot.y += pz * k; }
  }
  M.pos.set(M.pivot.x - sx * PIVOT, M.pivot.y - cz * PIVOT);
}
// Space while driving the Drac: the whole rig (shoes too) jumps, with fire and its manual landing impact.
export const DRAC_JUMP = { air: 0, airV: 0 };
function dracJump(dt) {
  if (PHOTO.action && dt > 0) { if (DRAC_JUMP.air === 0) { DRAC_JUMP.airV = CALM.matches ? 1.4 : 4.8; beginManualFlight('drac-valls'); PHOTO.drac.fire = 1.4; } PHOTO.action = false; } // a flamarada as it takes off
  const hit = stepManualJump(DRAC_JUMP, dt);
  if (hit > 2) manualContact('drac-valls', hit);
  PHOTO.air = DRAC_JUMP.air > 0;
  return DRAC_JUMP.air;
}
export function animPair(dt, beat, pair) {
  PAIR.k = pair ? 1 : 0;
  drac.root.visible = PAIR.k > 0;
  if (!PAIR.k) return;
  const w = PAIR.w;
  if (w.manual > 0) resumeWalker(w, beat);
  demoStep(w, DRAC_POSE, dt, beat, M.pos, DRAC_SCALE); PAIR.x = w.x; PAIR.z = w.z;
  placeLife(w.x, w.z, w.face, DRAC_JUMP.air = 0);
  poseDrac(drac, DRAC_POSE, 0, w.feetAt); dogDrac(drac, beat, DOG_TAME); dressCarrier(drac);
}

export function animPlayableDrac(dt, beat, live, reel) {
  if (!reel && (G.state === 'select')) { // picked on the selector: it wanders and shows off, from where it stands
    if (!soloOn) { resetWalker(SOLO, M.pos.x, M.pos.y, M.yaw); SOLO.hx = SOLO.hz = 0; soloOn = true; }
    PHOTO.drac.roar = PHOTO.on && PHOTO.id === 'drac-valls' && PHOTO.keys.has('KeyQ');
    if (PHOTO.on) manualDracStep(SOLO, DRAC_POSE, dt, beat, PHOTO.drac, DRAC_SCALE, CALM.matches);
    else demoStep(SOLO, DRAC_POSE, dt, beat, null, DRAC_SCALE);
    placeLife(SOLO.x, SOLO.z, SOLO.face, PHOTO.on && PHOTO.id === 'drac-valls' ? dracJump(dt) : (DRAC_JUMP.air = 0));
    poseDrac(drac, DRAC_POSE, 0, SOLO.feetAt); dogDrac(drac, beat, DOG_TAME); dressCarrier(drac);
    const prev = M.yaw;
    M.yaw = SOLO.face; M.yawVel = dt > 0 ? turn(M.yaw, prev) / dt : 0;
    M.pos.set(SOLO.x, SOLO.z); M.pivot.copy(M.pos); M.dancing = false;
    return;
  }
  soloOn = false;
  const dancing = G.state === 'play' || reel;
  // Reuse the bounded tap/hold/stumble springs; the dance itself is drac-dance.js's.
  for (const k in S) S[k].t = 0;
  holdGesture();
  stepSprings(Math.min(dt, 0.04));
  for (const k in CAP) if (S[k]) capSpring(S[k], CAP[k]);
  const col = G.collapseT && !reel ? smooth(Math.min(1, (clock - G.collapseT) / 0.6)) : 0;
  const target = reel ? 1 : dancing ? 1 - 0.92 * Math.min(1, (G.streak || 0) / 2) : live;
  M.vigor += (target - M.vigor) * easeIn(dt, 0.5);
  M.airV -= 14 * dt; M.air = Math.min(CAP.air, Math.max(0, M.air + M.airV * dt));
  if (M.air === 0 || M.air === CAP.air) M.airV = 0;
  DRAC_ACC.roll = S.roll.x; DRAC_ACC.pitch = S.pitch.x; DRAC_ACC.lift = M.air; DRAC_ACC.col = col; DRAC_ACC.vigor = M.vigor; // (no literal: no garbage a frame)
  const prev = M.yaw;
  M.yaw = danceDrac(reel ? REEL.beat : beat, DRAC_ACC, M.pos);
  M.yawVel = dt > 0 ? (M.yaw - prev) / dt : 0;
  M.pivot.copy(M.pos);
  M.dancing = dancing;
}
// another playable figure took the stage: the selector's walker starts afresh next time
export const leaveSolo = () => { soloOn = false; };
