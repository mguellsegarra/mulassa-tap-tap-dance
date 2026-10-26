// The Mulassa's one time map: song seconds (song-mulassa.json's audio clock and its `beats`) <-> REFERENCE seconds (the 2017
// source video, which figures/mulassa/mula-path.js is authored in). Music, chart, steps and animation all read the song clock;
// only this map turns it into the reference's.
// The anchors are the music form's `reference` block (music/mulassa/mulassa-form.json), written by tools/music/build_taiko.py as
// song.ref [[songSec, refSec]]: phrase starts tied to the dance's landmarks (docs: research/bestiari/mulassa/
// game-integration.md). That pairing is an ARTISTIC ADAPTATION: the 166 s performance is told in the game's ~87 s song,
// so no global stretch fits it. Between two anchors the song time is shared out by what the dance does there (`need`,
// figures/mulassa/mula-dance.js: turning and travel take their time, swaying in place goes by quickly), and the rate is eased in
// song time, so a phrase change never jolts a turn. Before the first anchor the reference waits at 0 (the intro), after
// the last it holds refEnd. Built once into a table; refAt/rateAt interpolate it, no allocation per call.
const STEP_REF = 0.02, STEP_SONG = 0.01, EASE = 0.4; // s: need samples, table step, half-width of the rate's easing

export function createMulaTime(song, need) {
  const R = song.ref, n = R?.length;
  if (!(n >= 2)) throw new RangeError('song.ref needs two anchors');
  for (let i = 1; i < n; i++) if (!(R[i][0] > R[i - 1][0] && R[i][1] > R[i - 1][1])) throw new RangeError('song.ref must rise');
  const r0 = R[0][1], r1 = R[n - 1][1], s0 = R[0][0], s1 = R[n - 1][0];
  // cumulative need over the reference, smoothed over ±0.5 s so its own jitter never reaches the rate (prefix sums)
  const count = Math.ceil((r1 - r0) / STEP_REF) + 1, raw = new Float64Array(count + 1), cum = new Float64Array(count);
  for (let i = 0; i < count; i++) raw[i + 1] = raw[i] + need(r0 + i * STEP_REF);
  const half = Math.round(0.5 / STEP_REF), mean = i => { const a = Math.max(0, i - half), z = Math.min(count - 1, i + half); return (raw[z + 1] - raw[a]) / (z - a + 1); };
  for (let i = 1; i < count; i++) cum[i] = cum[i - 1] + mean(i) * STEP_REF;
  const cumAt = r => { const x = Math.max(0, Math.min(count - 1, (r - r0) / STEP_REF)), i = Math.min(count - 2, Math.floor(x)); return cum[i] + (cum[i + 1] - cum[i]) * (x - i); };
  // song second -> reference second, piecewise: inside each anchor pair the song time follows the cumulative need.
  // Asked in rising order, so one forward walk over the cumulative table inverts it.
  const N = R.map(([, r]) => cumAt(r));
  let k = 0, j = 0;
  function piecewise(s) {
    if (s <= s0) return r0;
    if (s >= s1) return r1;
    while (R[k + 1][0] < s) k++;
    const goal = N[k] + (N[k + 1] - N[k]) * (s - R[k][0]) / (R[k + 1][0] - R[k][0]);
    while (j < count - 2 && cum[j + 1] < goal) j++;
    const r = r0 + (j + (goal - cum[j]) / ((cum[j + 1] - cum[j]) || 1)) * STEP_REF;
    return Math.min(R[k + 1][1], Math.max(R[k][1], r));
  }
  // the table, from EASE before the first anchor to EASE after the last, eased by a moving average in song time
  // (a monotone map stays monotone; the ends stay put because the map is flat beyond them)
  const t0 = s0 - EASE - STEP_SONG, size = Math.ceil((s1 + EASE - t0) / STEP_SONG) + 2, w = Math.round(EASE / STEP_SONG);
  const sharp = new Float64Array(size + 2 * w + 1), table = new Float64Array(size);
  for (let i = 0; i < size + 2 * w; i++) sharp[i + 1] = sharp[i] + piecewise(t0 + (i - w) * STEP_SONG);
  for (let i = 0; i < size; i++) {
    const avg = (sharp[i + 2 * w + 1] - sharp[i]) / (2 * w + 1);
    table[i] = Math.min(r1, Math.max(i ? table[i - 1] : r0, avg)); // (rounding never steps it back)
  }
  const refAt = t => {
    const x = (t - t0) / STEP_SONG;
    if (!(x > 0)) return r0;
    if (x >= size - 1) return r1;
    const i = Math.floor(x);
    return table[i] + (table[i + 1] - table[i]) * (x - i);
  };
  const rateAt = t => { // reference seconds per song second
    const x = (t - t0) / STEP_SONG;
    if (!(x > 0) || x >= size - 1) return 0;
    const i = Math.floor(x);
    return (table[i + 1] - table[i]) / STEP_SONG;
  };
  function songAtRef(r) { // the first song second showing reference second r
    if (!(r > r0)) return s0;
    if (r >= r1) return s1;
    let lo = 0, hi = size - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (table[m] < r) lo = m; else hi = m; }
    return t0 + (lo + (r - table[lo]) / (table[hi] - table[lo] || 1)) * STEP_SONG;
  }
  return { refAt, rateAt, songAtRef, refEnd: song.refEnd ?? r1, start: s0, end: s1 };
}
