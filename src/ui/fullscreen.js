// Fullscreen, orientation and the «gira» cover.
import { COARSE, isTablet, deviceOrient } from '../core/env.js';
import { G } from '../game/state.js';
import { pauseGame } from './pause.js';
import { resize } from '../hud/canvas.js';

function checkOrientation() {
  document.body.classList.toggle('tablet', isTablet()); // base.css's first-paint rule is a phone's: a small tablet's landscape page is as short
  if (!COARSE.matches) return;
  const wrong = document.body.classList.contains('view-mode') ? !isTablet() && innerHeight > innerWidth : isTablet() ? innerHeight > innerWidth : innerWidth > innerHeight;
  document.body.classList.toggle('wrong-orient', wrong);
  if (wrong && G.state === 'play') pauseGame();
}
addEventListener('resize', checkOrientation);
addEventListener('orientationchange', checkOrientation);
matchMedia('(orientation: portrait)').addEventListener('change', checkOrientation); // iOS: resize can come with the old size
setTimeout(checkOrientation);
const wantOrient = () => !isTablet() && document.body.classList.contains('view-mode') ? 'landscape' : deviceOrient();
const inFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const freeOn = () => document.body.classList.contains('view-mode');
// Fullscreen is free play's alone, on Android (controls.js, body.view-mode already set, inside a tap): in on entering it,
// phones locked to landscape; out on leaving it (which also lifts the lock). iOS has no lock: the «gira» cover asks.
export function photoOrient() {
  checkOrientation();
  if (!COARSE.matches) return;
  if (!freeOn()) { leaveFs(); return; }
  if (!inFs()) { enterFullscreen(); return; } // (it locks once in)
  if (isTablet()) return;
  try { screen.orientation?.lock?.(wantOrient())?.catch?.(() => {}); } catch { /* no lock here: the cover asks */ }
}
// Apple (iPhone, iPad — iPadOS reports a Mac with touch): no page fullscreen. iPad Safari's element fullscreen
// swallowed touches after the practice; there the way to full screen is "Afegeix a la pantalla d'inici".
const APPLE = /iP(hone|ad|od)/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
function enterFullscreen() {
  const el = document.documentElement;
  if (!COARSE.matches || APPLE || inFs()) return;
  if (navigator.userActivation && !navigator.userActivation.isActive) return; // only inside a real tap, never from a timer
  try {
    const req = el.requestFullscreen?.({ navigationUI: 'hide' }) ?? el.webkitRequestFullscreen?.();
    Promise.resolve(req).then(() => screen.orientation?.lock?.(wantOrient())).catch(() => {});
  } catch { /* not allowed here: play in the page */ }
}
function leaveFs() { if (inFs()) Promise.resolve(document.exitFullscreen?.() ?? document.webkitExitFullscreen?.()).catch(() => {}); }
for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, () => {
  if (!freeOn()) leaveFs(); // free play ended before it came in
  resize();
});
// Left it inside free play (back gesture, swipe)? The next tap there goes back in. Bubble phase: the button that
// ends free play has already taken view-mode off. The stick cancels touchstart (no click): its lift is the tap.
const backInFree = () => { if (freeOn()) enterFullscreen(); };
document.addEventListener('click', backInFree);
document.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse' && e.target.closest?.('#photo-touch')) backInFree(); });
