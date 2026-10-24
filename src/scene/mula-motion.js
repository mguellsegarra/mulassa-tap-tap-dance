// The mulassa's motion: damped-spring accents on top of the base choreography (game/mula-dance.js, placed by
// mula-stage.js), heading, stumbles and holds; off the song, the demo walk and photo mode. Her carriers' shoes are
// mula-stage.js's (the song's plan, or stepped live under wherever she goes).
import { PHOTO, PHOTO_RUN, photoBody, setPhotoControl } from '../game/photo-control.js';
import { tickPhoto, endPhoto } from './photo-motion.js';
import { CALM } from '../core/env.js';
import * as THREE from 'three';
import { poseMulaBody } from './mula-pose-rig.js';
import { newMulaPose, mulaComic, MULA_COMIC } from '../game/mula-dance.js';
import { MULA_CHEERS, cheerAt } from '../game/mula-figures.js';
import { CAM_AZ, FRONT, mula, drac, bou, mulaCarriers } from './stage.js';
import { selectedFigure, songTimeAtBeat } from '../game/figure-song.js';
import { danceMula, stepMulaFeet, resetMulaFeet, mulaCollaTick } from './mula-stage.js';
import { newDracPose } from '../game/dance-drac.js';
import { poseDrac } from './drac-motion.js';
import { dressCarrier } from './drac-rig.js';
import { danceDrac, dracColla } from './drac-dance.js';
import { danceBou, driveBou, bouCollaTick } from './bou-stage.js';
import { DRAC_SCALE } from './models/drac.js';
import { newWalker, resetWalker, demoStep, turn, manualDracStep, resumeWalker } from './drac-demo.js';
import { G, clock, isDown, chip } from '../game/state.js';
import { REEL } from '../game/showreel.js';
import { FIGURE_WEIGHT } from '../game/figures.js';
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
export const M = { pivot: new THREE.Vector2(0, PIVOT), pos: new THREE.Vector2(0, 0), yaw: 0, yawVel: 0, missT: -9, biteT: -9, peekT: -9, cheerT: -9, air: 0, airV: 0, dancing: false, danceBeat: 0, danceT: 0, vigor: 1 };
const MULA_OFF_COMIC = { lift: 0, roll: 0, pitch: 0 }; // the comic layer off the song (mula-dance.js)
let photoGait = 1, photoLastId = null, photoStride = 0, photoGround = 1, photoRear = 0, photoKick = 0;
// Q held: she rears up like a horse (front up, on her rear legs); E held: a kick (rear up, on her front legs). rad.
export const PHOTO_REAR = { front: 0.5, rear: 0.45, legZ: 1.05, ease: 0.15 };
let animatedFigureId = selectedFigure.id;
const DRAC_POSE = newDracPose(), DRAC_ACC = { roll: 0, pitch: 0, lift: 0, col: 0, vigor: 1 };
const POSE = newMulaPose(); // the base choreography's pose this frame (game/mula-dance.js, its dance frame), reused
const SHELL = { x: 0, z: 0, yaw: 0, roll: 0, pitch: 0 }; // her body this frame, for the live steps (mula-stage.js)
// Reactive limits on top of the base pose (rad, m): accents and stumbles never pile up, whatever the tapping rate.
const CAP = { yaw: 0.35, roll: 0.3, pitch: 0.3, neck: 0.6, neckYaw: 0.6, air: 0.18 };
function capSpring(sp, m) {
  if (sp.x > m) { sp.x = m; sp.v = Math.min(0, sp.v); } else if (sp.x < -m) { sp.x = -m; sp.v = Math.max(0, sp.v); }
}
export let trauma = 0; // camera shake
export const setTrauma = v => (trauma = v);
// Manual flight uses exact ballistic integration: the same contact time/speed at 30, 60 and 120 Hz.
// Return an impact only on the crossing, never on subsequent grounded frames or a paused frame.
function stepManualJump(body, dt) {
  if (!(dt > 0) || !(body.air > 0 || body.airV > 0)) return 0;
  const y = body.air, v = body.airV;
  body.air = Math.max(0, y + v * dt - 7 * dt * dt);
  body.airV = v - 14 * dt;
  if (body.air > 0) return 0;
  body.airV = 0;
  return Math.sqrt(v * v + 28 * y);
}
// A manual landing owns its actor and the exact input session that launched it.
// Separate from gameplay trauma: companions and demo accents cannot reach this channel.
let manualFlight = null, manualLanding = null;
const manualContext = token => token?.origin === 'manual-jump' && PHOTO.on && !G.paused && !CALM.matches
  && ['splash', 'select', 'title'].includes(G.state) && token.actor === PHOTO.id
  && token.epoch === PHOTO.epoch && token.inputEpoch === PHOTO.inputEpoch;
function beginManualFlight(actor) {
  manualFlight = { origin: 'manual-jump', actor, epoch: PHOTO.epoch, inputEpoch: PHOTO.inputEpoch };
}
function manualContact(actor, speed) {
  if (manualFlight?.actor === actor) {
    if (manualContext(manualFlight)) {
      manualLanding = { ...manualFlight, time: clock, startedAt: performance.now() };
      chip?.sfx('thud', speed, true, FIGURE_WEIGHT[actor]); // the «BUUUM» on the ground, once per flight; an explicit action, so it sounds with the menu music off too
    }
    manualFlight = null;
  }
}
export function manualLandingStrength() {
  if (!manualContext(manualLanding)) { manualLanding = null; return 0; }
  const age = Math.max(clock - manualLanding.time, (performance.now() - manualLanding.startedAt) / 1000);
  const initial = manualLanding.actor === 'mulassa-valls' ? 0.98 : 0.9;
  const strength = Math.max(0, initial - age * 1.6);
  if (age < 0 || strength === 0) { manualLanding = null; return 0; }
  return strength;
}
function landingImpact(strength) {
  if (!CALM.matches) trauma = Math.max(trauma, strength); // replace, never stack repeated landings
}
export function resetMotionImpact() {
  trauma = 0; manualFlight = manualLanding = null;
  M.air = M.airV = 0; PHOTO.air = false;
  DRAC_JUMP.air = DRAC_JUMP.airV = 0;
}
let impactState, impactFigure, impactEpoch;
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
  if (!manualContext(manualFlight)) manualFlight = null;
  if (!manualContext(manualLanding)) manualLanding = null;
  if (impactState !== G.state || impactFigure !== selectedFigure.id || impactEpoch !== PHOTO.epoch) {
    resetMotionImpact();
    impactState = G.state; impactFigure = selectedFigure.id; impactEpoch = PHOTO.epoch;
  }
  if (animatedFigureId !== selectedFigure.id) {
    animatedFigureId = selectedFigure.id;
    standUp(); M.dancing = false; M.yaw = FRONT; M.yawVel = 0;
    M.pos.set(0, 0); M.pivot.set(0, PIVOT); resetMulaFeet();
    Object.assign(S.yaw, { x: FRONT, v: 0, t: FRONT });
  }
  if (G.state !== 'splash' && G.state !== 'select' && G.state !== 'title' && PHOTO.ready) {
    setPhotoControl(false); endPhoto(); photoLastId = null;
  }
  const pair = G.state === 'splash' || PHOTO.pair && (G.state === 'select' || G.state === 'title');
  // M owns the Mulassa in a pair, but the selected figure in the solo menu. Hand the existing Drac walker over.
  if (pair !== Boolean(PAIR.k) && selectedFigure.id === 'drac-valls' && G.state !== 'play' && G.state !== 'results') {
    if (pair) {
      resetWalker(PAIR.w, M.pos.x, M.pos.y, M.yaw);
      PAIR.x = M.pos.x; PAIR.z = M.pos.y;
      M.pos.set(PAIR.hx, PAIR.hz); M.yaw = FRONT;
      M.pivot.set(M.pos.x + Math.sin(M.yaw) * PIVOT, M.pos.y + Math.cos(M.yaw) * PIVOT);
      keepClear(); resetMulaFeet();
    } else {
      M.pos.set(PAIR.x, PAIR.z); M.yaw = PAIR.w.face; M.pivot.copy(M.pos);
      resetWalker(SOLO, M.pos.x, M.pos.y, M.yaw); SOLO.hx = SOLO.hz = 0; soloOn = true;
      PHOTO.ready = false; photoLastId = null;
    }
    S.yaw.x = S.yaw.t = M.yaw; S.yaw.v = 0;
  }
  if (pair && !PAIR.k) keepClear();
  let manualMula = PHOTO.on && PHOTO.id === 'mulassa-valls';
  if (PHOTO.on) {
    if (PHOTO.pair && photoLastId === 'drac-valls' && PHOTO.id !== photoLastId) resumeWalker(PAIR.w, beat);
    photoLastId = PHOTO.id;
    tickPhoto(dt, M, PAIR, PIVOT);
    manualMula ||= PHOTO.pair && PHOTO.yielding && PHOTO.id === 'drac-valls';
    if (manualMula) { S.yaw.x = S.yaw.t = M.yaw; S.yaw.v = 0; }
    if (manualMula && PHOTO.action && PHOTO.id === 'mulassa-valls') { // (a yielding Mulassa never takes the Drac's jump)
      if (M.air === 0 && dt > 0) { M.airV = CALM.matches ? 1.4 : 4.8; beginManualFlight('mulassa-valls'); }
      PHOTO.action = false;
    }
  } else if (PHOTO.ready) {
    if (PAIR.k && photoLastId === 'drac-valls') {
      PAIR.w.x = PHOTO.drac.x; PAIR.w.z = PHOTO.drac.z; PAIR.w.face = PHOTO.drac.yaw;
      resumeWalker(PAIR.w, beat);
    } else if (!PAIR.k) {
      const p = photoBody(); M.pos.set(p.x, p.z); M.yaw = p.yaw;
      resetWalker(SOLO, p.x, p.z, p.yaw); SOLO.hx = SOLO.hz = 0; resumeWalker(SOLO, beat); soloOn = true;
    }
    M.pivot.set(M.pos.x + Math.sin(M.yaw) * PIVOT, M.pos.y + Math.cos(M.yaw) * PIVOT);
    S.yaw.x = S.yaw.t = M.yaw; S.yaw.v = 0;
    endPhoto(); photoLastId = null;
  }
  const solo = PHOTO.on && !PHOTO.pair ? PHOTO.id : selectedFigure.id; // (free play with the Bou drives it alone: no pair)
  const isBou = !pair && solo === 'bou-tradicional-valls', isDrac = !pair && solo === 'drac-valls';
  const reel = REEL.on && G.state === 'select' && !PHOTO.on && !pair, danceNow = reel ? REEL.beat : beat; // the selector's showreel: the song dance on the menu loop's beat (game/showreel.js)
  mula.root.visible = !isDrac && !isBou; drac.root.visible = isDrac; if (bou) bou.frame.visible = isBou;
  dracColla(isDrac, beat, dt); bouCollaTick(isBou, beat, dt);
  // the plaça answers her culades, charges and final hit (cheerT: the crowd's cue, crowd.js) and every big hit (biteT)
  const cheering = !isDrac && !isBou && (G.state === 'play' && !G.practice && !G.collapseT || reel);
  if (cheering && danceNow - M.danceBeat < 1) for (const c of MULA_CHEERS) if (M.danceBeat < c && c <= danceNow) M.cheerT = clock;
  mulaCollaTick(!isDrac && !isBou && !pair, beat, dt, M.danceBeat, Math.max(cheering ? cheerAt(danceNow) : 0, pulse(M.biteT, 0.8))); // (the splash has both figures: no colla)
  if (isDrac) { PAIR.k = 0; animPlayableDrac(dt, beat, live, reel); return; }
  if (isBou) { PAIR.k = 0; animPlayableBou(dt, beat, reel); return; }
  animPair(dt, beat, pair);
  const breath = Math.sin(clock * 2.2) * (1 - live); // standing still, only breathing
  const col = G.collapseT && !reel ? smooth(Math.min(1, (clock - G.collapseT) / 0.6)) : 0; // (a run's collapse is still in G on the selector)
  const dancing = G.state === 'play' || reel;
  if (M.dancing && !dancing) { // back to the free demo from wherever she faces and stands
    S.yaw.x = S.yaw.t = M.yaw; S.yaw.v = 0;
    M.pivot.set(M.pos.x + Math.sin(M.yaw) * PIVOT, M.pos.y + Math.cos(M.yaw) * PIVOT);
  }
  M.dancing = dancing;
  const playful = G.state !== 'play' || G.sec === 'B';
  const miss = pulse(M.missT, 0.7);
  let danceYaw = 0;
  if (dancing) { // the song's choreography (the practice holds its opening stance); a collapse freezes it where she fell
    if (reel || !G.collapseT) M.danceBeat = danceNow;
    M.danceT = songTimeAtBeat(M.danceBeat);
    danceYaw = danceMula(POSE, M.danceT, M.danceBeat, !!G.practice, M.pos);
    // Missing note after note calms her body (her path, heading and turns stay: the shoes are planned on them): she
    // eases down slowly, and springs back quickly on the first hit.
    const target = reel ? 1 : 1 - 0.92 * Math.min(1, G.streak / 2);
    M.vigor += (target - M.vigor) * easeIn(dt, target < M.vigor ? 0.8 : 0.25);
    for (const k of ['roll', 'pitch', 'lift', 'waddle', 'headRoll', 'headYaw', 'drive']) POSE[k] *= M.vigor;
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
    M.pos.x += fx * speed * dt; M.pos.y += fz * speed * dt;
  }
  if (dancing) S.yaw.t = 0; // during play the yaw spring is only an accent offset, and it settles back to the dance
  stepSprings(dt);
  if (dancing) for (const k in CAP) if (S[k]) capSpring(S[k], CAP[k]);
  const prevYaw = M.yaw;
  M.yaw = dancing ? danceYaw + S.yaw.x : S.yaw.x;
  M.yawVel = dt > 0 ? (M.yaw - prevYaw) / dt : 0;
  if (dancing) M.pivot.copy(M.pos); // she turns about her centre, which travels the reference's path (danceMula above)
  else { // the demo turns about her centre too (about the front pivot her rear swung at ~8 m/s: no carrier can step that)
    M.pivot.set(M.pos.x + Math.sin(M.yaw) * PIVOT, M.pos.y + Math.cos(M.yaw) * PIVOT);
    if (PAIR.k > 0 && !manualMula) keepClear();
  }
  // jumps: a tiny bit of ballistic flight, with a squash and some camera shake on landing
  let contact, hit = 0;
  if (manualMula) contact = (hit = stepManualJump(M, dt)) > 2;
  else {
    M.airV -= 14 * dt; M.air = Math.max(0, M.air + M.airV * dt);
    if (dancing && M.air > CAP.air) { M.air = CAP.air; M.airV = Math.min(0, M.airV); }
    contact = M.air === 0 && M.airV < -2;
  }
  if (contact) {
    S.squash.v -= 4; S.pitch.v += 1;
    if (manualMula) manualContact('mulassa-valls', hit);
    else if (dancing) landingImpact(0.35);
  }
  if (M.air === 0) M.airV = 0;
  if (manualMula && PHOTO.id === 'mulassa-valls') PHOTO.air = M.air > 0; // airborne: she keeps her momentum (movePhoto)
  // groove on every beat of the music, even without pressing anything; in play the base pose owns the body's sway,
  // lift and pitch (a miss weakens it for a moment), the groove only the head, ears and legs
  const photoGaitTarget = manualMula ? (CALM.matches ? 0 : Math.min(1, Math.hypot(PHOTO.mula.vx, PHOTO.mula.vz))) : 1;
  if (dt > 0) photoGait += (photoGaitTarget - photoGait) * (1 - Math.exp(-dt / 0.18));
  // driven at speed she gallops: legs on her own stride (not the beat), a hop and a rocking-horse pitch, flapping ears
  if (dt > 0) photoGround += ((M.air > 0 ? 0 : 1) - photoGround) * (1 - Math.exp(-dt / 0.06)); // in the air the gallop stops (its hops on the flight were a judder)
  if (!dancing) live *= photoGait * (manualMula ? photoGround : 1); // fade the music groove and stepping out too
  const photoRun = manualMula && !CALM.matches ? Math.min(1, Math.hypot(PHOTO.mula.vx, PHOTO.mula.vz) / PHOTO_RUN.run) * photoGround : 0;
  if (!manualMula || M.air === 0) photoStride = (photoStride + dt * 2 * Math.PI * (1.4 + photoRun * 3.2)) % (2 * Math.PI);
  const gallop = Math.sin(photoStride), hop = Math.abs(gallop) * 0.14 * photoRun; // (a bound the carriers' cuffs can follow: their shoes stay on their steps)
  const driving = manualMula && PHOTO.id === 'mulassa-valls', reduce = CALM.matches ? 0.4 : 1, poseE = dt > 0 ? 1 - Math.exp(-dt / PHOTO_REAR.ease) : 0; // (a NaN dt would stick for good)
  photoRear += ((driving && PHOTO.keys.has('KeyQ') ? reduce : 0) - photoRear) * poseE;
  photoKick += ((driving && PHOTO.keys.has('KeyE') ? reduce : 0) - photoKick) * poseE;
  const rearPitch = -PHOTO_REAR.front * photoRear + PHOTO_REAR.rear * photoKick; // + = rear up (the model faces +z)
  const rearLift = PHOTO_REAR.legZ * Math.abs(Math.sin(rearPitch)); // pivot on the legs that stay down
  const bp = beat * Math.PI, amp = (dancing ? POSE.drive : playful ? 1 : 0.6) * live, base = dancing ? (1 - col) * (1 - 0.5 * miss) : 0;
  // Manual travel already has its stride hop/pitch. Replace the music groove, rather than stacking two rhythms.
  // Off the song the comic layer on the music's beat (the splash's and results' walk: amp; free play: standing only, the
  // stride owns her body while she walks); the song dance carries its own
  mulaComic(MULA_OFF_COMIC, beat, MULA_COMIC);
  const manualK = manualMula ? photoGround * (1 - Math.max(photoRear, photoKick)) * (CALM.matches ? 0.2 : 1) : 0, still = manualK * (1 - photoGait);
  const bounce = dancing ? POSE.lift * base : manualMula ? MULA_OFF_COMIC.lift * still : MULA_OFF_COMIC.lift * amp;
  const manualSway = MULA_OFF_COMIC.roll * still + Math.sin(photoStride) * (0.025 + 0.01 * photoRun) * photoGait * manualK;
  // Weight sinks onto the planted supports on each stride; the existing cuffs follow the hem without stretching.
  const kneeStride = 1 - gallop * gallop;
  const manualDip = 0.025 * kneeStride * kneeStride * photoGait * (1 - photoRun * 0.5) * manualK;
  const sway = dancing ? (POSE.roll + POSE.waddle) * base : manualMula ? manualSway : MULA_OFF_COMIC.roll * amp;
  const buzz = dancing ? POSE.shake * base : 0; // the landing of each jump shakes the whole figure
  poseMulaBody(mula, M.pos.x, col ? -0.42 * col : bounce + M.air + hop + rearLift - manualDip, M.pos.y, M.yaw,
    col * 0.25 + S.roll.x + sway + buzz + Math.sin(clock * 35) * 0.06 * miss,
    S.pitch.x + rearPitch + gallop * 0.08 * photoRun + (dancing ? POSE.pitch * base + buzz * 0.6 : MULA_OFF_COMIC.pitch * (manualMula ? still : amp)));
  if (dancing) trauma = Math.max(trauma, Math.min(0.5, Math.abs(buzz) * 14));
  const sq = 1 + S.squash.x * 0.08 + breath * 0.012 - 0.03 * miss;
  mula.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  mula.neck.rotation.x = 0.15 - 0.35 * photoRear + 0.2 * photoKick + breath * 0.03 + col * 1.2 + S.neck.x + Math.sin(bp * 2) * 0.08 * amp;
  mula.neck.rotation.y = Math.sin(clock * 28) * 0.3 * miss + S.neckYaw.x + Math.sin(bp) * 0.12 * amp + (dancing ? POSE.headYaw * base : 0);
  mula.head.rotation.x = 0.2 + S.neck.x * 0.4 + Math.sin(bp * 2 + 1) * 0.08 * amp;
  mula.head.rotation.z = dancing ? POSE.headRoll * base : 0; // the approved small head accent on the body's sway
  mula.jaw.rotation.x = 0.55 * pulse(M.biteT, 0.3) + col * 0.6 + Math.max(0, Math.sin(bp * 2)) * 0.04 * amp;
  mula.ears.forEach((ear, i) => (ear.rotation.x = -0.25 + Math.sin(bp * 2 + i) * 0.2 * live + (miss + col) * 0.9 - S.neck.v * 0.03 + Math.abs(Math.sin(photoStride + i)) * 0.7 * photoRun));
  // the tail trails its targets like hair (no frame-to-frame snaps); positive x swings it out behind, never into the body
  const ease = 1 - Math.exp(-dt * 7), tail = mula.tail.rotation, clampT = (v, m) => Math.max(-m, Math.min(m, v));
  tail.z += (clampT(S.tail.x * 0.25 + Math.sin(clock * 7) * 0.15 - M.yawVel * 0.25, 1.2) - tail.z) * ease;
  tail.x += (0.12 + Math.min(1.1, Math.abs(M.yawVel) * 0.35 + Math.max(0, S.pitch.x) * 2) - tail.x) * ease;
  mula.peek.scale.setScalar(Math.max(0.001, hold(M.peekT, 1.6)));
  // relax the springs back to rest (yaw keeps wherever she turned to)
  for (const k of ['roll', 'pitch', 'neck', 'neckYaw', 'squash', 'tail']) S[k].t = 0;
  holdGesture();
  // her carriers: the song's planned shoes while it plays (the hits' lift only stretches the cuffs), stepped live under
  // her otherwise; off the song a jump or the gallop's hop takes the carriers up with her, Q / E keeps one end's shoes down
  mulaCarriers.group.visible = col < 0.5;
  SHELL.x = M.pos.x; SHELL.z = M.pos.y; SHELL.yaw = M.yaw; SHELL.roll = mula.body.rotation.z; SHELL.pitch = mula.body.rotation.x;
  stepMulaFeet(dt, dancing && !G.practice ? M.danceT : null, SHELL, CALM.matches ? 0.4 : 1, dancing ? 0 : M.air, rearLift, rearPitch);
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
// The selector shows its selected figure with HUD on, and this same pair in photo mode.
export const PAIR = { k: 0, x: Math.cos(CAM_AZ) * 2.6 - Math.sin(CAM_AZ) * 2.2, z: -Math.sin(CAM_AZ) * 2.6 - Math.cos(CAM_AZ) * 2.2, clear: 2.5, avoid: 4.2 };
PAIR.w = newWalker(PAIR.x, PAIR.z, FRONT, 1.3);
PAIR.hx = -Math.cos(CAM_AZ) * 1.6; PAIR.hz = Math.sin(CAM_AZ) * 1.6; // her own wandering middle: to the shot's left
const SOLO = newWalker(); // the Drac picked on the selector
let soloOn = false;
function placeLife(x, z, yaw, y = 0) { // the rig's parent: where it walks and which way it faces (0, 0, 0 in the song)
  const life = drac.root.parent;
  life.position.set(x, y, z); life.rotation.set(0, yaw, 0); // quaternion restores may leave x/z rotated
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
// Space while driving the Drac: the whole rig (shoes too) jumps, with fire and its manual landing impact.
const DRAC_JUMP = { air: 0, airV: 0 };
function dracJump(dt) {
  if (PHOTO.action && dt > 0) { if (DRAC_JUMP.air === 0) { DRAC_JUMP.airV = CALM.matches ? 1.4 : 4.8; beginManualFlight('drac-valls'); PHOTO.drac.fire = 1.4; } PHOTO.action = false; } // a flamarada as it takes off
  const hit = stepManualJump(DRAC_JUMP, dt);
  if (hit > 2) manualContact('drac-valls', hit);
  PHOTO.air = DRAC_JUMP.air > 0;
  return DRAC_JUMP.air;
}
function animPair(dt, beat, pair) {
  PAIR.k = pair ? 1 : 0;
  drac.root.visible = PAIR.k > 0;
  if (!PAIR.k) return;
  const w = PAIR.w;
  PHOTO.drac.roar = PHOTO.on && PHOTO.id === 'drac-valls' && PHOTO.keys.has('KeyQ'); // Q: heads up, jaws open, wings out
  const manual = PHOTO.on && PHOTO.pair && (PHOTO.id === 'drac-valls' || PHOTO.yielding);
  if (manual) manualDracStep(w, DRAC_POSE, dt, beat, PHOTO.drac, DRAC_SCALE, CALM.matches);
  else { if (w.manual > 0) resumeWalker(w, beat); demoStep(w, DRAC_POSE, dt, beat, M.pos, DRAC_SCALE); PAIR.x = w.x; PAIR.z = w.z; }
  placeLife(w.x, w.z, w.face, PHOTO.on && PHOTO.id === 'drac-valls' ? dracJump(dt) : (DRAC_JUMP.air = 0));
  poseDrac(drac, DRAC_POSE, 0, w.feetAt); dressCarrier(drac);
}

function animPlayableDrac(dt, beat, live, reel) {
  if (!reel && (G.state === 'select' || G.state === 'title')) { // picked on the selector: it wanders and shows off, from where it stands
    if (!soloOn) { resetWalker(SOLO, M.pos.x, M.pos.y, M.yaw); SOLO.hx = SOLO.hz = 0; soloOn = true; }
    PHOTO.drac.roar = PHOTO.on && PHOTO.id === 'drac-valls' && PHOTO.keys.has('KeyQ');
    if (PHOTO.on) manualDracStep(SOLO, DRAC_POSE, dt, beat, PHOTO.drac, DRAC_SCALE, CALM.matches);
    else demoStep(SOLO, DRAC_POSE, dt, beat, null, DRAC_SCALE);
    placeLife(SOLO.x, SOLO.z, SOLO.face, PHOTO.on && PHOTO.id === 'drac-valls' ? dracJump(dt) : (DRAC_JUMP.air = 0));
    poseDrac(drac, DRAC_POSE, 0, SOLO.feetAt); dressCarrier(drac);
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
// The Bou (bou-stage.js poses it at the song clock): the same bounded tap/hold springs as the Drac, at half the lean.
const BOU_ACC = { roll: 0, pitch: 0, col: 0 };
function animPlayableBou(dt, beat, reel) {
  soloOn = false;
  for (const k in S) S[k].t = 0;
  holdGesture();
  stepSprings(Math.min(dt, 0.04));
  for (const k in CAP) if (S[k]) capSpring(S[k], CAP[k]);
  BOU_ACC.roll = S.roll.x * 0.5; BOU_ACC.pitch = S.pitch.x * 0.5;
  BOU_ACC.col = G.collapseT && !reel ? smooth(Math.min(1, (clock - G.collapseT) / 0.6)) : 0;
  const prev = M.yaw, b = PHOTO.bou;
  M.yaw = PHOTO.on && PHOTO.id === 'bou-tradicional-valls' ? driveBou(dt, b, b.vx, b.vz, M.pos) : danceBou(reel ? REEL.beat : beat, dt, BOU_ACC, M.pos);
  M.yawVel = dt > 0 ? (M.yaw - prev) / dt : 0;
  M.pivot.copy(M.pos);
  M.dancing = G.state === 'play' || reel;
}
