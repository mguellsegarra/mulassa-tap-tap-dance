// Page-level constants read once at load: the URL flags (?autoplay, ?from, ?stars...) and the device's media queries.
// A leaf: it imports nothing outside core/ (the beat grid is game/figure-song.js; the judge window and sync offset, game/state.js).

// dev hosts only: the debug flags are invisible on a public host
export { Q } from './flags.js';
import { Q } from './flags.js';
export const AUTOPLAY = Q.has('autoplay');
export const JITTER = AUTOPLAY ? Math.max(0, +Q.get('jitter') || 0) : 0; // debug: ?autoplay&jitter=<ms> presses each note that far off the beat (dev/autoplay-jitter.js)
export const STARS = Q.has('stars') ? Math.max(0, Math.min(3, +Q.get('stars') || 0)) : -1; // debug: open straight on a results card with this many stars
export const FROM = +Q.get('from') || 0; // debug: start the song at this second
export const CLICKS = Q.has('clicks'); // debug: tick on every note, to check sync by ear
export const CAMDRAC = Q.get('camdrac'); // 'segueix': the play camera follows the figure's heading, as it did before the travelling dances (the calmer default: cameras.js DRAC_CAM)
export const LETTERS = Q.has('lletres'); // debug: the helpers' W / N / S / E letters over their heads (Drac and Mulassa)
export const FESTA = Q.get('festiu') !== '0'; // ?festiu=0: the Mulassa's dance without its extra festive sway (A/B against the reference's own)
export const DEMO = Q.has('demo'); // debug, dev builds only (select-ui.js): the selector shows a made-up record and position
export const COARSE = matchMedia('(pointer: coarse)'); // live: DevTools device mode, tablets...
export const LEAD = 3.2; // seconds between pressing start and the recording, filled by a timbal count-in
export const playFrom = FROM;
// Fullscreen on touch devices (Android, iPad): asked for inside the tap that starts the game or picks a difficulty.
// Never left between games; if the player leaves it, we don't ask again. iPhone has no page fullscreen: the
// home-screen app (manifest + apple-mobile-web-app-capable) is the way, and the title screen says so.
// Orientation: phones play in portrait, tablets (iPad) in landscape. A page can't lock rotation on iOS, so the
// wrong one shows a "gira" cover and pauses the song; Android in fullscreen also gets a real lock.
// Live, like COARSE: DevTools device mode flips pointer and screen size after the page has loaded.
export const isTablet = () => COARSE.matches && Math.min(screen.width, screen.height) >= 600;
export const deviceOrient = () => isTablet() ? 'landscape' : 'portrait';
export const pageActive = () => !document.hidden && document.hasFocus();
export const CALM = matchMedia('(prefers-reduced-motion: reduce)');
