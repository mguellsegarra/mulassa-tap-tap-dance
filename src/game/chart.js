import { tr } from '../i18n/messages.js';
import { beatAtTime, timeAtBeat } from '../core/beat-grid.js';
// The chart comes straight from the arrangement (tools/music/build_taiko.py -> song.notes):
// every tap is a note of the tune, on the song's own beat grid (song.beats: its tempo changes phrase by phrase), so it
// lands exactly on what you hear.
// GUA (red, left; data key "don") on the tune's strong positions, PA (blue, right; "ka") between them.
// GUAPA (Taiko's big notes, `big`; input 'B'), half red half blue, on the musical accents (crashes, the last C,
// the final hit): GUA + PA, both buttons at once for double points (FÀCIL: either one).
// MANTÉN (holds, `end`): the tune's long notes, from NORMAL up (on FÀCIL too in a song with `easyHolds`, the Bou's);
// press on the head and keep it down to `end` (one end, or one per level: the Bou's held runs).
// Each note carries the easiest difficulty that includes it.
// GLOBUS (Taiko's balloon): over the arrangement's drumrolls you mash either side to pop it.
// The mulassa's dance is not in the chart: it follows the song (dance.js), the same on every difficulty; hits only accent it.
export const DIFFS = ['easy', 'normal', 'hard'].map(k => ({ name: tr(`game.diff.${k}.name`) }));

export const sectionAt = (song, t) => (song.sections.filter(([s]) => s <= t).pop() ?? song.sections[0])[1]; // before the first section: the first one

const INPUT = { don: 'L', ka: 'R' };
const PUMPS = [1.7, 2.7, 4]; // taps per beat needed to pop, per difficulty

export function makeDanceChart(song, diff) {
  const B = song.beats;
  const windows = (song.balloons ?? song.balloonBeats ?? []).filter(([a, b]) => Number.isFinite(B[a]) && Number.isFinite(B[b]) && B[b] > B[a]);
  const inBalloon = t => windows.some(([a, b]) => t > B[a] - 1e-3 && t < B[b] - 1e-3);
  const notes = song.notes.filter(([t, , level]) => level <= diff && !inBalloon(t)).map(([t, kind, , big, holdEnd]) => {
    const phrase = Math.floor(Math.floor(beatAtTime(B, t) + 0.01) / 8), input = INPUT[kind];
    return { t, phrase, input: big ? 'B' : input, big: !!big, end: diff > 0 || song.easyHolds ? (Array.isArray(holdEnd) ? holdEnd[diff] : holdEnd) || 0 : 0 };
  });
  const balloons = windows.map(([a, b]) => ({ t: B[a], end: B[b], balloon: true, need: Math.round((b - a) * PUMPS[diff]), input: 'P', phrase: Math.floor(a / 8) }));
  return [...notes, ...balloons].sort((x, y) => x.t - y.t);
}
// A drum run's chart (docs/agents/drum-mode.md): written for the drum in song beats, [beat, kind, endBeat, need] per level.
// The touch game's notes, so they draw and judge as always: d GUA (the left face), k PA (the right face), D and K a GUAPA
// (both rims), r a roll (every hit counts, never judged), b a balloon.
const DRUM_INPUT = { d: 'L', k: 'R', D: 'B', K: 'B' };
// A figure with no chart of its own plays its touch chart on the drum, every MANTÉN (which a drum cannot hold: each hit
// is a ~55 ms pulse) a roll over the same span; the rest plays as it is (faces GUA / PA, both rims a GUAPA).
export const drumFromTouch = chart => chart.map(n => (n.end && !n.balloon ? { t: n.t, end: n.end, roll: true, input: 'P', phrase: n.phrase } : n));
export function makeDrumChart(song, chart, diff) {
  const at = beat => timeAtBeat(song.beats, beat);
  return chart.levels[diff].map(([beat, kind, endBeat, need]) => {
    const t = at(beat), phrase = Math.floor(Math.floor(beat + 0.01) / 8);
    if (kind === 'r') return { t, end: at(endBeat), roll: true, input: 'P', phrase };
    if (kind === 'b') return { t, end: at(endBeat), balloon: true, need, input: 'P', phrase };
    if (!DRUM_INPUT[kind]) throw new RangeError(`Unknown drum chart event: ${kind}`);
    return { t, phrase, input: DRUM_INPUT[kind], big: DRUM_INPUT[kind] === 'B', end: 0 };
  }).sort((x, y) => x.t - y.t);
}
