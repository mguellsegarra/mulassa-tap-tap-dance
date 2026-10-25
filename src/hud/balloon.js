// The GLOBUS balloon's HUD side: the 3D overlay, its still heads for the lane and the flat fallback.
import { createBalloonFx } from '../scene/balloon3d.js';
import { H, PXU } from './canvas.js';
import { C } from './sprites.js';
import { selectedFigure } from '../game/figure-song.js';
import { loader } from '../ui/handles.js';
import { renderer } from '../scene/stage.js';
import { heroQuadMake } from '../scene/share-capture.js';
import { G, clock } from '../game/state.js';
import { CALM } from '../core/env.js';
import { pulse } from '../core/anim.js';
import { glowDisc } from './primitives.js';
import { esquellotShape, esquellotHang } from './esquellot.js';
import { traitsOf } from '../figures/index.js';

const dracFig = () => traitsOf(selectedFigure.id).drumroll === 'carretilles', bouFig = () => traitsOf(selectedFigure.id).drumroll === 'esquellot';
// The Drac's repeated-tap icon: approved A artwork, a plain tube and a fan of sparks.
// Same 56 × 44 design as index.html's help; progress lengthens the sparks, never burns a fuse.
const CARRETILLA_RAYS = [[36, 4], [45, 7], [52, 15], [51, 25], [45, 33]];
// kick 0..1: a tap's recoil, the whole icon (sparks too, so they stay on the nozzle) back along the tube, the rays longer.
const RECOIL = [-5 * Math.cos(28 * Math.PI / 180), 5 * Math.sin(28 * Math.PI / 180)];
function carretillaShape(x, y, r, k, rot = 0, kick = 0) {
  const u = r / 28, reach = 0.55 + Math.max(0, Math.min(1, k)) * 0.45 + 0.45 * kick;
  H.save(); H.translate(x, y); H.rotate(rot * 0.3 - 0.12 * kick); H.scale(u, u); H.translate(-28 + RECOIL[0] * kick, -22 + RECOIL[1] * kick);
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
    const r0 = 0.25 * (1 - kick); // a burst starts at the nozzle
    H.beginPath(); H.moveTo(32 + (ex - 32) * r0, 22 + (ey - 22) * r0); H.lineTo(ex, ey);
    H.strokeStyle = C.dark; H.lineWidth = 4.3; H.stroke();
    H.strokeStyle = i % 2 ? C.cream : C.gold; H.lineWidth = 1.8; H.stroke();
  }
  H.fillStyle = C.cream; H.beginPath(); H.arc(32, 22, 2.2, 0, Math.PI * 2); H.fill();
  H.restore();
}

// The carretilla hanging under the ring answers every tap: it recoils as if it fired, glows and throws sparks that fall
// (positions in r units from its nozzle, so either caller’s transform works). Reduced motion: still.
const SPRAY = Array.from({ length: 24 }, () => ({ t0: -9, life: 0, vx: 0, vy: 0, gold: false }));
let sprayI = 0, sprayTap = -9;
function carretillaHang(x, y, r, k) {
  const calm = CALM.matches, kick = calm ? 0 : pulse(G.pumpT, 0.14), nx = x + r * 0.143, ny = y; // the nozzle: design (32, 22) of 56 × 44
  if (!calm && G.pumpT !== sprayTap && clock - G.pumpT < 0.1) {
    sprayTap = G.pumpT;
    for (let i = 0; i < 6; i++) {
      const q = SPRAY[sprayI = (sprayI + 1) % SPRAY.length], a = -0.9 + Math.random() * 1.4, v = 5 + Math.random() * 4;
      q.t0 = clock; q.life = 0.35 + Math.random() * 0.25; q.vx = Math.cos(a) * v; q.vy = Math.sin(a) * v; q.gold = i % 2 === 0;
    }
  }
  if (kick > 0) { const a0 = H.globalAlpha; H.globalAlpha = a0 * kick; glowDisc(nx, ny, r * 0.15, r * 0.95, '#ffd666'); H.globalAlpha = a0; }
  H.save(); H.lineCap = 'round'; const lw = Math.max(1.5, r * 0.07);
  for (const q of SPRAY) {
    const t = clock - q.t0; if (t >= q.life) continue;
    const px = nx + r * q.vx * t, py = ny + r * (q.vy * t + 7 * t * t), vy = q.vy + 14 * t; // they fall
    H.globalAlpha = 1 - t / q.life; H.beginPath(); H.moveTo(px, py); H.lineTo(px - r * q.vx * 0.05, py - r * vy * 0.05);
    H.strokeStyle = C.dark; H.lineWidth = lw * 2.4; H.stroke(); H.strokeStyle = q.gold ? C.gold : C.cream; H.lineWidth = lw; H.stroke(); // outlined like the rays: readable over the crowd
  }
  H.restore();
  carretillaShape(x, y, r, k, 0, kick);
}

export function balloonShape(x, y, r, col = '#ff5a7a') { // flat fallback (lane head, no WebGL overlay): round balloon, knot at the bottom
  if (dracFig()) return carretillaHang(x, y, r, 0);
  if (bouFig()) return esquellotHang(x, y, r);
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
export const setBalloonView = v => { // the Drac: a flat carretilla icon, the Bou its esquellot; lane.js draws their counter separately below
  if (v && dracFig()) { H.save(); H.setTransform(PXU, 0, 0, PXU, 0, 0); carretillaHang(v.x, v.y, v.r, v.k); H.restore(); return (balloonView = null); }
  if (v && bouFig()) { H.save(); H.setTransform(PXU, 0, 0, PXU, 0, 0); esquellotHang(v.x, v.y, v.r); H.restore(); return (balloonView = null); }
  return (balloonView = v);
};
let headArt = null; // the lane's drumroll head: stills of the same 3D balloon at three inflations (a live one would sit under the HUD band); vector until made
// After the first frames and the page cover: drawing them holds the thread a moment, and froze the loader's Mulassa.
setTimeout(function snap() { if (loader.covering) return setTimeout(snap, 500); try { headArt = balloonFx.snapshots(renderer, heroQuadMake(), [0.05, 0.55, 1]); } catch (err) { console.error(err); } }, 2500);
// k 0..1 blends the tones; sq / rot are balloon3d's springs (squash, tilt) so it punches with every tap like the big one; the vector stays flat
export function balloonHead(x, y, r, k = 0.5, sq = 0, rot = 0) {
  if (dracFig()) return carretillaShape(x, y + r * 0.1, r * 1.35, k, rot); // a thin diagonal: drawn larger than r so its ink matches the balloon's
  if (bouFig()) return esquellotShape(x, y, r * 1.2, rot * 0.5);
  if (!headArt) return balloonShape(x, y, r);
  const f = Math.min(0.999, k) * 2, i = Math.floor(f);
  H.save(); H.translate(x, y); H.rotate(rot * 0.3); H.scale(1 + sq * 0.5, 1 - sq * 0.5);
  H.drawImage(headArt[i], -1.1 * r, -1.1 * r, 2.2 * r, 2.5 * r);
  if (f > i) { H.globalAlpha = f - i; H.drawImage(headArt[i + 1], -1.1 * r, -1.1 * r, 2.2 * r, 2.5 * r); }
  H.restore();
}
