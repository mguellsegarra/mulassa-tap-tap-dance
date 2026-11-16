// Splash logo and prompt, plus the tips and stars shared by results.
import { tr } from '../i18n/messages.js';
import { song, beatAt } from '../game/figure-song.js';
import { glintAt, POP, popsAt } from './logo-motion.js';
import { COARSE, CALM } from '../core/env.js';
import { text, textWidth } from './primitives.js';
import { C, FONT, devScale, qSize, sprite } from './sprites.js';
import { G, chip, clock } from '../game/state.js';
import { W, HH, H, K, SAFE } from './canvas.js';

// The logo: MULASSA in Baloo, cream outlined on a darker cream extrusion (one copy under it: no dark smear on a game's dark page), a glint of light across
// its letters every few seconds, and TAP TAP DANCE tapping along to the menu loop, a word a beat
// (logo-motion.js glintAt/popsAt). Every piece is a cached sprite, blitted (the words at a pop's size, drawn smaller: they
// stay crisp); reduced motion: all still. warm: paint every sprite (splashWarmups), the glint's too.
const LOGO_RED = '#e8382f', LOGO_EXT = '#d8bf8f', LOGO_FS = 1.09, LOGO_LS = -0.0714; // font px per logo size s (the pixel logo's width), letter spacing in em
const pops = [0, 0, 0], tapAt = new Map(); // tapAt: s -> TAP, TAP, DANCE's centres from the middle (measured once a size)
const SPLASH_ENTER = [tr('hud.title.enterTouch'), tr('hud.title.enterClick')];
export function splashWarmups() { return [() => logo(0, splashS(), true)]; }
function logo(y, s = splashS(), warm = false) {
  const b = chip && G.state !== 'splash' ? Math.abs(Math.sin(beatAt(Math.max(0, chip.now())) * Math.PI)) : 0, my = y - b * s * 0.06, calm = CALM.matches;
  const hw = mulassa(W / 2, my, s, false);
  const g = calm ? null : glintAt(clock);
  if (g != null || warm) glint(W / 2, my, s, g ?? 0, hw);
  const ts = s * 0.38, big = 1 + POP.max;
  let at = tapAt.get(ts);
  if (!at) { // (cached per logo size)
    const all = textWidth('TAP TAP DANCE', ts), tap = textWidth('TAP', ts), gap = textWidth('TAP TAP', ts) - 2 * tap;
    at = [-all / 2 + tap / 2, -all / 2 + tap * 1.5 + gap, all / 2 - textWidth('DANCE', ts) / 2];
    if (tapAt.size > 7) tapAt.clear();
    tapAt.set(ts, at);
  }
  popsAt(calm ? NaN : chip?.menuBeat?.() ?? clock * song.bpm / 60, pops);
  for (let i = 0; i < 3; i++) text(i < 2 ? 'TAP' : 'DANCE', W / 2 + at[i], y + s * 0.82 - pops[i] * POP.lift * ts, ts * big, C.gold, 'center', C.dark, false, (1 + pops[i]) / big);
  return y + s * 1.02; // bottom of the block
}
// MULASSA centred on (x, y) at logo size s, from one sprite per size (white: only the letters, for the glint); returns
// its half width. As the selector's SVG: a thin dark line round it all, the extrusion, the cream outline, the red letters; tight letters, so the thin
// outline still closes the gap between the two S.
function mulassa(x, y, s, white) {
  const k = devScale(), fs = s * LOGO_FS, q = k ? qSize(fs * k) / k : fs, font = `800 ${q}px ${FONT}`, lw = q * 0.14, ex = q * 0.05, ol = lw + q * 0.052, pad = ol / 2 + 2;
  const sp = k && sprite(`MULASSA-logo|${font}|${k}|${white ? 1 : 0}`, k, c => {
    c.font = font; c.letterSpacing = `${LOGO_LS * q}px`; const m = c.measureText('MULASSA'), asc = m.actualBoundingBoxAscent || q * 0.625;
    // the ink's own edges: with tight letters the last A reaches past the advance width (it was cut)
    const left = m.actualBoundingBoxLeft || 0, tw = left + (m.actualBoundingBoxRight || m.width);
    return { tw, left, w: tw + 2 * pad, h: asc + (m.actualBoundingBoxDescent || 0) + lw + ex + 2 * pad, base: pad + lw / 2 + asc, cy: pad + lw / 2 + asc / 2 };
  }, (c, d) => {
    c.font = font; c.letterSpacing = `${LOGO_LS * q}px`; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round'; c.lineWidth = lw;
    if (white) { c.fillStyle = '#fff'; c.fillText('MULASSA', pad + d.left, d.base); return; }
    c.strokeStyle = C.dark; c.lineWidth = ol; c.strokeText('MULASSA', pad + d.left, d.base + ex); c.strokeText('MULASSA', pad + d.left, d.base);
    c.lineWidth = lw; c.strokeStyle = c.fillStyle = LOGO_EXT; c.strokeText('MULASSA', pad + d.left, d.base + ex); c.fillText('MULASSA', pad + d.left, d.base + ex);
    c.strokeStyle = C.cream; c.strokeText('MULASSA', pad + d.left, d.base);
    c.fillStyle = LOGO_RED; c.fillText('MULASSA', pad + d.left, d.base);
  }, true);
  if (sp) {
    const r = fs / q;
    H.drawImage(sp.c, x - sp.w / 2 * r, y - sp.cy * r, sp.w * r, sp.h * r);
    return sp.tw * r / 2;
  }
  // no sprite this frame: flat letters straight onto the HUD
  H.font = `800 ${fs}px ${FONT}`; H.letterSpacing = `${LOGO_LS * fs}px`; H.textAlign = 'center'; H.textBaseline = 'middle'; H.lineJoin = 'round'; H.lineWidth = fs * 0.14;
  H.strokeStyle = C.cream; if (!white) H.strokeText('MULASSA', x, y);
  H.fillStyle = white ? '#fff' : LOGO_RED; H.fillText('MULASSA', x, y);
  const hw = (H.measureText('MULASSA')?.width || fs * 3.85) / 2;
  H.letterSpacing = '0px'; // the HUD's other text is spaced normally
  return hw;
}
// The glint: the white copy of MULASSA's letters seen through a slanted band that crosses them (p: 0..1), a soft wide
// band and a brighter core, fading in and out at the ends
function glint(x, y, s, p, hw) {
  const lean = 0.3 * s, cx = x - hw - lean + p * (2 * hw + 2 * lean), a = Math.sin(Math.PI * p);
  for (const [w, alpha] of [[0.5 * s, 0.22], [0.16 * s, 0.5]]) {
    H.save();
    H.beginPath(); H.moveTo(cx - w / 2 + lean, y - 0.75 * s); H.lineTo(cx + w / 2 + lean, y - 0.75 * s);
    H.lineTo(cx + w / 2 - lean, y + 0.75 * s); H.lineTo(cx - w / 2 - lean, y + 0.75 * s); H.clip();
    H.globalAlpha *= alpha * a;
    mulassa(x, y, s, true);
    H.restore();
  }
}
// Cap in CSS pixels too: the HUD scale grows on large displays, but the logo must leave the models visible.
export const splashS = () => Math.min(W / 5, HH / 4.6, 130, 180 / K);
const splashPrompt = () => Math.max(32, 48 / K); // the prompt's height (drawSplash)
// The band between the splash's logo and its prompt (css px, the selector band's shape: cameras.js frames the pair in it); their
// heads may rise behind TAP TAP DANCE (under the logo alone, a desktop's band left them small and far)
export function splashBand(out) {
  out.top = out.hardTop = (HH * 0.2 + splashS() * 0.3) * K;
  out.bottom = (HH * 0.82 - splashPrompt() / 2 - 6) * K;
  out.left = SAFE.l; out.right = W * K - SAFE.r; out.ground = true; // (a narrow screen fits them by width: on the floor, not floating mid-band)
  return out;
}
export function drawSplash() {
  H.fillStyle = 'rgba(42,26,16,0.35)'; H.fillRect(0, 0, W, HH);
  logo(HH * 0.2);
  // The foot fades to the page edge's colour (theme-color), so it meets the phone's browser bar; over it, cream outlined
  // words that swell a little every 1.6 s, no button: a tap or key anywhere goes in (input.js). Reduced motion: still.
  const g = H.createLinearGradient(0, HH * 0.6, 0, HH);
  g.addColorStop(0, 'rgba(20,12,7,0)'); g.addColorStop(0.5, 'rgba(20,12,7,0.65)'); g.addColorStop(1, '#140c07');
  H.fillStyle = g; H.fillRect(0, HH * 0.6, W, HH * 0.4);
  const s = SPLASH_ENTER[COARSE.matches ? 0 : 1];
  const swell = CALM.matches ? 1 : 1 + 0.05 * (1 - Math.cos(clock * Math.PI * 2 / 1.6)) / 2;
  const fit = Math.min(1, (W - 40) / textWidth(s, 18 * 1.05)); // a longer language shrinks its words to the screen
  text(s, W / 2, HH * 0.82, 18 * 1.05, C.cream, 'center', C.dark, false, fit * swell / 1.05); // (one sprite, drawn smaller)
}
export function sparkle(x, y, r, col) { // four-point star
  H.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r;
    H.lineTo(x + Math.sin(a) * rr, y - Math.cos(a) * rr);
  }
  H.closePath(); H.fillStyle = col; H.fill();
}
export function tipChip(s, cx, cy, maxW, win, h = 20) { // advice reads as a tip: teal pill + lightbulb; a gold star pill when flawless
  const pad = 8 + (h - 20) / 3, icon = 12;
  let size = 9 * h / 20;
  H.font = `800 ${size * 1.15}px ${FONT}`;
  const tw = H.measureText(s)?.width || s.length * 5.5, room = maxW - icon - pad * 3;
  if (tw > room) size *= room / tw;
  const w = Math.min(tw, room) + icon + pad * 3, x = cx - w / 2;
  // a note, not a button: no outline, barely rounded corners, a coloured strip on the left
  H.beginPath(); H.roundRect(x, cy - h / 2, w, h, 3);
  H.fillStyle = win ? 'rgba(60,40,6,0.78)' : 'rgba(8,44,46,0.78)'; H.fill();
  H.fillStyle = win ? C.gold : '#5fd4c8'; H.fillRect(x, cy - h / 2, 3, h);
  const ix = x + pad + icon / 2;
  if (win) sparkle(ix, cy, 6.5, C.gold);
  else { // lightbulb: glass bulb, neck, screw base
    H.fillStyle = '#ffe98a'; H.beginPath(); H.arc(ix, cy - 2, 4, 0, Math.PI * 2); H.fill();
    H.fillRect(ix - 2, cy + 1, 4, 2.5);
    H.fillStyle = '#b9c7c9'; H.fillRect(ix - 2, cy + 4, 4, 2);
  }
  text(s, x + pad * 2 + icon, cy, size, win ? C.gold : '#bff5ec', 'left', win ? C.dark : '#06292b');
}
