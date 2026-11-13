// The Drac's music video on the plaça: «Mira el ball» films its dance with these cameras (figures/common/clip-camera.js, the
// shots' fields and the rules every film keeps, learnt on the Bou's: figures/bou/bou-clip.js), not the showreel's TV
// broadcast, which followed its root through every run and spin from the selector's band and read on an iPhone 18 Pro as a
// bouncing lens, poor framings and jumpy cuts (2026-11-13, the owner).
// Its root comes from the reference path (drac-path.js through drac-time.js): pure, so the lens can average it ahead.
// Seen from the play camera's side (`side`), which is nearly its dance frame's front: its two arcs to the source camera
// come at the lens. Its heading spins through most of B, C, E3 and the coda, so a shot that turns with it (`rel`) only
// where it holds a heading (A2's runs, the stare, E).
import { dracTime } from './drac-time.js';
import { rootAt } from './drac-path.js';
import { danceYaw, HELPER_CENTRE } from './drac-layout.js';
import { DRAC_SCALE } from './drac.js';
import { createClip } from '../common/clip-camera.js';

// 2.95 m to its heads, 2.74 m long: aimed higher than the Bou (its heads over the shell, ~2.4 m up).
// Three sizes and three sides, so no cut joins two pictures alike (2026-11-13, the owner: «canvis de plans molt iguals i
// queda molt malament»; on a phone the first list's wide, front, crane and orbit all showed it a third of the screen tall
// from the same side). Every cut changes its size on the screen by 1.4x or more, or the side by 0.5 rad or more
// (tests/figures/drac/drac-clip.mjs), and the angle is picked by its move (.agents/skills/mulassacat-camera/references/directing.md):
// FAR `vast` (the plaça, still) and `charge` as it sets off (fixed in front: it grows as its arc comes, shrinks as it goes
// back, uncut); MIDDLE `left` and `right`, the two ground cameras its runs come at and cross; NEAR `spot` (its body, on its
// spot) and `head`; `crane` from near up to far over a turn.
// portrait: on a phone the plaça round it is bare floor (no rotllana as the Bou's), and sized as on a wide frame the Drac
// stood a seventh of the screen tall over half a screen of tiles («hem d'evitar que es vegi tant de terra i tros buit»).
// So there: nearer, and aimed over its heads, which sets it in the frame's lower half with the crowd and the façades above
// it; lower still on a taller phone (tallY), where a shorter one has «Fes un tomb» under its feet. Its whole path fits in
// 5.4 m: no shot needs the Bou's 15 m
export const DRAC_CLIP_SHOTS = {
  vast: { az: [-.3, -.18], el: [.32, .3], size: [12, 11], y: 2, fov: 38, still: 1, portrait: { size: [6.4, 6], fov: 44, y: 2.6, tallY: .8 } },
  left: { az: [-.5, -.44], el: [.22, .22], size: [8.4, 8], y: 1.8, fov: 40, lag: 1.2, portrait: { el: [.06, .06], size: [3.8, 3.6], fov: 46, y: 2, tallY: .5 } }, // (on a wide frame from a little higher: at its heads' height the helper 2.6 m in front of this lens stood in the picture)
  right: { az: [.5, .44], el: [.22, .22], size: [8.4, 8], y: 1.8, fov: 40, lag: 1.2, portrait: { el: [.06, .06], size: [3.8, 3.6], fov: 46, y: 2, tallY: .5 } },
  crane: { az: [.12, .3], el: [.04, .3], size: [4, 10], y: 2, fov: 40, lag: 1, portrait: { size: [2.8, 5.2], fov: 46, y: 2, tallY: .4 } }, // (from its body up to the whole plaça)
  spot: { az: [-.2, -.14], el: [.04, .04], size: [5.4, 5.2], y: 1.9, fov: 36, lag: 1, portrait: { size: [2.9, 2.8], fov: 44, y: 1.9, tallY: .3 } }, // (its body on its spot as it twists and spins: no heading to keep to)
  charge: { az: [.05, .05], el: [.3, .3], size: [11, 11], y: 2, fov: 36, fixed: 1, lag: 3.5, portrait: { size: [5.4, 5.4], fov: 46, y: 2.8, tallY: .9 } }, // (it hardly pans: the arc comes at it inside the frame. From over the heads: at el .14-.2 the arc walked into the lens, 75% of it out of a phone's frame)
  head: { az: [.4, .35], el: [.1, .1], size: [3.6, 3.4], y: 2.4, fov: 30, rel: 1, ahead: .5, lag: .6 }, // (both heads, side by side over its chest: measured 0.5 m either side of its middle and only ~0.15 m ahead of it, their snouts ~0.6 m more)
};
// [song beat, shot, fit?] on its parts (song-drac.json arrangement: 2/4, a bar is 2 beats): A2 at 12, B 42, C 56, D 72,
// E 104, A3 128, B3 132, C3 146, D3 162, E3 194, coda 218. A cut where a run sets off or it stops, never in a run; the
// same camera for the same move (both turns under the crane, both arcs in the front camera, both torsions near).
export const DRAC_CLIP_CUTS = [
  [0, 'vast'], // the plaça while it waits for the pickup and sets off (the opening creeps in)
  [16, 'right'], // A2: it turns back, its runs seen from one ground camera
  [32, 'left'], // it stops and sets off again: from the other (always the left one before a crane, which rises on the right)
  [42, 'crane'], // B: the turn on its spot, from its body up over the plaça
  [56, 'spot'], // C: the torsions, near
  [70, 'charge'], // D: the whole arc in the front camera, coming and going back
  [96, 'head'], // the stare: its root stands still
  [104, 'right'], // E: the runs again
  [116, 'left'],
  [128, 'crane'], // A3, B3: the second turn
  [146, 'spot'], // C3
  [162, 'charge'], // D3: the second arc
  [192, 'spot'], // E3: the spins, near
  [208, 'vast'], // they brake and reverse: the whole plaça
  [218, 'crane'], // the coda, the last hit, up and out
];
export const DRAC_CLIP_END = dracTime.beats.length - 1;
export const dracClipSec = b => { const T = dracTime.beats, i = Math.min(T.length - 2, Math.max(0, Math.floor(b))); return T[i] + (T[i + 1] - T[i]) * (b - i); };
const clipRoot = { x: 0, z: 0, yaw: 0 };
// its root in its dance frame, m from the plaça's middle (drac-layout.js danceToWorld before the turn); no lift (its
// groove's bounce left out)
function dracClipRoot(t, out) { rootAt(clipRoot, dracTime.refAt(t)); out.x = clipRoot.x * DRAC_SCALE - HELPER_CENTRE[0]; out.z = clipRoot.z * DRAC_SCALE - HELPER_CENTRE[1]; out.lift = 0; out.yaw = clipRoot.yaw; return out; }
// side: from its frame's heading to the play camera (drac-layout.js danceYaw); clear: inside its helpers' ring (5.1 m), so
// none stands at the lens; inside the façades
const DRAC_CLIP = createClip({ shots: DRAC_CLIP_SHOTS, cuts: DRAC_CLIP_CUTS, end: DRAC_CLIP_END, secAt: dracClipSec, root: dracClipRoot, side: -danceYaw(0), clear: 7, reach: 12 });
export const placeDracClip = DRAC_CLIP.place;
