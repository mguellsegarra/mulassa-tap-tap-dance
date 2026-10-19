// The Drac's one time map: song seconds (song-drac.json's audio clock and its `beats` grid) <-> REFERENCE seconds (the
// source video's clock, which game/drac-path.js is authored in). The anchors are the music form's `reference` block,
// written by tools/build_drac.py as song.ref [[songSec, refSec]] (rising in both, the last on song.refEnd): the video's
// pulse at every phrase start (docs/drac-music.md). A monotone C1 cubic through them (drac-path.js's track / at); before
// the first anchor the Drac waits (ref 0: the count-in), after the last it holds refEnd. Pure, no allocations per call.
import dracSong from '../song-drac.json' with { type: 'json' };
import { beatAtTime } from '../core/beat-grid.js';
import { track, at } from './drac-path.js';

export function createDracTime(song) {
  const R = song.ref, n = R.length, B = song.beats;
  if (!(n >= 2)) throw new RangeError('song.ref needs two anchors');
  // track() rests at its end keys: one key past each end at the neighbouring rate keeps the map's pace up to them
  const rate = (a, b) => (b[1] - a[1]) / (b[0] - a[0]);
  const F = track([[R[0][0] - 1, R[0][1] - rate(R[0], R[1])], ...R, [R[n - 1][0] + 1, R[n - 1][1] + rate(R[n - 2], R[n - 1])]]);
  const s0 = R[0][0], s1 = R[n - 1][0], r0 = R[0][1], r1 = R[n - 1][1];
  const refAt = t => (t <= s0 ? r0 : t >= s1 ? r1 : at(F, t));
  const rateAt = t => (t <= s0 || t >= s1 ? 0 : at(F, t, true)); // reference seconds per song second
  function songAtRef(r) {
    if (!(r > r0)) return s0;
    if (r >= r1) return s1;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (R[m][1] <= r) lo = m; else hi = m; }
    let a = R[lo][0], b = R[hi][0], t = a + (r - R[lo][1]) * (b - a) / (R[hi][1] - R[lo][1]);
    for (let i = 0; i < 40; i++) { // Newton inside the anchors' bracket; bisect when a step would leave it
      const f = at(F, t) - r;
      if (Math.abs(f) < 1e-11) break;
      if (f > 0) b = t; else a = t;
      const d = at(F, t, true), next = t - f / d;
      t = d > 0 && next > a && next < b ? next : (a + b) / 2;
    }
    return t;
  }
  const pickupBeat = song.arrangement.find(([, label]) => label === 'pickup')[0];
  return {
    refAt, songAtRef, rateAt,
    beatAt: t => beatAtTime(B, t), // the game's own grid (figure-song.js beatAt for the Drac)
    beatAtRef: r => beatAtTime(B, songAtRef(r)),
    pickup: B[pickupBeat], // song seconds of the pickup note
    refEnd: song.refEnd,
  };
}
export const dracTime = createDracTime(dracSong);
