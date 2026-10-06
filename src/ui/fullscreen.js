// Fullscreen, orientation and the «gira» cover.
import { COARSE, TABLET, WANT_ORIENT } from '../core/env.js';
import { G } from '../game/state.js';
import { pauseGame } from './pause.js';
import { resize } from '../hud/canvas.js';

function checkOrientation() {
  if (!COARSE.matches) return;
  const wrong = TABLET ? innerHeight > innerWidth : innerWidth > innerHeight;
  document.body.classList.toggle('wrong-orient', wrong);
  if (wrong && G.state === 'play') pauseGame();
}
addEventListener('resize', checkOrientation);
addEventListener('orientationchange', checkOrientation);
setTimeout(checkOrientation);
let fsLeft = false;
// Apple (iPhone, iPad — iPadOS reports a Mac with touch): no page fullscreen. iPad Safari's element fullscreen
// swallowed touches after the practice; there the way to full screen is "Afegeix a la pantalla d'inici".
const APPLE = /iP(hone|ad|od)/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
export function goFullscreen() {
  const el = document.documentElement;
  if (!COARSE.matches || APPLE || fsLeft || document.fullscreenElement || document.webkitFullscreenElement) return;
  if (navigator.userActivation && !navigator.userActivation.isActive) return; // only inside a real tap, never from a timer
  try {
    const req = el.requestFullscreen?.({ navigationUI: 'hide' }) ?? el.webkitRequestFullscreen?.();
    Promise.resolve(req).then(() => screen.orientation?.lock?.(WANT_ORIENT)).catch(() => {});
  } catch { /* not allowed here: play in the page */ }
}
for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, () => {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) fsLeft = true;
  resize();
});
