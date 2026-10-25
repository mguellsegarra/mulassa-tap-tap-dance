// The logo's motion (pure: title.js draws it on the splash, and skips it all with reduced motion). MULASSA: a glint of light sweeps
// across its letters, GLINT.dur s out of every GLINT.every s. TAP TAP DANCE: one word pops per beat of the menu loop
// (TAP, TAP, DANCE, a rest), like drum hits: a quick attack and a short decay, a few percent of its size.
export const GLINT = { every: 5, dur: 0.8 }, POP = { tap: 0.05, dance: 0.06, max: 0.06, lift: 0.6 }; // lift: a hop (× the pop × the size), more than a swell: the words keep their gaps
export function glintAt(t) { // null, or how far the sweep has gone (0..1, eased), at t seconds
  const f = ((t % GLINT.every) + GLINT.every) % GLINT.every - (GLINT.every - GLINT.dur); // (the cycle's end: a pause first)
  if (f < 0) return null;
  const x = f / GLINT.dur;
  return x * x * (3 - 2 * x);
}
export function popsAt(beat, out) { // out[0..2]: TAP, TAP, DANCE's extra scale at a fractional beat (reused array)
  out[0] = out[1] = out[2] = 0;
  if (!Number.isFinite(beat)) return out;
  const n = Math.floor(beat), i = ((n % 4) + 4) % 4, f = beat - n;
  if (i < 3) out[i] = (i === 2 ? POP.dance : POP.tap) * (f < 0.05 ? f / 0.05 : Math.exp(-(f - 0.05) * 7));
  return out;
}
