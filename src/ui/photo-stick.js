// Photo mode's touch controls (COARSE only, while driving a figure), laid out as phone action games do (Genshin,
// Fortnite, Roblox): a layer over the plaça whose left half floats the stick where the thumb lands and whose right half
// looks (game/photo-touch.js); the jump big where the right thumb rests, the figure's three moves on an arc round it
// (Space, Q, E, R: photoPress), and the figure swap away from the thumb on the right edge, as the other figure's portrait.
// Desktop never shows it.
import { PHOTO, PHOTO_RUN, photoPress, photoRelease } from '../game/photo-control.js';
import { STICK, TOUCH, touchDown, touchMove, touchUp, touchReset } from '../game/photo-touch.js';
import { PHOTO_ICONS, swapArt } from './photo-icons.js';
import { tr } from '../i18n/messages.js';
import { traitsOf } from '../figures/index.js';

const PS_CODES = ['Space', 'KeyQ', 'KeyE', 'KeyR', 'Tab'];
export const touchEl = document.createElement('div');
touchEl.id = 'photo-touch';
touchEl.hidden = true;
touchEl.innerHTML = '<div class="ps-base" aria-hidden="true"><div class="ps-knob"></div></div><div class="ps-actions" role="group" aria-label="' + tr('ui.photo.actions') + '">'
  + PS_CODES.map(code => `<button type="button" class="ps-btn${code === 'Tab' ? ' ps-swap' : ''}" data-code="${code}"></button>`).join('') + '</div>';
document.getElementById('viewmode').after(touchEl);
const psBase = touchEl.querySelector('.ps-base'), psKnob = touchEl.querySelector('.ps-knob'), psButtons = [...touchEl.querySelectorAll('.ps-btn')];

function drawStick() {
  if (TOUCH.epoch !== PHOTO.inputEpoch) touchReset(); // control was dropped (Tab, blur…): so is the thumb
  const s = TOUCH.stick, on = s.id !== null;
  const reach = Math.hypot(PHOTO.stickX, PHOTO.stickY);
  psBase.classList.toggle('on', on);
  psBase.classList.toggle('run', on && reach >= PHOTO_RUN.stick); // the gallop: the ring turns gold
  psBase.style.left = on ? `${s.ox}px` : ''; // (its centre; at rest CSS puts it in the corner)
  psBase.style.top = on ? `${s.oy}px` : '';
  psKnob.style.transform = on ? `translate3d(${s.dx}px, ${s.dy}px, 0)` : '';
  psBase.style.setProperty('--ps-a', `${Math.atan2(s.dx, -s.dy)}rad`); // where she's heading: the arc on the ring
  psBase.style.setProperty('--ps-m', on ? reach.toFixed(2) : '0');
}
function releaseStick() { // every finger and held button lets go
  touchReset();
  for (const b of psButtons) if (b.dataset.pid) { photoRelease(b.dataset.code); delete b.dataset.pid; b.classList.remove('down'); }
  drawStick();
}
let stickSwitched = null, psFor = null;
export const setStickSwitched = f => (stickSwitched = f); // photo-avatars.js: relabel after a figure change
// labels: the figure's [key, action] pairs from photo-avatars.js (Q/E/R differ per figure); id: the figure driven.
export function showStick(on, labels, id) {
  if (!on) releaseStick();
  touchEl.hidden = !on;
  if (!labels || id === psFor) return;
  psFor = id;
  const name = { Space: tr(traitsOf(id).photoSpace), Tab: tr('ui.photo.act.swap') }, icons = PHOTO_ICONS[id] ?? {};
  for (const [key, label] of labels) name['Key' + key] = label;
  for (const b of psButtons) {
    b.setAttribute('aria-label', name[b.dataset.code] ?? ''); // icons only, as phone action games; the ? help names them
    b.innerHTML = b.dataset.code === 'Tab' ? swapArt(id) : icons[b.dataset.code] ?? '';
  }
}
touchEl.addEventListener('pointerdown', e => {
  if (e.target.closest?.('.ps-btn')) return;
  e.preventDefault(); // no compat mouse events, no focus, no scroll
  TOUCH.lookScale = STICK.turn / Math.max(320, innerWidth) / 0.003; // (photoLook: 0.003 rad a unit) the same turn for a swipe on any screen
  if (!touchDown(e.pointerId, e.clientX, e.clientY, e.clientX < innerWidth / 2)) return;
  try { touchEl.setPointerCapture(e.pointerId); } catch { /* already gone */ }
  drawStick();
});
touchEl.addEventListener('pointermove', e => { const stick = TOUCH.stick.id !== null; touchMove(e.pointerId, e.clientX, e.clientY); if (stick) drawStick(); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) touchEl.addEventListener(ev, e => { const stick = TOUCH.stick.id !== null; touchUp(e.pointerId); if (stick) drawStick(); });
for (const b of psButtons) {
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    if (!PHOTO.on || b.dataset.pid) return;
    b.dataset.pid = e.pointerId; b.classList.add('down');
    try { b.setPointerCapture(e.pointerId); } catch { /* already gone */ }
    photoPress(b.dataset.code);
    if (b.dataset.code === 'Tab') { drawStick(); stickSwitched?.(); } // the other figure: the thumb is dropped with the keys, the icons change
  });
  const up = e => {
    if (b.dataset.pid !== String(e.pointerId)) return;
    delete b.dataset.pid; b.classList.remove('down'); photoRelease(b.dataset.code);
  };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, up);
  b.addEventListener('contextmenu', e => e.preventDefault()); // a long press holds Q/E, never the callout
}
// Real iPhones still zoomed on a double tap through `touch-action: none` (the simulator didn't). Pointer events
// carry on regardless; only the browser's own gestures and the synthetic click go (the buttons act on pointerdown).
touchEl.addEventListener('touchstart', e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
addEventListener('blur', releaseStick);
document.addEventListener('visibilitychange', releaseStick);
addEventListener('pagehide', releaseStick);
