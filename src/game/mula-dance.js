// The Mulassa's dance in the game: the FIGURES of game/mula-figures.js (out and back, the circle, the passada, the
// culades, the charges, the turns on the spot) on the song's own beats, so music, steps and animation share one clock.
// The sway is the music's: its phase runs on the song's beats (a lean every 4 beats in A, every 2 from B on), a little
// more as the music livens (FESTA) and quiet at the end. The eight shoes are planned in song seconds
// (game/mula-supports.js), so seeking, a pause or a restart show the same pose and shoes, and a faster phrase steps faster.
// `time` is the comparator's map from the song to the 2017 reference (game/mula-time.js): the phrases' pairing with the
// video the dance is styled on, no longer what poses her. Pure, no three.js; pose(out, t) fills a reused object.
import mulaSong from '../song.json' with { type: 'json' };
import { beatAtTime } from '../core/beat-grid.js';
import { mulaMotion, mulaTrack } from './mula-path.js';
import { createMulaTime } from './mula-time.js';
import { planSupports } from './mula-supports.js';
import { figureAt, accentAt } from './mula-figures.js';

// How much song time a reference second needs in the comparator's map (game/mula-time.js shares each phrase out by it):
// a turn at 150 deg/s, travel at 1.2 m/s, a tilt cue or swaying in place at 4x take one song second each. Only the
// ratios matter inside a phrase.
export const NEED = { turn: 150 * Math.PI / 180, travel: 1.2, cue: 0.6, rate: 4 };
// Per section label: the sway period (beats), FESTA (extra sway), DRIVE (the head, ears and jaw's beat groove,
// mula-motion.js), the sway's roll / pitch (deg; the 2017 envelope's range, 4-15 / 1.5-13) and the comic layer on every
// beat, the Bou's (game/bou-dance.js; Marc 24/10/2026: «molt sosa»): the carriers' knee dip (m), the waddle a side a beat
// (deg), the nod on the dip (deg) and the see-saw, front and rump up in turn (deg). Each eases in over EASE_BEATS.
const STYLE = {
  intro: [8, 1, 0.3, 3, 1, 0.03, 1, 0.5, 0], intro0: [8, 1, 0.3, 3, 1, 0.03, 1, 0.5, 0], intro1: [8, 1, 0.3, 3, 1, 0.03, 1, 0.5, 0],
  intro2: [8, 1, 0.35, 3, 1, 0.04, 1.5, 0.8, 0], pickup: [8, 1, 0.4, 4, 1.5, 0.05, 2, 1, 0],
  A1: [8, 1, 0.55, 6, 2, 0.06, 2, 1.2, 0], A2: [8, 1.05, 0.65, 8, 3, 0.07, 2.5, 1.5, 0], B: [4, 1.1, 0.85, 12, 6, 0.09, 3, 1.8, 2.5],
  C: [4, 1.15, 0.95, 11, 5, 0.09, 3, 1.8, 3], X: [4, 1.18, 1, 14, 7, 0.1, 3.5, 2, 3.5], roll: [4, 1, 0.5, 8, 3, 0.07, 1.5, 1, 0],
};
const EASE_BEATS = 2, SHIFT = 0.04; // m: the weight shift towards the lean (FESTA only)
const mix = (a, b, c, k) => a[c] + (b[c] - a[c]) * k;
const mulaSmooth = k => k * k * (3 - 2 * k), DEG = Math.PI / 180;
// The comic layer at a beat, the Bou's (game/bou-dance.js): a dip shaped ((1 + cos)/2)^2 peaks on the beat with no kink,
// knees always a little bent; the waddle a side a beat passes the middle on the dip; the nod on the dip and the see-saw,
// front and rump up in turn. k: { dip (m), waddle, nod, seesaw (rad) }; fills out.lift (m, <= 0), roll, pitch (+ = front down).
export function mulaComic(out, beat, k, gain = 1) {
  const c = (1 + Math.cos(2 * Math.PI * beat)) / 2, dip = c * c;
  out.lift = -k.dip * (0.35 + 0.65 * dip) * gain;
  out.roll = k.waddle * Math.sin(Math.PI * beat) * gain;
  out.pitch = (k.nod * dip - k.seesaw * Math.cos(Math.PI * beat)) * gain;
  return out;
}
const MULA_SONG_COMIC = { lift: 0, roll: 0, pitch: 0 };
// Off the song (the splash's and the results' walk, free play standing): the B section's comic layer
export const MULA_COMIC = { dip: STYLE.B[5], waddle: STYLE.B[6] * DEG, nod: STYLE.B[7] * DEG, seesaw: STYLE.B[8] * DEG };
// (shake: no landing buzz in this dance, it would shake the camera; kept so the game's accent code reads one pose shape)
export const newMulaPose = () => ({ x: 0, z: 0, yaw: 0, roll: 0, pitch: 0, headRoll: 0, headYaw: 0, lift: 0, waddle: 0, drive: 0, rollAmp: 0, pitchAmp: 0, shake: 0, beat: 0, ref: 0 });

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
    const [b0, period, festa, drive, roll, pitch] = rows[i], prev = rows[Math.max(0, i - 1)], k = i ? mulaSmooth(Math.min(1, Math.max(0, (beat - b0) / EASE_BEATS))) : 1;
    out.phase = phase0[i] + (beat - b0) / period * 2 * Math.PI + Math.PI / 2; // leans land on the section's strong beats
    out.festa = festive ? prev[2] + (festa - prev[2]) * k : 1;
    out.drive = prev[3] + (drive - prev[3]) * k;
    out.rollAmp = (prev[4] + (roll - prev[4]) * k) * DEG; out.pitchAmp = (prev[5] + (pitch - prev[5]) * k) * DEG;
    out.dip = mix(prev, rows[i], 6, k); out.waddle = mix(prev, rows[i], 7, k) * DEG;
    out.nod = mix(prev, rows[i], 8, k) * DEG; out.seesaw = mix(prev, rows[i], 9, k) * DEG;
    return out;
  }
  // the figures read a C1 beat (monotone Hermite through the grid: no step in her speed where the tempo ramps), the
  // grid's last beat length carried on past its ends
  const grid = beats.map((t, i) => [t, i]), n = beats.length - 1;
  const smoothBeat = t => t <= beats[0] ? (t - beats[0]) / (beats[1] - beats[0])
    : t >= beats[n] ? n + (t - beats[n]) / (beats[n] - beats[n - 1]) : mulaTrack(grid, t);
  const S = {};
  function sway(out, beat, gain) { // the music's sway on the figure, and the carriers' lift
    out.rollAmp = S.rollAmp * gain; out.pitchAmp = S.pitchAmp * gain;
    out.roll = Math.sin(S.phase) * out.rollAmp; out.pitch = -Math.max(0, Math.sin(S.phase * 2)) * out.pitchAmp;
    out.headYaw = 0; out.lift = 0.025 * Math.abs(Math.sin(S.phase)) * gain;
    mulaComic(MULA_SONG_COMIC, beat, S, gain); // (the waddle in its own field: the leans above stay on their strong beats)
    out.lift += MULA_SONG_COMIC.lift; out.waddle = MULA_SONG_COMIC.roll; out.pitch += MULA_SONG_COMIC.pitch;
  }
  function pose(out, t) {
    const beat = beatAtTime(beats, t), b = smoothBeat(t);
    style(beat, S);
    figureAt(b, out);
    const quiet = Math.max(0, Math.min(1, (n + 2 - b) / 3)); // she settles after the final hit
    const gain = (festive ? S.festa : 1) * quiet;
    sway(out, beat, gain);
    accentAt(b, t, out);
    out.headRoll = out.roll * 0.12;
    out.lift += Math.max(0, 1.25 * Math.sin(Math.abs(out.pitch)) - 0.06); // the carriers lift the shell as its front rises
    if (festive) { // a little weight onto the side she leans to, in her own frame (+roll tips her top towards her -x)
      const s = -SHIFT * (S.festa - 1) * quiet / 0.18 * Math.sin(S.phase), c = Math.cos(out.yaw), q = Math.sin(out.yaw);
      out.x += s * c; out.z -= s * q;
    }
    out.drive = S.drive; out.beat = beat; out.ref = time.refAt(t);
    return out;
  }
  // The practice teaches the buttons, not the song: she holds the opening stance and sways like the first A.
  function practice(out, beat) {
    style(16, S); S.phase = beat / 8 * 2 * Math.PI + Math.PI / 2;
    figureAt(0, out); sway(out, beat, 1);
    out.headRoll = out.roll * 0.12;
    out.drive = STYLE.A1[2]; out.beat = beat; out.ref = 0;
    return out;
  }
  const end = (song.tail ?? beats.at(-1)) + 3, supports = planSupports((t, o) => pose(o, t), end, 0);
  return { pose, practice, foot: supports.foot, events: supports.events, time, end };
}
export const mulaDance = makeMulaDance(mulaSong);
