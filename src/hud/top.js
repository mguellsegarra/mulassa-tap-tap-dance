// The top band: the song progress ring, ENCERTS and the ànim (energy) meter.
import { tr } from '../i18n/messages.js';
import { fmtNum } from '../i18n/format.js';
import { song } from '../game/figure-song.js';
import { judgedCount } from '../game/progress.js';
import { comparableScore } from '../game/score-scale.js';
import { K, PXU, H, SAFE, W } from './canvas.js';
import { glowPath, textWidth, text } from './primitives.js';
import { C, devScale, sprite, setSpriteBudget } from './sprites.js';
import { HUD_H, ENC_H, HUD_CY, ENC_GAP } from './layout.js';
import { songTime, G, clock } from '../game/state.js';
import { elastic } from './praise.js';
import { CALM } from '../core/env.js';
import { portraitArt, portraitPalette } from '../game/figures.js';
import { selectedFigure } from '../game/figure-song.js';
const TOP_TXT = { double: tr('hud.top.double') };

// Top bar: ONE compact row centred at the top, like FNF / osu! / Guitar Hero: L'ÀNIM DE LA PLAÇA is the one bar
// (the mulassa as its portrait, then the bar: empty, she falls apart) and ENCERTS (the quality: the hit rate) is just a
// number on its right, with no caption, coloured by tier (the 70% goal is spelled out on the results screen). The HTML #pause button
// owns the top-right corner; the panel and the button share one centre line, HUD_CY.
const PAUSE_PX = () => (K < 2 ? 54 : 64); // css px of #pause (index.html), for the room the panel leaves it
const snap = v => Math.round(v * PXU) / PXU; // to the device pixel grid: crisp edges
let meterUp = false, meterT = -9;
function hudBox(x, y, w, h, glow = 0) {
  H.beginPath(); H.roundRect(x, y, w, h, h / 2);
  if (glow > 0) glowPath(C.gold, 10 * glow);
  H.fillStyle = 'rgba(42,26,16,0.86)'; H.fill();
  H.strokeStyle = C.gold; H.lineWidth = 1.5 + glow; H.stroke();
}
// Song progress: from the first note to the last (song.end, the final hit: the tail after it is the celebration, not the dance)
// on the audio clock (songTime), so the count-in reads 0 and a pause holds it. Shown as a ring round #pause (drawProgressRing).
const RING_GAP = 1.5, RING_W = 2; // the ring: RING_GAP off the button's edge
const songProgress = t => Math.min(1, Math.max(0, (t - song.notes[0][0]) / (song.end - song.notes[0][0])));
// The mulassa's pixel art (src/game/figures.js), facing the way the song goes. Painted once per HUD scale into a sprite, dark-outlined.
const MULE_S = 17 / 10.8, MULE_W = 12.8 * MULE_S, MULE_H = 10.8 * MULE_S; // 17 units tall with its outline
function paintMule(c) { // in a MULE_W × MULE_H box, feet at the bottom
  // the box fits a 12×10 portrait (Mulassa, Drac); a bigger one (the Bou's 18×13) shrinks to fit whole, centred, feet down
  const art = portraitArt(selectedFigure), w = art[0].length, h = art.length, fit = Math.min(1, 12 / w, 10 / h);
  c.scale(MULE_S * fit, MULE_S * fit); c.translate((12.8 / fit - w) / 2, 10.8 / fit - 0.4 - h);
  c.fillStyle = C.dark;
  portraitArt(selectedFigure).forEach((row, y) => [...row].forEach((k, x) => k !== '.' && c.fillRect(x - 0.4, y - 0.4, 1.8, 1.8))); // outline
  portraitArt(selectedFigure).forEach((row, y) => [...row].forEach((k, x) => { if (k !== '.') { c.fillStyle = portraitPalette(selectedFigure)[k]; c.fillRect(x, y, 1, 1); } }));
}
function muleGlyph(x, bottom) { // x: centre; blitted from a sprite (painted once per HUD scale), drawn directly without one (tests)
  const k = devScale(), y = bottom - MULE_H, x0 = x - MULE_W / 2;
  const sp = k ? sprite(`figure|${selectedFigure.id}|${k}`, k, () => ({ w: MULE_W, h: MULE_H }), c => paintMule(c)) : null;
  if (sp) { H.drawImage(sp.c, x0, y, sp.w, sp.h); return; }
  H.save(); H.translate(x0, y); paintMule(H); H.restore();
}
// The pill's text. PUNTS go digit by digit: one cached sprite per digit (a sprite per score would paint one on every hit).
// A fixed width, for six digits and 100%, so nothing moves as they count; the digits not reached yet stay dim, like an old arcade cabinet's LEDs.
const ENC_SIZE = 11, ENC_PAD = 9, ENC_SP = 4, PTS_GHOST = fmtNum(100000).replace(/\d/g, '0'), PTS_GHOST_COL = '#54436e', PTS_TRACK = 1, DASH = '-';
const isDigit = ch => ch >= '0' && ch <= '9';
const glyphWidth = ch => textWidth(isDigit(ch) ? '0' : ch, ENC_SIZE, true) + PTS_TRACK; // (the pixel font's digits are all as wide; the outline eats the gap between them)
function pointsWidth() {
  let sum = 0;
  for (const ch of PTS_GHOST) sum += glyphWidth(ch);
  return sum;
}
let ptsFor = -1, ptsStr = '';
function pointsText() { // bare digits, for the fixed slots: some languages group only from 10.000
  // shortcut: stops at 999.999, no chart comes near it; widen PTS_GHOST if one does
  if (G.score !== ptsFor) { ptsFor = G.score; ptsStr = String(Math.min(999999, comparableScore(G.score, G.diff, G.figureVersion))); }
  return ptsStr;
}
const ptsGlyph = (ch, col) => text(ch, 0, 0, ENC_SIZE, col, 'center', C.dark, true);
export const pillWarmups = () => [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9]].map(ds => () => { // painted ahead: the pill appears right on the first note
  setSpriteBudget(8);
  ds.forEach(d => ptsGlyph(String(d), C.score));
  for (const ch of new Set(PTS_GHOST)) { ptsGlyph(ch, PTS_GHOST_COL); ptsGlyph(ch, C.score); }
  text(DASH, 0, 0, ENC_SIZE, C.cream, 'left', C.dark, true);
});
const TOP = { x: 0, y: 0, w: 0, h: HUD_H, cy: 0, pad: 9, enc: { x: 0, y: 0, w: 0, h: ENC_H }, bar: { x: 0, y: 0, w: 0, h: 10 }, tag: { x: 0, y: 0, w: 50, h: 9 } };
export function topLayout() { // drawTop()'s geometry, filled in place; tests check it clears the rest
  const T = TOP, ph = HUD_H, reserve = (10 + PAUSE_PX() + 6 + Math.max(SAFE.r, SAFE.l)) / K; // clear of the pause button on both sides, so it stays centred
  T.y = snap(HUD_CY() - ph / 2); T.cy = T.y + ph / 2;
  T.w = snap(Math.min(250, W - 2 * reserve)); T.x = snap(W / 2 - T.w / 2);
  // one row: pad | mulassa | gap | ÀNIM bar | pad; PUNTS - ENCERTS share a pill under it, centred, of a fixed width
  const b = T.bar, g = T.tag, e = T.enc;
  b.x = snap(T.x + T.pad + MULE_W + 6); b.w = snap(T.x + T.w - T.pad - b.x); b.y = snap(T.cy - b.h / 2);
  e.w = snap(Math.min(T.w, 2 * (ENC_PAD + ENC_SP) + pointsWidth() + textWidth(DASH, ENC_SIZE, true) + textWidth('100%', ENC_SIZE, true))); e.x = snap(W / 2 - e.w / 2); e.y = snap(T.y + ph + 0.75 + ENC_GAP);
  g.x = W / 2 - g.w / 2; g.y = T.y - 3 - g.h / 2; // the x2 tag: a badge on the panel's top edge, over the ÀNIM bar's gap, inside the safe area
  return T;
}
const pauseBox = () => { const ps = PAUSE_PX() / K; return { cx: W - (10 + SAFE.r) / K - ps / 2, cy: ((K < 2 ? 13 : 18) + SAFE.t) / K + ps / 2, r: ps / 2 }; }; // #pause's circle (index.html)
export function drawProgressRing(t) { // a halo round #pause (the canvas sits under the button): a dark track and a gold arc
  const { cx, cy, r } = pauseBox(), R = r + RING_GAP, k = songProgress(t), a0 = -Math.PI / 2, at = f => a0 + f * 2 * Math.PI;
  H.lineWidth = RING_W; H.lineCap = 'butt';
  H.strokeStyle = 'rgba(42,26,16,0.86)'; H.beginPath(); H.arc(cx, cy, R, 0, 2 * Math.PI); H.stroke();
  if (k > 0) { H.strokeStyle = C.gold; H.beginPath(); H.arc(cx, cy, R, a0, at(k)); H.stroke(); }
}
// The pill under the panel: PUNTS in lilac, a dash, then ENCERTS, the hit rate, in its tier's colour. It appears with the first judged note.
function drawEncerts(T, v, n, up, pk) {
  if (!n) return; // nothing judged yet: no pill (no '—' placeholder)
  const { x, y, w, h } = T.enc, cy = y + h / 2 + 0.3 /* the pixel font's ink sits a little high */, col = v >= 90 ? C.green : up ? C.gold : v >= 35 ? C.blue : C.pink;
  H.beginPath(); H.roundRect(x, y, w, h, h / 2);
  if (pk > 0) glowPath(C.gold, 8 * pk);
  H.fillStyle = 'rgba(42,26,16,0.86)'; H.fill(); H.strokeStyle = C.gold; H.lineWidth = 1; H.stroke();
  const pts = pointsText(), first = 6 - pts.length; // the first lit slot
  let cx = x + ENC_PAD, slot = 0;
  for (const ch of PTS_GHOST) {
    const digit = isDigit(ch), lit = digit ? slot >= first : slot > first, g = glyphWidth(ch); // a separator lights once a digit before it has
    text(digit && lit ? pts[slot - first] : ch, cx + g / 2, cy, ENC_SIZE, lit ? C.score : PTS_GHOST_COL, 'center', C.dark, true); // opaque: an alpha would thin the outline too
    cx += g; if (digit) slot++;
  }
  text(DASH, x + ENC_PAD + pointsWidth() + ENC_SP, cy, ENC_SIZE, C.cream, 'left', C.dark, true);
  text(`${Math.round(v)}%`, x + w - ENC_PAD, cy, ENC_SIZE, col, 'right', C.dark, true);
}
export function drawTop(t = songTime()) { // t: drawHud's smooth draw clock (the notes' time)
  const T = topLayout(), ph = T.h, y = T.y, cy = T.cy, pw = T.w, x = T.x;
  const v = G.shown, n = judgedCount(G.counts), up = n > 0 && v >= 70;
  if (up !== meterUp) { meterUp = up; if (up && n > 1) meterT = clock; } // reaching the goal: a short golden pulse (not on the first note)
  const pk = Math.max(0, 1 - (clock - meterT) / 0.8), glow = pk * (0.6 + 0.4 * Math.sin((clock - meterT) * 20));
  hudBox(x, y, pw, ph, glow);
  const pad = T.pad;
  drawEnergy(x + pad, T.bar.x, T.bar.w, T.bar.y, cy);
  drawProgressRing(t);
  drawEncerts(T, v, n, up, pk);
  if (G.doublePoints) { // FINAL ESBOJARRAT at >= 70%: points count double, a small tag on the panel's top edge for as long as it lasts
    const pop = elastic(Math.min(1, (clock - (G.doubleT ?? clock)) * 3)), tw = T.tag.w, th = T.tag.h, tx = T.tag.x, ty = T.tag.y; // topLayout(): on the panel's top edge
    H.save(); H.translate(tx + tw / 2, ty + th / 2); H.scale(pop, pop);
    H.beginPath(); H.roundRect(-tw / 2, -th / 2, tw, th, th / 2);
    H.fillStyle = `hsl(${(clock * 200) % 360},80%,45%)`; H.fill();
    H.strokeStyle = C.gold; H.lineWidth = 1.5; H.stroke();
    H.restore();
    if (pop > 0.3) text(TOP_TXT.double, tx + tw / 2, ty + th / 2, 7 * pop, '#fff');
  }
}
function meterBar(x, y, w, h, k, col, danger = 0) { // dark track, glossy segmented fill
  H.fillStyle = '#140c07'; H.beginPath(); H.roundRect(x, y, w, h, h / 2); H.fill();
  if (danger) { H.fillStyle = 'rgba(192,40,60,0.28)'; H.beginPath(); H.roundRect(x, y, w * danger, h, h / 2); H.fill(); }
  if (k > 0.003) {
    const fw = Math.max(h, w * k);
    H.fillStyle = col; H.beginPath(); H.roundRect(x, y, fw, h, h / 2); H.fill();
    H.fillStyle = 'rgba(255,255,255,0.32)'; H.beginPath(); H.roundRect(x + 1.5, y + 1, Math.max(0, fw - 3), h * 0.32, h * 0.16); H.fill(); // gloss
    H.fillStyle = 'rgba(20,12,7,0.35)'; for (let i = 1; i < 10; i++) if (w * i / 10 < fw - 2) H.fillRect(snap(x + w * i / 10 - 0.5), y + h * 0.45, 1, h * 0.55); // segments
  }
  H.strokeStyle = 'rgba(255,243,214,0.18)'; H.lineWidth = 1; H.beginPath(); H.roundRect(x - 0.5, y - 0.5, w + 1, h + 1, h / 2 + 0.5); H.stroke();
}
// L'ÀNIM: green -> yellow -> red as it sinks, the 35% danger zone marked on the track; pulses and shakes when low;
// flashes white (and the mulassa hops) when a GUAPA / MANTÉN / GLOBUS refills it.
function drawEnergy(mx, bx, bw, by, cy) {
  const e = Math.max(0, Math.min(1, G.shownE)), low = G.energy < 0.35, danger = G.energy < 0.15;
  const hue = e > 0.5 ? 50 + (e - 0.5) * 140 : e * 100; // 120 green .. 50 yellow .. 0 red
  const col = `hsl(${hue},85%,${danger ? 55 + 10 * Math.sin(clock * 18) : 52}%)`;
  const dx = CALM.matches ? 0 : danger ? Math.sin(clock * 47) * 1.2 : low ? Math.sin(clock * 31) * 0.5 : 0;
  const fk = Math.max(0, 1 - (clock - G.energyT) / 0.6); // refill flash
  const bh = 10; // by: topLayout()
  mulaPortrait(mx + dx, cy, e, fk, low);
  meterBar(bx + dx, by, bw, bh, e, col, 0.35);
  H.fillStyle = 'rgba(255,243,214,0.55)'; H.fillRect(snap(bx + dx + bw * 0.35 - 0.5), by - 2, 1, bh + 4); // danger tick
  if (fk > 0) {
    H.globalAlpha = fk * 0.85;
    H.beginPath(); H.roundRect(bx, by - 1, Math.max(bh, bw * e), bh + 2, bh / 2 + 1); glowPath('#fff', 6 * fk);
    H.fillStyle = '#fff'; H.fill();
    H.globalAlpha = 1;
  }
  const warn = Math.max(0, 1 - (clock - (G.energyWarnT ?? -9)) / 0.7);
  if (warn > 0) {
    H.save(); H.globalAlpha = warn * 0.45; H.strokeStyle = C.red; H.lineWidth = 2;
    H.beginPath(); H.roundRect(bx - 2, by - 2, bw + 4, bh + 4, bh / 2 + 2); H.stroke(); H.restore();
  }
  if (low) { // a red rim that throbs with the danger
    H.save(); H.globalAlpha = 0.5 + 0.5 * Math.sin(clock * (danger ? 16 : 9));
    H.strokeStyle = C.red; H.lineWidth = 1.5; H.beginPath(); H.roundRect(bx + dx - 1.5, by - 1.5, bw + 3, bh + 3, bh / 2 + 1.5); H.stroke();
    H.restore();
  }
}
function mulaPortrait(x, cy, e, fk, low) { // the ànim's portrait: throbs and slumps back as the energy sinks, hops with a glow on a refill
  const pulse = low ? 1 + 0.08 * Math.sin(clock * 14) : 1, hop = CALM.matches ? 0 : fk * 3, bottom = cy + MULE_H / 2 - hop, mx = x + MULE_W / 2;
  if (fk > 0) { H.save(); H.globalAlpha = fk * 0.8; H.beginPath(); H.ellipse(mx, cy, MULE_W / 2 + 2, MULE_H / 2 + 2, 0, 0, 7); glowPath(C.gold, 6 * fk); H.fillStyle = C.gold; H.fill(); H.restore(); }
  H.save(); H.translate(mx, bottom); H.rotate(low ? -(0.35 - e) * 0.7 : 0); H.scale(pulse, pulse); // pivots on her feet: below 35% she leans back, ever more
  muleGlyph(0, 0);
  H.restore();
}
