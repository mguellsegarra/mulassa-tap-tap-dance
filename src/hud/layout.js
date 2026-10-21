// HUD layout numbers shared by the screens: the top band, the lane, the stage and the praise slots.
import { stageFrame } from '../scene/framing.js';
import { SAFE, K, HH, padTop, W, setPadTop } from './canvas.js';
import { COARSE, isTablet } from '../core/env.js';
import { G } from '../game/state.js';
import { NOTE_R, RING_R } from './primitives.js';
import { C } from './sprites.js';

// ------------------------------------------------------------------ HUD screens
// Lane on top (Taiko no Tatsujin / Friday Night Funkin'): right under the top bar, full width, so the mulassa
// gets the middle of the screen to herself. Everything tied to the lane reads BELOW it (the HUD is above).
export const LH = 40, LOOK = [2.6, 2.2, 1.8], MAXSPEED = [110, 135, 170]; // seconds a note is visible; speed cap in HUD units/s
export const padEl = document.getElementById('pad');
export const HUD_H = 20; // drawTop()'s panel: one row, the mulassa + the ànim bar + the quality %
export const HUD_CY = () => (10 + SAFE.t) / K + 20; // centre of the top band: #pause (index.html) and #skip centre on it, and so do the panel and the practice's dots
export const playBottom = () => (COARSE.matches ? Math.min(HH, (setPadTop(padTop ?? (padEl.getBoundingClientRect().top))) / K) : HH); // top of the pad on touch (cached: no layout per frame)
try { new ResizeObserver(() => { setPadTop(null); }).observe(padEl); } catch { /* old browser: resize() clears it */ }
// Lane size. The band grows with the screen (sb: 1.4x on phones, up to 2x on big desktops, 1.15x on landscape phones,
// which are short on height; on big screens it also drops towards 15% of the height instead of hugging the HUD).
// The notes grow with it (s) only as far as the chart allows: the closest two notes of the chart (minGap) must keep a
// clear gap of NOTE_GAP diameters while a note still shows for at least MIN_LOOK s. Scroll speed on screen = the
// larger of what that gap needs and the relaxed LOOK[d] pace (capped at MAXSPEED), so bigger notes scroll faster
// and never overlap. Everything in the band is drawn in lane units scaled by s around the ring (drawLane).
const NOTE_GAP = 0.5, MIN_LOOK = 0.9;
const bandScale = () => (HH < 320 ? 1.15 : W < 420 ? (HH >= 720 ? 1.75 : 1.4) : Math.max(1.4, Math.min(2, 1.4 + (Math.min(W, HH) - 260) * 0.6 / 270)));
const gapCache = new WeakMap();
function minGap(chart) { // seconds between the closest two notes on the lane (after a hold: from its end)
  let g = gapCache.get(chart);
  if (g == null) {
    g = 1;
    for (let i = 1; i < chart.length; i++) { const p = chart[i - 1]; g = Math.min(g, chart[i].t - (p.end && !p.balloon ? p.end : p.t)); }
    gapCache.set(chart, g = Math.max(0.12, g));
  }
  return g;
}
export const lane = () => {
  const sb = bandScale(), h = LH * sb, base = HUD_CY() + 37 + (W < 420 ? (HH >= 720 ? 12 : 5) : 5); // (tablets and desktops too: the band never touches the pill) // 37 = the panel's old half height (13) + 24: the ENCERTS pill fits under the panel, then the streak badge's headroom above the ring on portrait phones (the song progress rides #pause, not the lane)
  const hx = W < 420 ? W * 0.2 : W * 0.5, vis = W - hx; // phones: the ring near the left edge, the most room to read
  const d = G.practice ? 0 : G.diff, gap = G.chart?.length ? minGap(G.chart) : 0.4; // the practice scrolls at FÀCIL's relaxed pace
  const pitch = 2 * NOTE_R * (1 + NOTE_GAP); // centre to centre of the closest two notes, lane units
  const s = Math.max(0.8, Math.min(sb, vis / MIN_LOOK * gap / pitch));
  // the ring stands out above the band: on tablets and desktops (room to spare) keep it clear of the ENCERTS pill too, not just the band.
  // Phones and short windows are already tight (the camera and the GLOBUS zone are fitted to this), so they stay as they were.
  const ringTop = W >= 420 ? HUD_CY() + HUD_H / 2 + 0.75 + ENC_GAP + ENC_H + 4 + (RING_R + 2.25) * s - h / 2 : 0;
  const top = Math.max(ringTop, base + Math.max(0, Math.min(1, (sb - 1.4) / 0.4)) * Math.max(0, HH * 0.15 - base)), cy = top + h / 2;
  const px = Math.max(pitch * s / gap, Math.min(vis / LOOK[d], MAXSPEED[d] * s)); // screen units/s
  return { cy, top, bottom: top + h, hx, s, sb, speed: px / s }; // speed in lane units/s
};
export const ENC_H = HUD_H, ENC_GAP = 6; // the ENCERTS pill: as tall as the panel above, ENC_GAP under its stroke (both fit lane()'s headroom)
// Practice praise (not big) shares the compact judging slot; its instruction stays above the pad.
export const HEADLINE_SIZE = (big = !G.practice) => Math.min((big ? 26 : 10) * bandScale(), W / 9);
// tablets and portrait screens (phones): the big words sit centred in the free space between the lane and the pad,
// clear of a GLOBUS and the practice instruction; landscape phones and desktops (little height): just under the lane.
// Portrait phones too sit exactly in the middle (Marc: centred reads better than clearing her face at 0.6).
export const PRAISE_CENTRED = (big = !G.practice) => big && (isTablet() || HH > W);
export const PRAISE_Y = (big = !G.practice) => {
  if (!big) return lane().bottom + 16 * bandScale();
  const { bottom } = lane(), under = bottom + 44 * bandScale() + HEADLINE_SIZE(big) * 0.6;
  return PRAISE_CENTRED(big) ? Math.max(under, (bottom + praiseFloor()) / 2) : under;
};
// what a centred word centres against: the pad's top, except on a tablet on its side in the practice, where the instruction pill
// sits well above the pad (its round buttons are in the corners) and the word would land on it and on the mulassa
const praiseFloor = () => (G.practice && HH < W ? Math.min(playBottom(), PRACTICE_Y() - 16) : playBottom());
export const PRACTICE_Y = () => playBottom() - 22; // instruction stays above the pad, away from the feedback slot
const RESERVED_BOTTOM = () => lane().bottom + (G.practice ? 26 : 34) * bandScale();
const stage = {}; // shared by camera framing and bubble exclusion; temporary text never changes it
export function playStage() { // the dance demo has no lane or pad: the whole screen under the pause button and its tag
  const top = G.collapseT ? SAFE.t / K + 8 : G.watch ? (SAFE.t + 84) / K : RESERVED_BOTTOM();
  const bottom = G.collapseT ? HH - SAFE.b / K - 38 : G.watch ? HH - (SAFE.b + 16) / K : playBottom() - (G.practice ? 36 : 0);
  return stageFrame(stage, top, bottom);
}
// The count-in's sizes and colours, shared with warmStart(): its words are painted ahead on the title and during
// PREPARATS (one a spare frame, drawHud). New big sprites painted right on the beat were the hitches of a game's start.
export const BANNER = { big: () => Math.min(W / 3, HH / 5, 90), ready: () => Math.min(34, W / 9), go: () => Math.min(W / 3.6, BANNER.big()),
  count: [C.cream, C.gold], goCols: [C.gold, '#ff9f1c'] };
