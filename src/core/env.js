// Page-level constants read once at load: the URL flags (?autoplay, ?from, ?stars...), the beat grid, the judge windows in use
// and the sync offset.
import { finalMode } from '../dev/final-test.js';
import { WINDOWS } from '../game/progress.js';
import { BEATS, BEAT, FINALE_T, beatAt } from '../game/figure-song.js';
export { BEATS, BEAT, FINALE_T, beatAt };
import { store } from '../platform/storage.js';

export const Q = new URLSearchParams(location.search);
export const AUTOPLAY = Q.has('autoplay');
export const STARS = Q.has('stars') ? Math.max(0, Math.min(3, +Q.get('stars') || 0)) : -1; // debug: open straight on a results card with this many stars
export const FROM = +Q.get('from') || 0; // debug: start the song at this second
export const CLICKS = Q.has('clicks'); // debug: tick on every note, to check sync by ear
export const DEMO = Q.has('demo'); // debug, dev builds only (select-ui.js): the selector shows a made-up record and position
// ?final[=95-0-record] (dev hosts only, src/dev/final-test.js): straight to the results of a made-up run, a mock leaderboard
export const FINAL = finalMode({ hostname: location.hostname, search: location.search });
export const COARSE = matchMedia('(pointer: coarse)'); // live: DevTools device mode, tablets...
export let WIN = WINDOWS[0];
export const setWIN = v => (WIN = v);
export const LEAD = 3.2; // seconds between pressing start and the recording, filled by a timbal count-in
export const playFrom = FROM;
export let offsetMs = +(Q.get('offset') ?? store.get('offset') ?? 0); // calibration knob: the sync sheet, or [ and ] keys
export const setOffsetMs = v => (offsetMs = v);
// Fullscreen on touch devices (Android, iPad): asked for inside the tap that starts the game or picks a difficulty.
// Never left between games; if the player leaves it, we don't ask again. iPhone has no page fullscreen: the
// home-screen app (manifest + apple-mobile-web-app-capable) is the way, and the title screen says so.
// Orientation: phones play in portrait, tablets (iPad) in landscape. A page can't lock rotation on iOS, so the
// wrong one shows a "gira" cover and pauses the song; Android in fullscreen also gets a real lock.
export const TABLET = COARSE.matches && Math.min(screen.width, screen.height) >= 600;
export const WANT_ORIENT = TABLET ? 'landscape' : 'portrait';
export const pageActive = () => !document.hidden && document.hasFocus();
export const CALM = matchMedia('(prefers-reduced-motion: reduce)');
