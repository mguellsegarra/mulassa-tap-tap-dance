// The GLOBUS balloon's HUD side: the 3D overlay, its still heads for the lane and the flat fallback.
import { createBalloonFx } from '../scene/balloon3d.js';
import { H, PXU } from './canvas.js';
import { C } from './sprites.js';
import { selectedFigure } from '../game/figure-song.js';
import { clock } from '../game/state.js';
import { loader } from '../ui/handles.js';
import { renderer } from '../scene/stage.js';
import { heroQuadMake } from '../scene/share-capture.js';

const dracFig = () => selectedFigure.id === 'drac-valls';
// The Drac's GLOBUS is a TRACA (its petards go off on the Drac's fire points, drac-fx.js): one fat petard where the balloon
// would hang, a trueno de mecha: brown kraft paper with a dark printed band, twisted shut at both ends like a sweet (a fanned
// tail behind, a knot tied with white string in front) and a green fuse out of the knot, burning down as k (0..1) fills,
// the spark at its end growing into a burst. Drawn in a 10-unit box (r = 10 units, the balloon's radius); index.html's help
// icon (li.only-drac) is this same drawing at r 18, k 0.35. cord: the y the string hangs from (the counter under the ring).
const TRACA = { kraft: '#c49a6c', shade: '#9a7248', light: '#e6caa0', print: '#6e4c2c', fuse: '#3cc35a', glow: 'rgba(255,170,40,0.6)', ray: '#ffe27a' };
const TAIL = [-6, -3.4, -7.8, -1.2, -10.6, -4.6, -11.2, 0, -10.6, 4.6, -7.8, 1.2, -6, 3.4], KNOT = [6, -3, 7.6, -1.3, 9.6, -3.6, 10.2, 0, 9.6, 3.6, 7.6, 1.3, 6, 3];
function tracaPoly(p) { H.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) H.lineTo(p[i], p[i + 1]); H.closePath(); }
function tracaSilhouette() { H.beginPath(); tracaPoly(TAIL); tracaPoly(KNOT); H.roundRect(-6.4, -5, 12.8, 10, 3.4); }
function tracaShape(x, y, r, k, cord = null, rot = 0) {
  const u = r / 10, o = Math.max(1.5, 1.5 / u), e = 1 - 0.85 * Math.min(1, k), a = -0.35 + rot * 0.3; // o: the dark rim (units); e: how much fuse is left
  H.save(); H.translate(x, y);
  if (cord != null) { H.fillStyle = C.dark; H.fillRect(-1, cord - y, 2, y - 4.6 * u - cord); } // the string, into the top of the body
  H.rotate(a); H.scale(u, u); H.lineCap = H.lineJoin = 'round';
  // the fuse, from the knot out and up (a quadratic cut at e: de Casteljau)
  const ex = 9.6 * (1 - e) * (1 - e) + 25.6 * e * (1 - e) + 12.8 * e * e, ey = -6.5 * e * e;
  H.beginPath(); H.moveTo(9.6, 0); H.quadraticCurveTo(9.6 + 3.2 * e, 0, ex, ey);
  H.strokeStyle = C.dark; H.lineWidth = 1.4 + 2 * o; H.stroke(); H.strokeStyle = TRACA.fuse; H.lineWidth = 1.4; H.stroke();
  // the paper: the dark rim round it all, then the kraft, shade underneath, the printed band, a shine, the creases and the string
  tracaSilhouette(); H.strokeStyle = C.dark; H.lineWidth = 2 * o; H.stroke(); H.fillStyle = C.dark; H.fill();
  tracaSilhouette(); H.fillStyle = TRACA.kraft; H.fill();
  H.fillStyle = TRACA.shade; H.beginPath(); H.roundRect(-6.4, 1.6, 12.8, 3.4, [0, 0, 3.4, 3.4]); H.fill();
  H.fillStyle = TRACA.print; H.fillRect(-2.6, -5, 3.6, 10);
  H.fillStyle = TRACA.light; H.fillRect(-1.9, -2.2, 2.2, 1); H.fillRect(-1.9, 0.2, 2.2, 1); // its lettering
  H.fillStyle = 'rgba(255,248,230,0.45)'; H.fillRect(-5, -3.8, 10, 1.3);
  H.strokeStyle = TRACA.shade; H.lineWidth = 0.7; H.beginPath();
  H.moveTo(-7.8, 0); H.lineTo(-10.4, -2.6); H.moveTo(-7.8, 0); H.lineTo(-10.4, 2.6); H.moveTo(7.8, 0); H.lineTo(9.6, -1.8); H.moveTo(7.8, 0); H.lineTo(9.6, 1.8); H.stroke();
  H.strokeStyle = C.dark; H.lineWidth = 1.2 + o; H.beginPath(); H.moveTo(7.2, -2.2); H.lineTo(7.2, 2.2); H.stroke();
  H.strokeStyle = '#fff'; H.lineWidth = 1.2; H.stroke();
  // the spark at the fuse's end: a glow, a white-hot core and rays that spin and grow as the TRO nears
  H.globalCompositeOperation = 'lighter';
  H.fillStyle = TRACA.glow; H.beginPath(); H.arc(ex, ey, 2.4 + 2.6 * k, 0, 7); H.fill();
  H.strokeStyle = TRACA.ray; H.lineWidth = Math.max(1, 0.9 / u * 1.5);
  H.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * 0.785 + clock * 3, l = (2.6 + 3.4 * k) * (i % 2 ? 0.6 : 1) * (0.85 + 0.15 * Math.sin(clock * 40 + i * 2));
    H.moveTo(ex + Math.cos(a) * 1.4, ey + Math.sin(a) * 1.4); H.lineTo(ex + Math.cos(a) * (1.4 + l), ey + Math.sin(a) * (1.4 + l));
  }
  H.stroke();
  H.fillStyle = '#fff'; H.beginPath(); H.arc(ex, ey, 1.3 + 0.5 * k, 0, 7); H.fill();
  H.restore();
}

export function balloonShape(x, y, r, col = '#ff5a7a') { // flat fallback (lane head, no WebGL overlay): round balloon, knot at the bottom
  if (dracFig()) return tracaShape(x, y, r, 0);
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
export const setBalloonView = v => { // the Drac: no 3D balloon, the traca drawn flat right here (the counter drawn next sits on top)
  if (v && dracFig()) { H.save(); H.setTransform(PXU, 0, 0, PXU, 0, 0); tracaShape(v.x, v.y, v.r, v.k, v.ay + 2); H.restore(); return (balloonView = null); }
  return (balloonView = v);
};
let headArt = null; // the lane's drumroll head: stills of the same 3D balloon at three inflations (a live one would sit under the HUD band); vector until made
// After the first frames and the page cover: drawing them holds the thread a moment, and froze the loader's Mulassa.
setTimeout(function snap() { if (loader.covering) return setTimeout(snap, 500); try { headArt = balloonFx.snapshots(renderer, heroQuadMake(), [0.05, 0.55, 1]); } catch (err) { console.error(err); } }, 2500);
// k 0..1 blends the tones; sq / rot are balloon3d's springs (squash, tilt) so it punches with every tap like the big one; the vector stays flat
export function balloonHead(x, y, r, k = 0.5, sq = 0, rot = 0) {
  if (dracFig()) return tracaShape(x, y + r * 0.1, r * 0.95, k, null, rot);
  if (!headArt) return balloonShape(x, y, r);
  const f = Math.min(0.999, k) * 2, i = Math.floor(f);
  H.save(); H.translate(x, y); H.rotate(rot * 0.3); H.scale(1 + sq * 0.5, 1 - sq * 0.5);
  H.drawImage(headArt[i], -1.1 * r, -1.1 * r, 2.2 * r, 2.5 * r);
  if (f > i) { H.globalAlpha = f - i; H.drawImage(headArt[i + 1], -1.1 * r, -1.1 * r, 2.2 * r, 2.5 * r); }
  H.restore();
}
