// The GLOBUS balloon's HUD side: the 3D overlay, its still heads for the lane and the flat fallback.
import { createBalloonFx } from '../scene/balloon3d.js';
import { H } from './canvas.js';
import { C } from './sprites.js';

export function balloonShape(x, y, r, col = '#ff5a7a') { // flat fallback (lane head, no WebGL overlay): round balloon, knot at the bottom
  H.fillStyle = C.dark;
  H.beginPath(); H.ellipse(x, y, r * 0.9 + 2, r + 2, 0, 0, 7); H.fill();
  H.beginPath(); H.moveTo(x, y + r * 0.85); H.lineTo(x - r * 0.3 - 2, y + r * 1.3 + 2); H.lineTo(x + r * 0.3 + 2, y + r * 1.3 + 2); H.fill();
  H.fillStyle = col;
  H.beginPath(); H.ellipse(x, y, r * 0.9, r, 0, 0, 7); H.fill();
  H.beginPath(); H.moveTo(x, y + r * 0.85); H.lineTo(x - r * 0.3, y + r * 1.3); H.lineTo(x + r * 0.3, y + r * 1.3); H.fill();
  H.fillStyle = 'rgba(255,255,255,0.6)';
  H.beginPath(); H.ellipse(x - r * 0.35, y - r * 0.4, r * 0.18, r * 0.3, -0.5, 0, 7); H.fill();
}
// GLOBUS in 3D: drawLane fills `balloonView` each frame it hangs; frame() steps and renders it (balloon3d.js). null = the flat fallback.
export const balloonFx = (() => { try { return createBalloonFx(); } catch (err) { console.error(err); return null; } })();
export let balloonView = null;
export const setBalloonView = v => (balloonView = v);
let headArt = null, headTimer = 0; // the lane's drumroll head: stills of the same 3D balloon at three inflations (a live one would sit under the HUD band); vector until made
const makeHeadArt = () => {
  headTimer = 0;
  try {
    headArt = [0.05, 0.55, 1].map(k => balloonFx.snapshot(k));
    headArt.forEach(c => c.addEventListener?.('contextrestored', remakeHeadArt));
  } catch (err) { console.error(err); }
};
// a GPU process crash blanks the stills: the vector head until they are taken again (a fresh context, once the GPU is back)
const remakeHeadArt = () => { headArt = null; headTimer ||= setTimeout(makeHeadArt, 2500); };
headTimer = setTimeout(makeHeadArt, 2500); // after the first frames: a one-off context
// k 0..1 blends the tones; sq / rot are balloon3d's springs (squash, tilt) so it punches with every tap like the big one; the vector stays flat
export function balloonHead(x, y, r, k = 0.5, sq = 0, rot = 0) {
  if (!headArt) return balloonShape(x, y, r);
  const f = Math.min(0.999, k) * 2, i = Math.floor(f);
  H.save(); H.translate(x, y); H.rotate(rot * 0.3); H.scale(1 + sq * 0.5, 1 - sq * 0.5);
  H.drawImage(headArt[i], -1.1 * r, -1.1 * r, 2.2 * r, 2.5 * r);
  if (f > i) { H.globalAlpha = f - i; H.drawImage(headArt[i + 1], -1.1 * r, -1.1 * r, 2.2 * r, 2.5 * r); }
  H.restore();
}
