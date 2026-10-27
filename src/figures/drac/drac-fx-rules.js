// The Drac's fire and powder, no drawing (drac-fx.js draws them): the tuning, the particles' kinds and the rules the
// game wires up (drac-show.js).

export const DRAC_FX = {
  streakAt: 30, streakRamp: 0.3, // the jets light on a 30 streak (and in the finale: drac-show.js), eased in/out over 0.3 s
  // the red smoke: from the brake before the six reversed spins (flareRef, reference seconds) it builds up to the final
  // hit; it rises evenly all over the plaça (flareNear-flareFar m from its centre) except the corridor between the lens
  // and her (flareClear m either side); after the song it thins out over flareRamp s
  flareRamp: 10, flareRef: 93.8, flareNear: 1.5, flareFar: 10, flareClear: 2,
  tracaBefore: 0.6, tracaAfter: 0.8, // the CARRETILLES burn from 0.6 s before their drumroll to 0.8 s after
  tracaIn: 0.35, tracaOut: 0.3, tracaJet: 0.7, // their jets ease in / out (s) at this level
  kick: 0.35, kickJet: 2.2, // a tap (or a CREMA while a flamarada burns) kicks a jet up to kickJet, back in kick s
  // the rodes de foc (its confetti), one on each fire point: rad/s, arms, the tiny circle they turn on (m), spark speed m/s,
  // spark life s (+ up to wheelLife2 more), spark size m
  wheelSpin: 14, wheelArms: 2, wheelR: 0.06, wheelSpeed: 4.6, wheelLife: 0.45, wheelLife2: 0.35, wheelSize: 0.05, wheelTrail: 0.06, // (trail: s of flight a spark's streak shows)
  full: 160, // the smoke pool every emission rate is tuned for (a smaller pool emits less, so nothing is recycled while visible)
};
// The rules the game wires up (drac-show.js), here so tests can reach them: the streak's jets, when the bengales are lit
// (from the brake before the reversed spins to the final hit, flareLevel), when the CARRETILLES burn on her (a little
// before and after their window).
export const streakFire = combo => combo >= DRAC_FX.streakAt;
// the red smoke's level at song time t, lit at t0 and full on the final hit t1: 0..1, eased in (smoothstep)
export const flareLevel = (t, t0, t1) => { const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))); return t < t0 ? 0 : k * k * (3 - 2 * k); };
export function tracaWindow(balloons, t) {
  for (let i = 0; i < balloons.length; i++) { const n = balloons[i]; if (t >= n.t - DRAC_FX.tracaBefore && t < n.end + DRAC_FX.tracaAfter) return n; }
  return null;
}
// SMOKE: kinds of puff [life s, start size m, end size m, alpha, rise m/s, r, g, b]
export const PUFF = { crema: [1.9, 0.6, 2.4, 0.65, 1.1, 0.2, 0.19, 0.19], jet: [1.6, 0.3, 1.1, 0.3, 0.45, 0.7, 0.69, 0.67], // the fireball's dark smoke; a jet's white
  flare: [7, 1.2, 7, 0.7, -0.22, 0.6, 0.07, 0.05], // a bengala's smoke, a rosy red (linear RGB); soft alpha edges still reveal the crowd as it spreads and fades
  tro: [2, 0.7, 2.8, 0.8, 0.7, 0.24, 0.22, 0.21], petard: [1.2, 0.3, 1.2, 0.7, 0.6, 0.33, 0.31, 0.3],
  soot: [1.8, 0.25, 0.95, 0.7, 0.5, 0.09, 0.085, 0.08] }; // a wisp off a charred head (drac-soot.js)
export const DRAG = 2.5; // how fast a puff's own push dies (1/s)
export const WHEEL_PAL = [1, 0.78, 0.2, 0.9, 0.1, 0]; // the wheels' sparks, hot to cool: gold, through orange, to red
export const SP = { drag: 1.6, g: 7 }; // their air drag (1/s) and gravity (m/s²)
export const FLASHES = 6; // one per fire point, and the TRO's
// The plaça at night under the Drac (prototype, ?nit=a-d, ?nit=0 by day all through): its windows as [from, to] arrangement
// labels or beats (to null: through its end and tail), the s the night takes to fall and lift, its look (drac-show.js) and the Drac's own glow.
export const DRAC_NIGHTS = {
  a: { windows: [[122, 'C3']], fall: 0.6, look: 'blue', glow: 0.9 }, // two beats before the mid-song GLOBUS (124) through its carretilles' last sparks and smoke
  b: { windows: [['E3', null]], fall: 1.5, look: 'ember', glow: 0.75 }, // the last pass, its red smoke and the final in the dark
  c: { windows: [['D', 'E'], ['D3', 'E3']], fall: 0.4, look: 'blue', glow: 0.9 }, // both long D parts, the Bou's two discos
  d: { windows: [['A3', null]], fall: 8, look: 'dusk', glow: 0.8 }, // night falls slowly from the D.S. to the final
};
// a night's windows in song seconds
export function dracNightWindows(song, night) {
  const at = mark => song.beats[typeof mark === 'number' ? mark : song.arrangement.find(([, l]) => l === mark)[0]];
  return night ? night.windows.map(([from, to]) => [at(from), to ? at(to) : Infinity]) : [];
}
export function dracNightOn(windows, t) { // once a frame: no closure
  for (let i = 0; i < windows.length; i++) if (t >= windows[i][0] && t < windows[i][1]) return true;
  return false;
}
