// The GLOBUS balloon's HUD side: the 3D overlay, its still heads for the lane and the flat fallback.
import { createBalloonFx } from '../scene/balloon3d.js';
import { H, PXU } from './canvas.js';
import { C } from './sprites.js';
import { selectedFigure } from '../game/figure-song.js';
import { loader } from '../ui/handles.js';
import { renderer } from '../scene/stage.js';
import { heroQuadMake } from '../scene/share-capture.js';

const dracFig = () => selectedFigure.id === 'drac-valls';
// The Drac's repeated-tap icon: approved A artwork, a plain tube and a fan of sparks.
// Same 56 × 44 design as index.html's help; progress lengthens the sparks, never burns a fuse.
const CARRETILLA_RAYS = [[36, 4], [45, 7], [52, 15], [51, 25], [45, 33]];
function carretillaShape(x, y, r, k, rot = 0) {
  const u = r / 28, reach = 0.55 + Math.max(0, Math.min(1, k)) * 0.45;
  H.save(); H.translate(x, y); H.rotate(rot * 0.3); H.scale(u, u); H.translate(-28, -22);
  H.lineCap = H.lineJoin = 'round';
  H.save(); H.translate(24, 26); H.rotate(-28 * Math.PI / 180); H.translate(-24, -26);
  H.beginPath(); H.roundRect(6, 22, 27, 10, 1.7);
  H.fillStyle = '#c49a6c'; H.fill(); H.strokeStyle = C.dark; H.lineWidth = 3; H.stroke();
  H.beginPath(); H.moveTo(9, 24); H.lineTo(29, 24); H.strokeStyle = '#f1ddba'; H.lineWidth = 1.8; H.stroke();
  H.beginPath(); H.moveTo(9, 30); H.lineTo(29, 30); H.strokeStyle = '#966c40'; H.lineWidth = 1.4; H.stroke();
  H.beginPath(); H.moveTo(31, 23); H.lineTo(31, 31); H.strokeStyle = C.cream; H.lineWidth = 2; H.stroke();
  H.restore();
  for (let i = 0; i < CARRETILLA_RAYS.length; i++) {
    const [rx, ry] = CARRETILLA_RAYS[i], ex = 32 + (rx - 32) * reach, ey = 22 + (ry - 22) * reach;
    H.beginPath(); H.moveTo(32 + (ex - 32) * 0.25, 22 + (ey - 22) * 0.25); H.lineTo(ex, ey);
    H.strokeStyle = C.dark; H.lineWidth = 4.3; H.stroke();
    H.strokeStyle = i % 2 ? C.cream : C.gold; H.lineWidth = 1.8; H.stroke();
  }
  H.fillStyle = C.cream; H.beginPath(); H.arc(32, 22, 2.2, 0, Math.PI * 2); H.fill();
  H.restore();
}

export function balloonShape(x, y, r, col = '#ff5a7a') { // flat fallback (lane head, no WebGL overlay): round balloon, knot at the bottom
  if (dracFig()) return carretillaShape(x, y, r, 0);
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
export const setBalloonView = v => { // the Drac: a flat carretilla icon; lane.js draws its counter separately below
  if (v && dracFig()) { H.save(); H.setTransform(PXU, 0, 0, PXU, 0, 0); carretillaShape(v.x, v.y, v.r, v.k); H.restore(); return (balloonView = null); }
  return (balloonView = v);
};
let headArt = null; // the lane's drumroll head: stills of the same 3D balloon at three inflations (a live one would sit under the HUD band); vector until made
// After the first frames and the page cover: drawing them holds the thread a moment, and froze the loader's Mulassa.
setTimeout(function snap() { if (loader.covering) return setTimeout(snap, 500); try { headArt = balloonFx.snapshots(renderer, heroQuadMake(), [0.05, 0.55, 1]); } catch (err) { console.error(err); } }, 2500);
// k 0..1 blends the tones; sq / rot are balloon3d's springs (squash, tilt) so it punches with every tap like the big one; the vector stays flat
export function balloonHead(x, y, r, k = 0.5, sq = 0, rot = 0) {
  if (dracFig()) return carretillaShape(x, y + r * 0.1, r * 0.95, k, rot);
  if (!headArt) return balloonShape(x, y, r);
  const f = Math.min(0.999, k) * 2, i = Math.floor(f);
  H.save(); H.translate(x, y); H.rotate(rot * 0.3); H.scale(1 + sq * 0.5, 1 - sq * 0.5);
  H.drawImage(headArt[i], -1.1 * r, -1.1 * r, 2.2 * r, 2.5 * r);
  if (f > i) { H.globalAlpha = f - i; H.drawImage(headArt[i + 1], -1.1 * r, -1.1 * r, 2.2 * r, 2.5 * r); }
  H.restore();
}
