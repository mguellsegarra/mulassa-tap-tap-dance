// Which DOM controls show in each state, and the photo (view) mode.
import { showAvatars } from './photo-avatars.js';
import { sheets } from './sheets.js';
import { howtoMenu, settingsMenu, privacyMenu, pauseMenu, hide, howtoEl, settingsEl, leadersEl, feedbackEl, musicEl, iosHint, hintOff, pauseEl, skipEl, retryEl } from './handles.js';
import { G, clock, CHALLENGE } from '../game/state.js';
import { keyboardNav } from './focus.js';
import { hud, buttonAt } from '../hud/canvas.js';

// Canvas buttons need the same hover cursor as DOM buttons. Recheck on state/layout
// changes too, even when the mouse stays still (photo mode, resize, entering play).
const hudPointer = { clientX: 0, clientY: 0 };
let hudMouse = false;
function updateHudCursor() {
  const active = hudMouse && !viewMode && !sheetUp();
  const clickable = active && ((G.state === 'splash' || G.state === 'title') && buttonAt(hudPointer)
    || G.state === 'results' && clock - G.resT > 1);
  const cursor = clickable ? 'pointer' : '';
  if (hud.style.cursor !== cursor) hud.style.cursor = cursor;
}
hud.addEventListener('pointermove', e => {
  hudMouse = e.pointerType === 'mouse';
  hudPointer.clientX = e.clientX; hudPointer.clientY = e.clientY;
  updateHudCursor();
});
hud.addEventListener('pointerleave', () => { hudMouse = false; updateHudCursor(); });

export const sheetUp = () => howtoMenu.open || settingsMenu.open || sheets.sync.open || sheets.board.open || privacyMenu.open || sheets.share.open || pauseMenu.open || sheets.feedback.open || sheets.profile?.isOpen || sheets.select?.sheetOpen;
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
  viewMode = on; showAvatars(on); viewT = performance.now();
  document.body.classList.toggle('view-mode', on);
  for (const el of VIEW_HIDES) el.inert = on;
  viewBtn.setAttribute('aria-pressed', String(on)); // (one name, «Amaga els botons», pressed or not; the tooltip says what a press does)
  viewBtn.title = on ? 'Mostra els botons (H)' : 'Amaga els botons (H)';
  clearTimeout(viewIdle); viewBtn.classList.remove('idle');
  if (on) {
    viewBack = document.activeElement;
    viewBtn.focus({ preventScroll: true });
    viewWake();
  } else {
    const back = viewBack; viewBack = null;
    if (keyboardNav && back && back !== document.body && back.isConnected && !back.hidden) back.focus({ preventScroll: true });
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
  sheets.select?.visible(G.state === 'select');
  hide(howtoEl, true); // instructions live below the selector's record tiles
  hide(viewBtn, !menuState());
  if (viewMode && (!menuState() || sheetUp())) setView(false); // menu screens only, never under a sheet
  hide(settingsEl, (G.state !== 'title' && G.state !== 'select'));
  hide(leadersEl, (G.state !== 'title' && G.state !== 'select') || !sheets.board.configured);
  document.getElementById('select').toggleAttribute?.('data-ranking', !leadersEl.hidden);
  hide(feedbackEl, (G.state !== 'title' && G.state !== 'select'));
  hide(musicEl, (G.state !== 'title' && G.state !== 'select'));
  hide(iosHint, hintOff || (G.state !== 'title' && G.state !== 'select') || howtoMenu.open || settingsMenu.open || sheets.sync.open);
  hide(pauseEl, G.state !== 'play' || G.paused || Boolean(G.collapseT));
  hide(skipEl, G.state !== 'play' || !G.practice || G.paused);
  sheets.board.results(G.state === 'results' && clock - G.resT > 1); // with TOCA PER TORNAR: no stray tap from the last notes
  sheets.share.results(G.state === 'results' && clock - G.resT > 1, G.shareRun, CHALLENGE); // the row itself (#results-actions)
  hide(retryEl, !(G.state === 'results' && clock - G.resT > 1));
}
