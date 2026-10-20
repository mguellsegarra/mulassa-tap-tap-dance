// The Mulassa in the plaça: her song dance carried into its frame (game/mula-dance.js through game/mula-layout.js), her
// carriers' shoes (the song's plan while it plays; stepped live under her everywhere else: the selector walk, photo mode,
// the practice, the results) and her colla. mula-motion.js keeps the accents, the demo walk and the rig's head and tail.
import { mula, mulaCarriers, mulaColla, MULA_YAW } from './stage.js';
import { LETTERS, FESTA } from '../core/env.js';
import { PHOTO } from '../game/photo-control.js';
import { mulaDance, makeMulaDance } from '../game/mula-dance.js';
import { menuSong } from '../game/figure-song.js';
import { mulaToWorld, placeMulaDance } from '../game/mula-layout.js';
import { createStepper, SUPPORT_LAYOUT } from '../game/mula-supports.js';
import { tickColla } from './drac-colla.js';
import { CUFF } from './mula-carriers.js';
import { collaRun } from './drac-dance.js';

// One pose of the song's dance at song second t (or the practice's at its beat): fills `pose` (the dance frame) and
// `pos` (a Vector2, the plaça's m) and returns her world heading.
const AT = { x: 0, z: 0 };
const MULA_DANCE = FESTA ? mulaDance : makeMulaDance(menuSong, { festive: false }); // (menuSong: the Mulassa's)
export function danceMula(pose, t, beat, practice, pos) {
  if (practice) MULA_DANCE.practice(pose, beat); else MULA_DANCE.pose(pose, t);
  mulaToWorld(AT, pose.x, pose.z, MULA_YAW);
  pos.set(AT.x, AT.z);
  return MULA_YAW + pose.yaw;
}

// The shoes this frame (world m). songT: the song second whose planned shoes to show (null: step them live under the
// shell, taking over from wherever the song left them). shell: { x, z, yaw, roll, pitch } of the body, world. lift 0-1
// scales a live step's height. air: how far the whole rig is off the floor (a jump: the carriers jump with her, their
// shoes carried rigidly under the shell until it lands, where they are planted again); rearLift / rearPitch: photo
// Q / E, the end that stays down keeps its shoes there, the raised end's come up with it.
export const MULA_FEET = SUPPORT_LAYOUT.map(() => ({ x: 0, y: 0, z: 0, yaw: 0, contact: true }));
const stepper = createStepper(), MULA_PLAN = {}, FLIGHT = SUPPORT_LAYOUT.map(() => ({ x: 0, z: 0, yaw: 0 }));
let onSong = false, flying = false;
export function stepMulaFeet(dt, songT, shell, lift = 1, air = 0, rearLift = 0, rearPitch = 0) {
  if (songT !== null) {
    for (let i = 0; i < 8; i++) {
      const f = MULA_FEET[i];
      MULA_DANCE.foot(songT, i, MULA_PLAN);
      mulaToWorld(AT, MULA_PLAN.x, MULA_PLAN.z, MULA_YAW);
      f.x = AT.x; f.z = AT.z; f.yaw = MULA_YAW + MULA_PLAN.yaw; f.y = MULA_PLAN.y; f.contact = MULA_PLAN.contact;
    }
    onSong = true;
  } else if (air > 0) { // off the floor: each shoe keeps where it was under the shell when she took off
    const c = Math.cos(shell.yaw), n = Math.sin(shell.yaw);
    if (!flying && !onSong) { const feet = stepper.update(dt, shell, lift); for (let i = 0; i < 8; i++) Object.assign(MULA_FEET[i], feet[i]); } // (stale shoes if she was hidden: planted under her first)
    for (let i = 0; i < 8; i++) {
      const f = MULA_FEET[i], o = FLIGHT[i];
      if (!flying) { const dx = f.x - shell.x, dz = f.z - shell.z; o.x = c * dx - n * dz; o.z = n * dx + c * dz; o.yaw = f.yaw - shell.yaw; }
      f.x = shell.x + c * o.x + n * o.z; f.z = shell.z - n * o.x + c * o.z; f.yaw = shell.yaw + o.yaw; f.y = air; f.contact = false;
    }
    onSong = false; flying = true;
  } else {
    if (onSong || flying) { for (const f of MULA_FEET) f.y = 0; stepper.place(MULA_FEET); onSong = flying = false; }
    const feet = stepper.update(dt, shell, lift);
    for (let i = 0; i < 8; i++) Object.assign(MULA_FEET[i], feet[i]);
  }
  if (rearLift) for (let i = 0; i < 8; i++) MULA_FEET[i].y += Math.max(0, rearLift - SUPPORT_LAYOUT[i].z * Math.sin(rearPitch));
  mulaCarriers.pose(mula, MULA_FEET, songT === null ? CUFF.max : Infinity); // (the song's planned shoes as planned)
  return MULA_FEET;
}
export const resetMulaFeet = () => { stepper.reset(); onSong = false; }; // the next frame plants them under her (a jump to a new spot)

// Her colla, every frame: shown with her (not in photo mode, where the driven beast would run them over), clapping on
// the music's beat while a run is on (calm on the menus); frozen with her by a pause or a collapse on `frozenBeat`;
// cheer 0-1: arms up and a hop (her culades, charges, the final hit, a GUAPA).
export const MULA_COLLA_SPOTS = []; // fixed obstacles for the crowd while it is out (crowd.js)
const TICK = { obstacles: MULA_COLLA_SPOTS, toWorld: h => mulaToWorld({}, h.x, h.z, MULA_YAW), frozenBeat: 0, run: {}, labels: LETTERS, cheer: 0 };
export function mulaCollaTick(on, beat, dt, frozenBeat, cheer = 0) {
  if (!mulaColla) return;
  placeMulaDance(mulaColla.helpers, MULA_YAW);
  TICK.frozenBeat = frozenBeat; TICK.cheer = cheer; collaRun(TICK.run);
  tickColla(mulaColla, on && !PHOTO.on, beat, dt, TICK);
}
