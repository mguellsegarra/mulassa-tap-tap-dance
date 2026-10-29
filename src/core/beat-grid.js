// Song seconds <-> fractional beat on a beat grid (song-drac.json `beats`: the time of every whole beat; the tempo
// changes between them). Linear inside each beat, like tools/music/build_drac.py's sec(); before the first and after the
// last beat the first / last beat's length carries on (the lead-in, the settle after the final hit).
export function timeAtBeat(B, beat) {
  const k = Math.min(Math.max(Math.floor(beat), 0), B.length - 2);
  return B[k] + (beat - k) * (B[k + 1] - B[k]);
}
export function beatAtTime(B, t) {
  let lo = 0, hi = B.length - 2; // the last k with B[k] <= t, held to the first / last interval
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (B[mid] <= t) lo = mid; else hi = mid - 1; }
  return lo + (t - B[lo]) / (B[lo + 1] - B[lo]);
}
