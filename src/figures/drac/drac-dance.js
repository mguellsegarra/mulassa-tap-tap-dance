// The Drac's revised dance in the game (play, practice, results): the song time goes through the one time map
// (figures/drac/drac-time.js) to reference seconds, which pose the shell (figures/drac/drac-pose.js) and its carrier's feet
// (figures/drac/drac-steps.js) inside the dance frame (figures/drac/drac-layout.js). scene/stage-motion.js only dispatches here and hands over
// its bounded accent springs; the selector / photo walkers stay in drac-demo.js.
import { drac, colla, DRAC_YAW } from './drac-objects.js';
import { LETTERS } from '../../core/env.js';
import { G } from '../../game/state.js';
import { PHOTO } from '../../game/photo-control.js';
import { lensShrink } from '../../scene/framing.js';
import { REEL } from '../../game/showreel.js';
import { songTimeAtBeat } from '../../game/figure-song.js';
import { newDracPose } from './dance-drac.js';
import { poseAt } from './drac-pose.js';
import { feetAt } from './drac-steps.js';
import { dracTime } from './drac-time.js';
import { placeDance, danceToWorld } from './drac-layout.js';
import { tickColla } from '../common/colla.js';
import { collaRun } from '../common/colla-run.js';
import { poseCarrier } from './drac-rig.js';
import { DRAC_SCALE } from './drac.js';

// beat: the music beat drawn; ref: the reference second shown. The practice holds the first stance, the results keep
// the last reference second shown (the settle), a pause or a collapse freezes both where they were.
export const DANCE = { beat: 0, ref: 0 };
export const DRAC_DANCE_POSE = newDracPose();
const DANCE_AT = { x: 0, z: 0 }; // the root in the plaça (m)

// One frame. acc: the game's accents on top of the base pose ({ roll, pitch, lift } added, `vigor` 0-1 scales the base
// lean, `col` 0-1 the collapse). Fills `pos` (a Vector2, the plaça's metres) and returns the world heading.
export function danceDrac(beat, acc, pos) {
  const reel = REEL.on && G.state === 'select', dancing = G.state === 'play' || reel; // (the selector's showreel: a run's collapse is still in G)
  if (reel || !G.collapseT && !(dancing && G.paused)) DANCE.beat = beat;
  if (G.practice) DANCE.ref = 0;
  else if (reel || dancing && !G.collapseT && !G.paused) DANCE.ref = dracTime.refAt(songTimeAtBeat(DANCE.beat));
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
export const COLLA_SPOTS = []; // fixed obstacles for the crowd while the colla is out (crowd.js): helpers and the seated shown
const DRAC_TICK = { obstacles: COLLA_SPOTS, toWorld: h => danceToWorld({}, h.x, h.z, DRAC_YAW), frozenBeat: 0, run: {}, labels: LETTERS, shrink: lensShrink };
export function dracColla(on, beat, dt) {
  if (!colla) return;
  placeDance(colla.helpers, DRAC_YAW);
  DRAC_TICK.frozenBeat = DANCE.beat; collaRun(DRAC_TICK.run);
  tickColla(colla, on && !PHOTO.on, beat, dt, DRAC_TICK);
}
