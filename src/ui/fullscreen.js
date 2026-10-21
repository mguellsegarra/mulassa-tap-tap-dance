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
let fsLeft = false;
const wantOrient = () => !isTablet() && document.body.classList.contains('view-mode') ? 'landscape' : deviceOrient();
// Photo mode on/off (controls.js, body.view-mode already set): lock where Android allows it (fullscreen, a tap);
// iOS has no lock, so the «gira» cover asks instead and lifts by itself on turning.
export function photoOrient() {
  checkOrientation();
  if (!COARSE.matches || isTablet()) return;
  if (!document.fullscreenElement && !document.webkitFullscreenElement) { goFullscreen(); return; } // (it locks once in)
  try { screen.orientation?.lock?.(wantOrient())?.catch?.(() => {}); } catch { /* no lock here: the cover asks */ }
}
// Apple (iPhone, iPad — iPadOS reports a Mac with touch): no page fullscreen. iPad Safari's element fullscreen
// swallowed touches after the practice; there the way to full screen is "Afegeix a la pantalla d'inici".
const APPLE = /iP(hone|ad|od)/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
export function goFullscreen() {
  const el = document.documentElement;
  if (!COARSE.matches || APPLE || fsLeft || document.fullscreenElement || document.webkitFullscreenElement) return;
  if (navigator.userActivation && !navigator.userActivation.isActive) return; // only inside a real tap, never from a timer
  try {
    const req = el.requestFullscreen?.({ navigationUI: 'hide' }) ?? el.webkitRequestFullscreen?.();
    Promise.resolve(req).then(() => screen.orientation?.lock?.(wantOrient())).catch(() => {});
  } catch { /* not allowed here: play in the page */ }
}
for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, () => {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) fsLeft = true;
  resize();
});
