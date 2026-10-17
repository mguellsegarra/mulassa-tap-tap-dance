// The song's base choreography: where the Mulassa faces and how she sways at any musical moment. Pure, no three.js,
// no randomness, no allocations: dancePose(out, beat) fills a reused pose, so a seek (?from), a pause or a restart
// shows the right pose directly, without integrating earlier frames. `beat` is the arrangement's beat index
// (song.beats[i] is beat i; main.js beatAt() turns song time, sync offset included, into it).
//
// OBSERVED in three Arditproduccions videos: front / three-quarter with a swaying lean -> about half a turn to show the rear -> rear held, with lateral lean -> back to the front -> livelier turns
// with lean, pitching and some lift -> successive turns -> front, settling.
// ARTISTIC ADAPTATION (not documented choreography): the beat each change lands on, the number of turns, their
// direction (to her left, seen in one clear sequence, not a rule), every amplitude and the sway periods.
// PROVISIONAL TIMING: bound to this game's fixed-tempo arrangement, never to the videos' seconds (rubato, fermatas).

// The arrangement's sections from the pickup on (music/taiko-arrangement.json). tests/dance.mjs fails if a
// regenerated arrangement moves them, so the cues below can't silently drift off the music.
// The short cut: the song as it was up to bar 31 (beat 174), then bar 49 on (C, X, the roll) 84 beats earlier; the
// break, A' and B' are not played, so neither is their choreography.
export const ARRANGEMENT = [[12, 'pickup'], [16, 'A1'], [80, 'A2'], [144, 'B'], [176, 'C'], [208, 'X'], [224, 'roll']];
export const END_BEAT = 228; // the final hit

const PI = Math.PI;
// Heading keys [beat, yaw]: 0 = front to the plaça (the play camera), PI = rear. Unwrapped: turns keep going the same
// way instead of unwinding. Smoothstep between keys: each turn starts and ends at rest.
const YAW = [
  [0, 0], [72, 0], //        pickup, A bars 1-8: front
  [80, 1], [136, 1], //      half turn to show the rear at the end of the half; A bars 9-16: rear
  [144, 2], [150, 3], //     back to the front before B; B: a broader turn towards the rear...
  [168, 3], [176, 4], //     ...held, then the same way round to the front as bar 49 leads into C
  [188, 6], [192, 6], //     C: one turn, a breath in front,
  [204, 8], [208, 8], //     another one, a little quicker,
  [216, 10], [224, 12], //   the last phrase (the finale): two quick turns, front for the roll and the final hit
].map(([b, k]) => [b, k * PI]);
// Style keys, linear in between: [beat, roll deg, pitch sway deg, pitch bias deg (- = front up), hop deg (how far the
// front carriers throw the front up on each jump), local travel (fraction of her length), three-quarter glance (rad),
// drive (groove liveliness 0-1), landing shake deg]. The guide's starting ranges (roll 3-7 deg, pitch 2-5) were far too
// timid to read from the play camera (and in the videos the lean is the whole show), so this is deliberately theatrical:
// a heavy, slow lean and a rearing front even in the solemn A, a big bouncing lean in B and C. Artistic values.
const STYLE = [
  [0, 3, 1, 0, 0, 0.02, 0, 0.2, 0], //          before the song: standing ready
  [12, 6, 2, 0, 3, 0.04, 0.1, 0.4, 0.3], //       pickup: preparing the front
  [16, 15, 4, 0, 8, 0.05, 0.3, 0.7, 0.6], //      A: front / three-quarter, a slow heavy lean, the front rearing
  [72, 15, 4, 0, 8, 0.05, 0.1, 0.7, 0.6],
  [80, 19, 4, 0, 9, 0.05, 0.2, 0.7, 0.7], //      rear, a little more lean
  [132, 19, 4, 0, 9, 0.05, 0.2, 0.7, 0.7],
  [140, 16, 4, -6, 10, 0.05, 0.1, 0.85, 0.8], //   back to the front with the front lifted
  [146, 26, 7, 0, 15, 0.08, 0.1, 1, 1.3], //     B: broad lean, real jumps
  [172, 26, 7, 0, 15, 0.08, 0.1, 1, 1.3],
  [176, 27, 6, 0, 15, 0.08, 0, 1, 1.5], //       C: successive turns
  [208, 28, 7, 0, 16, 0.08, 0, 1, 1.7], //       the last phrase, strongest
  [222, 28, 7, 0, 16, 0.08, 0, 1, 1.7],
  [228, 3, 1, -3, 0, 0.02, 0, 0.4, 0.5], //      the final hit: front up, a clear ending pose
  [234, 1, 0.5, 0, 0, 0.01, 0, 0.3, 0], //       settled
];
// Sway period in beats, per stretch: one side per score quarter-pair in A (a quarter = 2 game beats), one side per
// 2/4 bar in B/C. Every change sits on a sway extreme (zero velocity), so the switch is smooth. One slow lean over the
// fill into C (172-176) puts C, the finale and the ending on the side they leaned to before the cut.
const PERIOD = [[0, 8], [144, 4], [172, 8], [176, 4], [224, 8]]; // (the first one also runs back before beat 0)
const PHASE0 = PERIOD.map(() => 0); // sway phase at each stretch's start (prepared once)
for (let i = 1; i < PERIOD.length; i++) PHASE0[i] = PHASE0[i - 1] + (PERIOD[i][0] - PERIOD[i - 1][0]) / PERIOD[i - 1][1] * 2 * PI;
export const DANCE_SIZE = { h: 4.03, l: 4.22 }; // her height and length (models.js buildMulassa), metres
const L = DANCE_SIZE.l;
const REAR = 1.5; // m from her middle to the hem the rear carriers keep on the ground while the front is thrown up
const DEG = PI / 180, smooth = k => k * k * (3 - 2 * k);

function stretchAt(beat) {
  let i = PERIOD.length - 1;
  while (i > 0 && beat < PERIOD[i][0]) i--;
  return i;
}
function yawAt(beat) {
  if (beat <= YAW[0][0]) return YAW[0][1];
  for (let i = 1; i < YAW.length; i++) {
    const [b1, y1] = YAW[i];
    if (beat < b1) { const [b0, y0] = YAW[i - 1]; return y0 + (y1 - y0) * smooth((beat - b0) / (b1 - b0)); }
  }
  return YAW[YAW.length - 1][1];
}
function style(beat, out) { // interpolates the style row into `out` (no arrays created)
  let i = 1;
  while (i < STYLE.length - 1 && beat >= STYLE[i][0]) i++;
  const a = STYLE[i - 1], b = STYLE[i], k = Math.min(1, Math.max(0, (beat - a[0]) / (b[0] - a[0])));
  const m = j => a[j] + (b[j] - a[j]) * k;
  out.rollAmp = m(1) * DEG; out.pitchAmp = m(2) * DEG; out.pitchBias = m(3) * DEG;
  out.hopAmp = m(4) * DEG; out.travel = m(5) * L; out.glance = m(6); out.drive = m(7); out.shakeAmp = m(8) * DEG;
}

// Pose channels: yaw (rad, unwrapped, + = towards her left), roll (body.rotation.z, + tilts her top to her right),
// pitch (body.rotation.x, + = nose down), lift (m), x / z: local travel of the whole figure in her own frame
// (x = her left, z = forward), drive (0-1: how lively the secondary groove of head, ears and legs is), shake (rad:
// the landing's buzz, added to roll and pitch by the caller).
export const newPose = () => ({ yaw: 0, roll: 0, pitch: 0, lift: 0, x: 0, z: 0, drive: 0, rollAmp: 0, pitchAmp: 0, pitchBias: 0, hopAmp: 0, travel: 0, glance: 0, shakeAmp: 0, shake: 0 });

// One lean per half sway period, and a jump between two leans: the two front carriers throw the front up (a ballistic
// arc, so it lands hard on each lean) while the rear ones stay on the ground, so the body pitches about her rear and
// the rear hem hardly leaves the floor (lift). Each landing buzzes the whole figure for a moment.
function sway(out, beat) {
  const i = stretchAt(beat), half = PERIOD[i][1] / 2, ph = PHASE0[i] + (beat - PERIOD[i][0]) / PERIOD[i][1] * 2 * PI, c = Math.cos(ph);
  const f = ph / PI - Math.floor(ph / PI), arc = 4 * f * (1 - f), since = f * half; // since: beats since the last landing
  out.roll = out.rollAmp * c; // leans to one side on the strong beats, to the other on the next
  out.pitch = out.pitchBias + out.pitchAmp * Math.cos(2 * ph) - out.hopAmp * arc; // a nod with every lean, the front up between them
  out.lift = REAR * Math.sin(Math.max(0, -out.pitch));
  out.x = -out.travel * c; // a short step towards the side she leans to (roll + tilts her to -x)
  out.z = out.travel * 0.4 * Math.sin(2 * ph);
  out.shake = out.shakeAmp * Math.exp(-since * 4) * Math.sin(2 * PI * 5 * since);
  out.yaw += out.glance * Math.sin(ph / 2); // three-quarter glances
  return out;
}

export function dancePose(out, beat) {
  style(beat, out);
  out.yaw = yawAt(beat);
  return sway(out, beat);
}

// The practice teaches the buttons, not the song: she stays front on, with the A section's restrained sway,
// so its prompts never land in the middle of a turn.
export function practicePose(out, beat) {
  style(40, out);
  out.yaw = 0;
  return sway(out, 32 + ((beat % 16) + 16) % 16); // two sway periods: the glance repeats too, seamlessly
}
