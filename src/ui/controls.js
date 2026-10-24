// Which DOM controls show in each state, and the photo (view) mode.
import { showAvatars, photoHelpAvailable } from './photo-avatars.js';
import { sheets } from './sheets.js';
import { howtoMenu, settingsMenu, privacyMenu, pauseMenu, hide, howtoEl, settingsEl, feedbackEl, freeEl, musicEl, pauseEl, skipEl, retryEl } from './handles.js';
import { G, clock, CHALLENGE, setFreeSound } from '../game/state.js';
import { selectedFigure } from '../game/figure-song.js';
import { keyboardNav } from './focus.js';
import { hud, buttonAt } from '../hud/canvas.js';
import { lookSync } from './mouse-look.js';
import { PHOTO } from '../game/photo-control.js';
import { COARSE } from '../core/env.js';
import { photoOrient } from './fullscreen.js';
import { tr } from '../i18n/messages.js';

const practiceLabel = document.getElementById('skip-label'), practiceIcon = document.getElementById('skip-icon');
const CTL = { photoExit: tr('ui.controls.photoExit'), photo: tr('ui.controls.photo'), plaza: tr('ui.controls.plaza'), photoHelp: tr('ui.controls.photoHelp'), howto: tr('ui.controls.howto'), // resolved once: updateControls runs per frame
  exit: tr('ui.controls.exitLabel'), skip: tr('ui.controls.skipLabel'), exitPractice: tr('ui.controls.exitPractice'), skipPractice: tr('ui.controls.skipPractice') };

// Canvas buttons need the same hover cursor as DOM buttons. Recheck on state/layout
// changes too, even when the mouse stays still (photo mode, resize, entering play).
const hudPointer = { clientX: 0, clientY: 0 };
let hudMouse = false;
function updateHudCursor() {
  const active = hudMouse && !sheetUp();
  const clickable = active && (G.state === 'splash' || G.state === 'title' && buttonAt(hudPointer)
    || G.state === 'results' && !G.watch && clock - G.resT > 1);
  const cursor = clickable ? 'pointer' : '';
  if (hud.style.cursor !== cursor) hud.style.cursor = cursor;
}
hud.addEventListener('pointermove', e => {
  hudMouse = e.pointerType === 'mouse';
  hudPointer.clientX = e.clientX; hudPointer.clientY = e.clientY;
  updateHudCursor();
});
hud.addEventListener('pointerleave', () => { hudMouse = false; updateHudCursor(); });

export const sheetUp = () => howtoMenu.open || settingsMenu.open || sheets.sync.open || sheets.board.open || privacyMenu.open || sheets.share.open || pauseMenu.open || sheets.feedback.open || sheets.profile?.isOpen || sheets.select?.sheetOpen || sheets.watch?.open
  || sheets.account?.isOpen || sheets.seasons?.isOpen || sheets.seasonEnd?.isOpen || sheets.card?.isOpen || sheets.hint?.isOpen;
export const menuState = () => G.state === 'splash' || G.state === 'title' || G.state === 'select'; // the camera steers
export const photoScreen = () => G.state === 'select'; // photo mode lives only on the selector
export const steers = () => menuState() && !sheetUp();
// «Mode foto» (free play: entered through the selector's round gamepad button #free; #viewmode shows only inside
// it, as the way back): every control, tip and the HUD fade out (index.html body.view-mode) and the plaça
// is all there is: the camera steers as on the selector, the menu loop plays on, a tap picks nothing, no sheet opens. H
// toggles it; Escape or the same button (dimmed after 3 idle seconds, back on any touch, move or key) brings it all back.
// The hidden controls are inert (never focused or clicked); the focus goes to the button and back to where it was.
export const viewBtn = document.getElementById('viewmode');
const VIEW_HIDES = ['settings', 'feedback', 'free', 'music', 'howto', 'fps', 'feedback-nudge', 'select'].map(id => document.getElementById(id));
export let viewMode = false, viewT = 0, viewBack = null, viewIdle = 0, hudBlank = false;
export const setHudBlank = v => (hudBlank = v);
export function setView(on) {
  if (on === viewMode || on && (!photoScreen() || sheetUp())) return;
  const entryFocus = on ? document.activeElement : null; // making the selector inert can already blur its card
  const entryFigure = on && G.state === 'select' && !sheets.select?.pending && sheets.select?.figure;
  viewMode = on; setFreeSound(on); showAvatars(on, (entryFigure || selectedFigure).id); hide(viewBtn, !on); sheets.music?.visible(on); viewT = performance.now(); // (a pending selection drives the last playable figure; the button first: the radio and ? are placed from it)
  if (!on) hide(howtoEl, true);
  document.body.classList.toggle('view-mode', on);
  photoOrient();
  for (const el of VIEW_HIDES) el.inert = on;
  viewBtn.setAttribute('aria-pressed', String(on)); // (one name, «Joc lliure», pressed or not; pressed it shows the practice's «surt» door, the tooltip says what a press does)
  viewBtn.title = on ? CTL.photoExit : CTL.photo;
  clearTimeout(viewIdle); viewBtn.classList.remove('idle');
  hud.setAttribute('role', on ? 'region' : 'img');
  if (!on) hud.setAttribute('aria-label', CTL.plaza);
  if (on) {
    viewBack = entryFocus;
    (PHOTO.on ? hud : viewBtn).focus({ preventScroll: true });
    viewWake();
  } else {
    const back = viewBack; viewBack = null;
    if (keyboardNav && back && back !== document.body && back.isConnected && !back.hidden && !back.closest?.('[hidden], [inert]')) back.focus({ preventScroll: true });
    else if (keyboardNav && G.state === 'select') sheets.select?.refocus?.();
    else document.activeElement?.blur(); // touch/mouse: Space picks a difficulty again
  }
  updateHudCursor();
}
function viewWake() {
  if (!viewMode) return;
  viewBtn.classList.remove('idle');
  clearTimeout(viewIdle); if (!COARSE.matches) viewIdle = setTimeout(() => viewBtn.classList.add('idle'), 3000); // touch has no Esc: its way back never fades
}
for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel']) addEventListener(ev, viewWake, { passive: true });
viewBtn.addEventListener('click', () => setView(!viewMode));
// #free dances on what sounds on the menus (the radio's song or the menu loop; select.css): b = that beat, null = silence
let freeDancing = false;
export function freeDance(b) {
  const on = b != null && !freeEl.hidden && !viewMode;
  if (on !== freeDancing) freeEl.toggleAttribute('data-dancing', (freeDancing = on));
  if (on) freeEl.style.setProperty('--b', (b % 2).toFixed(3));
}
export function enterFree() { setView(true); if (viewMode) sheets.music?.playFigure(G.figureId); } // the figure's own song (a pending selection: the last playable one, the one she drives)
freeEl.addEventListener('click', () => { G.state === 'select' && enterFree(); });
document.getElementById('rotate-exit').addEventListener('click', () => setView(false));
export function updateControls() {
  updateHudCursor();
  hide(viewBtn, !photoScreen() || !viewMode);
  if (viewMode && (!photoScreen() || sheetUp())) setView(false); // the selector only, never under a sheet
  lookSync(); // (after it: a sheet or a state change has just dropped control)
  const photoHelp = photoHelpAvailable();
  howtoEl.inert = viewMode && !photoHelp;
  hide(howtoEl, !photoHelp); // the same ? opens and closes non-modal help, including on touch
  howtoEl.classList.toggle('photo-help', photoHelp);
  howtoEl.setAttribute('aria-label', photoHelp ? CTL.photoHelp : CTL.howto);
  howtoEl.setAttribute('aria-haspopup', photoHelp ? 'false' : 'dialog');
  hide(settingsEl, (G.state !== 'title' && G.state !== 'select'));
  hide(feedbackEl, G.state !== 'title'); // on the selector the Bústia is in ⚙ Configuració; its corner slot is #free's
  hide(freeEl, G.state !== 'select');
  hide(musicEl, (G.state !== 'title' && G.state !== 'select'));
  sheets.select?.visible(G.state === 'select'); // measure after the header controls have their final layout
  hide(pauseEl, G.state !== 'play' || G.paused || Boolean(G.collapseT));
  hide(skipEl, G.state !== 'play' || !G.practice || G.paused);
  if (G.practice) {
    const exit = G.practice.then == null, label = exit ? CTL.exit : CTL.skip;
    if (practiceLabel.textContent !== label) {
      practiceLabel.textContent = label;
      skipEl.setAttribute('aria-label', exit ? CTL.exitPractice : CTL.skipPractice);
      practiceIcon.setAttribute('d', exit ? 'M10 8v-2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-2M15 12H3l3-3M6 15l-3-3' : 'm5 5 7 7-7 7M13 5l7 7-7 7');
    }
  }
  const result = G.state === 'results' && !G.watch && clock - G.resT > 1; // (the dance demo ends on its own sheet)
  sheets.board.results(result); // with TOCA PER TORNAR: no stray tap from the last notes
  sheets.share.results(result, G.shareRun, CHALLENGE); // the row itself (#results-actions)
  hide(retryEl, !result);
  sheets.watch?.frame();
}
