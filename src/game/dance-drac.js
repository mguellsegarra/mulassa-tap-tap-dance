import { danceSections, danceCues, sameDanceForm, boundedDance } from './dance.js';
// The Drac's base choreography: where it faces and how it moves at any musical moment. Pure, no three.js, no randomness,
// no allocations: dracPose(out, beat) fills a reused pose, so a seek, a pause or a restart shows the right pose directly.
// `beat` is the arrangement's quarter-note index (song-drac.json beats[i] is beat i).
//
// OBSERVED (docs/bestiari-valls.md, Arditproduccions «Ball del DRAC», Sant Joan 2023): it stands upright with both necks
// up; the whole body rolls far over to one side (the flank with its orange rings shows), rears back with both heads high
// and jaws open, crouches, spins with the tail flying, and from the middle of the ball on it breathes fire from the mouths,
// wings and tail. The carrier's legs stay on the ground. Music: F. Bofarull, 2/4, quarter = 126.
// ARTISTIC ADAPTATION (not documented choreography): which beat each change lands on, the number of turns, every amplitude.
// PROVISIONAL TIMING: bound to this game's generated beat grid, never to the video's seconds.
//
// music/drac-arrangement.json `arrangement` rows; tests/drac.mjs fails if a regenerated arrangement moves them.
// The song is the score's own order: A twice (1st / 2nd ending), B, C, the whole D, E, the D.S. from bar 6 through bar 51,
// coda, its last note held over the closing roll (docs/drac-music.md).
export const ARRANGEMENT = [[11, 'pickup'], [12, 'A2'], [42, 'B'], [56, 'C'], [72, 'D'], [104, 'E'],
  [128, 'A3'], [132, 'B3'], [146, 'C3'], [162, 'D3'], [194, 'E3'], [218, 'coda'], [225, 'roll']];
export const END_BEAT = 233; // the final hit
export const DRAC_DANCE_SIZE = { h: 4.6, l: 4.2 };

// Sway period in beats per stretch: the body leans to one side, holds, and goes over to the other, like the original
// (one lean lasts 2-4 s, not one bar). Every change sits on a lean's extreme, and the rate itself eases over the 2 beats
// around it (a sudden rate step kept the phase but snapped the speed of every sine of it: travel, whip, reach).
// The D.S. comes half an 8-beat sway early (bar 51 runs straight into bar 6): one faster sway over bar 51 gives the
// half back, so the sway after it leans the way it was tuned to (a plain cut mirrored every later lean).
const DRAC_LENGTHS = { intro: 11, pickup: 1, A1: 14, A2: 30, B: 14, C: 16, D: 32, E: 24, A3: 4, B3: 14, C3: 16, D3: 32, E3: 24, coda: 7, roll: 8 };
// The D.S. half-sway is E + 20; it travels with its label. (D3 / E3: rows for edited forms that play a later D / E.)
const DRAC_PERIOD_CUES = { intro: [[0, 8]], pickup: [[0, 8]], A1: [[0, 8]], A2: [[0, 8]], B: [[0, 8]], C: [[0, 8]], D: [[0, 4]], E: [[0, 8], [20, 4]], A3: [[0, 8]], B3: [[0, 8]], C3: [[0, 8]], D3: [[0, 4]], E3: [[0, 8]], coda: [[0, 8]], roll: [[0, 8]] };
const PI = Math.PI, DEG = PI / 180, smooth = k => k * k * (3 - 2 * k), clamp01 = k => Math.min(1, Math.max(0, k));
// A pulse on every `period` beats, 1 on the downbeat, a smooth bump around it (never a reset at the bar line: an
// exp(-(beat % 2)) decay jumped from ~0 back to 1 on each downbeat, the wings every 2 bars, jaws/fire/shake every bar).
// `n` sharpens it; it is defined for any beat, negative too.
const pulse = (beat, period, n) => (0.5 + 0.5 * Math.cos(beat / period * 2 * PI)) ** n;
const sat = k => (k < 0.8 ? k : 1 - 0.2 * Math.exp((0.8 - k) / 0.2)); // min(1, k) without the kink: slope 1 up to 0.8, then eases into 1
const STYLE = { // per style: roll deg (side to side, one side per bar), pitch sway deg, neck sway amount 0-1, jaw chomp 0-1,
  // wing flap 0-1, hop m, travel m, drive 0-1 (how lively the head/tail/wing groove is), fire 0-1 on the downbeats
  pickup: [4, 2, 0.3, 0.2, 0.1, 0.04, 0, 0.3, 0], intro: [2, 1, 0.2, 0, 0, 0.02, 0, 0.2, 0],
  A1: [10, 3, 0.45, 0.2, 0.2, 0.07, 0.15, 0.5, 0], A2: [20, 5, 0.6, 0.35, 0.4, 0.1, 0.3, 0.7, 0], A3: [24, 5, 0.7, 0.4, 0.5, 0.11, 0.35, 0.8, 0.3],
  B: [34, 6, 0.75, 0.5, 0.6, 0.12, 0.4, 0.85, 0], B3: [42, 6, 0.85, 0.55, 0.7, 0.13, 0.45, 0.9, 0.5],
  C: [26, 8, 0.9, 0.6, 0.6, 0.12, 0.3, 0.9, 0], C3: [30, 8, 1, 0.65, 0.7, 0.13, 0.35, 0.95, 0.6],
  D: [40, 9, 1, 0.8, 0.9, 0.16, 0.6, 1, 0.8, 1], D3: [44, 10, 1, 0.9, 1, 0.18, 0.7, 1, 1, 1],
  E: [38, 6, 0.8, 0.5, 0.6, 0.12, 0.4, 0.9, 0.5], E3: [44, 7, 0.9, 0.6, 0.8, 0.14, 0.5, 0.95, 0.8],
  coda: [14, 4, 0.6, 0.4, 0.5, 0.08, 0.2, 0.7, 0.4], roll: [0, 0, 0.3, 0.3, 0.3, 0, 0, 0.6, 0.3],
};
// Heading keys [beat, half-turns]: 0 = front to the plaça. Unwrapped, smoothstep between: each turn starts and ends at rest.
const DRAC_YAW_CUES = {
  intro: [[0, 0]], B: [[0, 0], [4, 1], [10, 1], [14, 2]], C: [[16, 0]], D: [[8, 2], [16, 2], [24, 4], [32, 4]],
  E: [[12, 0], [20, 2], [24, 2]], A3: [[4, 0]], B3: [[6, 1], [14, 1]], C3: [[6, 1]],
  D3: [[8, 2], [16, 2], [24, 4], [32, 4]], E3: [[8, 0], [16, 2], [24, 2]], roll: [[4, 0]],
};
// The last rear belongs to coda, with its release extending three beats into the closing roll.
const DRAC_REAR_CUES = { C: [[8, 16]], coda: [[4, 8]] }; // C3 has no rear (its rows predate the full D.S.)
const DRAC_CROUCH_CUES = { roll: [[0, 4]] };
export const newDracPose = () => ({ practice: false, beat: 0, yaw: 0, roll: 0, pitch: 0, lift: 0, crouch: 0, x: 0, z: 0, drive: 0, swing: 0, reach: 0, jaw: 0,
  flap: 0, whip: 0, shake: 0, fire: 0, rear: 0 });

export function makeDracDance({ arrangement, end }) {
  const raw = makeDracChoreography(arrangement, end);
  return { pose: sameDanceForm(arrangement, end, ARRANGEMENT, END_BEAT) ? raw.pose : boundedDance(raw.pose, dracPose, newDracPose, end, END_BEAT) };
}
function makeDracChoreography(arrangement, end) {
  const sections = danceSections(arrangement, end, DRAC_LENGTHS);
  const PERIOD = danceCues(sections, DRAC_PERIOD_CUES, DRAC_LENGTHS, 'period');
  const YAW = danceCues(sections, DRAC_YAW_CUES, DRAC_LENGTHS, 'yaw');
  const windows = table => sections.flatMap(({ start, stop, key }) => (table[key] ?? []).map(([a, b]) => {
    const scale = Math.min(1, (stop - start) / DRAC_LENGTHS[key]);
    return [start + a * scale, start + b * scale];
  }));
  const REAR = windows(DRAC_REAR_CUES), CROUCH = windows(DRAC_CROUCH_CUES);
  const ARRANGEMENT = sections.filter(s => s.start !== 0 || s.key !== 'intro').map(s => [s.start, s.key]);
  if (!ARRANGEMENT.length) ARRANGEMENT.push([end, 'intro']);
  const END_BEAT = end;
  const PHASE0 = PERIOD.map(() => 0);
  for (let i = 1; i < PERIOD.length; i++) PHASE0[i] = PHASE0[i - 1] + (PERIOD[i][0] - PERIOD[i - 1][0]) / PERIOD[i - 1][1] * 2 * PI;
  function phaseAt(beat) {
    let i = PERIOD.length - 1;
    while (i > 0 && beat < PERIOD[i][0]) i--;
    let ph = PHASE0[i] + (beat - PERIOD[i][0]) / PERIOD[i][1] * 2 * PI;
    // the rate eases from the old period to the new over [change - 1, change + 1]: the integral of that smoothstep minus
    // the step's; it is 0 at both ends, so outside the 2 beats (and every lean extreme) the phase is the step's exactly
    for (let j = 1; j < PERIOD.length; j++) {
      const t = beat - PERIOD[j][0];
      if (t <= -1 || t >= 1) continue;
      const u = (t + 1) / 2, df = 2 * PI * (1 / PERIOD[j][1] - 1 / PERIOD[j - 1][1]);
      ph += df * (2 * u * u * u - u * u * u * u - Math.max(0, t));
    }
    return ph;
  }

  const ROW = new Array(10).fill(0); // the style row in force, cross-faded over 2 beats from the previous style's (no jumps at section starts)
  const ROOT_ROW = new Array(10).fill(0); // dracRoot's own: sampling another beat never overwrites a pose's ROW
  function styleRow(beat, row = ROW) {
    let i = ARRANGEMENT.length - 1;
    while (i > 0 && beat < ARRANGEMENT[i][0]) i--;
    const first = beat < ARRANGEMENT[0][0];
    const cur = STYLE[first ? 'intro' : ARRANGEMENT[i][1]], prev = STYLE[first || i === 0 ? 'intro' : ARRANGEMENT[i - 1][1]];
    // the fade ends by the next section (the 1-beat pickup): the next one then starts from this style, fully in force
    const len = i + 1 < ARRANGEMENT.length ? ARRANGEMENT[i + 1][0] - ARRANGEMENT[i][0] : 2;
    const w = first ? 1 : smooth(clamp01((beat - ARRANGEMENT[i][0]) / Math.min(2, len)));
    for (let j = 0; j < 10; j++) row[j] = (prev[j] || 0) + ((cur[j] || 0) - (prev[j] || 0)) * w;
    return row;
  }
  function yawAt(beat) {
    if (beat <= YAW[0][0]) return YAW[0][1];
    for (let i = 1; i < YAW.length; i++) {
      const [b1, y1] = YAW[i];
      if (beat < b1) { const [b0, y0] = YAW[i - 1]; return y0 + (y1 - y0) * smooth((beat - b0) / (b1 - b0)); }
    }
    return YAW[YAW.length - 1][1];
  }
  const env = (list, beat, ramp = 2) => { // 0..1: eased in over `ramp` beats, held, eased out over the last beat
    for (const [a, b] of list) if (beat >= a - ramp && beat < b + 1) return smooth(clamp01((beat - (a - ramp)) / ramp)) * smooth(clamp01((b + 1 - beat) / 1));
    return 0;
  };

  // Where the root stands on the floor: x/z travel (settled by the final hit) from the sway phase. dracPose and dracRoot
  // both go through it, so the feet (game/drac-feet.js) plan on the very root the body dances on. Returns the phase.
  function rootWith(out, beat, travel) {
    const ph = phaseAt(beat), e = smooth(clamp01(beat - END_BEAT));
    out.x = -travel * 1.4 * Math.sin(ph) * 0.5 * (1 - e); out.z = travel * 1.4 * 0.25 * Math.sin(2 * ph) * (1 - e);
    return ph;
  }
  // The root alone ({x, z, yaw}) at any beat of the song, or of the practice in its pose's beat (20..36, any beat wraps).
  function root(out, beat, practice) {
    if (practice) { rootWith(out, 20 + mod16(beat - 20), STYLE.A1[6]); out.yaw = 0; } else { rootWith(out, beat, styleRow(beat, ROOT_ROW)[6]); out.yaw = yawAt(beat); }
    return out;
  }
  const mod16 = b => b - 16 * Math.floor(b / 16); // exact on [0, 16): the practice pose's own beat maps to itself

  const pose = (out, beat) => { out.practice = false; return poseWith(out, beat, styleRow(beat)); };
  function poseWith(out, beat, S) {
    const F = S[9] || 0; // F: the frenzy (D) weight
    const rearE = env(REAR, beat), crouchE = env(CROUCH, beat, 1.5);
    out.yaw = yawAt(beat);
    const ph = rootWith(out, beat, S[6]), side = Math.cos(ph); // one lean per half period, held at the extremes
    const hop = Math.sin(beat * PI) ** 2; // a hop on every beat, landing softly (|sin| hit the floor at full speed)
    out.beat = beat;
    out.roll = S[0] * DEG * side * (1 - rearE * 0.8) * (1 - crouchE);
    out.pitch = (S[1] * DEG * Math.cos(2 * ph)) * (1 - rearE) - rearE * 32 * DEG + crouchE * 10 * DEG;
    out.lift = S[5] * 1.6 * hop * (1 - crouchE) + rearE * 0.12;
    out.crouch = crouchE * 0.7;
    out.drive = S[7];
    out.swing = S[2]; // neck sway amount; the motion module phases it per neck
    out.reach = rearE + (0.15 + 0.25 * F) * Math.sin(ph / 2);
    out.jaw = sat(S[3] * (0.25 + 0.75 * pulse(beat, 2, 3)) + rearE + crouchE * 0.4); // the jaws open wide on every bar's downbeat
    out.flap = S[4] * pulse(beat, 4, 3) * 0.6 + rearE * 0.7; // the wings open a little on every second bar, wider when she rears
    out.whip = S[7] * Math.sin(ph) * 0.8 + F * 0.4 * Math.sin(2 * ph);
    // a tremble under the drum rolls (2 a beat: 60 rad a beat aliased into jitter at 60 fps) and a jolt on each downbeat
    out.shake = crouchE * 0.05 * Math.sin(beat * 4 * PI) + S[5] * 0.3 * pulse(beat, 2, 6);
    // a flare on each bar's downbeat; the rear burns more once the fire part has begun (eased in with the style)
    out.fire = sat(S[8] * pulse(beat, 2, 2) + crouchE * 0.4 + rearE * (0.2 + 0.3 * smooth(clamp01(S[8] / 0.3))));
    out.rear = rearE;
    const e = smooth(clamp01(beat - END_BEAT)); // the final hit: heads up, jaws wide, still (over a beat: half of one snapped)
    if (e > 0) {
      out.roll *= 1 - e; out.lift *= 1 - e; out.crouch *= 1 - e; out.shake *= 1 - e;
      out.flap *= 1 - e; out.whip *= 1 - e; out.drive *= 1 - e; // still: no wing beats, tail or neck groove after it
      out.pitch += (-20 * DEG - out.pitch) * e;
      out.jaw += (1 - out.jaw) * e; out.reach += (1 - out.reach) * e; out.rear += (1 - out.rear) * e;
      out.fire = out.fire * (1 - e) + e * (1 - smooth(clamp01((beat - END_BEAT) / 1.7))); // one last blast, burning out
    }
    return out;
  }

  // The practice teaches the buttons, not the song: it stays front on and calm. A1's style throughout, so the 16-beat loop
  // (two sways) wraps onto the same pose (the song's own beats there are A2's: a jump on every wrap).
  function practice(out, beat) {
    poseWith(out, 20 + (((beat % 16) + 16) % 16), STYLE.A1);
    out.yaw = 0; out.fire = 0; out.practice = true;
    return out;
  }
  return { pose, root, practice };
}
const DRAC_DEFAULT = makeDracChoreography(ARRANGEMENT, END_BEAT);
export const dracPose = DRAC_DEFAULT.pose;
export const dracRoot = DRAC_DEFAULT.root;
export const dracPractice = DRAC_DEFAULT.practice;
