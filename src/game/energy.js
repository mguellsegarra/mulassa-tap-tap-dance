// L'ÀNIM DE LA PLAÇA: the health bar (Guitar Hero / osu! / FNF). Starts full; every miss drains it, every hit
// refills a bit (perfect more, a finished GUAPA / MANTÉN / GLOBUS a bit more). Empty: the mulassa falls apart.
// Per difficulty: `miss` drains (1/miss = misses from full to empty), `perfect`/`good` refill, `bonus` on top
// for a finished special. Alternating PERFECTE/ERROR slowly gains on FÀCIL, slowly loses on DIFÍCIL.
export const ENERGY = [
  { miss: 1 / 13, perfect: 0.1, good: 0.08, bonus: 0.06 }, // FÀCIL: 13 misses in a row
  { miss: 1 / 10, perfect: 0.09, good: 0.06, bonus: 0.06 }, // NORMAL: 10
  { miss: 1 / 8, perfect: 0.08, good: 0.05, bonus: 0.05 }, // DIFÍCIL: 8
];
export const WARN = [[0.35, 0.5, 'AGUANTEU, QUE CAIEM!'], [0.15, 0.25, 'NO PODEM MÉS!!']]; // [below, re-arm above, shout]

// One judgement: the new energy (0..1). `special`: a finished GUAPA pair, a MANTÉN held to the end, a popped GLOBUS.
export function drain(e, diff, kind, special = false) {
  const k = ENERGY[diff] ?? ENERGY[0];
  const d = kind === 'miss' ? -k.miss : k[kind] + (special ? k.bonus : 0);
  const v = e + d;
  return v < 1e-9 ? 0 : Math.min(1, v); // 13 × 1/13 lands exactly on empty, not on a rounding crumb
}

// The portadors' warnings: once per dip, re-armed when the plaça cheers up again. `armed` is mutated.
export function warnings(e, armed) {
  const out = [];
  WARN.forEach(([below, above, word], i) => {
    if (armed[i] && e < below) { armed[i] = false; out.push(word); }
    else if (!armed[i] && e > above) armed[i] = true;
  });
  return out;
}
