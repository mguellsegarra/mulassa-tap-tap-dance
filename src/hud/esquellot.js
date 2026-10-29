// The Bou's ESQUELLOT: its GLOBUS, drawn flat under the ring: one bell swinging on its strap, the other
// way at each tap, ringing (the sound is judge.js bellRing). The owner chose it over a collar of small bells and a struck bell.
// Reduced motion keeps it still.
import { H } from './canvas.js';
import { C } from './sprites.js';
import { G, clock } from '../game/state.js';
import { CALM } from '../core/env.js';
import { pulse } from '../core/anim.js';

// 44 × 44 design, pivot at the strap (22, 4). swing (rad) tilts it on the pivot; kick 0..1 (a tap) rings it: two pairs
// of sound arcs out of its sides.
export function esquellotShape(x, y, r, swing = 0, kick = 0) {
  const u = r / 22;
  H.save(); H.translate(x, y); H.scale(u, u); H.translate(-22, -22);
  H.lineCap = H.lineJoin = 'round';
  if (kick > 0) for (const sx of [-1, 1]) for (const d of [0, 6]) { // the ring, outside the swing so it stays put
    H.beginPath(); H.arc(22 + sx * (17 + d), 24, 6 + d, sx > 0 ? -0.7 : Math.PI - 0.7, sx > 0 ? 0.7 : Math.PI + 0.7);
    H.globalAlpha = kick * (d ? 0.6 : 1); H.strokeStyle = C.dark; H.lineWidth = 4; H.stroke(); H.strokeStyle = C.gold; H.lineWidth = 1.8; H.stroke();
  }
  H.globalAlpha = 1;
  H.translate(22, 4); H.rotate(swing); H.translate(-22, -4);
  H.beginPath(); H.arc(22, 7, 5, Math.PI, 0); H.strokeStyle = C.dark; H.lineWidth = 5; H.stroke(); H.strokeStyle = '#7a4a24'; H.lineWidth = 2.4; H.stroke(); // the strap's loop
  H.beginPath(); H.moveTo(14, 9); H.lineTo(30, 9); H.lineTo(36, 34); H.quadraticCurveTo(22, 38, 8, 34); H.closePath(); // the bell, wider at the mouth
  H.fillStyle = '#c9963a'; H.fill(); H.strokeStyle = C.dark; H.lineWidth = 3; H.stroke();
  H.beginPath(); H.moveTo(16, 12); H.lineTo(13, 31); H.strokeStyle = '#f1d58a'; H.lineWidth = 2.2; H.stroke(); // its shine
  H.beginPath(); H.moveTo(10, 31); H.quadraticCurveTo(22, 34.5, 34, 31); H.strokeStyle = '#8a5f1e'; H.lineWidth = 1.6; H.stroke(); // the rim
  H.beginPath(); H.arc(22 + 2.5 * Math.sin(swing * 2), 38, 3.2, 0, Math.PI * 2); H.fillStyle = '#5a3a1e'; H.fill(); H.strokeStyle = C.dark; H.lineWidth = 2; H.stroke(); // the clapper, lagging the swing
  H.restore();
}

let bellSide = 1, bellTap = -9; // each tap flips the side it swings to
const bellSwing = (t, side, a) => (t > 1.5 ? 0 : side * a * Math.exp(-4 * t) * Math.sin(Math.min(t * 16, Math.PI / 2 + t * 9))); // a damped pendulum

// (x, y): where the bell hangs, r its size
export function esquellotHang(x, y, r) {
  if (G.pumpT !== bellTap && clock - G.pumpT < 0.1) { bellTap = G.pumpT; bellSide = -bellSide; }
  const calm = CALM.matches, t = clock - G.pumpT, kick = calm ? 0 : pulse(G.pumpT, 0.18);
  esquellotShape(x, y, r, calm ? 0 : bellSwing(t, bellSide, 0.5), kick);
}
