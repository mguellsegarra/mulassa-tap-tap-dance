// The chart comes straight from the arrangement (tools/build_taiko.py -> song.notes):
// every tap is a note of the tune, on a constant BPM grid (song.bpm), so it lands exactly on what you hear.
// GUA (red, left; data key "don") on the tune's strong positions, PA (blue, right; "ka") between them.
// GUAPA (Taiko's big notes, `big`; input 'B'), half red half blue, on the musical accents (crashes, the last C,
// the final hit): GUA + PA, both buttons at once for double points (FÀCIL: either one).
// MANTÉN (holds, `end`): the tune's long notes, from NORMAL up; press on the head and keep it down to `end`.
// Each note carries the easiest difficulty that includes it.
// GLOBUS (Taiko's balloon): over the arrangement's drumrolls you mash either side to pop it.
// The mulassa's dance is not in the chart: it follows the song (dance.js), the same on every difficulty; hits only accent it.
export const DIFFS = [{ name: 'FÀCIL', sub: 'Només les notes principals' }, { name: 'NORMAL', sub: 'Tota la melodia, al temps' }, { name: 'DIFÍCIL', sub: 'Totes les notes' }];

export const sectionAt = (song, t) => (song.sections.filter(([s]) => s <= t).pop() ?? song.sections[0])[1]; // before the first section: the first one

const INPUT = { don: 'L', ka: 'R' };
export const BALLOONS = [[140, 143], [240, 243], [308, 312]]; // beat windows [start, end)
const PUMPS = [1.7, 2.7, 4]; // taps per beat needed to pop, per difficulty

export function makeDanceChart(song, diff) {
  const spb = 60 / song.bpm, b0 = song.beats[0], B = song.beats;
  const inBalloon = t => BALLOONS.some(([a, b]) => t > B[a] - 1e-3 && t < B[b] - 1e-3);
  const notes = song.notes.filter(([t, , level]) => level <= diff && !inBalloon(t)).map(([t, kind, , big, holdEnd]) => {
    const phrase = Math.floor(Math.floor((t - b0) / spb + 0.01) / 8), input = INPUT[kind];
    return { t, phrase, input: big ? 'B' : input, big: !!big, end: diff > 0 ? holdEnd || 0 : 0 };
  });
  const balloons = BALLOONS.map(([a, b]) => ({ t: B[a], end: B[b], balloon: true, need: Math.round((b - a) * PUMPS[diff]), input: 'P', phrase: Math.floor(a / 8) }));
  return [...notes, ...balloons].sort((x, y) => x.t - y.t);
}
