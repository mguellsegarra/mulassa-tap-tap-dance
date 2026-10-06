// Small easing helpers shared by the scene and the HUD (smooth, pulse, hold, smooth01, easeIn).
import { clock } from '../game/state.js';

// ------------------------------------------------------------------ mulassa motion
// Everything goes through damped springs so moves overshoot and settle instead of sliding.
// During play (song and practice) the heading and sway belong to the base choreography (dance.js, song time);
// the springs only add short, bounded accents on top (accent()), which always settle back onto it. She turns about
// her own centre, which stays in a small zone of the plaça (as in the videos), so M.pivot is that centre then.
// On the title (and results) the free demo steers her about the plaça instead, turning round a pivot at her front
// so the rear sweeps a big circle (a stylization, not a documented fact about the carriers' footwork).
export const smooth = k => k * k * (3 - 2 * k);
export function pulse(t0, len) { // 0 -> 1 fast, then eases back to 0
  const k = (clock - t0) / len;
  if (k < 0 || k > 1) return 0;
  return k < 0.2 ? smooth(k / 0.2) : 1 - smooth((k - 0.2) / 0.8);
}
export function hold(t0, len) { // 0 -> 1, stays, -> 0
  const k = (clock - t0) / len;
  if (k < 0 || k > 1) return 0;
  return Math.min(1, k / 0.12, (1 - k) / 0.2);
}
export const TAU = Math.PI * 2, smooth01 = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export const easeIn = (dt, tc) => 1 - Math.exp(-dt / tc); // a one-pole filter's step over dt, time constant tc (s)
