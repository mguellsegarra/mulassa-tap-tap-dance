// Dev only (?autoplay&jitter=<ms>): autoplay presses each note off the beat by about that many ms, early or late. Deterministic
// per note index and seed, so a run repeats; magnitude ms x [0.75, 1.25], so a window test can bracket a grade.
const jitterHash = x => { let h = Math.imul(x ^ 0x9E3779B9, 0x85EBCA6B); h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35); return (h ^ (h >>> 16)) >>> 0; };
export function autoplayError(i, ms, seed = 1) {
  if (!ms) return 0;
  const a = jitterHash(i * 2 + seed * 7919), b = jitterHash(a + 1);
  return (a & 1 ? 1 : -1) * ms / 1000 * (0.75 + 0.5 * (b / 4294967296)); // s, signed: negative = early
}
