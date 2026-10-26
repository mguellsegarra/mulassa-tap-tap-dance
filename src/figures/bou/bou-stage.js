// The Bou Tradicional in the game (play, practice, results, the selector's showreel, «Mira el ball»): its dance
// (figures/bou/bou-dance.js, applied to the rig by bou-motion.js) posed at the SONG clock, inside its dance frame (bou-objects.js
// bou.frame). bou-play.js calls it from the stage's frame and hands over its bounded accent springs. No elapsed clock of its
// own: a pause or a collapse freezes the song second shown, a restart seeks it, the results keep the last one.
import * as THREE from 'three';
import { bou, bouColla, BOU_COLLA_YAW } from './bou-objects.js';
import { G } from '../../game/state.js';
import { REEL } from '../../game/showreel.js';
import { songTimeAtBeat } from '../../game/figure-song.js';
import { createBouMotion } from './bou-motion.js';
import { BOU_TIMING, BOU_CARRY, bouPose, newBouPose, bouFestaAt } from './bou-dance.js';
import { liveBouFeet } from './bou-feet.js';
import { PHOTO } from '../../game/photo-control.js';
import { LETTERS } from '../../core/env.js';
import { tickColla } from '../common/colla.js';
import { collaRun } from '../common/colla-run.js';
import { lensShrink } from '../../scene/framing.js';
import { bouToWorld, carryColla } from './bou-colla.js';
import { PARADE } from './bou-parade.js';
import { smooth } from '../../core/math.js';

export const BOU_DANCE = { t: 0 }; // the song second shown
export const BOU_END = BOU_TIMING.duration;
const BOU_WORLD = new THREE.Vector3();
let bouMotion = null, bouShown = -1;

// acc: { roll, pitch } accents (rad) leaning the shell on the carriers, `col` 0-1 the collapse. The shell never lifts
// off its carriers: the reference's collective overhead lift needs exterior carriers, not modelled.
// Fills `pos` (a Vector2, the plaça's metres) and returns the world heading.
export function danceBou(beat, dt, acc, pos) {
  bouMotion ??= createBouMotion(bou);
  const reel = REEL.on && G.state === 'select', dancing = G.state === 'play' || reel;
  if (BOU_LIVE.parked && !dancing && G.state === 'select') return driveBou(dt, BOU_LIVE.at, 0, 0, pos); // free play, just looking: it stays where it was driven
  if (BOU_LIVE.parked) { BOU_LIVE.parked = false; bouSteps = null; bouShown = -9; } // back to its dance: fresh steps next time, the tail hangs still
  bou.frame.rotation.y = BOU_COLLA_YAW; // (the dance frame, its colla's compass, which free play turned to the plaça's)
  if (G.practice || !dancing && G.state !== 'results') BOU_DANCE.t = 0; // the practice and the menus: its opening stance
  else if (reel || dancing && !G.collapseT && !G.paused) BOU_DANCE.t = Math.max(0, songTimeAtBeat(beat));
  const jump = Math.abs(BOU_DANCE.t - bouShown) > 0.5; // a seek (restart, a new reel loop): the tail hangs still again
  bouShown = BOU_DANCE.t;
  const P = bouMotion(BOU_DANCE.t, jump ? 0 : dt, bramaAt(BOU_DANCE.t));
  // a collapse: the shell slumps forward and sideways on its tired carriers, its head well clear of the floor
  bou.body.rotation.x += acc.pitch + acc.col * 0.1; // (the motion set the base pose this frame: nothing piles up)
  bou.body.rotation.z += acc.roll + acc.col * 0.12;
  bou.root.getWorldPosition(BOU_WORLD);
  pos.set(BOU_WORLD.x, BOU_WORLD.z);
  return bou.frame.rotation.y + P.yaw;
}
// A BRAMA hit (judge.js guapaHit) squashes its head: in, held, out on the song clock (a pause holds it, a restart
// drops it). A second one mid-squash rises from where the first had got to: never a pop.
const BRAMA = { at: -9, from: 0 }, BRAMA_T = { in: 0.1, hold: 0.3, out: 0.45 };
const bramaEase = x => smooth(Math.max(0, Math.min(1, x)));
function bramaAt(t) {
  const s = t - BRAMA.at;
  if (s < 0 || s > BRAMA_T.hold + BRAMA_T.out) return 0;
  const up = BRAMA.from + (1 - BRAMA.from) * bramaEase(s / BRAMA_T.in);
  return up * (1 - bramaEase((s - BRAMA_T.hold) / BRAMA_T.out));
}
export function bouBrama() { BRAMA.from = bramaAt(BOU_DANCE.t); BRAMA.at = BOU_DANCE.t; }
// One still pose, no tail swing (the share photo, share-capture.js): the next frame poses it again from BOU_DANCE.
export function poseBou(t) { bouMotion ??= createBouMotion(bou); return bouMotion(t, 0); }

// Free play (photo mode, the Bou alone): driven like the others (game/photo-control.js movePhoto), its carriers stepping
// live under it (figures/bou/bou-feet.js liveBouFeet). Q lifts its head, E stretches the carriers' left legs (the dance's
// gesture), Space charges head down, R is the half turn every figure has. No hop, no lift: its feet never leave the
// floor together. Parked where it stopped while free play looks around; the next dance takes it back to its frame.
export const BOU_LIVE = { parked: false, at: { x: 0, z: 0, yaw: 0 }, charge: 0, head: 0, reach: 0 };
const BOU_FEET = Array.from({ length: 4 }, () => ({})), BOU_REACH = i => (i % 2 ? 0 : BOU_LIVE.reach);
let bouSteps = null, bouClock = 0;
// body: { x, z, yaw } in the plaça (m, rad); vx, vz its velocity (m/s), for where the feet land.
export function driveBou(dt, body, vx, vz, pos) {
  bouSteps ??= liveBouFeet();
  bouClock += dt; BOU_LIVE.parked = true;
  Object.assign(BOU_LIVE.at, { x: body.x, z: body.z, yaw: body.yaw });
  const driving = PHOTO.on && PHOTO.id === 'bou-tradicional-valls', keys = PHOTO.keys;
  if (driving && PHOTO.action) { BOU_LIVE.charge = 0.7; PHOTO.action = false; }
  BOU_LIVE.charge = Math.max(0, BOU_LIVE.charge - dt);
  const ease = 1 - Math.exp(-dt / 0.15);
  BOU_LIVE.head += ((driving && keys.has('KeyQ') ? -0.12 : 0) + (BOU_LIVE.charge > 0 ? 0.2 : 0) - BOU_LIVE.head) * ease;
  BOU_LIVE.reach += ((driving && keys.has('KeyE') ? 1 : 0) - BOU_LIVE.reach) * ease;
  bou.frame.rotation.y = 0; // the plaça's own frame: the driven body is in world metres
  bou.root.position.set(body.x, 0, body.z); bou.root.rotation.y = body.yaw;
  const speed = Math.hypot(vx, vz);
  bou.body.rotation.set(BOU_LIVE.head + 0.012 * Math.min(1, speed / 3) * Math.sin(bouClock * 9), 0, 0); // a little trot nod
  bouSteps(bouClock, body, vx, vz, BOU_REACH, BOU_FEET);
  for (let i = 0; i < 4; i++) { const f = BOU_FEET[i]; bou.feet[i].position.set(f.x, f.y, f.z); bou.feet[i].rotation.set(f.tilt ?? 0, f.yaw, 0, 'YXZ'); }
  bou.cap?.play(bouClock); // free play: the head's gags on its own steady beat
  bou.poseLegs(); bou.root.updateMatrixWorld(true); bou.swingTail(dt);
  pos.set(body.x, body.z);
  return body.yaw;
}

// Its colla, every frame, as the Mulassa's (mula-stage.js): shown with it (not in free play), clapping on the music's
// beat in a run and the showreel; a pause or a collapse freezes them on the beat it froze on.
export const BOU_COLLA_SPOTS = []; // fixed obstacles for the crowd while it is out (crowd.js)
const BOU_TICK = { obstacles: BOU_COLLA_SPOTS, toWorld: h => bouToWorld(h.x, h.z, BOU_COLLA_YAW), frozenBeat: 0, run: {}, labels: LETTERS, shrink: lensShrink };
export function bouCollaTick(on, beat, dt) {
  if (!bouColla) return;
  const run = collaRun(BOU_TICK.run);
  if (!(run.play && (run.paused || run.collapsed))) BOU_TICK.frozenBeat = beat;
  const show = on && !PHOTO.on;
  tickColla(bouColla, show, beat, dt, BOU_TICK);
  // the festa: the attendants carry it (their obstacles for the crowd go with them) and the public runs behind
  bouPose(BOU_DANCE.t, BOU_CARRY_POSE);
  PARADE.on = show; PARADE.beat = BOU_CARRY_POSE.beat; PARADE.yaw = BOU_COLLA_YAW;
  PARADE.x = BOU_CARRY_POSE.x; PARADE.z = BOU_CARRY_POSE.z; PARADE.heading = BOU_CARRY_POSE.yaw; PARADE.colla = BOU_COLLA_SPOTS;
  BOU_FESTA.k = show ? bouFestaAt(BOU_CARRY_POSE.beat) : 0;
  if (!show) return;
  carryColla(bouColla, BOU_CARRY_POSE, BOU_CARRY, dt);
  for (let i = 0; i < 4; i++) { const g = bouColla.crew[i].g.position, w = bouToWorld(g.x, g.z, BOU_COLLA_YAW); BOU_COLLA_SPOTS[i]?.pos.set(w.x, w.z); }
}
const BOU_CARRY_POSE = newBouPose();
// 0-1 while its colla carries it round (bouFestaAt): the play camera stops following and steps back (cameras.js)
export const BOU_FESTA = { k: 0 };
