// The title screen: logo, splash, the JUGA button (it opens «QUI BALLA?», src/ui/select-ui.js) and their layout.
import { song } from '../game/figure-song.js';
import { glintAt, POP, popsAt, titleLayout, CHIP } from './title-layout.js';
import { challengeTip } from '../services/share.js';
import { COARSE, beatAt, CALM } from '../core/env.js';
import { text, textWidth, glowPath, drawButton } from './primitives.js';
import { C, titleKey, titleL, PIXEL, FONT, setTitleKey, setTitleL } from './sprites.js';
import { G, chip, clock, CHALLENGE } from '../game/state.js';
import { W, HH, H, K, SAFE, setButtons } from './canvas.js';
import { iosHint, howtoEl, settingsEl, leadersEl, feedbackEl, musicEl } from '../ui/handles.js';

// The title's words, at the title's sizes (its logo is not the splash's size): painted on the splash, so the tap's first
// title frame only blits them (it painted ~10 new outlined sprites, along with the audio unlock and the DOM buttons).
export function titleWarmups() {
  return [() => logo(0, titleLayoutNow().s, true), () => logo(0, titleLayoutNow().s, true),
    () => { text(PLAY.name, 0, 0, 12, C.cream); text(PLAY.sub, 0, 0, titleLayoutNow().subSize, !COARSE.matches ? C.gold : '#e8d8b8'); }];
}
const PLAY = { name: 'JUGA', sub: 'Tria qui balla i el nivell' };
// The logo: MULASSA on a blocky extrusion (one dark copy of its sprite, stacked), a glint of light across its letters
// every few seconds, and TAP TAP DANCE tapping along to the menu loop, a word a beat (title-layout.js glintAt/popsAt).
// Every piece is a cached sprite, blitted (the words at a pop's size, drawn smaller: they stay crisp); reduced motion:
// all still. warm: paint every sprite (titleWarmups), the glint's too.
const LOGO_EXT = '#5e1514', LOGO_DEPTH = [0.03, 0.06];
const pops = [0, 0, 0], tapAt = new Map(); // tapAt: s -> TAP, TAP, DANCE's centres from the middle (measured once a size)
let mulaRatio = 5; // MULASSA's width / s (titleLayoutNow measures it)
function logo(y, s = splashS(), warm = false) { // the title passes its own layout budget
  const b = chip ? Math.abs(Math.sin(beatAt(Math.max(0, chip.now())) * Math.PI)) : 0, my = y - b * s * 0.06, calm = CALM.matches;
  for (const d of LOGO_DEPTH) text('MULASSA', W / 2, my + d * s, s, LOGO_EXT, 'center', LOGO_EXT, true);
  text('MULASSA', W / 2, my, s, C.red, 'center', C.cream, true);
  const g = warm ? 0.5 : calm ? null : glintAt(clock);
  if (g != null) glint(W / 2, my, s, g);
  const ts = s * 0.38, big = 1 + POP.max;
  let at = tapAt.get(ts);
  if (!at) { // (a handful of sizes: the splash's and the title's)
    const all = textWidth('TAP TAP DANCE', ts), tap = textWidth('TAP', ts), gap = textWidth('TAP TAP', ts) - 2 * tap;
    at = [-all / 2 + tap / 2, -all / 2 + tap * 1.5 + gap, all / 2 - textWidth('DANCE', ts) / 2];
    if (tapAt.size > 7) tapAt.clear();
    tapAt.set(ts, at);
  }
  popsAt(calm ? NaN : chip?.menuBeat?.() ?? clock * song.bpm / 60, pops);
  for (let i = 0; i < 3; i++) text(i < 2 ? 'TAP' : 'DANCE', W / 2 + at[i], y + s * 0.82 - pops[i] * POP.lift * ts, ts * big, C.gold, 'center', C.dark, false, (1 + pops[i]) / big);
  return y + s * 1.02; // bottom of the block
}
// The glint: a white copy of MULASSA's letters (one sprite; no outline) seen through a slanted band that crosses them
// (p: 0..1), a soft wide band and a brighter core, fading in and out at the ends
function glint(x, y, s, p) {
  const hw = mulaRatio * s / 2, lean = 0.3 * s, cx = x - hw - lean + p * (2 * hw + 2 * lean), a = Math.sin(Math.PI * p);
  for (const [w, alpha] of [[0.5 * s, 0.22], [0.16 * s, 0.5]]) {
    H.save();
    H.beginPath(); H.moveTo(cx - w / 2 + lean, y - 0.75 * s); H.lineTo(cx + w / 2 + lean, y - 0.75 * s);
    H.lineTo(cx + w / 2 - lean, y + 0.75 * s); H.lineTo(cx - w / 2 - lean, y + 0.75 * s); H.clip();
    H.globalAlpha *= alpha * a;
    text('MULASSA', x, y, s, '#fff', 'center', 'rgba(0,0,0,0)', true);
    H.restore();
  }
}
// Cap in CSS pixels too: the HUD scale grows on large displays, but the logo must leave the models visible.
export const splashS = () => Math.min(W / 5, HH / 4.6, 130, 180 / K);
export function drawSplash() {
  H.fillStyle = 'rgba(42,26,16,0.35)'; H.fillRect(0, 0, W, HH);
  logo(HH * 0.2);
  // Breathe as one button. Scale a single text sprite continuously, never its rounded font size.
  const pulse = CALM.matches ? 0 : (1 - Math.cos(clock * Math.PI * 2 / 2.4)) / 2, grow = 1 + 0.05 * pulse, s = COARSE.matches ? 'TOCA AQUÍ PER ENTRAR' : 'CLICA AQUÍ PER ENTRAR'; // (any tap used to go in: say where)
  const h = Math.max(32, 48 / K) * grow, w = Math.max(textWidth(s, 12) + 48, 120) * grow, y = HH * 0.82; // >= 44 css px
  H.beginPath(); H.roundRect(W / 2 - w / 2, y - h / 2, w, h, h / 2);
  glowPath(C.gold, 5 + 5 * pulse, 0.6 + 0.5 * pulse);
  H.fillStyle = 'rgba(42,26,16,0.8)'; H.fill(); H.strokeStyle = C.gold; H.lineWidth = 1.5; H.stroke();
  text(s, W / 2, y, 12 * 1.05, C.cream, 'center', C.dark, false, grow / 1.05);
  setButtons([{ x: W / 2 - w / 2, y: y - h / 2, w, h }]);
}
// Title layout (src/hud/title-layout.js): one budget for the logo, the choice and the DOM pill (+ iPhone hint) under it,
// recomputed only when the screen or what is shown changes (the DOM is measured then, never per frame). The pill and
// the hint are placed from it, so canvas buttons and DOM controls can't overlap. Corner mode = index.html's
// max-height: 500px rules (pill top-right, ⚙ top-left, the podium after it).
export const CORNER = matchMedia('(max-height: 500px)');
try { document.fonts?.ready.then(() => { setTitleKey(''); }); } catch { /* no font API (tests) */ } // widths change once the fonts load
export function titleLayoutNow() {
  const keys = !COARSE.matches, hint = !iosHint.hidden, corner = CORNER.matches;
  const key = `${W}|${HH}|${K}|${keys}|${hint}|${corner}|${G.audioError}|${SAFE.t},${SAFE.r},${SAFE.b},${SAFE.l}`;
  if (key === titleKey && titleL) return titleL;
  const rect = el => { const r = el.getBoundingClientRect?.(); return r && r.width ? r : null; };
  const pillH = howtoEl.offsetHeight, hintH = hint ? iosHint.offsetHeight : 0;
  setTitleKey(pillH && (!hint || hintH) ? key : ''); // still hidden (first frame): measure again next frame
  H.font = `140px ${PIXEL}`;
  const logoRatio = (H.measureText('MULASSA')?.width || 500) / 100 + 1.4 / 3; // logo(): text size 1.4 s + outline
  mulaRatio = logoRatio;
  setTitleL(titleLayout({
    W, HH, K, safe: SAFE, keys, note: G.audioError, logoRatio,
    subW: textWidth(PLAY.sub, 7),
    pill: { h: pillH || (K === 2 ? 56 : 44) }, hint: hint ? { h: hintH || 48 } : null, corner,
    obstacles: [settingsEl, leadersEl, feedbackEl, musicEl, corner && howtoEl].map(el => el && rect(el)).filter(Boolean), chip: Boolean(CHALLENGE),
  }));
  howtoEl.style.top = titleL.pillTopCss == null ? '' : `${titleL.pillTopCss}px`; // corner: index.html places it
  howtoEl.style.bottom = titleL.pillTopCss == null ? '' : 'auto';
  iosHint.style.top = titleL.iosTopCss == null ? '' : `${titleL.iosTopCss}px`;
  iosHint.style.bottom = titleL.iosTopCss == null ? '' : 'auto';
  return titleL;
}
// The first title ever: a faint "drag to look round" line for 3 s, just over the choice (inside the mulassa's free
// band, only if it has room), once; dragging ends it early.
export function drawTitle() {
  H.fillStyle = 'rgba(42,26,16,0.35)'; H.fillRect(0, 0, W, HH);
  // logo on top, the mulassa dancing in the middle, JUGA at the bottom above the "Com es juga?" pill
  const L = titleLayoutNow(), keys = !COARSE.matches; // keys: JUGA shows as the one in focus (Space / Enter press it)
  logo(L.logoY, L.s);
  setButtons(L.buttons.map(b => {
    drawButton(b.x, b.y, b.w, b.h, keys);
    text(PLAY.name, b.x + b.w / 2, b.y + b.h * 0.38, 12, C.cream);
    text(PLAY.sub, b.x + b.w / 2, b.y + b.h * 0.74, L.subSize, keys ? C.gold : '#e8d8b8');
    return b;
  }));
  if (L.chipY != null) tipChip(challengeTip(CHALLENGE), W / 2, L.chipY, Math.min(W - 16, 330), false, CHIP); // a friend's ?repte, over the button
  if (L.hintY == null) return; // no room for it (or touch)
  const s = G.audioError || 'ESPAI per començar', size = G.audioError ? 10 : 9;
  text(s, W / 2, L.hintY, Math.min(size, size * (W - 16) / textWidth(s, size)), C.cream);
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
