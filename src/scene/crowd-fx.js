// The per-hit ripple: every hit sends a pulse out from the mulassa through the crowd (delay = distance / `speed`), so
// a hit is seen travelling round the ring instead of the whole plaça nodding as one. Pure and cheap on purpose: a
// 64-entry envelope table, at most `max` (8) live pulses, and a person only reads it while one is still on its way.
// `side` (+1 GUA, -1 PA, 0 both) favours the screen's left or right; `share` is the part of the crowd that answers.
export const RIPPLE = { speed: 9, attack: 0.09, release: 0.3, max: 8, reach: 14 };
const SPAN = RIPPLE.attack + RIPPLE.release * 3, N = 64, K = (N - 1) / SPAN;
const TABLE = Float32Array.from({ length: N }, (_, i) => {
  const a = i / K;
  return a < RIPPLE.attack ? (a / RIPPLE.attack) ** 2 * (3 - 2 * (a / RIPPLE.attack)) : Math.exp(-(a - RIPPLE.attack) / RIPPLE.release);
});
export const pulses = [];
export function pushPulse(now, amp, side = 0, share = 1) {
  if (pulses.length >= RIPPLE.max) pulses.shift();
  pulses.push({ t0: now, amp, side, share });
}
// Any pulse that can still reach someone (`reach` m away)? One check a frame; false skips everyone's maths.
export const rippleLive = now => pulses.length > 0 && now - pulses[pulses.length - 1].t0 < SPAN + RIPPLE.reach / RIPPLE.speed;
// Someone `dist` m from her, `side` (-1 screen right .. +1 screen left), answering with `resp` (0..1, their own draw).
export function ripple(now, dist, side, resp) {
  let sum = 0;
  for (let i = 0; i < pulses.length; i++) {
    const p = pulses[i];
    if (resp > p.share) continue;
    const age = now - p.t0 - dist / RIPPLE.speed;
    if (age < 0 || age >= SPAN) continue;
    sum += TABLE[(age * K) | 0] * p.amp * (p.side ? 0.55 + 0.45 * p.side * side : 1);
  }
  return Math.min(1.5, sum);
}
