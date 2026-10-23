// The showreel's idle screen (Netflix's trick, Marc 2026-10-23): left untouched on the selector for a while, its UI fades
// out (body.reel-idle, select.css) and the dance has the whole screen (idleBand: where she stands then); any touch, move,
// wheel or key brings it all back at once. Never under a sheet, in photo mode or off the showreel.
import { REEL } from '../game/showreel.js';
import { G } from '../game/state.js';
import { sheetUp, viewMode } from './controls.js';

export const REEL_IDLE = { after: 10 }; // s untouched
let reelIdleOn = false, reelIdleLast = -Infinity, reelIdleWoken = true, reelIdleBack = false, reelIdleTap = null, reelIdleKey = null, reelWakeEnd = 0;
export const REEL_WAKE_MS = 250; // body.reel-wake's fade back in (select.css)
// The press that wakes it only wakes it (Marc): no card changes, no tap or drag reaches the plaça. This module is imported
// before ui/input.js, so its window listeners run first; the waking pointer's up and click (a key's up) are swallowed too.
const reelIdleSwallow = e => { e.stopImmediatePropagation(); if (e.cancelable && e.type !== 'pointerdown') e.preventDefault(); };
addEventListener('pointermove', () => { reelIdleWoken = true; }, { capture: true, passive: true });
// Leaving the page (another tab or app, the window's focus) pauses everything (main.js stops drawing, the audio context is
// suspended) and puts the selector back (Marc, 2026-10-23: the simplest, with nothing left half-way to glitch on return);
// coming back starts the idle count afresh: the time away never counts.
function reelIdleAway() {
  reelIdleBack = true;
  if (!document.hidden && document.hasFocus()) return;
  reelIdleWoken = true;
  if (reelIdleOn) { reelIdleOn = false; reelWake(); }
}
for (const ev of ['blur', 'focus', 'pagehide', 'pageshow']) addEventListener(ev, reelIdleAway);
document.addEventListener('visibilitychange', reelIdleAway);
for (const ev of ['pointerdown', 'keydown', 'wheel']) addEventListener(ev, e => {
  reelIdleWoken = true;
  if (!reelIdleOn) { if (ev === 'pointerdown') reelIdleTap = null; return; } // (a tap that never clicked holds nothing back)
  reelIdleOn = false; reelWake(); // (at once: the next press is a real one)
  if (ev === 'pointerdown') reelIdleTap = e.pointerId; else if (ev === 'keydown') reelIdleKey = e.code;
  reelIdleSwallow(e);
}, { capture: true, passive: false });
for (const ev of ['pointerup', 'pointercancel', 'click']) addEventListener(ev, e => {
  if (reelIdleTap == null || ev !== 'click' && e.pointerId !== reelIdleTap) return;
  if (ev === 'click') reelIdleTap = null;
  reelIdleSwallow(e);
}, { capture: true, passive: false });
addEventListener('keyup', e => { if (e.code === reelIdleKey) { reelIdleKey = null; reelIdleSwallow(e); } }, { capture: true }); // (Space clicks a focused button on its up)

// Where she stands while the UI is faded out (css px; cameras.js frames her in it, easing in ~2 s and back out quickly as
// the UI returns): the whole screen inside the safe areas (Marc, 2026-10-23: always framed in the room no UI covers). A
// portrait screen keeps her low, in the room the dock left (half a screen of bare floor otherwise), the plaça above.
const REEL_IDLE_BAND = { top: 0, bottom: 0, hardTop: 0, left: 0, right: 0, soft: true };
export function idleBand(band, vw, vh, safe) {
  if (!band) return band;
  REEL_IDLE_BAND.top = vh > vw ? vh * 0.3 : safe.t + vh * 0.06; REEL_IDLE_BAND.bottom = vh - safe.b - vh * 0.05;
  REEL_IDLE_BAND.hardTop = safe.t; REEL_IDLE_BAND.left = safe.l; REEL_IDLE_BAND.right = vw - safe.r;
  return REEL_IDLE_BAND;
}

// Every frame (now: the frame's ms). True while the UI is faded out.
export function reelIdle(now) {
  const may = REEL.on && G.state === 'select' && !viewMode && !sheetUp(), woke = reelIdleWoken || !may;
  if (woke || reelIdleBack) reelIdleLast = now;
  reelIdleWoken = reelIdleBack = false;
  const on = may && !woke && (reelIdleOn || now - reelIdleLast > REEL_IDLE.after * 1000);
  if (on !== reelIdleOn) { reelIdleOn = on; if (on) { document.body.classList.toggle('reel-idle', true); document.body.classList.toggle('reel-wake', false); reelWakeEnd = 0; } else reelWake(); }
  if (reelWakeEnd < 0) reelWakeEnd = now + REEL_WAKE_MS; // (dated by the first frame after it)
  else if (reelWakeEnd && now > reelWakeEnd) { reelWakeEnd = 0; document.body.classList.toggle('reel-wake', false); } // the quick fade done: their own transitions again
  return on;
}
function reelWake() {
  document.body.classList.toggle('reel-idle', false); document.body.classList.toggle('reel-wake', true); reelWakeEnd = -1;
}
