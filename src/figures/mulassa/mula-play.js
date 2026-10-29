// The Mulassa's motion: damped-spring accents (scene/figure-springs.js) on top of the base choreography (mula-dance.js,
// placed by mula-stage.js), heading, stumbles and holds; off the song, the demo walk and free play. Her carriers' shoes
// are mula-stage.js's (the song's plan, or stepped live under wherever she goes). The stage (scene/stage-motion.js)
// calls it through her hooks (mula-scene.js) and hands her the splash's pair: the Drac dancing beside her.
import { PHOTO, PHOTO_RUN } from '../../game/photo-control.js';
import { CALM } from '../../core/env.js';
import { poseMulaBody } from './mula-pose-rig.js';
import { newMulaPose, mulaComic, MULA_COMIC } from './mula-dance.js';
import { mula, mulaCarriers } from './mula-objects.js';
import { songTimeAtBeat } from '../../game/figure-song.js';
import { danceMula, stepMulaFeet } from './mula-stage.js';
import { G, clock } from '../../game/state.js';
import { REEL } from '../../game/showreel.js';
import { pulse, hold } from '../../core/anim.js';
import { smooth, easeIn } from '../../core/math.js';
import { PIVOT, S, M, CAP, stepSprings, capSpring, holdGesture } from '../../scene/figure-springs.js';
import { trauma, setTrauma, stepManualJump, beginManualFlight, manualContact, landingImpact } from '../../scene/manual-jump.js';

const MULA_OFF_COMIC = { lift: 0, roll: 0, pitch: 0 }; // the comic layer off the song (mula-dance.js)
let photoGait = 1, photoStride = 0, photoGround = 1, photoRear = 0, photoKick = 0;
// Q held: she rears up like a horse (front up, on her rear legs); E held: a kick (rear up, on her front legs). rad.
export const PHOTO_REAR = { front: 0.5, rear: 0.45, legZ: 1.05, ease: 0.15 };
const POSE = newMulaPose(); // the base choreography's pose this frame (mula-dance.js, its dance frame), reused
const SHELL = { x: 0, z: 0, yaw: 0, roll: 0, pitch: 0 }; // her body this frame, for the live steps (mula-stage.js)
// splash: { pair, keepClear } (figures/drac/drac-play.js): the Drac beside her on the splash, fading out after it
export function animPlayableMula(dt, beat, live, reel, { pair: PAIR, keepClear }) {
  const manualMula = PHOTO.on && PHOTO.id === 'mulassa-valls';
  if (manualMula) {
    S.yaw.x = S.yaw.t = M.yaw; S.yaw.v = 0;
    if (PHOTO.action) { // her jump (the Drac has its own)
      if (M.air === 0 && dt > 0) { M.airV = CALM.matches ? 1.4 : 4.8; beginManualFlight('mulassa-valls'); }
      PHOTO.action = false;
    }
  }
  const danceNow = reel ? REEL.beat : beat;
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
  if (dancing) setTrauma(Math.max(trauma, Math.min(0.5, Math.abs(buzz) * 14)));
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
