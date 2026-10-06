// HUD drawing primitives: text, panels, glows, note discs, hold tails, arrows.
import { C, devScale, qSize, PIXEL, FONT, sprite, DIRDK, DIRC, DIRLT } from './sprites.js';
import { H, K } from './canvas.js';
import { clock } from '../game/state.js';

// grow: drawn at size × grow from the sprite painted at `size` (a pulse or a pop-in reuses one sprite instead of a new
// one per step; keep grow <= 1 so it stays crisp)
export function text(s, x, y, size, col = C.cream, align = 'center', outline = C.dark, pixel = false, grow = 1) {
  size = Math.round(size * (pixel ? 1.4 : 1.15) * 10) / 10;
  const k = devScale();
  if (k && size > 0) { // blit a sprite painted at a size within 1.5% of this one
    const q = qSize(size * k) / k, lw = Math.max(1.5, q / 6), pad = lw / 2 + 1, font = pixel ? `${q}px ${PIXEL}` : `800 ${q}px ${FONT}`;
    const sp = sprite(`${s}|${font}|${k}|${col}|${outline}`, k, c => { c.font = font; const tw = c.measureText(s).width; return { tw, w: tw + 2 * pad, h: q * 1.7 + lw, cy: (q * 1.7 + lw) / 2 }; }, (c, d) => {
      c.font = font; c.textAlign = 'left'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.lineWidth = lw; c.strokeStyle = outline; c.strokeText(s, pad, d.cy);
      c.fillStyle = col; c.fillText(s, pad, d.cy);
    }, true);
    if (sp) {
      const r = size * grow / q, left = align === 'left' ? 0 : align === 'right' ? sp.tw : sp.tw / 2;
      H.drawImage(sp.c, x - (left + pad) * r, (pixel ? y : y + size * grow * 0.08) - sp.cy * r, sp.w * r, sp.h * r);
      return;
    }
  }
  size *= grow;
  H.font = pixel ? `${size}px ${PIXEL}` : `800 ${size}px ${FONT}`;
  H.textAlign = align;
  H.textBaseline = 'middle';
  const yy = pixel ? y : y + size * 0.08; // Baloo sits a little high
  H.lineJoin = 'round';
  H.lineWidth = Math.max(1.5, size / 6);
  H.strokeStyle = outline;
  H.strokeText(s, x, yy);
  H.fillStyle = col;
  H.fillText(s, x, yy);
}
// Glows without shadowBlur: translucent layered strokes round the current path, and a soft radial disc sprite
// (solid to r0, fading out at r1). col: #rgb / #rrggbb.
export function glowPath(col, width, a = 1) {
  const a0 = H.globalAlpha;
  H.strokeStyle = col;
  H.globalAlpha = a0 * a * 0.22; H.lineWidth = width; H.stroke();
  H.globalAlpha = a0 * a * 0.3; H.lineWidth = width * 0.55; H.stroke();
  H.globalAlpha = a0;
}
export function glowDisc(x, y, r0, r1, col) {
  const k = Math.round(r0 / r1 * 10) / 10, sp = sprite(`glow|${col}|${k}`, 32, () => ({ w: 2, h: 2 }), c => {
    const g = c.createRadialGradient(1, 1, 0, 1, 1, 1);
    g.addColorStop(0, col); g.addColorStop(k, col); g.addColorStop(1, col + (col.length === 4 ? '0' : '00'));
    c.fillStyle = g; c.fillRect(0, 0, 2, 2);
  });
  if (sp) H.drawImage(sp.c, x - r1, y - r1, 2 * r1, 2 * r1);
}
export function panel(x, y, w, h, fill = 'rgba(42,26,16,0.88)') {
  H.fillStyle = fill; H.fillRect(x, y, w, h);
  H.fillStyle = C.gold; H.fillRect(x, y, w, 2); H.fillRect(x, y + h - 2, w, 2);
}
export function drawButton(x, y, w, h, focused) { // three equal choices; keyboard focus is a glowing ring, not a fill
  if (focused) {
    H.beginPath(); H.roundRect(x - 4, y - 4, w + 8, h + 8, 16 / K); glowPath(C.gold, 7);
    H.strokeStyle = C.cream; H.lineWidth = 3 / K; H.stroke();
  }
  H.beginPath(); H.roundRect(x, y, w, h, 12 / K);
  H.fillStyle = focused ? 'rgba(74,46,24,0.95)' : 'rgba(42,26,16,0.91)'; H.fill();
  H.strokeStyle = C.gold; H.lineWidth = 2 / K; H.stroke();
}
function arrow(dir, x, y, r) {
  H.save();
  H.translate(x, y);
  H.rotate({ R: 0, D: Math.PI / 2, L: Math.PI, U: -Math.PI / 2 }[dir]);
  H.beginPath();
  H.moveTo(r * 0.55, 0); H.lineTo(-r * 0.3, -r * 0.5); H.lineTo(-r * 0.3, r * 0.5); H.closePath();
  H.lineJoin = 'round'; H.lineWidth = Math.max(1, r * 0.1); H.strokeStyle = DIRDK[dir] ?? C.dark; H.stroke(); // outline keeps it readable on the light turquoise
  H.fillStyle = '#fff'; H.fill();
  H.restore();
}
function noteFace(dir, x, y, r) { // note colour with a shaded bottom and a lighter top: reads as a round drum
  H.fillStyle = DIRDK[dir]; H.beginPath(); H.arc(x, y, r, 0, 7); H.fill();
  H.fillStyle = DIRC[dir]; H.beginPath(); H.arc(x, y - r * 0.12, r * 0.9, 0, 7); H.fill();
  H.fillStyle = DIRLT[dir]; H.globalAlpha = 0.55; H.beginPath(); H.ellipse(x, y - r * 0.45, r * 0.5, r * 0.22, 0, 0, 7); H.fill(); H.globalAlpha = 1;
}
export function noteDisc(dir, x, y, r, big = false) { // big = GUAPA: 1.4x, gold rim, half GUA orange / half PA turquoise
  const rim = big ? 3.5 : 2;
  if (big) { r *= 1.4; glowDisc(x, y, r + rim - 1, r + rim + 4, C.gold); }
  H.fillStyle = C.dark;
  H.beginPath(); H.arc(x, y, r + rim, 0, 7); H.fill();
  H.fillStyle = big ? C.gold : '#fff';
  H.beginPath(); H.arc(x, y, r, 0, 7); H.fill();
  if (big) { // GUA orange | PA turquoise, the word centred with room to spare inside the disc
    H.fillStyle = DIRC.L; H.beginPath(); H.arc(x, y, r - rim, Math.PI / 2, Math.PI * 1.5); H.fill();
    H.fillStyle = DIRC.R; H.beginPath(); H.arc(x, y, r - rim, -Math.PI / 2, Math.PI / 2); H.fill();
    H.fillStyle = 'rgba(255,255,255,0.28)'; H.beginPath(); H.ellipse(x, y - r * 0.5, r * 0.5, r * 0.2, 0, 0, 7); H.fill(); // shine across both halves
    text('GUAPA', x, y + 0.4, 6.5, '#fff', 'center'); // +0.4: Baloo's caps sit a hair high
    return;
  }
  noteFace(dir, x, y, r - rim);
  arrow(dir, x, y, r);
}
// MANTÉN: a thick bar in the note's colour with a round cap. state: 0 waiting, 1 being held (glows, energy flows
// into the ring), 2 let go too early (greyed out, it just scrolls away).
export function holdTail(dir, x0, x1, y, state = 0) {
  if (x1 <= x0) return;
  const col = state === 2 ? '#7d746c' : DIRC[dir], lt = state === 2 ? '#a39a90' : DIRLT[dir];
  if (state === 2) H.globalAlpha = 0.55;
  H.fillStyle = C.dark; H.beginPath(); H.roundRect(x0, y - 11, x1 - x0 + 11, 22, 11); H.fill();
  H.fillStyle = state === 2 ? '#cfc6ba' : '#fff'; H.beginPath(); H.roundRect(x0, y - 9, x1 - x0 + 9, 18, 9); H.fill();
  H.fillStyle = col; H.beginPath(); H.roundRect(x0, y - 7, x1 - x0 + 7, 14, 7); H.fill();
  H.fillStyle = 'rgba(255,255,255,0.35)'; H.fillRect(x0, y - 5, x1 - x0, 3); // shine
  if (state === 1) { // additive glow, pulsing on the beat of the hold, and chevrons of energy flowing into the ring
    const p = 0.5 + 0.5 * Math.sin(clock * 16);
    H.save(); H.globalCompositeOperation = 'lighter';
    H.globalAlpha = 0.35 + 0.3 * p; H.fillStyle = lt; H.beginPath(); H.roundRect(x0, y - 7, x1 - x0 + 7, 14, 7); H.fill();
    glowPath(col, 8 + 5 * p);
    H.globalAlpha = 0.9;
    try {
      H.beginPath(); H.roundRect(x0, y - 7, x1 - x0 + 7, 14, 7); H.clip();
      const sp = 16, ph = (clock * 150) % sp;
      H.strokeStyle = '#fff'; H.lineWidth = 2.5; H.lineCap = 'round'; H.lineJoin = 'round';
      H.beginPath();
      for (let x = x0 + sp - ph; x < x1 + 4; x += sp) { H.moveTo(x + 4, y - 4.5); H.lineTo(x, y); H.lineTo(x + 4, y + 4.5); } // ‹ ‹ ‹ towards the ring
      H.stroke();
    } finally { H.restore(); } // never leave the HUD clipped
  }
  H.fillStyle = C.dark; H.beginPath(); H.arc(x1, y, 5, 0, 7); H.fill(); // cap: where to let go
  H.fillStyle = state === 2 ? '#a39a90' : C.gold; H.beginPath(); H.arc(x1, y, 3, 0, 7); H.fill();
  H.globalAlpha = 1;
}
export function holdHalo(dir, hx, cy) { // under the head sitting on the ring: a pulsing halo in the note's colour
  const p = 0.5 + 0.5 * Math.sin(clock * 16);
  H.save(); H.globalCompositeOperation = 'lighter';
  H.globalAlpha = 0.35 + 0.4 * p;
  glowDisc(hx, cy, 17 + 2.5 * p, 22 + 5 * p, DIRC[dir]);
  H.restore();
}
export function holdCharge(dir, hx, cy, frac) { // over the head: a gold arc charging round the ring 0 -> 100%
  const p = 0.5 + 0.5 * Math.sin(clock * 16), col = DIRC[dir];
  H.lineCap = 'round';
  H.strokeStyle = 'rgba(42,26,16,0.7)'; H.lineWidth = 4.5; H.beginPath(); H.arc(hx, cy, RING_R, 0, 7); H.stroke(); // track
  const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * Math.max(0.02, frac);
  H.beginPath(); H.arc(hx, cy, RING_R, a0, a1); glowPath(col, 8);
  H.strokeStyle = C.gold; H.lineWidth = 3; H.stroke();
  const spin = clock * 9; // a bright comet chasing round the ring: it is charging
  H.strokeStyle = DIRLT[dir]; H.lineWidth = 2; H.beginPath(); H.arc(hx, cy, RING_R, spin, spin + 0.9); H.stroke();
  H.fillStyle = '#fff'; H.beginPath(); H.arc(hx + Math.cos(a1) * RING_R, cy + Math.sin(a1) * RING_R, 2.2 + p, 0, 7); H.fill(); // leading edge
  H.lineCap = 'butt';
}
// The target is a Taiko "socket": a dark disc exactly the size of a note (NOTE_R), a thin ring on its edge so an
// on-time note visibly fits, and a thick outer ring (RING_R, about a GUAPA's size). The socket is drawn under
// the notes (drawRing), the rings, shockwaves and sparks over them (drawRingTop), so the target never disappears.
export const NOTE_R = 16, RING_R = 21; // NOTE_R: a normal note's outer edge (14 + its dark rim)
export function textWidth(s, size) { // width in HUD units of text(s, ..., size)
  H.font = `800 ${Math.round(size * 11.5) / 10}px ${FONT}`;
  return H.measureText(s)?.width || s.length * size * 0.62;
}
