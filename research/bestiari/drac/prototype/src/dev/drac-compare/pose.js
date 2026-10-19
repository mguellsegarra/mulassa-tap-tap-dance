// The comparison's pose at a video second (dev only): the root path (path.js) plus whole-body reactions to the foot plan
// (steps.js). The shell is one rigid carried prop, as in the video: jaws, wings, tail and necks hold their rest; only
// the body leans, bobs and flexes with the carrier. pose.beat carries the video seconds (poseDrac hands it to feetAt).
import { newDracPose } from '../../game/dance-drac.js';
import { TRACKS, at, END, track } from './path.js';
import { bodyEnv, feetAt, newFeet } from './steps.js';
import { FOOT_X, FOOT_Z } from '../../scene/models/drac.js';
import { pulseAt } from './pulse.js';

// weight onto the standing foot (deg), lean into the walk (deg at full tanh, model units a second), bob of a passing
// foot (model units); fixed open jaws and half-spread wings (the video's rest look)
export const BODY = { lean: 3, pitch: 4, pitchSpeed: 1.6, bob: 0.035, jaw: 0.45, flap: 0.3 };
const DEG = Math.PI / 180;
export const newPose = newDracPose;

// COMIC INTERPRETATION ("Expressivitat", not observed in the video): on top of the base above, the carrier's knees dip on
// each estimated pulse (pulse.js) and the shell waddles side to side and nods with them. Amplitudes are authored per
// stretch: bigger in the still holds and torsions, small while it walks (a deeper dip tilts a long step's trousers off
// its shoe), small through the fast spins (the shell already swings hard there), gone by the final settle. Only the
// shell moves: the dip lowers it (never raises it), the soles and the root path are the base's.
// [t, knee dip (model units, the shell's lowest at a beat), sway (deg either side), nod (deg forward at the dip)]
export const COMIC_KEYS = [
  [0, 0.06, 2, 1], [8.2, 0.06, 2, 1], [8.4, 0.04, 2, 0.8], [16, 0.04, 2, 0.8], [16.7, 0.08, 2, 1], [19.8, 0.2, 3.5, 1.5],
  [28, 0.2, 3.5, 1.5], [28.8, 0.04, 2, 0.8], [41.8, 0.04, 2, 0.8], [42.5, 0.2, 3.5, 1.5], [44, 0.2, 3.5, 1.5], [44.6, 0.06, 2, 1],
  [59, 0.06, 2, 1], [60, 0.08, 2, 1], [63.4, 0.08, 2, 1], [64, 0.2, 3.5, 1.5], [71.7, 0.2, 3.5, 1.5], [72.8, 0.04, 2, 0.8],
  [85.8, 0.04, 2, 0.8], [86.6, 0.07, 1.2, 0.8], [93.6, 0.07, 1.2, 0.8], [93.9, 0.14, 2.5, 1.2], [94.3, 0.14, 2.5, 1.2], [94.8, 0.05, 1, 0.6],
  [103.5, 0.05, 1, 0.6], [104.4, 0, 0, 0], [104.8, 0, 0, 0],
];
const COMIC = [1, 2, 3].map(c => track(COMIC_KEYS, c));
export const EXPRESSION_DEFAULT = 1;
const FEET = newFeet();
// how far the soles are from under the carrier's hips (sum of squares, model units^2; the hips face the feet's mean
// heading, as rig.js's pelvis does): a long step dips less, so the deeper knee bend never tips a trouser off its shoe.
// Smooth in t (no max / no switch).
function spread(t, x, z) {
  feetAt(FEET, t);
  const yaw = (FEET[0].yaw + FEET[1].yaw) / 2;
  let q = 0;
  for (let i = 0; i < 2; i++) {
    const f = FEET[i], rx = i ? -FOOT_X : FOOT_X, c = Math.cos(f.yaw), n = Math.sin(f.yaw), C = Math.cos(yaw), N = Math.sin(yaw);
    const dx = f.x + c * rx + n * FOOT_Z - (x + C * rx + N * FOOT_Z), dz = f.z - n * rx + c * FOOT_Z - (z - N * rx + C * FOOT_Z);
    q += dx * dx + dz * dz;
  }
  return q;
}

// the pose at video second t; gain 0-1 scales the comic layer (0 = the base exactly)
export function poseAt(out, t, gain = EXPRESSION_DEFAULT) {
  t = Math.min(Math.max(t, 0), END); // past the audited range it holds the settled pose
  // travel velocity as a centred difference over +-0.2 s: the keyed path is C1, so the lean that follows its velocity
  // stays C1 too (a lean on the exact velocity would kink at every key and jolt the shell)
  const yaw = at(TRACKS.yaw, t) * DEG, vx = (at(TRACKS.x, t + 0.2) - at(TRACKS.x, t - 0.2)) / 0.4, vz = (at(TRACKS.z, t + 0.2) - at(TRACKS.z, t - 0.2)) / 0.4;
  const e0 = bodyEnv(0, t), e1 = bodyEnv(1, t);
  out.practice = false; out.beat = t;
  out.x = at(TRACKS.x, t); out.z = at(TRACKS.z, t); out.yaw = yaw;
  // leg 0 (+x) up: the weight goes onto leg 1, the body's top towards -x (+roll)
  out.roll = (BODY.lean * (e0 - e1) + at(TRACKS.shift, t)) * DEG;
  out.pitch = BODY.pitch * DEG * Math.tanh((vx * Math.sin(yaw) + vz * Math.cos(yaw)) / BODY.pitchSpeed);
  // knee flex lowers the shell through `lift`: poseDrac's crouch would squash the body and lift the tail
  out.lift = BODY.bob * Math.max(e0, e1) - 0.9 * at(TRACKS.crouch, t);
  out.crouch = 0;
  if (gain > 0) { // smooth in t (the pulse is C1): a dip shaped ((1 + cos)/2)^2 peaks on the beat with no kink
    const ph = pulseAt(t), c = (1 + Math.cos(2 * Math.PI * ph)) / 2, dip = c * c;
    const q = spread(t, out.x, out.z) / 0.3;
    out.lift -= gain * at(COMIC[0], t) * dip / (1 + q * q);
    out.roll += gain * at(COMIC[1], t) * DEG * Math.sin(Math.PI * ph); // one side a beat, through the middle on the dip
    out.pitch += gain * at(COMIC[2], t) * DEG * dip;
  }
  out.jaw = BODY.jaw; out.flap = BODY.flap;
  out.drive = 0; out.swing = 0; out.reach = 0; out.whip = 0; out.shake = 0; out.fire = 0; out.rear = 0;
  return out;
}
