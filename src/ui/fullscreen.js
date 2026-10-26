// Fullscreen, orientation and the «gira» cover.
import { COARSE, isTablet, deviceOrient } from '../core/env.js';
import { G } from '../game/state.js';
import { pauseGame } from './pause.js';
import { resize } from '../hud/canvas.js';

function checkOrientation() {
  if (!COARSE.matches) return;
  const wrong = document.body.classList.contains('view-mode') ? !isTablet() && innerHeight > innerWidth : isTablet() ? innerHeight > innerWidth : innerWidth > innerHeight;
  document.body.classList.toggle('wrong-orient', wrong);
  if (wrong && G.state === 'play') pauseGame();
}
addEventListener('resize', checkOrientation);
addEventListener('orientationchange', checkOrientation);
setTimeout(checkOrientation);
const wantOrient = () => !isTablet() && document.body.classList.contains('view-mode') ? 'landscape' : deviceOrient();
const inFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
let fsLeft = false, fsBefore = false, exitingFs = false; // fsBefore: fullscreen already on when free play began
// Photo mode on/off (controls.js, body.view-mode already set, inside a tap): free play is always fullscreen on
// Android, phones locked to landscape; leaving it puts the page back as it was. iOS has no lock: the «gira» cover asks.
export function photoOrient() {
  checkOrientation();
  if (!COARSE.matches) return;
  const on = document.body.classList.contains('view-mode');
  if (on) fsBefore = inFs();
  if (!inFs()) { if (on) enterFullscreen(); return; } // (it locks once in)
  if (!on && !fsBefore) { // free play put it on: off again (which also lifts the lock)
    exitingFs = true;
    Promise.resolve(document.exitFullscreen?.() ?? document.webkitExitFullscreen?.()).catch(() => { exitingFs = false; });
    return;
  }
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
export function goFullscreen() { if (!fsLeft) enterFullscreen(); } // the game's taps: not again once the player left it
for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, () => {
  if (!inFs()) { if (!exitingFs) fsLeft = true; exitingFs = false; }
  resize();
});
// Left it inside free play (back gesture, swipe)? The next tap there goes back in. Bubble phase: the button that
// ends free play has already taken view-mode off. The stick cancels touchstart (no click): its lift is the tap.
const backInFree = () => { if (document.body.classList.contains('view-mode')) enterFullscreen(); };
document.addEventListener('click', backInFree);
document.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse' && e.target.closest?.('#photo-touch')) backInFree(); });
