// The mulassa's motion: damped-spring accents on top of the base choreography (dance.js), heading, stumbles and holds.
import { PHOTO, photoBody, setPhotoControl } from '../game/photo-control.js';
import { tickPhoto, endPhoto } from './photo-motion.js';
import { CALM } from '../core/env.js';
import * as THREE from 'three';
import { poseMulaBody } from './mula-pose-rig.js';
import { newPose, practicePose, dancePose } from '../game/dance.js';
import { CAM_AZ, FRONT, mula, drac } from './stage.js';
import { selectedFigure } from '../game/figure-song.js';
import { newDracPose, dracPose, dracPractice } from '../game/dance-drac.js';
import { poseDrac } from './drac-motion.js';
import { DRAC_SCALE } from './models/drac.js';
import { newWalker, resetWalker, demoStep, turn, manualDracStep, resumeWalker } from './drac-demo.js';
import { G, clock, isDown } from '../game/state.js';
import { smooth, pulse, easeIn, hold } from '../core/anim.js';

export const PIVOT = 1.3; // metres from the body centre to the front pivot
const spring = (k = 90, c = 11) => ({ x: 0, v: 0, t: 0, k, c });
export const S = {
  yaw: spring(60, 10), roll: spring(110, 8), pitch: spring(110, 9),
  neck: spring(80, 9), neckYaw: spring(70, 8), squash: spring(260, 14), tail: spring(90, 5),
};
const MOTION_SPRINGS = Object.values(S);
function stepSprings(dt) {
  for (const sp of MOTION_SPRINGS) {
    sp.v += (sp.k * (sp.t - sp.x) - sp.c * sp.v) * dt;
    sp.x += sp.v * dt;
  }
}
export const M = { pivot: new THREE.Vector2(0, PIVOT), pos: new THREE.Vector2(0, 0), yaw: 0, yawVel: 0, missT: -9, biteT: -9, peekT: -9, air: 0, airV: 0, dancing: false, danceBeat: 0, vigor: 1 };
let photoGait = 1, photoLastId = null;
let animatedFigureId = selectedFigure.id;
const DRAC_POSE = newDracPose();
const POSE = newPose(); // the base choreography's pose this frame (dance.js), reused
const HOME = new THREE.Vector2(0, 0); // her centre's spot in the plaça during play; the choreography travels around it
// Reactive limits on top of the base pose (rad, m): accents and stumbles never pile up, whatever the tapping rate.
const CAP = { yaw: 0.35, roll: 0.3, pitch: 0.3, neck: 0.6, neckYaw: 0.6, air: 0.18 };
function capSpring(sp, m) {
  if (sp.x > m) { sp.x = m; sp.v = Math.min(0, sp.v); } else if (sp.x < -m) { sp.x = -m; sp.v = Math.max(0, sp.v); }
}
export let trauma = 0; // camera shake
export const setTrauma = v => (trauma = v);
// A successful tap during play: a short accent on the base dance, never a new heading. GUA (orange, left) leans her
// to the screen's left and PA (turquoise, right) to its right, whichever way she faces (roll and pitch share the
// lean by her heading). GUAPA ('B', also a GLOBUS pop): both at once, a proud whole-body lift.
function accent(input) {
  const cy = Math.cos(M.yaw - CAM_AZ), sy = Math.sin(M.yaw - CAM_AZ); // her heading as the play camera sees it
  if (input === 'L' || input === 'R') {
    const s = input === 'L' ? 1 : -1;
    S.roll.v += s * 1.1 * cy; S.pitch.v -= s * 1.1 * sy;
    S.neckYaw.v -= s * 3 * cy; // the head glances the same way
    S.neck.v -= 2; S.tail.v -= s * 8;
    M.airV = Math.max(M.airV, 0.9); // the carriers push up on the beat
    S.squash.v += 2;
  } else {
    S.pitch.v -= 2.4; S.neck.v -= 5; S.tail.v += 12; // front and head up, tail flying
    M.airV = Math.max(M.airV, 1.8);
    S.squash.v -= 3;
  }
}
export function act(dir) {
  if (G.state === 'play') return accent(dir);
  const B = G.state !== 'play' || G.sec === 'B';
  const side = dir === 'L' ? 1 : -1;
  if (dir === 'L' || dir === 'R') {
    S.yaw.t += side * (B ? 1.25 : 0.55); // B: big compass swing, A: turn to greet
    S.roll.v -= side * (B ? 2.2 : 0.9); // leans out as the rear flies round
    S.neckYaw.v += side * (B ? 3 : 5); // the head leads the turn
    S.tail.v -= side * 9;
  } else if (dir === 'U') {
    if (B) { M.airV = 3.2; S.pitch.v -= 2.5; } // bot!
    else { S.neck.v -= 4; S.pitch.v -= 1.2; M.airV = 1.2; } // alça el cap, proud
    S.neck.v -= 3;
  } else { // D
    if (B) { S.pitch.v += 4; S.tail.v += 14; } // cop de cua: the rear kicks up
    else { S.neck.v += 7; S.pitch.v += 1.6; } // deep reverència, head down to the floor
    S.squash.v -= 3;
  }
  S.squash.v += 2.5;
}
// Back on the title she stands up again: nothing a run left on her carries over (a collapse's sunk body, drooped neck,
// open jaw, hidden legs and the sad crowd all hang on G.collapseT; a stumble, a jump). The demo walk goes on from
// where she stands, facing where she faced (S.yaw keeps her heading).
export function standUp() {
  G.collapseT = 0;
  Object.assign(M, { missT: -9, air: 0, airV: 0 });
  for (const k of ['roll', 'pitch', 'neck', 'neckYaw', 'squash', 'tail']) Object.assign(S[k], { x: 0, v: 0, t: 0 });
}
export function stumble(dir) { // PATAPAM: a wrong move trips her up: nose dips, she lurches sideways and lands heavily
  const side = dir === 'L' ? -1 : 1; // lurches the other way from where she was told to go
  S.pitch.v += 5; S.roll.v += side * 4; S.neck.v += 6; S.neckYaw.v -= side * 6; S.squash.v -= 5; S.tail.v += side * 12;
  M.missT = clock; // (no camera shake: a miss shouldn't jolt the view)
}
export function animMula(dt, beat, live = 1) {
  if (animatedFigureId !== selectedFigure.id) {
    animatedFigureId = selectedFigure.id;
    standUp(); M.dancing = false; M.yaw = FRONT; M.yawVel = 0;
    M.pos.set(0, 0); M.pivot.set(0, PIVOT);
    Object.assign(S.yaw, { x: FRONT, v: 0, t: FRONT });
  }
  if (PHOTO.on && G.state !== 'splash' && G.state !== 'select' && G.state !== 'title') setPhotoControl(false);
  let manualMula = PHOTO.on && PHOTO.id === 'mulassa-valls';
  if (PHOTO.on) {
    if (PHOTO.pair && photoLastId === 'drac-valls' && PHOTO.id !== photoLastId) resumeWalker(PAIR.w, beat);
    photoLastId = PHOTO.id;
    tickPhoto(dt, M, PAIR, PIVOT);
    manualMula ||= PHOTO.pair && PHOTO.yielding && PHOTO.id === 'drac-valls';
    if (manualMula) { S.yaw.x = S.yaw.t = M.yaw; S.yaw.v = 0; }
    if (manualMula && PHOTO.action) {
      if (M.air === 0) M.airV = CALM.matches ? 1.4 : 4.8;
      PHOTO.action = false;
    }
  } else if (PHOTO.ready) {
    if (PHOTO.pair && photoLastId === 'drac-valls') {
      PAIR.w.x = PHOTO.drac.x; PAIR.w.z = PHOTO.drac.z; PAIR.w.face = PHOTO.drac.yaw;
      resumeWalker(PAIR.w, beat);
    } else if (!PHOTO.pair) {
      const p = photoBody(); M.pos.set(p.x, p.z); M.yaw = p.yaw;
      resetWalker(SOLO, p.x, p.z, p.yaw); SOLO.hx = SOLO.hz = 0; resumeWalker(SOLO, beat); soloOn = true;
    }
    M.pivot.set(M.pos.x + Math.sin(M.yaw) * PIVOT, M.pos.y + Math.cos(M.yaw) * PIVOT);
    S.yaw.x = S.yaw.t = M.yaw; S.yaw.v = 0;
    endPhoto(); photoLastId = null;
  }
  const isDrac = (PHOTO.on && !PHOTO.pair ? PHOTO.id : selectedFigure.id) === 'drac-valls';
  mula.root.visible = !isDrac; drac.root.visible = isDrac;
  if (isDrac) { PAIR.k = 0; animPlayableDrac(dt, beat, live); return; }
  animPair(dt, beat);
  const breath = Math.sin(clock * 2.2) * (1 - live); // standing still, only breathing
  const col = G.collapseT ? smooth(Math.min(1, (clock - G.collapseT) / 0.6)) : 0;
  const dancing = G.state === 'play';
  if (M.dancing && !dancing) { // back to the free demo from wherever she faces and stands
    S.yaw.x = S.yaw.t = M.yaw; S.yaw.v = 0;
    M.pivot.set(M.pos.x + Math.sin(M.yaw) * PIVOT, M.pos.y + Math.cos(M.yaw) * PIVOT);
  }
  M.dancing = dancing;
  const playful = G.state !== 'play' || G.sec === 'B';
  const miss = pulse(M.missT, 0.7);
  if (dancing) { // the song's choreography (the practice's own front-on sway); a collapse freezes it where she fell
    if (!G.collapseT) M.danceBeat = beat;
    (G.practice ? practicePose : dancePose)(POSE, M.danceBeat);
    // Missing note after note calms her body (heading and turns stay): she eases down slowly, and springs back
    // quickly on the first hit.
    const target = 1 - 0.92 * Math.min(1, G.streak / 2);
    M.vigor += (target - M.vigor) * easeIn(dt, target < M.vigor ? 0.8 : 0.25);
    for (const k of ['roll', 'pitch', 'lift', 'x', 'z', 'shake', 'drive']) POSE[k] *= M.vigor;
  } else if (!manualMula && !col && live) { // the demo walks: solemn = slowly round the plaça, playful = trotting about
    const fx = Math.sin(M.yaw), fz = Math.cos(M.yaw);
    const hx = PAIR.k ? PAIR.hx : 0, hz = PAIR.k ? PAIR.hz : 0; // the middle; on the splash, her half of the shot (the Drac has the other)
    const r = Math.hypot(M.pivot.x - hx, M.pivot.y - hz);
    if (r > (playful ? 2.2 : 2.6)) { // steer back towards the middle
      const toC = Math.atan2(hx - M.pivot.x, hz - M.pivot.y);
      S.yaw.t += Math.atan2(Math.sin(toC - M.yaw), Math.cos(toC - M.yaw)) * dt * 0.8;
    } else if (!playful) { // follow the circle
      const ang = Math.atan2(M.pivot.y, M.pivot.x), tang = Math.atan2(-Math.sin(ang), Math.cos(ang));
      S.yaw.t += Math.atan2(Math.sin(tang - M.yaw), Math.cos(tang - M.yaw)) * dt * 0.3;
    }
    let slow = 1;
    if (PAIR.k > 0) { // the Drac dances on the splash: heading its way, she slows to a halt short of it (her beat turns lead her off)
      const ax = M.pivot.x - PAIR.x, az = M.pivot.y - PAIR.z, d = Math.hypot(ax, az);
      if (ax * fx + az * fz < 0) slow = Math.max(0, Math.min(1, (d - PAIR.clear - 0.3) / (PAIR.avoid - PAIR.clear - 0.3)));
    }
    const speed = (playful ? 0.8 : 0.35) * live * slow;
    M.pivot.x += fx * speed * dt; M.pivot.y += fz * speed * dt;
  }
  if (dancing) S.yaw.t = 0; // during play the yaw spring is only an accent offset, and it settles back to the dance
  stepSprings(dt);
  if (dancing) for (const k in CAP) if (S[k]) capSpring(S[k], CAP[k]);
  const prevYaw = M.yaw;
  M.yaw = dancing ? FRONT + POSE.yaw + S.yaw.x : S.yaw.x;
  M.yawVel = dt > 0 ? (M.yaw - prevYaw) / dt : 0;
  if (dancing) { // she turns about her centre, which travels a little round its spot, in her own frame
    const cy = Math.cos(FRONT + POSE.yaw), sy = Math.sin(FRONT + POSE.yaw);
    M.pos.set(HOME.x + POSE.x * cy + POSE.z * sy, HOME.y - POSE.x * sy + POSE.z * cy);
    M.pivot.copy(M.pos);
  } else { // the demo's body centre hangs behind its front pivot: turning swings the rear round it
    M.pos.set(M.pivot.x - Math.sin(M.yaw) * PIVOT, M.pivot.y - Math.cos(M.yaw) * PIVOT);
    if (PAIR.k > 0 && !manualMula) keepClear();
  }
  // jumps: a tiny bit of ballistic flight, with a squash and some camera shake on landing
  M.airV -= 14 * dt; M.air = Math.max(0, M.air + M.airV * dt);
  if (dancing && M.air > CAP.air) { M.air = CAP.air; M.airV = Math.min(0, M.airV); }
  if (M.air === 0 && M.airV < -2) { S.squash.v -= 4; trauma = Math.min(1, trauma + 0.35); S.pitch.v += 1; }
  if (M.air === 0) M.airV = 0;
  // groove on every beat of the music, even without pressing anything; in play the base pose owns the body's sway,
  // lift and pitch (a miss weakens it for a moment), the groove only the head, ears and legs
  const photoGaitTarget = manualMula ? (CALM.matches ? 0 : Math.min(1, Math.hypot(PHOTO.mula.vx, PHOTO.mula.vz))) : 1;
  photoGait += (photoGaitTarget - photoGait) * (1 - Math.exp(-dt / 0.18));
  if (!dancing) live *= photoGait;
  const bp = beat * Math.PI, amp = (dancing ? POSE.drive : playful ? 1 : 0.6) * live, base = dancing ? (1 - col) * (1 - 0.5 * miss) : 0;
  const bounce = dancing ? POSE.lift * base : Math.abs(Math.sin(bp)) * 0.1 * amp;
  const sway = dancing ? POSE.roll * base : Math.sin(bp) * 0.07 * amp;
  const buzz = dancing ? POSE.shake * base : 0; // the landing of each jump shakes the whole figure
  poseMulaBody(mula, M.pos.x, col ? -0.42 * col : bounce + M.air, M.pos.y, M.yaw,
    col * 0.25 + S.roll.x + sway + buzz + Math.sin(clock * 35) * 0.06 * miss,
    S.pitch.x + (dancing ? POSE.pitch * base + buzz * 0.6 : Math.sin(bp * 2) * 0.02 * amp));
  if (dancing) trauma = Math.max(trauma, Math.min(0.5, Math.abs(buzz) * 14));
  const sq = 1 + S.squash.x * 0.08 + breath * 0.012 - 0.03 * miss;
  mula.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  mula.neck.rotation.x = 0.15 + breath * 0.03 + col * 1.2 + S.neck.x + Math.sin(bp * 2) * 0.08 * amp;
  mula.neck.rotation.y = Math.sin(clock * 28) * 0.3 * miss + S.neckYaw.x + Math.sin(bp) * 0.12 * amp;
  mula.head.rotation.x = 0.2 + S.neck.x * 0.4 + Math.sin(bp * 2 + 1) * 0.08 * amp;
  mula.jaw.rotation.x = 0.55 * pulse(M.biteT, 0.3) + col * 0.6 + Math.max(0, Math.sin(bp * 2)) * 0.12 * amp;
  mula.ears.forEach((ear, i) => (ear.rotation.x = -0.25 + Math.sin(bp * 2 + i) * 0.2 * live + (miss + col) * 0.9 - S.neck.v * 0.03));
  // the tail trails its targets like hair (no frame-to-frame snaps); positive x swings it out behind, never into the body
  const ease = 1 - Math.exp(-dt * 7), tail = mula.tail.rotation, clampT = (v, m) => Math.max(-m, Math.min(m, v));
  tail.z += (clampT(S.tail.x * 0.25 + Math.sin(clock * 7) * 0.15 - M.yawVel * 0.25, 1.2) - tail.z) * ease;
  tail.x += (0.12 + Math.min(1.1, Math.abs(M.yawVel) * 0.35 + Math.max(0, S.pitch.x) * 2) - tail.x) * ease;
  mula.peek.scale.setScalar(Math.max(0.001, hold(M.peekT, 1.6)));
  // relax the springs back to rest (yaw keeps wherever she turned to)
  for (const k of ['roll', 'pitch', 'neck', 'neckYaw', 'squash', 'tail']) S[k].t = 0;
  holdGesture();
  const stepping = playful || Math.abs(M.yawVel) > 0.5 || (dancing && POSE.drive > 0.8);
  mula.legs.forEach((l, i) => {
    l.visible = col < 0.5;
    const ph = (i % 2) * Math.PI + ((i >> 2) & 1) * Math.PI / 2;
    const rear = i >= 4, extra = rear ? Math.min(0.15, Math.abs(M.yawVel) * 0.06) : 0; // the rear legs run round the compass
    l.position.y = Math.max(0, Math.sin(bp * (stepping ? 2 : 1) + ph)) * ((stepping ? 0.16 : 0.06) + extra) * live;
    if (dancing) l.position.y += Math.max(0, bounce + M.air - l.position.z * Math.sin(mula.body.rotation.x)) - bounce - M.air; // the rear legs stay planted, the front ones follow the raised front
  });
}
// MANTÉN held right: a restrained sustained gesture (a lean to the note's side, head up) that the springs release
// smoothly when the hold ends or is let go.
function holdGesture() {
  const h = G.hold;
  if (G.state !== 'play' || !h || G.collapseT || !(h.auto || isDown(h.n.input))) return;
  const s = h.n.input === 'L' ? 1 : -1, cy = Math.cos(M.yaw - CAM_AZ), sy = Math.sin(M.yaw - CAM_AZ);
  S.roll.t = s * 0.06 * cy; S.pitch.t = -s * 0.06 * sy - 0.03; S.neck.t = -0.15;
}

// The splash: the Drac wanders and dances beside her (drac-demo.js), round a spot across the shot from the camera; each
// slows down short of the other, and a last push keeps her head, centre and rear out of its footprint.
// The selector shows only its selected figure, from the first frame.
export const PAIR = { k: 0, x: Math.cos(CAM_AZ) * 2.6 - Math.sin(CAM_AZ) * 2.2, z: -Math.sin(CAM_AZ) * 2.6 - Math.cos(CAM_AZ) * 2.2, clear: 2.5, avoid: 4.2 };
PAIR.w = newWalker(PAIR.x, PAIR.z, FRONT, 1.3);
PAIR.hx = -Math.cos(CAM_AZ) * 1.6; PAIR.hz = Math.sin(CAM_AZ) * 1.6; // her own wandering middle: to the shot's left
const SOLO = newWalker(); // the Drac picked on the selector
let soloOn = false;
function placeLife(x, z, yaw) { // the rig's parent: where it walks and which way it faces (0, 0, 0 in the song)
  const life = drac.root.parent;
  life.position.set(x, 0, z); life.rotation.set(0, yaw, 0); // quaternion restores may leave x/z rotated
  life.scale.setScalar(DRAC_SCALE);
}
function keepClear() {
  const sx = Math.sin(M.yaw), cz = Math.cos(M.yaw);
  for (const back of [0, PIVOT, 2 * PIVOT]) { // her head, centre and rear
    const px = M.pivot.x - sx * back - PAIR.x, pz = M.pivot.y - cz * back - PAIR.z, d = Math.hypot(px, pz) || 1;
    if (d < PAIR.clear) { const k = (PAIR.clear - d) / d; M.pivot.x += px * k; M.pivot.y += pz * k; }
  }
  M.pos.set(M.pivot.x - sx * PIVOT, M.pivot.y - cz * PIVOT);
}
function animPair(dt, beat) {
  PAIR.k = G.state === 'splash' ? 1 : 0;
  drac.root.visible = PAIR.k > 0;
  if (!PAIR.k) return;
  const w = PAIR.w;
  if (PHOTO.on && PHOTO.pair && (PHOTO.id === 'drac-valls' || PHOTO.yielding)) manualDracStep(w, DRAC_POSE, dt, beat, PHOTO.drac, DRAC_SCALE, CALM.matches);
  else { if (w.manual > 0) resumeWalker(w, beat); demoStep(w, DRAC_POSE, dt, beat, M.pos, DRAC_SCALE); PAIR.x = w.x; PAIR.z = w.z; }
  placeLife(w.x, w.z, w.face);
  poseDrac(drac, DRAC_POSE, 0, w.feetAt);
}

function animPlayableDrac(dt, beat, live) {
  if (G.state === 'select' || G.state === 'title') { // picked on the selector: it wanders and shows off, from where it stands
    if (!soloOn) { resetWalker(SOLO, M.pos.x, M.pos.y, M.yaw); SOLO.hx = SOLO.hz = 0; soloOn = true; }
    if (PHOTO.on) manualDracStep(SOLO, DRAC_POSE, dt, beat, PHOTO.drac, DRAC_SCALE, CALM.matches);
    else demoStep(SOLO, DRAC_POSE, dt, beat, null, DRAC_SCALE);
    placeLife(SOLO.x, SOLO.z, SOLO.face);
    poseDrac(drac, DRAC_POSE, 0, SOLO.feetAt);
    const prev = M.yaw;
    M.yaw = SOLO.face; M.yawVel = dt > 0 ? turn(M.yaw, prev) / dt : 0;
    M.pos.set(SOLO.x, SOLO.z); M.pivot.copy(M.pos); M.dancing = false;
    return;
  }
  soloOn = false; placeLife(0, 0, 0);
  const dancing = G.state === 'play';
  if (!G.collapseT && !(dancing && G.paused)) M.danceBeat = beat;
  (dancing && !G.practice ? dracPose : dracPractice)(DRAC_POSE, M.danceBeat);
  // Reuse the bounded tap/hold/stumble springs; shoes remain planted by the Drac's own feet solver.
  for (const k in S) S[k].t = 0;
  holdGesture();
  stepSprings(Math.min(dt, 0.04));
  for (const k in CAP) if (S[k]) capSpring(S[k], CAP[k]);
  const col = G.collapseT ? smooth(Math.min(1, (clock - G.collapseT) / 0.6)) : 0;
  const target = dancing ? 1 - 0.92 * Math.min(1, (G.streak || 0) / 2) : live;
  M.vigor += (target - M.vigor) * easeIn(dt, 0.5);
  DRAC_POSE.roll = DRAC_POSE.roll * M.vigor + S.roll.x + col * 0.6;
  DRAC_POSE.pitch = DRAC_POSE.pitch * M.vigor + S.pitch.x + col * 0.5;
  M.airV -= 14 * dt; M.air = Math.min(CAP.air, Math.max(0, M.air + M.airV * dt));
  if (M.air === 0 || M.air === CAP.air) M.airV = 0;
  DRAC_POSE.lift += M.air * (1 - col); // lift the body, while the Drac's shoe solver stays grounded
  DRAC_POSE.drive *= M.vigor * (1 - col);
  DRAC_POSE.crouch = Math.max(DRAC_POSE.crouch, col * 0.8);
  DRAC_POSE.fire *= (1 - col) * live;
  poseDrac(drac, DRAC_POSE, FRONT);
  const prev = M.yaw;
  M.yaw = FRONT + DRAC_POSE.yaw;
  M.yawVel = dt > 0 ? (M.yaw - prev) / dt : 0;
  M.pos.set(DRAC_POSE.x * DRAC_SCALE, DRAC_POSE.z * DRAC_SCALE); M.pivot.copy(M.pos); // the world's metres
  M.dancing = dancing;
}
