// The Drac's comic groove (artistic, not observed in the video) on top of the revised dance (play, practice, results,
// showreel; drac-dance.js), all on the MUSIC beat and smooth in it (no state, seekable):
// - the splash's groove: the old beat choreography (dance-drac.js) lends its neck wave, tail whip, jaws on each bar,
//   wings every two bars and a share of its side lean, and the rig goes through poseDrac, not poseRigid, so the necks
//   counter-lean and the heads stay up while the shell tips;
// - a happy dog: the tail up and wagging, the little wings flapping on every beat (the walkers have it too, drac-play.js);
// - the mood: as the player misses (`mood`, the springs' vigor, 1 playing well - 0.08), the groove and the dog fade and
//   the heads, wings and tail droop.
// Bigger in the holds, smaller while it walks or spins, gone by the final settle (drac-pose.js COMIC_KEYS' stretches).
// Never moves the shoes or the root path; tests/figures/drac/drac-groove.mjs checks trousers, necks, wings and helpers.
import { COMIC_KEYS } from './drac-pose.js';
import { track, at } from './drac-path.js';
import { dracPose, newDracPose } from './dance-drac.js';
import { poseDrac } from './drac-motion.js';
import { dressCarrier } from './drac-rig.js';
import { TAU, clamp01, smooth } from '../../core/math.js';

const DIP_KEY = track(COMIC_KEYS, 1);
const beatBump = b => { const c = (1 + Math.cos(TAU * b)) / 2; return c * c; }; // 1 on the beat, 0 between
export const grooveEnv = ref => Math.min(1, 0.45 + 0.55 * at(DIP_KEY, ref) / 0.2) * (1 - smooth(clamp01((ref - 103.5) / 0.9)));

// the splash's groove into the dance pose P, before drac-dance.js scales its lean by the same vigor
const GROOVE_POSE = newDracPose();
export function grooveDrac(P, beat, ref, mood) {
  const e = grooveEnv(ref), k = e * mood;
  dracPose(GROOVE_POSE, beat);
  P.drive = GROOVE_POSE.drive * k; P.swing = GROOVE_POSE.swing * 0.7; P.whip = GROOVE_POSE.whip * k; // a fuller neck wave grazes the necks' bases
  P.jaw = Math.max(P.jaw, GROOVE_POSE.jaw * k); P.flap = Math.max(P.flap, GROOVE_POSE.flap * k);
  P.roll += 0.6 * GROOVE_POSE.roll * e * e * mood; // e squared: little lean while it walks, where a long step would cross the trousers
}

// the happy dog on the posed rig, k 0-1
export function dogDrac(rig, beat, k) {
  rig.tail.base.rotation.x -= 0.25 * k;
  rig.tail.forEach((g, j) => { g.rotation.y += k * 0.3 * Math.sin(TAU * beat - 0.7 * j); });
  rig.wings.forEach((w, i) => { w.root.rotation.z += (i ? -1 : 1) * k * 0.55 * (beatBump(beat) - 0.4); });
}

// The whole rig for the dance pose P: poseDrac with its waves on the music beat and the feet on reference seconds, the
// dog, the droop, then the carrier's trousers.
const REF_FEET = { t: 0, feetAt: null }, refFeetAt = (o, b, practice, front) => REF_FEET.feetAt(o, REF_FEET.t, practice, front);
export function poseDracDance(rig, P, beat, ref, mood, feetAt) {
  P.beat = beat; REF_FEET.t = ref; REF_FEET.feetAt = feetAt;
  poseDrac(rig, P, 0, refFeetAt);
  dogDrac(rig, beat, grooveEnv(ref) * mood);
  const sad = 1 - mood;
  rig.necks.forEach((n, i) => {
    n.segs.forEach(g => { g.rotation.x += 0.22 * sad; });
    n.head.rotation.x += 0.55 * sad;
    n.root.rotation.z -= (i ? -0.15 : 0.15) * sad; // the drooped heads hang apart: straight down they touch
    n.jaw.rotation.x += 0.35 * sad;
  });
  rig.wings.forEach((w, i) => { w.root.rotation.z -= (i ? -1 : 1) * 0.35 * sad; });
  rig.tail.base.rotation.x += 0.3 * sad;
  dressCarrier(rig);
}
