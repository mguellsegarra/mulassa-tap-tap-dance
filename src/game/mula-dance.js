// The Mulassa's dance in the game: the song's seconds go through the one time map (game/mula-time.js) to the reference
// second the reconstruction (game/mula-path.js) is posed at: travel, heading, turns and reversals as validated against the
// 2017 video. The sway is the MUSIC's: its phase runs on the song's beats (a lean every 4 beats in A, every 2 from B on),
// its size is the reference's envelope, a little more as the music livens (FESTA, an artistic adaptation) and quiet at
// the end. The eight shoes are planned in song seconds (game/mula-supports.js), so seeking, a pause or a restart show
// the same pose and shoes, and a faster phrase steps faster instead of stretching a stance.
// Pure, no three.js; pose(out, t) fills a reused object. Frame: the reference's (x right of the opening camera, z towards
// it, yaw + anticlockwise); game/mula-layout.js carries it into the plaça.
import mulaSong from '../song.json' with { type: 'json' };
import { beatAtTime } from '../core/beat-grid.js';
import { mulaMotion, mulaLift } from './mula-path.js';
import { createMulaTime } from './mula-time.js';
import { planSupports } from './mula-supports.js';

// How much song time a reference second needs (game/mula-time.js shares each phrase out by it): a turn at 150 deg/s,
// travel at 1.2 m/s, a tilt cue (the front thrown up, a big lean) or swaying in place at 4x take one song second each
// per `turn`/`travel`/`cue`/`rate`. Only the ratios matter inside a phrase.
export const NEED = { turn: 150 * Math.PI / 180, travel: 1.2, cue: 0.6, rate: 4 };
// Per section label: the sway period (beats), FESTA (extra sway on top of the reference's, which mula-path already
// emphasises by 15%) and DRIVE (the head, ears and jaw's beat groove, mula-motion.js). Each eases in over EASE_BEATS.
const STYLE = {
  intro: [8, 1, 0.3], intro0: [8, 1, 0.3], intro1: [8, 1, 0.3], intro2: [8, 1, 0.35], pickup: [8, 1, 0.4],
  A1: [8, 1, 0.55], A2: [8, 1.05, 0.65], B: [4, 1.1, 0.85], C: [4, 1.15, 0.95], X: [4, 1.18, 1], roll: [4, 1, 0.5],
};
const EASE_BEATS = 2, SHIFT = 0.04; // m: the weight shift towards the lean (FESTA only)
const mulaSmooth = k => k * k * (3 - 2 * k), DEG = Math.PI / 180;
// (shake: no landing buzz in this dance; kept so the game's accent code reads one pose shape)
export const newMulaPose = () => ({ x: 0, z: 0, yaw: 0, roll: 0, pitch: 0, headRoll: 0, lift: 0, drive: 0, rollAmp: 0, pitchAmp: 0, shake: 0, beat: 0, ref: 0 });

export function makeMulaDance(song, { festive = true } = {}) {
  const motion = mulaMotion, A = {}, B = {};
  const need = r => {
    motion.pose(r - 0.025, A); motion.pose(r + 0.025, B);
    const cue = motion.tilts.some(c => Math.abs(r - c.time) < c.radius) ? NEED.cue : 0;
    return Math.max(1 / NEED.rate, cue, Math.abs(B.yaw - A.yaw) / 0.05 / NEED.turn, Math.hypot(B.x - A.x, B.z - A.z) / 0.05 / NEED.travel);
  };
  const time = createMulaTime(song, need), beats = song.beats;
  // the sections as [beat, period, festa, drive], with the sway phase at each start (continuous across period changes)
  const rows = (song.arrangement ?? [[0, 'A1']]).map(([b, label]) => [b, ...(STYLE[label] ?? STYLE[label.replace(/[0-9]+$/, '')] ?? STYLE.A1)]);
  const phase0 = rows.map(() => 0);
  for (let i = 1; i < rows.length; i++) phase0[i] = phase0[i - 1] + (rows[i][0] - rows[i - 1][0]) / rows[i - 1][1] * 2 * Math.PI;
  function style(beat, out) { // fills out.phase / festa / drive at a fractional beat
    let i = rows.length - 1;
    while (i > 0 && beat < rows[i][0]) i--;
    const [b0, period, festa, drive] = rows[i], prev = rows[Math.max(0, i - 1)], k = i ? mulaSmooth(Math.min(1, Math.max(0, (beat - b0) / EASE_BEATS))) : 1;
    out.phase = phase0[i] + (beat - b0) / period * 2 * Math.PI + Math.PI / 2; // leans land on the section's strong beats
    out.festa = festive ? prev[2] + (festa - prev[2]) * k : 1;
    out.drive = prev[3] + (drive - prev[3]) * k;
    return out;
  }
  // The reference's tilt cues (a lean through the first turn, the front thrown up at 130 s...) at their song time,
  // never quicker than CUE_MIN s each side: a compressed phrase must not turn them into jolts.
  const CUE_MIN = 0.5, cues = motion.tilts.map(c => {
    const at = time.songAtRef(c.time), rate = Math.max(1e-3, time.rateAt(at));
    return { at, radius: Math.max(CUE_MIN, c.radius / rate), roll: c.roll * DEG, pitch: c.pitch * DEG };
  });
  const S = {};
  function pose(out, t) {
    const beat = beatAtTime(beats, t), r = time.refAt(t);
    style(beat, S);
    motion.pose(r, out, S.phase);
    const quiet = Math.max(0, Math.min(1, (time.refEnd - 1.2 - r) / 3)); // the ending settles before the reference does
    const gain = 1 + (S.festa - 1) * quiet;
    out.roll *= gain; out.pitch *= gain;
    let W = 0, roll = 0, pitch = 0;
    for (const c of cues) {
      const d = Math.min(1, Math.abs(t - c.at) / c.radius), w = 1 - d * d * (3 - 2 * d);
      W += w; roll += w * c.roll * 1.15; pitch += w * c.pitch;
    }
    if (W > 0) { const k = Math.min(1, W); out.roll += (roll / W - out.roll) * k; out.pitch += (pitch / W - out.pitch) * k; }
    out.headRoll = out.roll * 0.12;
    out.lift = mulaLift(out.pitch, S.phase, r);
    if (festive) { // a little weight onto the side she leans to, in her own frame (+roll tips her top towards her -x)
      const s = -SHIFT * (gain - 1) / 0.18 * Math.sin(S.phase), c = Math.cos(out.yaw), n = Math.sin(out.yaw);
      out.x += s * c; out.z -= s * n;
    }
    out.drive = S.drive; out.beat = beat; out.ref = r;
    return out;
  }
  // The practice teaches the buttons, not the song: she holds the opening stance and sways like the first A.
  function practice(out, beat) {
    S.phase = beat / 8 * 2 * Math.PI + Math.PI / 2;
    motion.pose(0, out, S.phase);
    out.headRoll = out.roll * 0.12; out.lift = mulaLift(out.pitch, S.phase, 0);
    out.drive = STYLE.A1[2]; out.beat = beat; out.ref = 0;
    return out;
  }
  const end = (song.tail ?? beats.at(-1)) + 3, supports = planSupports((t, o) => pose(o, t), end, 0);
  return { pose, practice, foot: supports.foot, events: supports.events, time, end };
}
export const mulaDance = makeMulaDance(mulaSong);
