// The lane: notes, holds, balloons, the hit ring and the streak badge.
import { tr } from '../i18n/messages.js';
import { figTheme } from '../game/figure-theme.js';
import { lane, LH } from './layout.js';
import { W, H, PXU, SAFE, K } from './canvas.js';
import { BEATS, beatAt, CALM } from '../core/env.js';
import { RING_R, holdTail, holdHalo, noteDisc, holdCharge, text, textWidth, NOTE_R, glowDisc, glowPath } from './primitives.js';
import { G, balloonShown, clock } from '../game/state.js';
import { pulse } from '../core/anim.js';
import { balloonFx, balloonHead, balloonShape, setBalloonView } from './balloon.js';
import { C, DIRC, setSpriteBudget } from './sprites.js';
import { topLayout } from './top.js';
import { M } from '../scene/mula-motion.js';
const LANE_TXT = { hold: tr('hud.lane.hold'), taps: tr('hud.lane.taps'), balloon: tr('hud.lane.balloon'), pop: tr('hud.lane.pop'), mash1: tr('hud.lane.mash1'), mash2: tr('hud.lane.mash2'), mash: tr('hud.lane.mash'), streak: tr('hud.lane.streak') };

export function drawLane(t) {
  const { cy, hx, s, sb, speed } = lane(), LB = LH * sb / s, top = cy - LB / 2, bottom = cy + LB / 2; // in lane units, scaled by s around the ring
  const W0 = hx - hx / s, W1 = hx + (W - hx) / s; // the screen's left and right edges in lane units
  H.save(); H.translate(hx, cy); H.scale(s, s); H.translate(-hx, -cy);
  H.fillStyle = 'rgba(42,26,16,0.45)'; H.fillRect(W0, top, W1 - W0, LB); // see-through: the plaça shows behind
  H.fillStyle = 'rgba(245,197,24,0.8)'; H.fillRect(W0, top, W1 - W0, 1.5); H.fillRect(W0, top + LB - 1.5, W1 - W0, 1.5);
  for (let i = 0; i < BEATS.length; i++) { // a line on every real beat of the recording, stronger on each bar (4 beats)
    const x = hx + (BEATS[i] - t) * speed;
    if (x > W1) break;
    if (x <= hx + RING_R) continue; // never inside the target: the ring beats instead
    if (i % 4) { H.fillStyle = 'rgba(255,243,214,0.12)'; H.fillRect(x - 0.5, top + 6, 1, LB - 12); }
    else { H.fillStyle = 'rgba(255,243,214,0.35)'; H.fillRect(x - 1, top + 4, 2, LB - 8); }
  }
  drawRing(t, hx, cy);
  let held = null;
  for (let i = Math.min(G.chart.length - 1, G.next + 40); i >= Math.max(0, G.next - 4); i--) {
    const n = G.chart[i];
    const holding = G.hold?.n === n, dropped = n.dropAt != null && !holding;
    if (n.hit && !holding && !dropped) continue;
    const x = hx + (n.t - t) * speed;
    if (n.end && !n.balloon) { // MANTÉN: the tail is eaten at the ring while held; the head then sits on the ring, glowing
      const xe = hx + (n.end - t) * speed, xh = holding ? hx : dropped ? hx + (n.dropAt - t) * speed : x;
      if (x > W1 + 20 || xe < hx - 20) continue;
      if (dropped) { holdTail(n.input, xh, Math.min(xe, W1 + 40), cy, 2); continue; } // let go: what was left greys out and scrolls away
      holdTail(n.input, xh, Math.min(xe, W1 + 40), cy, holding ? 1 : 0);
      if (holding) holdHalo(n.input, hx, cy);
      noteDisc(n.input, xh, cy, 14);
      if (holding) held = n;
      continue;
    }
    if (n.balloon) { // head + tail over its whole window; the head waits on the ring while it lasts
      const xe = hx + (n.end - t) * speed - 14, xh = Math.max(hx, x); // tail stops short of the next note
      if (x > W1 + 20 || xe < hx) continue;
      const live = balloonShown(t) === n, k = live ? (n.count % n.need) / n.need : 0, pp = pulse(G.popT ?? -9, 0.35), hit = live ? Math.max(pulse(G.pumpT, 0.14), pp * 2) : 0, w = balloonFx?.wobble() ?? { sq: 0, rot: 0 };
      const br = 8 + hit * 1.5, bw = Math.max(0, xe - xh) + 8; // the roll's bar swells on every tap; a pill at any height, its 2 px rim even all round (the carretilla leaves the left end in view)
      H.fillStyle = C.dark; H.beginPath(); H.roundRect(xh - 2, cy - br - 2, bw + 4, 2 * br + 4, br + 2); H.fill();
      H.fillStyle = pp > 0.3 ? C.cream : hit > 0.05 ? '#ffd166' : '#ff9f1c'; H.beginPath(); H.roundRect(xh, cy - br, bw, 2 * br, br); H.fill();
      const bob = live ? 0 : Math.sin(clock * 6 + n.t) * 1.6, shake = Math.sin(clock * 80) * hit * 2; // waiting: a restless bob; tapped: a jolt
      balloonHead(xh + shake, cy - 3 + bob, 14 * (1 + 0.22 * k + pp * 0.35), k, w.sq, w.rot);
      continue;
    }
    if (x > W1 + 20 || x < hx - 20) continue;
    noteDisc(n.input, x, cy, 14, n.big);
  }
  drawRingTop(t, hx, cy, !!held);
  if (held) {
    holdCharge(held.input, hx, cy, (G.hold.got - held.t) / (held.end - held.t));
    text(LANE_TXT.hold, hx + 30, bottom + 8, 9 * 1.06, C.gold, 'left', C.dark, false, (1 + 0.06 * Math.sin(clock * 8)) / 1.06); // small label beside the ring, clear of the judge word
  }
  const bl = balloonShown(t);
  if (bl) { // the balloon hangs from the ring, under the lane, and inflates with every tap; the counter keeps going after each pop
    const k = (bl.count % bl.need) / bl.need, carretilles = figTheme.drac;
    const r = carretilles ? 24 : 9 + 17 * k + pulse(G.pumpT, 0.15) * 3, by = carretilles ? bottom + 24 : bottom + 8 + r;
    const m = balloonFx && H.getTransform?.(); // the 3D balloon (balloon3d.js) is drawn under the HUD: say where it hangs, the counter below sits on top
    if (m) {
      const px = (x, y) => [(m.a * x + m.c * y + m.e) / PXU, (m.b * x + m.d * y + m.f) / PXU], [bx, byy] = px(hx, by), [ax, ay] = px(hx, cy + 17), sc = Math.hypot(m.a, m.b) / PXU;
      setBalloonView({ x: bx, y: byy, r: r * sc, k, ax, ay });
    } else {
      if (!carretilles) { H.strokeStyle = C.cream; H.lineWidth = 1; H.beginPath(); H.moveTo(hx, cy + 17); H.lineTo(hx, by - r); H.stroke(); }
      balloonShape(hx, by, r, `hsl(${350 - k * 30},90%,${62 - k * 8}%)`);
    }
    if (carretilles) { // keep tapping through the whole roll: only the cumulative tap total, not the tro's threshold
      text(String(bl.count), hx + 34, bottom + 12, 20, C.cream, 'left', C.dark, false, 0.8 * (1 + pulse(G.pumpT, 0.12) * 0.25));
      text(LANE_TXT.taps, hx + 34, bottom + 26, 8, C.cream, 'left');
    } else {
      text(String(bl.count), hx, by, 28, C.cream, 'center', C.dark, false, (9 + r * 0.55 + pulse(G.pumpT, 0.12) * 3) / 28); // the total only ever goes up; grows from one sprite per number (r < 29)
      const pops = Math.floor(bl.count / bl.need);
      text(pops ? `x${pops}` : `${bl.need - bl.count}`, hx + 34, bottom + 12, 20, C.gold, 'left', C.dark, false, 0.8 * (1 + pulse(G.pumpT, 0.12) * 0.25));
      text(pops ? LANE_TXT.balloon : LANE_TXT.pop, hx + 34, bottom + 26, 8, C.cream, 'left');
    }
    const urge = (1 + 0.08 * Math.sin(clock * 12)) / 1.08, U = 9 * 1.08; // mirrors the counter on the other side of the balloon
    if (hx - 34 - W0 > textWidth(LANE_TXT.mash2, 9) + 2) { text(LANE_TXT.mash1, hx - 34, bottom + 12, U, C.gold, 'right', C.dark, false, urge); text(LANE_TXT.mash2, hx - 34, bottom + 25, U, C.gold, 'right', C.dark, false, urge); }
    else text(LANE_TXT.mash, hx + 34, bottom + 40, U, C.gold, 'left', C.dark, false, urge); // no room left of the ring (phones): under the counter
  }
  const hd = G.holdDone, hk = hd ? (clock - hd.t0) / 0.7 : 1;
  if (hk < 1) { // A finished hold sends a flat shockwave along the lane; practice also names it
    const e = 1 - hk;
    H.save(); H.globalCompositeOperation = 'lighter'; H.globalAlpha = e;
    H.strokeStyle = DIRC[hd.dir]; H.lineWidth = 1 + 4 * e;
    H.beginPath(); H.ellipse(hx, cy, RING_R + 70 * (1 - e * e), RING_R + 2 * (1 - e), 0, 0, 7); H.stroke();
    H.strokeStyle = C.gold; H.lineWidth = 1 + 2 * e;
    H.beginPath(); H.ellipse(hx, cy, RING_R + 45 * (1 - e * e * e), RING_R + 1 * (1 - e), 0, 0, 7); H.stroke();
    H.restore();
  }
  H.restore();
  drawStreak(t); // in screen units, over the band
}
// Hit-ring juice (Taiko style), all under 300 ms: PERFECTE flashes gold with a shockwave and sparks in the
// note's colour, BÉ a small cream pulse, ERROR shakes and dims slate blue; every tap squashes the ring a little.
const SPARKS = Array.from({ length: 32 }, () => ({ t0: -9, a: 0, v: 0, col: '' }));
let sparkI = 0;
export function ringSparks(n, col, v) { // downwards only (the HUD is above the lane), so they never hide the notes coming in on the right
  for (let i = 0; i < n; i++) Object.assign(SPARKS[sparkI = (sparkI + 1) % SPARKS.length], { t0: clock, a: Math.PI * (0.1 + Math.random() * 0.8), v: v * (0.6 + Math.random() * 0.6), col });
}
export function ringFx(kind, col, word = '') {
  G.ring = { kind, t0: clock, col, word };
  if (kind === 'perfect') ringSparks(6, col, 26);
  if (kind === 'good') ringSparks(3, C.cream, 16);
  if (kind === 'pop') { ringSparks(16, '#ff5a7a', 44); ringSparks(8, C.gold, 36); }
  if (kind === 'gran') { ringSparks(14, col, 44); ringSparks(8, C.gold, 34); }
}
function ringAnim(t) {
  const r = G.ring, wide = r && (r.kind === 'pop' || r.kind === 'gran'), k = r ? (clock - r.t0) / (wide ? 0.45 : 0.3) : 1, on = k < 1, e = 1 - k;
  return { r, wide, on, e, miss: on && r.kind === 'miss' };
}
function drawRing(t, hx, cy) {
  const { r, wide, on, e, miss } = ringAnim(t), fl = pulse(G.flash, 0.2), x = hx + (miss ? Math.sin(clock * 90) * 3 * e : 0);
  H.fillStyle = 'rgba(20,12,6,0.16)'; H.beginPath(); H.arc(x, cy, RING_R, 0, 7); H.fill();
  H.fillStyle = miss ? `rgba(40,55,95,${0.3 + 0.4 * e})` : 'rgba(20,12,6,0.32)'; H.beginPath(); H.arc(x, cy, NOTE_R, 0, 7); H.fill(); // the socket
  if (fl > 0) { H.fillStyle = `rgba(255,243,214,${fl * 0.35})`; H.beginPath(); H.arc(x, cy, NOTE_R, 0, 7); H.fill(); }
  if (on && (r.kind === 'perfect' || wide)) { // gold flash with a glow in the note's colour
    H.globalAlpha = e; glowDisc(x, cy, NOTE_R - 1, NOTE_R + 5, r.col);
    H.fillStyle = C.gold; H.beginPath(); H.arc(x, cy, NOTE_R, 0, 7); H.fill(); H.globalAlpha = 1;
  }
  const lit = r?.kind === 'perfect' || r?.kind === 'gran';
  if (on && r.word) { // inside the ring: never over the words above, and shrunk to fit inside the thin inner ring (GUAPA!)
    const s = 8 + 3 * e, w = textWidth(r.word, s), fit = 2 * NOTE_R - 5, sz = w > fit ? s * fit / w : s, top = Math.min(11, fit * s / w); // top: its size at e = 1 (widths scale with s)
    text(r.word, x, cy, top, lit ? C.dark : C.cream, 'center', lit ? C.cream : C.dark, false, sz / top); // one sprite per word, shrunk
  }
  if (miss) { H.strokeStyle = `rgba(20,20,30,${e})`; H.lineWidth = 1.5; H.beginPath(); H.moveTo(x - 9, cy - 10); H.lineTo(x - 2, cy - 1); H.lineTo(x - 6, cy + 3); H.lineTo(x + 4, cy + 11); H.stroke(); } // crack
}
function drawRingTop(t, hx, cy, holding) {
  const { r, wide, on, e, miss } = ringAnim(t), x = hx + (miss ? Math.sin(clock * 90) * 3 * e : 0);
  const fl = pulse(G.flash, 0.2), bt = beatAt(Math.max(0, t)), beatPulse = Math.max(0, 1 - (bt % 1) * 4), squash = pulse(G.tapT ?? -9, 0.12), pp = pulse(G.popT ?? -9, 0.35);
  const barPulse = t > 0 && Math.floor(bt) % 4 === 0 ? beatPulse : 0; // the ring beats with the music, gold and bigger on each bar
  H.strokeStyle = miss ? '#8aa0c8' : 'rgba(255,243,214,0.6)'; H.lineWidth = 1; // thin inner ring: where the note's edge lands
  H.beginPath(); H.arc(x, cy, NOTE_R, 0, 7); H.stroke();
  if (!holding) { // thick outer ring (a hold draws its charging arc here instead)
    const rx = RING_R + fl * 4 + beatPulse * 2 + barPulse * 2 + squash * 2 + pp * 8, ry = RING_R + fl * 4 + beatPulse * 2 + barPulse * 2 - squash * 3 + pp * 8;
    H.strokeStyle = 'rgba(42,26,16,0.55)'; H.lineWidth = 5; H.beginPath(); H.ellipse(x, cy, rx, ry, 0, 0, 7); H.stroke();
    H.strokeStyle = miss ? '#8aa0c8' : fl > 0.3 || barPulse > 0.3 || pp > 0.3 ? C.gold : C.cream; H.lineWidth = 3 + barPulse + pp * 3; H.beginPath(); H.ellipse(x, cy, rx, ry, 0, 0, 7); H.stroke();
  }
  if (on && r.kind !== 'miss') { // shockwave
    const big = wide ? 30 : r.kind === 'perfect' ? 14 : 8;
    H.globalAlpha = e * (r.kind === 'good' ? 0.6 : 1); H.strokeStyle = r.kind === 'good' ? C.cream : r.col; H.lineWidth = 1 + 3 * e;
    H.beginPath(); H.arc(x, cy, RING_R + big * (1 - e * e), 0, 7); H.stroke();
    if (r.kind === 'gran') { H.strokeStyle = C.gold; H.beginPath(); H.arc(x, cy, RING_R + 18 * (1 - e * e * e), 0, 7); H.stroke(); } // double wave
    H.globalAlpha = 1;
  }
  for (const s of SPARKS) {
    const sk = (clock - s.t0) / 0.3;
    if (sk < 0 || sk >= 1) continue;
    const d = RING_R + s.v * (1 - (1 - sk) * (1 - sk)), z = 3.5 * (1 - sk);
    H.fillStyle = s.col; H.fillRect(hx + Math.cos(s.a) * d - z / 2, cy + Math.sin(s.a) * d - z / 2, z, z);
  }
}
// The streak (RATXA): a small badge in the corner of the eye, never on the notes' path. Wide screens (the ring in the
// middle): inside the band, just behind the ring, where the notes have already gone. Portrait phones (the ring near
// the left edge, no room behind it): the top row, left of the panel (level with the mulassa and the bar). From `show` in a row
// (quiet cream), gold from 10; its colour climbs the tiers; each hit pops it a little, a milestone
// pops it more with a brief glow; from `heat` it breathes on the beat, from 100 its rim runs through the colours.
// A miss lets it sink and fade (no flash). Reduced motion: colour only. Only scale and colour move: no jitter.
// Digits are one cached sprite per digit and tier (painted ahead, streakWarmups), drawn with a fixed advance.
const STREAK = { show: 10, heat: 50, rainbow: 100, num: 13, lab: 6, maxPop: 1.3, pop: 0.1, popT: 0.16, big: 0.28, bigT: 0.45, glowT: 0.7, fade: 0.6, drop: 3,
  tiers: [[10, C.gold], [25, '#ff9f1c'], [50, '#ff5ea8'], [100, '#ffffff']] }; // 100+: white-hot, on a rim that runs through the colours
const streakMilestone = n => n === 10 || n === 25 || n === 50 || n === 75 || (n >= 100 && n % 50 === 0);
const streakCol = n => { let c = STREAK.tiers[0][1]; for (const [at, col] of STREAK.tiers) if (n >= at) c = col; return c; };
const stk = { n: 0, t: -9, mt: -9, lost: 0, lostT: -9 };
const advCache = new Map();
function digitAdv(size) { // the widest digit at this size: a fixed advance, so the number never shuffles as it counts
  let a = advCache.get(size);
  if (a == null) advCache.set(size, a = Math.max(...'0123456789'.split('').map(d => textWidth(d, size))));
  return a;
}
function streakBox() { // the badge's centre (cx, cy), size at scale 1 (w × h) and its biggest pop (M); tests check it clears the rest
  const L = lane(), z = W < 420 ? 1 : Math.max(1, Math.min(1.35, L.sb / 1.4)), h = 30 * z, adv = digitAdv(STREAK.num * z);
  const w = Math.max(3 * adv, textWidth(LANE_TXT.streak, STREAK.lab * z)) + 7 * z, left = SAFE.l / K + 3;
  const ringR = (RING_R + 12.5) * L.s + 2; // the ring at its biggest flash, beat and squash, with its stroke
  const right = L.hx - Math.max(ringR, 47 * L.s) - 4; // and past a missed GUAPA's reach (it scrolls on to hx - 20, glow and all)
  let P = Math.min(STREAK.maxPop, (L.bottom - L.top - 4) / h); // the biggest pop that stays inside the band
  if (right - left >= w * P) return { cx: right - w * P / 2, cy: L.cy, w, h, M: P, z, lane: true };
  const T = topLayout(); // no room behind the ring: on the top row, left of the panel
  P = Math.min(STREAK.maxPop, (T.x - 3 - left) / w);
  const cx = left + w * P / 2, cy = T.cy; // on the panel's centre line (mulassa, bar, #pause), left of it
  return cy - h * P / 2 >= SAFE.t / K + 3 ? { cx, cy, w, h, M: P, z, lane: false } : null;
}
function drawStreak(t) {
  if (G.practice) return; // the practice has its own combo praise (and SALTA owns that corner)
  const c = G.combo, calm = CALM.matches;
  if (c !== stk.n) {
    if (c > stk.n && c >= STREAK.show) { stk.t = clock; if (streakMilestone(c)) stk.mt = clock; }
    if (c < stk.n && stk.n >= STREAK.show && clock - M.missT < 0.2) { stk.lost = stk.n; stk.lostT = clock; } // a miss broke it (a new run just clears it)
    stk.n = c;
  }
  const live = c >= STREAK.show, k = live ? 0 : (clock - stk.lostT) / STREAK.fade;
  if (k >= 1) return;
  const B = streakBox();
  if (!B) return;
  const n = live ? c : stk.lost, col = streakCol(n), z = B.z, e = k * k;
  const sc = Math.min(B.M, calm ? 1 : live ? 1 + STREAK.pop * pulse(stk.t, STREAK.popT) + STREAK.big * pulse(stk.mt, STREAK.bigT) : 1 - 0.1 * e);
  const cx = B.cx, cy = B.cy + (calm ? 0 : STREAK.drop * e), g = sc / B.M;
  H.globalAlpha = (1 - k) * (n < STREAK.tiers[1][0] ? 0.85 : 1); // the first tier stays a little quiet
  // the plate: dark like the top panel, rimmed in the tier's colour
  const gm = calm || !live ? 0 : pulse(stk.mt, STREAK.glowT), beat = Math.max(0, 1 - (beatAt(Math.max(0, t)) % 1) * 3);
  const heat = calm || !live || n < STREAK.heat ? 0 : (n >= STREAK.rainbow ? 0.25 : 0) + 0.35 * beat; // breathes on the beat, glows for good from 100
  const rim = n >= STREAK.rainbow && !calm && live ? `hsl(${(clock * 120) % 360},90%,62%)` : col;
  H.beginPath(); H.roundRect(cx - B.w * sc / 2, cy - B.h * sc / 2, B.w * sc, B.h * sc, 7 * z * sc);
  if (gm + heat > 0) glowPath(rim, (7 + 9 * gm) * z, Math.min(1, gm + heat));
  H.fillStyle = 'rgba(42,26,16,0.82)'; H.fill();
  H.strokeStyle = rim; H.lineWidth = (1.25 + 1.5 * gm) * z; H.stroke();
  text(LANE_TXT.streak, cx, cy - 8 * z * sc, STREAK.lab * z * B.M, col, 'center', C.dark, false, g);
  const s = String(n), adv = digitAdv(STREAK.num * z) * sc, ny = cy + 3.5 * z * sc;
  for (let i = 0; i < s.length; i++) text(s[i], cx + (i - (s.length - 1) / 2) * adv, ny, STREAK.num * z * B.M, col, 'center', C.dark, false, g);
  H.globalAlpha = 1;
}
export function streakWarmups() { // every tier's digits and label at this screen's size, painted ahead (one tier a spare frame)
  return STREAK.tiers.flatMap(([, col]) => [0, 5].map(d0 => () => { // six small sprites a go (a spare frame, drawHud)
    const B = streakBox();
    if (!B) return;
    setSpriteBudget(6);
    for (let d = d0; d < d0 + 5; d++) text(String(d), 0, 0, STREAK.num * B.z * B.M, col, 'center', C.dark, false, 1 / B.M);
    if (d0) text(LANE_TXT.streak, 0, 0, STREAK.lab * B.z * B.M, col, 'center', C.dark, false, 1 / B.M);
  }));
}
