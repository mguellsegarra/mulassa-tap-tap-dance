// Composition root: builds the pieces and wires them to the page. The flow is flow.js, the HUD hud.js, the end results.js,
// the rules rules.js, the 3D board.js and hero.js, the sound audio.js.
import { createBoard } from './board.js';
import { createHero } from './hero.js';
import { createHud } from './hud.js';
import { createResults } from './results.js';
import { createFlow } from './flow.js';
import { setupRankingUI } from './ranking-ui.js';
import { setupOrientation } from '#plassa/orientation.js';
import { t, applyWords } from './i18n.js';
import { setMusicOn, musicOn, startHomeMusic, unlock, audioPage, watchAudio, SFX } from './audio.js';
import { guardGpu } from '#plassa/gpu-guard.js';
import { errors } from '#plassa/errors.js';
import { watchUpdates } from '#plassa/update-watch.js';
import { stopDoubleTapZoom } from '#plassa/double-tap.js';
import { waitForTap } from '#plassa/tap-start.js';
import { onEveryGesture } from '#plassa/gesture.js';
import { setUiSound, soundOnPress } from '#plassa/ui-sound.js';
import { setupSheetKeys } from '#plassa/sheet-keys.js';
import { closeOnBackdrop } from '#plassa/backdrop.js';
import { scrollHints } from '#plassa/scroll-hint.js';
import { bootLines } from '#plassa/boot-lines.js';
import { onPageLeave } from '#plassa/page-leave.js';
import '#plassa/focus.js'; // keyboard vs pointer: <html data-keys> while keys drive the page

const $ = id => document.getElementById(id);
// the error card's words in the player's language, for the shared boot watchdog (Catalan until here)
window.__gameBootWords = { title: t('fail.title'), text: t('fail.text'), retry: t('fail.retry') };
const board = createBoard($('game'));
const hero = createHero($('menu-hero'));
let booted = false; // the boot screen is up: nothing is drawn under it (see the end of this file)
bootLines($('boot-line'), () => booted); // its funny lines while it lasts
// The public board (ranking-ui.js). The dev bot's runs start at BOT_FROM points: they are not the game's and never go.
const rankingUI = setupRankingUI({ t, focusBack: () => $('menu-best').focus({ focusVisible: false }) });
const hud = createHud({ board, t });
const flow = createFlow({ board, hud, results: createResults({ board, t, rankingUI }), rankingUI, t, booted: () => booted });
errors.context(() => ({ game: 'pop', state: flow.mode, booted })); // crash reports as the main game's (plassa/errors.js)
// a lost GPU pauses a run (it would go on unseen); back, a paused board is drawn again; gone for good, the error card
guardGpu([$('game'), $('menu-hero')], {
  lost: () => { errors.report('webgl-context-lost', { game: 'pop', screen: flow.mode }); flow.pause(); },
  restored: () => { if (flow.mode === 'paused' || flow.mode === 'over') board.frame(0); }, // not redrawn otherwise
  dead: () => { errors.report('webgl-not-restored', { game: 'pop' }); flow.pause(); window.__gameFail?.(t('lost.title'), t('lost.text'), 'webgl-not-restored'); },
});
// a newer deploy reloads the page, but only on the home or the end sheet with nothing open over them
watchUpdates(() => (flow.mode === 'menu' || flow.mode === 'over') && !document.querySelector('.cover:not([hidden]):not(#boot):not(#end-menu)'));

applyWords();
// From the games sheet (mulassa.cat, location.replace keeps the referrer) the corner's bubble says «Torna als jocs»; a shared
// link, a typed address or a reload (which keeps the first referrer, the games sheet no longer behind) gets an invitation (style.css)
if (!document.referrer.startsWith(`${location.origin}/`) || performance.getEntriesByType('navigation')[0]?.type === 'reload') {
  $('back').classList.add('more');
  $('back').querySelector('.exit-tip').textContent = t('more');
}

$('game').addEventListener('pointerdown', e => flow.tap(e.clientX, e.clientY));
$('play').addEventListener('click', flow.start);
$('again').addEventListener('click', flow.start);
$('to-menu').addEventListener('click', flow.showMenu);
$('quit').addEventListener('click', flow.showMenu);
$('pause').addEventListener('click', flow.pause);
$('resume').addEventListener('click', flow.resume);
const musicBtns = document.querySelectorAll('.music-btn'); // the HUD's and the home's
const syncMusicBtn = () => { for (const b of musicBtns) { b.setAttribute('aria-pressed', musicOn()); b.querySelector('.music-off').toggleAttribute('hidden', musicOn()); } };
for (const b of musicBtns) b.addEventListener('click', () => { setMusicOn(!musicOn()); syncMusicBtn(); });
syncMusicBtn();
const inRun = () => flow.mode === 'play' || flow.mode === 'count';
// Escape, or a tap on a cover's backdrop (backdrop.js): a board closes, a run pauses, a pause resumes
const back = () => { if (rankingUI.escape()) return; if (inRun()) flow.pause(); else flow.resume(); };
addEventListener('keydown', e => { if (e.key === 'Escape') back(); });
closeOnBackdrop(back);
scrollHints([$('board-list')]);
addEventListener('resize', flow.resized);
stopDoubleTapZoom(); // a quick second tap (the board is all quick taps) zoomed the page on an iPad
onEveryGesture(unlock); // the first tap the browser counts lets the home's music sound
// the base's UI sound on every press and keyboard move, and the arrows in the open cover (the home when none is)
setUiSound(SFX.ui);
soundOnPress();
setupSheetKeys({ top: () => [...document.querySelectorAll('.cover:not([hidden]):not(#boot)')].pop() ?? (flow.mode === 'menu' ? $('menu') : null) });
// leaving the page (hidden, blur, pagehide) pauses a run; so does a run whose audio clock stands still (page-audio.js)
onPageLeave(flow.pause);
audioPage({ stall: () => inRun() && (flow.pause(), true) });

let last = performance.now(), behind = 0, odd = false; // behind: the home backdrop's time not drawn yet
function frame(now) {
  const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); // a stalled tab must not burn the fuses; the first frame's stamp can predate `last`
  last = now;
  watchAudio(now);
  flow.step(dt);
  // the board: every frame in a run; on the home, under its blur, every other one (the hero is drawn too); a run's end,
  // until its blast has played out
  if (booted && flow.mode !== 'paused' && !board.settled()) {
    behind += dt;
    odd = flow.mode === 'menu' && !odd;
    if (!odd) { board.frame(behind); behind = 0; }
  }
  if (flow.mode === 'menu' && booted) hero.frame(dt);
  requestAnimationFrame(frame);
}

flow.showMenu();
setupOrientation(flow.pause);
requestAnimationFrame(frame);
// dev: __pop.portraits() downloads the home cards' portraits, to replace public/jocs/pop/cards/*.png after a model changes
if (import.meta.env.DEV) window.__pop = { board, get game() { return flow.game; }, get run() { return flow.run; }, get mode() { return flow.mode; },
  async portraits() {
    const pics = await board.portraits([...document.querySelectorAll('.c-card')].map(c => c.dataset.kind), 320, { tight: true });
    for (const [kind, url] of Object.entries(pics)) Object.assign(document.createElement('a'), { href: url, download: `${kind}.png` }).click();
  } };

// The boot, while the boot screen's Mulassa runs: the shaders, then the home's portraits and the fonts. Each step leaves the
// main thread between tasks; the menu shows whole, on the board's first frame (this rAF runs after frame's).
await board.warm();
await hero.warm();
// the portraits are files (public/jocs/pop/cards, made with __pop.portraits): drawing them here held a phone's boot
await Promise.all([...document.querySelectorAll('.c-card img')].map(img => img.decode().catch(() => {})));
await document.fonts.ready;
// the record's place on the board comes with the menu, not after it (the pill would widen under the player's eyes); a slow
// network waits 1.5 s at most, and the place then joins late
await Promise.race([rankingUI.sync().catch(() => {}), new Promise(go => setTimeout(go, 1500))]);
// the first frame of each 3D scene, still under the boot screen: it is the costly one, and the blurred home over an undrawn
// board showed an empty night for a moment as the boot screen faded
board.frame(0);
hero.frame(0);
await new Promise(go => requestAnimationFrame(() => requestAnimationFrame(go)));
booted = true;
requestAnimationFrame(() => {
  document.documentElement.classList.add('ready');
  errors.start(); // the SDK loads when the browser is idle (nothing at all without a DSN)
  if (flow.mode === 'menu') startHomeMusic();
  // the tap the home's music needs (tap-start.js): the live Mulassa and Drac fade, the title glides to its place
  waitForTap({ label: t('home.tap'), onGo: unlock, into: $('play').parentElement, art: document.querySelector('#menu .c-art'), title: document.querySelector('#menu .pop-title') });
  setTimeout(() => { $('boot').hidden = true; }, 400); // kept, still: the error card comes up in it (index.html's watchdog)
});
