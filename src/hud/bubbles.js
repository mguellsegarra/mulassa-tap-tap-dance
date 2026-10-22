// Speech bubbles anchored to people in the plaza.
import { restTimeline, rattled, updateRest, placeBubble, mayTalk, BUBBLE_SECONDS } from '../game/bubble-rules.js';
import * as THREE from 'three';
import { song } from '../game/figure-song.js';
import { pick } from '../scene/models.js';
import { SAFE, K, W, HH, toScreen, H } from './canvas.js';
import { G, songTime, balloonAt, bigPending, clock } from '../game/state.js';
import { playStage } from './layout.js';
import { M } from '../scene/mula-motion.js';
import { textWidth, text } from './primitives.js';
import { activeCrowd } from '../scene/quality.js';
import { C } from './sprites.js';
import { trf, FIGURE_CHATTER_KEYS } from '../game/figure-theme.js';
import { wrapLines } from './text-wrap.js';
import { isLatin, isCjk } from '../i18n/fonts.js';

// Speech bubbles anchored to people in the world, only in rests and hushed while the player struggles. Each one sits whole inside the free area (safe area, under the HUD + lane +
// judge/headline slots, over the pad) with its tail on the speaker; no room there: another spectator, or nothing.
export const bubbles = [];
export let lastBubble = -9, shaken = false, nextChatter = 0, rests = restTimeline([]);
export const setLastBubble = v => (lastBubble = v);
export const setShaken = v => (shaken = v);
export const setNextChatter = v => (nextChatter = v);
export const setRests = v => (rests = v);
const BUB = { size: 9, h: 14, tail: 7, pad: 10, line: 1.2, min: 0.6 }; // HUD units; min: the smallest share of the size a non-Latin bubble is shrunk to
const bubPos = new THREE.Vector3(), talkNow = { diff: 0, live: false, rattled: false, sinceMiss: 9, onScreen: 0, sinceLast: 9, combo: 0, energy: 1, restAvailable: false };
function bubbleView() { // the free area, HUD units
  const v = { l: SAFE.l / K + 4, r: W - SAFE.r / K - 4, t: SAFE.t / K + 4, b: HH - SAFE.b / K - 4 };
  if (G.state !== 'play') return v;
  const area = playStage();
  v.t = Math.max(v.t, area.top + 2); v.b = Math.min(v.b, area.bottom - 2);
  return v;
}
export function talkState() {
  shaken = rattled(shaken, G);
  const t = songTime();
  updateRest(rests, t, Boolean(G.hold || balloonAt(t) || bigPending));
  return Object.assign(talkNow, { diff: G.diff, live: G.state === 'play' && !G.practice && !G.paused && !G.collapseT && t >= G.go && t < song.end,
    rattled: shaken, sinceMiss: clock - M.missT, onScreen: bubbles.length, sinceLast: clock - lastBubble, combo: G.combo, energy: G.energy, restAvailable: rests.available });
}
function fitBubble(txt, v) { // font size, body width and lines that fit the free width; null: too long to stay readable (the bubble is optional)
  const room = v.r - v.l, scale = Math.min(1, room / (textWidth(txt, BUB.size) + BUB.pad));
  if (isLatin() || scale >= BUB.min) { const size = BUB.size * scale; return [size, textWidth(txt, size) + BUB.pad, [txt]]; }
  const lines = wrapLines(txt, s => textWidth(s, BUB.size), room - BUB.pad, isCjk());
  if (lines.length > 2) return null;
  const widest = Math.max(...lines.map(l => textWidth(l, BUB.size))), size = BUB.size * Math.min(1, (room - BUB.pad) / widest);
  return size < BUB.size * BUB.min ? null : [size, widest * size / BUB.size + BUB.pad, lines];
}
const bubbleH = n => BUB.h + (n - 1) * BUB.size * BUB.line;
const takenBoxes = () => bubbles.filter(b => b.shown).map(b => b.box);
// a visible spectator near the mulassa with room for `w` (lure: the one nearest the lane, where it tempts the eye)
function speaker(w, h, v, lure = false) {
  const d = p => (p.g.position.x - M.pos.x) ** 2 + (p.g.position.z - M.pos.y) ** 2;
  const taken = takenBoxes(), ok = [];
  for (const p of activeCrowd.slice().sort((a, b) => d(a) - d(b)).slice(0, 24)) {
    const pos = at(p.g, 2.3), box = placeBubble(toScreen(pos()), w, h, BUB.tail, v, taken);
    if (box) ok.push([pos, box]);
  }
  if (!ok.length) return null;
  if (lure) ok.sort((a, b) => a[1].y0 - b[1].y0);
  return ok[Math.floor(Math.random() * Math.min(lure ? 3 : ok.length, ok.length))][0];
}
// kind: 'crowd' | 'chatter' | 'celebrate'. pos null: a spectator near the mulassa.
export function bubble(txt, pos, col = C.dark, kind = 'crowd') {
  if (!mayTalk(kind, talkState())) return false;
  const v = bubbleView(), fit = fitBubble(txt, v);
  if (!fit) return false;
  const [size, w, lines] = fit, h = bubbleH(lines.length);
  if (!pos || !placeBubble(toScreen(pos()), w, h, BUB.tail, v, takenBoxes())) pos = speaker(w, h, v, kind === 'chatter');
  if (!pos) return false;
  lastBubble = clock;
  bubbles.push({ txt, lines: lines.length > 1 ? lines : null, h, pos, t0: clock, dur: BUBBLE_SECONDS, col, size, w, box: { x0: 0, y0: 0, x1: 0, y1: 0 }, shown: false });
  return true;
}
function talk() { // a little festa-major chatter, only when the chart leaves room
  if (G.state !== 'play' || clock < nextChatter) return;
  nextChatter = clock + 0.4 + Math.random() * 1.2;
  bubble(trf(pick(FIGURE_CHATTER_KEYS)), null, C.dark, 'chatter');
}
export function drawBubbles() {
  const state = talkState();
  if (G.state === 'play' && (!state.live || state.rattled || rests.remaining < 0.2 || songTime() < rests.previousEnd || G.hold || balloonAt(songTime()) || bigPending)) {
    bubbles.length = 0;
  }
  talk();
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i], k = (clock - b.t0) / b.dur;
    if (k > 1) { bubbles.splice(i, 1); continue; }
    const v = bubbleView(), a = toScreen(b.pos()), w = Math.min(b.w, v.r - v.l);
    const p = placeBubble(a, w, b.h ?? BUB.h, BUB.tail + k * 6, v); // rises a little as it fades
    b.shown = !!p;
    if (!p) continue; // the speaker is off the free area this frame
    Object.assign(b.box, { x0: p.x - w / 2, y0: p.y0, x1: p.x + w / 2, y1: p.y1 });
    H.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1;
    H.beginPath();
    H.moveTo(p.x - w / 2, p.y0); H.lineTo(p.x + w / 2, p.y0); H.lineTo(p.x + w / 2, p.y1);
    if (p.tipX != null) { H.lineTo(p.baseX + 4, p.y1); H.lineTo(p.tipX, p.tipY); H.lineTo(p.baseX - 4, p.y1); }
    H.lineTo(p.x - w / 2, p.y1);
    H.closePath();
    H.fillStyle = '#fff'; H.fill();
    H.strokeStyle = C.dark; H.lineWidth = 1.5; H.lineJoin = 'round'; H.stroke();
    const sz = b.size * Math.min(1, w / b.w), mid = (p.y0 + p.y1) / 2;
    if (!b.lines) text(b.txt, p.x, mid, sz, b.col, 'center', '#fff');
    else for (let j = 0; j < b.lines.length; j++) text(b.lines[j], p.x, mid + (j - (b.lines.length - 1) / 2) * sz * BUB.line, sz, b.col, 'center', '#fff'); // non-Latin: two lines
    H.globalAlpha = 1;
  }
}
export const at = (obj, y) => () => bubPos.setFromMatrixPosition(obj.matrixWorld).setY(y); // shared vector: read it right away
