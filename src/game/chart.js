import { tr } from '../i18n/messages.js';
import { beatAtTime } from '../core/beat-grid.js';
// The chart comes straight from the arrangement (tools/build_taiko.py -> song.notes):
// every tap is a note of the tune, on the song's own beat grid (song.beats: its tempo changes phrase by phrase), so it
// lands exactly on what you hear.
// GUA (red, left; data key "don") on the tune's strong positions, PA (blue, right; "ka") between them.
// GUAPA (Taiko's big notes, `big`; input 'B'), half red half blue, on the musical accents (crashes, the last C,
// the final hit): GUA + PA, both buttons at once for double points (FÀCIL: either one).
// MANTÉN (holds, `end`): the tune's long notes, from NORMAL up; press on the head and keep it down to `end`.
// Each note carries the easiest difficulty that includes it.
// GLOBUS (Taiko's balloon): over the arrangement's drumrolls you mash either side to pop it.
// The mulassa's dance is not in the chart: it follows the song (dance.js), the same on every difficulty; hits only accent it.
export const DIFFS = ['easy', 'normal', 'hard'].map(k => ({ name: tr(`game.diff.${k}.name`), sub: tr(`game.diff.${k}.sub`) }));

export const sectionAt = (song, t) => (song.sections.filter(([s]) => s <= t).pop() ?? song.sections[0])[1]; // before the first section: the first one

const INPUT = { don: 'L', ka: 'R' };
const PUMPS = [1.7, 2.7, 4]; // taps per beat needed to pop, per difficulty

export function makeDanceChart(song, diff) {
  const B = song.beats;
  const windows = (song.balloons ?? song.balloonBeats ?? BALLOONS).filter(([a, b]) => Number.isFinite(B[a]) && Number.isFinite(B[b]) && B[b] > B[a]);
  const inBalloon = t => windows.some(([a, b]) => t > B[a] - 1e-3 && t < B[b] - 1e-3);
  const notes = song.notes.filter(([t, , level]) => level <= diff && !inBalloon(t)).map(([t, kind, , big, holdEnd]) => {
    const phrase = Math.floor(Math.floor(beatAtTime(B, t) + 0.01) / 8), input = INPUT[kind];
    return { t, phrase, input: big ? 'B' : input, big: !!big, end: diff > 0 ? holdEnd || 0 : 0 };
  });
  const balloons = windows.map(([a, b]) => ({ t: B[a], end: B[b], balloon: true, need: Math.round((b - a) * PUMPS[diff]), input: 'P', phrase: Math.floor(a / 8) }));
  return [...notes, ...balloons].sort((x, y) => x.t - y.t);
}
