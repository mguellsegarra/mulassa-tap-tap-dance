// The Drac's revised dance in the game (play, practice, results): the song time goes through the one time map
// (game/drac-time.js) to reference seconds, which pose the shell (game/drac-pose.js) and its carrier's feet
// (game/drac-steps.js) inside the dance frame (game/drac-layout.js). mula-motion.js only dispatches here and hands over
// its bounded accent springs; the selector / photo walkers stay in drac-demo.js.
import { drac, colla, DRAC_YAW } from './stage.js';
import { LETTERS } from '../core/env.js';
import { G } from '../game/state.js';
import { PHOTO } from '../game/photo-control.js';
import { songTimeAtBeat } from '../game/figure-song.js';
import { newDracPose } from '../game/dance-drac.js';
import { poseAt } from '../game/drac-pose.js';
import { feetAt } from '../game/drac-steps.js';
import { dracTime } from '../game/drac-time.js';
import { placeDance, danceToWorld, HELPERS } from '../game/drac-layout.js';
import * as THREE from 'three';
import { poseCarrier } from './drac-rig.js';
import { DRAC_SCALE } from './models/drac.js';

// beat: the music beat drawn; ref: the reference second shown. The practice holds the first stance, the results keep
// the last reference second shown (the settle), a pause or a collapse freezes both where they were.
export const DANCE = { beat: 0, ref: 0 };
export const DRAC_DANCE_POSE = newDracPose();
const DANCE_AT = { x: 0, z: 0 }; // the root in the plaça (m)

// One frame. acc: the game's accents on top of the base pose ({ roll, pitch, lift } added, `vigor` 0-1 scales the base
// lean, `col` 0-1 the collapse). Fills `pos` (a Vector2, the plaça's metres) and returns the world heading.
export function danceDrac(beat, acc, pos) {
  const dancing = G.state === 'play';
  if (!G.collapseT && !(dancing && G.paused)) DANCE.beat = beat;
  if (G.practice) DANCE.ref = 0;
  else if (dancing && !G.collapseT && !G.paused) DANCE.ref = dracTime.refAt(songTimeAtBeat(DANCE.beat));
  const P = poseAt(DRAC_DANCE_POSE, DANCE.ref, DANCE.beat);
  P.roll = P.roll * acc.vigor + acc.roll + acc.col * 0.6;
  P.pitch = P.pitch * acc.vigor + acc.pitch + acc.col * 0.5;
  P.lift += acc.lift * (1 - acc.col); // lift the body, while the shoes stay on their plan
  P.crouch = Math.max(P.crouch, acc.col * 0.8);
  const life = placeDance(drac.root.parent, DRAC_YAW); // one frame for the path, the feet and the helpers
  life.scale.setScalar(DRAC_SCALE);
  poseCarrier(drac, P, feetAt);
  danceToWorld(DANCE_AT, P.x * DRAC_SCALE, P.z * DRAC_SCALE, DRAC_YAW);
  pos.set(DANCE_AT.x, DANCE_AT.z);
  return DRAC_YAW + P.yaw;
}

// The colla, every frame: shown with the Drac (not in photo mode, where the driven beast would run the helpers over),
// the helpers on the dance frame's spots, clapping on the music's beat while a run is on (calm on the menus).
const COLLA_E = { k: 0 }; // the clap's energy, eased (a collapse or the end of a run lowers the arms, never at once)
export const COLLA_SPOTS = []; // fixed obstacles for the crowd while the colla is out (crowd.js): helpers and the seated shown
let spotsFor = -1;
function collaSpots() {
  if (spotsFor === colla.count) return;
  spotsFor = colla.count; COLLA_SPOTS.length = 0;
  for (const h of HELPERS) { const w = danceToWorld({}, h.x, h.z, DRAC_YAW); COLLA_SPOTS.push({ pos: new THREE.Vector2(w.x, w.z), rad: 0.45, fixed: true }); }
  for (let i = 0; i < colla.count; i++) { // a seated member: hips on the seat, legs towards the centre
    const p = colla.members[i].g.position, r = Math.hypot(p.x, p.z), k = (r - 0.35) / r;
    COLLA_SPOTS.push({ pos: new THREE.Vector2(p.x * k, p.z * k), rad: 0.7, fixed: true });
  }
}
export function dracColla(on, beat, dt) {
  if (!colla) return;
  const show = on && !PHOTO.on;
  colla.helpers.visible = show; colla.seated.visible = show && colla.count > 0;
  if (!show) return;
  collaSpots();
  placeDance(colla.helpers, DRAC_YAW);
  colla.setLabels(LETTERS);
  // a pause (and its resume count-in) or a collapse freezes them with the Drac, on the beat it was frozen on
  const frozen = G.state === 'play' && (G.paused || G.collapseT);
  if (!(G.state === 'play' && G.paused)) COLLA_E.k += ((G.state === 'play' && !G.collapseT ? 1 : 0) - COLLA_E.k) * (1 - Math.exp(-Math.max(0, dt) / 0.35));
  colla.update(frozen ? DANCE.beat : beat, COLLA_E.k);
}
