// The Mulassa's previous, beat-based choreography (the game now dances the reference-led one, figures/mulassa/mula-dance.js; this
// one still poses the share photo's still) and the dance factories the Drac's beat dance shares: where she faces and how
// she sways at any musical moment. Pure, no three.js,
// no randomness, no allocations: dancePose(out, beat) fills a reused pose, so a seek (?from), a pause or a restart
// shows the right pose directly, without integrating earlier frames. `beat` is the arrangement's beat index
// (song.beats[i] is beat i; main.js beatAt() turns song time, sync offset included, into it).
//
// OBSERVED in three Arditproduccions videos: front / three-quarter with a swaying lean -> about half a turn to show the rear -> rear held, with lateral lean -> back to the front -> livelier turns
// with lean, pitching and some lift -> successive turns -> front, settling.
// ARTISTIC ADAPTATION (not documented choreography): the beat each change lands on, the number of turns, their
// direction (to her left, seen in one clear sequence, not a rule), every amplitude and the sway periods.
// PROVISIONAL TIMING: bound to this game's fixed-tempo arrangement, never to the videos' seconds (rubato, fermatas).
import { DEG, smooth } from '../core/math.js';

// The arrangement's sections from the pickup on (music/mulassa/taiko-arrangement.json). tests/figures/mulassa/dance.mjs fails if a
// regenerated arrangement moves them, so the cues below can't silently drift off the music.
// The short cut: the song as it was up to bar 31 (beat 174), then bar 49 on (C, X, the roll) 84 beats earlier; the
// break, A' and B' are not played, so neither is their choreography.
export const ARRANGEMENT = [[12, 'pickup'], [16, 'A1'], [80, 'A2'], [144, 'B'], [176, 'C'], [208, 'X'], [224, 'roll']];
export const END_BEAT = 228; // the final hit

// Every cue is [offset from its label start, value...]. Boundary turns belong to the section ending there.
// Turn amounts are relative too: repeating a section continues around instead of unwinding.
const MULA_LENGTHS = { intro: 12, pickup: 4, A1: 64, A2: 64, B: 32, C: 32, X: 16, roll: 4 };
const MULA_YAW = {
  intro: [[0, 0]], A1: [[56, 0], [64, 1]], A2: [[56, 0], [64, 1]],
  B: [[6, 1], [24, 1], [32, 2]], C: [[12, 2], [16, 2], [28, 4], [32, 4]], X: [[8, 2], [16, 4]],
};
const MULA_STYLE = {
  intro: [[0, 3, 1, 0, 0, 0.02, 0, 0.2, 0]], pickup: [[0, 6, 2, 0, 3, 0.04, 0.1, 0.4, 0.3]],
  A1: [[0, 15, 4, 0, 8, 0.05, 0.3, 0.7, 0.6], [56, 15, 4, 0, 8, 0.05, 0.1, 0.7, 0.6]],
  A2: [[0, 19, 4, 0, 9, 0.05, 0.2, 0.7, 0.7], [52, 19, 4, 0, 9, 0.05, 0.2, 0.7, 0.7], [60, 16, 4, -6, 10, 0.05, 0.1, 0.85, 0.8]],
  B: [[2, 26, 7, 0, 15, 0.08, 0.1, 1, 1.3], [28, 26, 7, 0, 15, 0.08, 0.1, 1, 1.3]],
  C: [[0, 27, 6, 0, 15, 0.08, 0, 1, 1.5]],
  X: [[0, 28, 7, 0, 16, 0.08, 0, 1, 1.7], [14, 28, 7, 0, 16, 0.08, 0, 1, 1.7]],
  roll: [[4, 3, 1, -3, 0, 0.02, 0, 0.4, 0.5], [10, 1, 0.5, 0, 0, 0.01, 0, 0.3, 0]],
};
const MULA_PERIOD = { intro: [[0, 8]], pickup: [[0, 8]], A1: [[0, 8]], A2: [[0, 8]], B: [[0, 4], [28, 8]], C: [[0, 4]], X: [[0, 4]], roll: [[0, 8]] };
const PI = Math.PI;
export const DANCE_SIZE = { h: 4.03, l: 4.22 }; // her height and length (models.js buildMulassa), metres
const L = DANCE_SIZE.l;
const REAR = 1.5; // m from her middle to the hem the rear carriers keep on the ground while the front is thrown up

export const newPose = () => ({ yaw: 0, roll: 0, pitch: 0, lift: 0, x: 0, z: 0, drive: 0, rollAmp: 0, pitchAmp: 0, pitchBias: 0, hopAmp: 0, travel: 0, glance: 0, shakeAmp: 0, shake: 0 });

// [beat, value] keys eased from one to the next (smoothstep), held before the first and after the last: a dance's heading cues
export function smoothKeys(keys, beat) {
  if (beat <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [b1, y1] = keys[i];
    if (beat < b1) { const [b0, y0] = keys[i - 1]; return y0 + (y1 - y0) * smooth((beat - b0) / (b1 - b0)); }
  }
  return keys[keys.length - 1][1];
}
export function makeDance({ arrangement, end }) {
  const raw = makeMulaChoreography(arrangement, end);
  return { pose: sameDanceForm(arrangement, end, ARRANGEMENT, END_BEAT) ? raw.pose : boundedDance(raw.pose, dancePose, newPose, end, END_BEAT) };
}
function makeMulaChoreography(arrangement, end) {
  const sections = danceSections(arrangement, end, MULA_LENGTHS);
  const YAW = danceCues(sections, MULA_YAW, MULA_LENGTHS, 'yaw');
  const STYLE = danceCues(sections, MULA_STYLE, MULA_LENGTHS, 'style');
  if (STYLE.length < 2) STYLE.push([end, ...STYLE[0].slice(1)]);
  const PERIOD = danceCues(sections, MULA_PERIOD, MULA_LENGTHS, 'period');
  const PHASE0 = PERIOD.map(() => 0);
  for (let i = 1; i < PERIOD.length; i++) PHASE0[i] = PHASE0[i - 1] + (PERIOD[i][0] - PERIOD[i - 1][0]) / PERIOD[i - 1][1] * 2 * PI;
  function stretchAt(beat) {
    let i = PERIOD.length - 1;
    while (i > 0 && beat < PERIOD[i][0]) i--;
    return i;
  }
  function style(beat, out) { // interpolates the style row into `out` (no arrays created)
    let i = 1;
    while (i < STYLE.length - 1 && beat >= STYLE[i][0]) i++;
    const a = STYLE[i - 1], b = STYLE[i], k = Math.min(1, Math.max(0, (beat - a[0]) / (b[0] - a[0])));
    out.rollAmp = (a[1] + (b[1] - a[1]) * k) * DEG; out.pitchAmp = (a[2] + (b[2] - a[2]) * k) * DEG; out.pitchBias = (a[3] + (b[3] - a[3]) * k) * DEG;
    out.hopAmp = (a[4] + (b[4] - a[4]) * k) * DEG; out.travel = (a[5] + (b[5] - a[5]) * k) * L; out.glance = (a[6] + (b[6] - a[6]) * k); out.drive = (a[7] + (b[7] - a[7]) * k); out.shakeAmp = (a[8] + (b[8] - a[8]) * k) * DEG;
  }

  // Pose channels: yaw (rad, unwrapped, + = towards her left), roll (body.rotation.z, + tilts her top to her right),
  // pitch (body.rotation.x, + = nose down), lift (m), x / z: local travel of the whole figure in her own frame
  // (x = her left, z = forward), drive (0-1: how lively the secondary groove of head, ears and legs is), shake (rad:
  // the landing's buzz, added to roll and pitch by the caller).

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

  function pose(out, beat) {
    style(beat, out);
    out.yaw = smoothKeys(YAW, beat);
    return sway(out, beat);
  }

  // The practice teaches the buttons, not the song: she stays front on, with the A section's restrained sway,
  // so its prompts never land in the middle of a turn.
  function practice(out, beat) {
    style(40, out);
    out.yaw = 0;
    return sway(out, 32 + ((beat % 16) + 16) % 16); // two sway periods: the glance repeats too, seamlessly
  }
  return { pose, practice };
}
const MULA_DEFAULT = makeMulaChoreography(ARRANGEMENT, END_BEAT);
export const dancePose = MULA_DEFAULT.pose;
export const practicePose = MULA_DEFAULT.practice;

// Shared compilation helpers. Unknown labels use their family (B3 -> B), then the preceding recognised style.
export function danceSections(arrangement, end, lengths) {
  if (!Number.isFinite(end) || end <= 0) throw new RangeError('Dance end must be positive');
  const rows = arrangement.map(([beat, label]) => [beat, label]);
  if (!rows.length || rows[0][0] > 0) rows.unshift([0, 'intro']);
  let previous = 'intro';
  return rows.map(([start, label], i) => {
    const stop = rows[i + 1]?.[0] ?? end;
    if (!Number.isFinite(start) || start < 0 || stop <= start) throw new RangeError('Dance sections must increase before end');
    const family = label.replace(/[0-9]+$/, '');
    const key = lengths[label] ? label : lengths[family] ? family : family === 'A' ? (lengths.A1 ? 'A1' : 'A2') : previous;
    previous = key;
    return { start, stop, key, label };
  });
}
export function sameDanceForm(arrangement, end, baseline, baselineEnd) {
  const rows = arrangement.filter(([b, label]) => b !== 0 || label !== 'intro');
  return end === baselineEnd && rows.length === baseline.length && rows.every(([b, label], i) => b === baseline[i][0] && label === baseline[i][1]);
}
export function danceCues(sections, table, lengths, kind) {
  const result = [];
  let turns = 0;
  for (const section of sections) {
    const { start, stop, key } = section, length = lengths[key], scale = Math.min(1, (stop - start) / length);
    const cues = table[key] ?? [];
    if (kind === 'yaw' && (!result.length || result[result.length - 1][0] < start)) result.push([start, turns * Math.PI]);
    for (const [offset, ...values] of cues) {
      if (offset > length && section !== sections[sections.length - 1]) continue; // settling tails belong only to the ending
      const beat = start + offset * scale;
      if (kind === 'yaw') values[0] = (turns + values[0] * scale) * Math.PI;
      if (kind === 'period' && result.length && result[result.length - 1][1] === values[0]) continue;
      if (result.length && result[result.length - 1][0] === beat) result.pop();
      result.push([beat, ...values]);
    }
    if (kind === 'yaw') {
      if (cues.length) turns += cues[cues.length - 1][1] * scale;
      if (result[result.length - 1][0] < stop) result.push([stop, turns * Math.PI]);
    }
  }
  if (!result.length) result.push([0, kind === 'period' ? 8 : 0]);
  return result;
}

// Compile edited poses once. Short clips can demand impossibly fast changes (a 32-beat turn in half a beat).
// Follow those cues at <= 80% of the baseline channel's measured maximum speed. This deliberately reduces or
// delays gestures in very short sections. A backwards pass removes the abrupt start of a saturated transition.
// The immutable sampled path is seekable; evaluation only interpolates into the caller's object, allocating nothing.
const DANCE_LIMITS = new WeakMap();
export function boundedDance(raw, baseline, createPose, end, baselineEnd) {
  const step = 1 / 64, first = -8, last = end + 64;
  const probe = createPose(), prev = createPose();
  const keys = Object.keys(probe).filter(k => typeof probe[k] === 'number' && k !== 'beat');
  let limits = DANCE_LIMITS.get(baseline);
  if (!limits) {
    limits = keys.map(() => 0);
    baseline(prev, first);
    for (let beat = first + step; beat <= baselineEnd + 16; beat += step) {
      baseline(probe, beat);
      for (let j = 0; j < keys.length; j++) { const k = keys[j]; limits[j] = Math.max(limits[j], Math.abs(probe[k] - prev[k]) / step); prev[k] = probe[k]; }
    }
    DANCE_LIMITS.set(baseline, limits);
  }
  const count = Math.ceil((last - first) / step) + 1, data = new Float64Array(count * keys.length);
  for (let i = 0; i < count; i++) {
    raw(probe, first + i * step);
    for (let j = 0; j < keys.length; j++) {
      const value = probe[keys[j]], old = i ? data[(i - 1) * keys.length + j] : value, cap = limits[j] * step * 0.8;
      data[i * keys.length + j] = old + Math.max(-cap, Math.min(cap, value - old));
    }
  }
  for (let i = count - 2; i >= 0; i--) for (let j = 0; j < keys.length; j++) data[i * keys.length + j] = (data[i * keys.length + j] + data[(i + 1) * keys.length + j]) / 2;
  return (out, beat) => {
    const position = Math.max(0, Math.min(count - 1, (beat - first) / step)), i = Math.min(count - 2, Math.floor(position)), mix = position - i;
    for (let j = 0; j < keys.length; j++) { const a = data[i * keys.length + j]; out[keys[j]] = a + (data[(i + 1) * keys.length + j] - a) * mix; }
    if ('beat' in out) { out.beat = beat; out.practice = false; }
    return out;
  };
}
