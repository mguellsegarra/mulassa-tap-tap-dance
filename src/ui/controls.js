// Which DOM controls show in each state, and the photo (view) mode.
import { showAvatars, photoHelpAvailable } from './photo-avatars.js';
import { sheets } from './sheets.js';
import { howtoMenu, settingsMenu, privacyMenu, pauseMenu, hide, howtoEl, settingsEl, leadersEl, feedbackEl, musicEl, iosHint, hintOff, pauseEl, skipEl, retryEl } from './handles.js';
import { G, clock, CHALLENGE, startMenuAudio } from '../game/state.js';
import { keyboardNav } from './focus.js';
import { hud, buttonAt } from '../hud/canvas.js';
import { lookSync } from './mouse-look.js';
import { PHOTO } from '../game/photo-control.js';

const practiceLabel = document.getElementById('skip-label'), practiceIcon = document.getElementById('skip-icon');

// Canvas buttons need the same hover cursor as DOM buttons. Recheck on state/layout
// changes too, even when the mouse stays still (photo mode, resize, entering play).
const hudPointer = { clientX: 0, clientY: 0 };
let hudMouse = false;
function updateHudCursor() {
  const active = hudMouse && !viewMode && !sheetUp();
  const clickable = active && ((G.state === 'splash' || G.state === 'title') && buttonAt(hudPointer)
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

export const sheetUp = () => howtoMenu.open || settingsMenu.open || sheets.sync.open || sheets.board.open || privacyMenu.open || sheets.share.open || pauseMenu.open || sheets.feedback.open || sheets.profile?.isOpen || sheets.select?.sheetOpen || sheets.watch?.open;
export const menuState = () => G.state === 'splash' || G.state === 'title' || G.state === 'select'; // the camera steers, photo mode works
export const steers = () => menuState() && !sheetUp();
// «Mode foto» (#viewmode, splash/title/selector): every control, tip and the HUD fade out (index.html body.view-mode) and the plaça
// is all there is: the camera steers as on the title, the menu loop plays on, a tap picks nothing, no sheet opens. H
// toggles it; Escape or the same button (dimmed after 3 idle seconds, back on any touch, move or key) brings it all back.
// The hidden controls are inert (never focused or clicked); the focus goes to the button and back to where it was.
export const viewBtn = document.getElementById('viewmode');
const VIEW_HIDES = ['leaders', 'settings', 'feedback', 'music', 'howto', 'ios-hint', 'fps', 'feedback-nudge', 'select'].map(id => document.getElementById(id));
export let viewMode = false, viewT = 0, viewBack = null, viewIdle = 0, hudBlank = false;
export const setHudBlank = v => (hudBlank = v);
export function setView(on) {
  if (on === viewMode || on && (!menuState() || sheetUp())) return;
  const entryFocus = on ? document.activeElement : null; // making the selector inert can already blur its card
  if (on && G.state === 'splash') startMenuAudio();
  const entryFigure = on && G.state === 'select' && !sheets.select?.pending && sheets.select?.figure;
  viewMode = on; showAvatars(on, entryFigure?.id); viewT = performance.now();
  if (!on) hide(howtoEl, true);
  document.body.classList.toggle('view-mode', on);
  for (const el of VIEW_HIDES) el.inert = on;
  viewBtn.setAttribute('aria-pressed', String(on)); // (one name, «Amaga els botons», pressed or not; the tooltip says what a press does)
  viewBtn.title = on ? 'Mostra els botons (H)' : 'Amaga els botons (H)';
  clearTimeout(viewIdle); viewBtn.classList.remove('idle');
  hud.setAttribute('role', on ? 'region' : 'img');
  if (!on) hud.setAttribute('aria-label', 'La plaça');
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
  clearTimeout(viewIdle); viewIdle = setTimeout(() => viewBtn.classList.add('idle'), 3000);
}
for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel']) addEventListener(ev, viewWake, { passive: true });
viewBtn.addEventListener('click', () => setView(!viewMode));
export function updateControls() {
  updateHudCursor();
  // Set the hint's final layout before the selector measures its information block.
  hide(iosHint, hintOff || (G.state !== 'title' && G.state !== 'select') || howtoMenu.open || settingsMenu.open || sheets.sync.open);
  hide(viewBtn, !menuState());
  if (viewMode && (!menuState() || sheetUp())) setView(false); // menu screens only, never under a sheet
  lookSync(); // (after it: a sheet or a state change has just dropped control)
  const photoHelp = photoHelpAvailable();
  howtoEl.inert = viewMode && !photoHelp;
  hide(howtoEl, !photoHelp); // reuse the existing ? only after the photo instructions disappear
  howtoEl.classList.toggle('photo-help', photoHelp);
  howtoEl.setAttribute('aria-label', photoHelp ? 'Controls del mode foto (?)' : 'Com es juga?');
  howtoEl.setAttribute('aria-haspopup', photoHelp ? 'false' : 'dialog');
  hide(settingsEl, (G.state !== 'title' && G.state !== 'select'));
  hide(leadersEl, (G.state !== 'title' && G.state !== 'select') || !sheets.board.configured);
  document.getElementById('select').toggleAttribute?.('data-ranking', !leadersEl.hidden);
  hide(feedbackEl, (G.state !== 'title' && G.state !== 'select'));
  hide(musicEl, (G.state !== 'title' && G.state !== 'select'));
  sheets.select?.visible(G.state === 'select'); // measure after the header controls have their final layout
  hide(pauseEl, G.state !== 'play' || G.paused || Boolean(G.collapseT));
  hide(skipEl, G.state !== 'play' || !G.practice || G.paused);
  if (G.practice) {
    const exit = G.practice.then == null, label = exit ? 'SURT' : 'SALTA';
    if (practiceLabel.textContent !== label) {
      practiceLabel.textContent = label;
      skipEl.setAttribute('aria-label', exit ? 'Surt de la pràctica' : 'Salta la pràctica');
      practiceIcon.setAttribute('d', exit ? 'M10 4H4v16h6M14 8l4 4-4 4M8 12h12' : 'm5 5 7 7-7 7M13 5l7 7-7 7');
    }
  }
  const result = G.state === 'results' && !G.watch && clock - G.resT > 1; // (the dance demo ends on its own sheet)
  sheets.board.results(result); // with TOCA PER TORNAR: no stray tap from the last notes
  sheets.share.results(result, G.shareRun, CHALLENGE); // the row itself (#results-actions)
  hide(retryEl, !result);
  sheets.watch?.frame();
}
