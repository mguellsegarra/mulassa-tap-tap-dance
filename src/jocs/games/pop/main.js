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
import { setupLevelStep } from './level-step.js';
import { setupHelp, KINDS } from './help.js';
import { guardGpu } from '#plassa/gpu-guard.js';
import { lostGpu } from '#plassa/quality.js';
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
const lines = bootLines($('boot-line')); // its funny lines while it lasts; it leaves at a line's end, as mulassa.cat's
// The public board (ranking-ui.js). The dev bot's runs start at BOT_FROM points: they are not the game's and never go.
const rankingUI = setupRankingUI({ t, focusBack: () => $('menu-best').focus({ focusVisible: false }),
  askName: run => settings().then(m => m.promptName(run, rankingUI.named), () => {}) });
const hud = createHud({ board, t });
const flow = createFlow({ board, hero, hud, results: createResults({ board, hero, t, rankingUI }), rankingUI, t, booted: () => booted });
errors.context(() => ({ game: 'pop', state: flow.mode, booted })); // crash reports as the main game's (plassa/errors.js)
// a lost GPU pauses a run (it would go on unseen); back, a paused board is drawn again; gone for good, the error card
guardGpu([$('game'), $('menu-hero')], {
  lost: () => { errors.report('webgl-context-lost', { game: 'pop', screen: flow.mode }); lostGpu(); flow.pause(); }, // lostGpu: a reload starts a level lighter
  restored: () => { if (flow.mode === 'paused' || flow.mode === 'over') board.frame(0); }, // not redrawn otherwise
  dead: () => { errors.report('webgl-not-restored', { game: 'pop' }); flow.pause(); window.__gameFail?.(t('lost.title'), t('lost.text'), 'webgl-not-restored'); },
});
// a newer deploy reloads the page, but only on the home or the end sheet with nothing open over them
watchUpdates(() => (flow.mode === 'menu' || flow.mode === 'over') && !document.querySelector('.cover:not([hidden]):not(#boot):not(#end-menu), dialog[open]'));

applyWords();
// From Mulassa Games (/jocs/, location.replace keeps the referrer) the corner's bubble says «Torna als jocs»; a shared
// link, a typed address or a reload (which keeps the first referrer, the selector no longer behind) gets an invitation (style.css)
if (!document.referrer.startsWith(`${location.origin}/`) || performance.getEntriesByType('navigation')[0]?.type === 'reload') {
  $('back').classList.add('more');
  $('back').querySelector('.exit-tip').textContent = t('more');
}
// the bubble never runs under the corner row (a narrow phone, a long language, «Instal·la l'app» shown): it stays away then
const exitTip = $('back').querySelector('.exit-tip'), cornerRow = document.querySelector('#menu .corner-row');
function fitExitTip() {
  exitTip.hidden = false; // measured shown (its width), then hidden in the same task: never painted in between
  const first = [...cornerRow.children].find(el => !el.hidden);
  exitTip.hidden = Boolean(first) && $('back').getBoundingClientRect().left + exitTip.offsetLeft + exitTip.offsetWidth + 8 > first.getBoundingClientRect().left;
}
addEventListener('resize', fitExitTip);
new MutationObserver(fitExitTip).observe(cornerRow, { subtree: true, attributeFilter: ['hidden'] });
document.fonts.ready.then(fitExitTip);

// the way back replaces this page as the selector's cards did (location.replace): a link back and forth would grow the history.
// Still a real link (no script, a new tab with ctrl/⌘/middle click)
$('back').addEventListener('click', e => {
  if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  location.replace($('back').href);
});
$('game').addEventListener('pointerdown', e => flow.tap(e.clientX, e.clientY));
const levelStep = setupLevelStep({ t, onPlay: flow.start }); // «Juga» asks for the level first; «Torna-hi» keeps it
// «Com es juga?», and the first «Juga» goes through it (help.js), once
const help = setupHelp({ t });
$('play').addEventListener('click', () => help.play(levelStep.open));
$('again').addEventListener('click', flow.start);
$('to-menu').addEventListener('click', flow.showMenu);
$('quit').addEventListener('click', flow.showMenu);
$('pause').addEventListener('click', flow.pause);
$('resume').addEventListener('click', flow.resume);
// ⚙ Configuració (settings.js, mulassa.cat's sheets and code), loaded at the boot (below), opened by a tap; closed, the focus is back on ⚙
// A chunk that cannot load (a page from before a deploy, the dev server restarted) is reported and the page reloads, once;
// anything else that fails in it is reported (the sheet would otherwise just not open)
const settings = () => import('./settings.js').catch(e => {
  errors.capture(e, { game: 'pop', where: 'settings' });
  if (!/dynamically imported module|Importing a module script failed|error loading/i.test(String(e?.message))) throw e;
  let again = false;
  try { again = !sessionStorage.getItem('pop-settings-reload'); sessionStorage.setItem('pop-settings-reload', '1'); } catch { /* no storage: no reload loop either */ }
  if (again) location.reload();
  throw e;
});
$('settings').addEventListener('click', () => settings().then(m => m.openSettings(() => $('settings').focus({ focusVisible: false })), () => {}));
// a run with no name for the board: the profile's own steps here, then the kept run goes (ranking-ui.js)
$('end-name').addEventListener('click', e => {
  const a = e.currentTarget;
  e.preventDefault();
  settings().then(m => m.openProfile(a.dataset.kind, rankingUI.named, a.dataset.kind === 'create' ? rankingUI.runLine() : null), () => { location.href = a.href; }); // the chunk failed: mulassa.cat's sheet
});
const musicBtns = document.querySelectorAll('.music-btn'); // the HUD's and the home's
const syncMusicBtn = () => { for (const b of musicBtns) { b.setAttribute('aria-pressed', musicOn()); b.querySelector('.music-off').toggleAttribute('hidden', musicOn()); } };
for (const b of musicBtns) b.addEventListener('click', () => { setMusicOn(!musicOn()); syncMusicBtn(); });
syncMusicBtn();
const inRun = () => flow.mode === 'play' || flow.mode === 'count';
// Escape, or a tap on a cover's backdrop (backdrop.js): a board, the level step or the help closes, a run pauses, a pause resumes
const back = () => {
  if (rankingUI.escape()) return;
  if (levelStep.isOpen()) return levelStep.close();
  if (help.isOpen()) return help.close();
  if (inRun()) flow.pause(); else flow.resume();
};
addEventListener('keydown', e => { if (e.key === 'Escape') back(); });
closeOnBackdrop(back);
scrollHints([$('board-list')]);
addEventListener('resize', flow.resized);
stopDoubleTapZoom(); // a quick second tap (the board is all quick taps) zoomed the page on an iPad
onEveryGesture(unlock); // the first tap the browser counts lets the home's music sound
// the base's UI sound on every press and keyboard move, and the arrows in the open cover (the home when none is)
setUiSound(SFX.ui);
soundOnPress();
setupSheetKeys({ top: () => [...document.querySelectorAll('.cover:not([hidden]):not(#boot), dialog[open]')].pop() ?? (flow.mode === 'menu' ? $('menu') : null) });
// leaving the page (hidden, blur, pagehide) pauses a run; so does a run whose audio clock stands still (page-audio.js)
onPageLeave(flow.pause);
audioPage({ stall: () => inRun() && (flow.pause(), true) });

let last = performance.now(), behind = 0, odd = false; // behind: the home backdrop's time not drawn yet
function frame(now) {
  const raw = Math.max(0, (now - last) / 1000); // the first frame's stamp can predate `last`
  const dt = Math.min(.05, raw); // a stalled tab must not burn the fuses
  last = now;
  watchAudio(now);
  // the run's clock takes up to 250 ms: an iPhone in Low Power Mode misses 24–30 Hz frames into 80–100 ms, and a 50 ms cap lost
  // that time, so the music (which follows the game, audio.js followGame) slowed down and stuttered. Past that, a stall still costs the run its time.
  flow.step(Math.min(.25, raw));
  // the board: every frame in a run; on the home, under its blur, every other one (the hero is drawn too); a run's end,
  // until its blast has played out
  if (booted && flow.mode !== 'paused' && !board.settled()) {
    behind += dt;
    odd = flow.mode === 'menu' && !odd;
    if (!odd) { board.frame(behind); behind = 0; }
  }
  if ((flow.mode === 'menu' || flow.mode === 'over') && booted) hero.frame(dt); // the end sheet borrows it (results.js)
  requestAnimationFrame(frame);
}

flow.showMenu();
setupOrientation(flow.pause);
requestAnimationFrame(frame);
// dev: __pop.portraits() downloads the figures' portraits (help.js, the HUD's chip), to replace public/jocs/pop/cards/*.png after a model changes
if (import.meta.env.DEV) window.__pop = { board, get game() { return flow.game; }, get run() { return flow.run; }, get mode() { return flow.mode; },
  async portraits() {
    const pics = await board.portraits(KINDS, 320, { tight: true });
    for (const [kind, url] of Object.entries(pics)) Object.assign(document.createElement('a'), { href: url, download: `${kind}.png` }).click();
  },
  // a carretilla among five Mulassas, tapped: for reviewing her correfoc in a run
  carretilla() {
    const cells = flow.game.cells.filter(c => c.kind === 'drac' && c.age >= 0).sort(() => Math.random() - .5);
    cells.slice(0, 5).forEach(c => Object.assign(c, { prev: c.kind, kind: 'mula', age: 1, left: 5 }));
    Object.assign(cells[5], { prev: 'drac', kind: 'carretilla', age: 1, left: 9 });
    setTimeout(() => flow.run.tap(cells[5].i), 600);
  } };

// The boot, while the boot screen's Mulassa runs: the shaders, then the home's portraits and the fonts. Each step leaves the
// main thread between tasks; the menu shows whole, on the board's first frame (this rAF runs after frame's).
// ⚙'s sheets load meanwhile; they paint once with the 3D's first frame below, in the same GPU stall (settings.js warm)
// a chunk that never answers (4 s from here) is let go: the boot screen would otherwise wait on it for good, and ⚙ loads it again on its tap
const sheetsLoad = settings().catch(() => null); // the browser tip waits for it whole (below): only the boot lets it go
const sheetsCode = Promise.race([sheetsLoad, new Promise(go => setTimeout(go, 4000, null))]);
await board.warm();
await hero.warm();
await document.fonts.ready;
// the record's place on the board comes with the menu, not after it (the pill would widen under the player's eyes); a slow
// network waits 1.5 s at most, and the place then joins late
await Promise.race([rankingUI.sync().catch(() => {}), new Promise(go => setTimeout(go, 1500))]);
// the first frame of each 3D scene, still under the boot screen: it is the costly one, and the blurred home over an undrawn
// board showed an empty night for a moment as the boot screen faded
const sheetsWarm = (await sheetsCode)?.warm();
board.frame(0);
hero.frame(0);
await new Promise(go => requestAnimationFrame(() => requestAnimationFrame(go)));
await sheetsWarm;
await lines.finished(); // never a line cut mid-read (at most one line's turn, 3.5 s)
booted = true;
requestAnimationFrame(() => {
  document.documentElement.classList.add('ready');
  errors.start(); // the SDK loads when the browser is idle (nothing at all without a DSN)
  if (flow.mode === 'menu') startHomeMusic();
  // the tap the home's music needs (tap-start.js): the live Mulassa and Drac fade, the title glides to its place
  waitForTap({ label: t('home.tap'), onGo: unlock, into: $('play').parentElement, art: document.querySelector('#menu .c-art'), title: document.querySelector('#menu .pop-title'),
    onIn: () => sheetsLoad.then(m => { if (flow.mode === 'menu') m?.deviceHint(); }) }); // an app's own browser: its tip, over the whole home (still there when a slow chunk comes)
  setTimeout(() => { $('boot').hidden = true; }, 400); // kept, still: the error card comes up in it (index.html's watchdog)
});
