// «Mode foto» on desktop: two character frames, like a party's portraits. The view is free (menu orbit, figures on their
// own) until one is clicked: then WASD drives it. A click on the active one, or Escape, goes back to just looking.
// Touch screens (COARSE) never get them: there photo mode only looks.
import { PHOTO, setPhotoControl } from '../game/photo-control.js';
import { MULASSA, DRAC, portraitArt, portraitPalette, townOf } from '../game/figures.js';
import { pixelSvg } from './select-ui.js';
import { sheets } from './sheets.js';
import { COARSE, Q } from '../core/env.js';
import { G } from '../game/state.js';

const FIGS = [[MULASSA, 'salta'], [DRAC, 'flamarada']];
export const avatarsEl = document.createElement('div');
avatarsEl.id = 'photo-figs';
avatarsEl.hidden = true;
avatarsEl.dataset.variant = ['a', 'b', 'c'].includes(Q.get('avatars')) ? Q.get('avatars') : 'a'; // shortcut: design prototype, one stays
avatarsEl.setAttribute('role', 'group');
avatarsEl.setAttribute('aria-label', 'Mou una figura');
avatarsEl.innerHTML = FIGS.map(([f]) => `<button type="button" class="pf" data-id="${f.id}" aria-pressed="false" style="--c:${townOf(f).color}"><span class="pf-por">${pixelSvg(portraitArt(f), portraitPalette(f), '#2a1a10')}</span><span class="pf-nb"><span class="pf-name">${f.name}</span><small></small></span></button>`).join('')
  + '<p class="pf-tip" hidden></p>';
document.getElementById('viewmode').after(avatarsEl);
const buttons = [...avatarsEl.querySelectorAll('.pf')], tip = avatarsEl.querySelector('.pf-tip');

let shown = false;
export function syncAvatars() {
  for (const b of buttons) {
    const on = PHOTO.on && PHOTO.id === b.dataset.id, name = b.querySelector('.pf-name').textContent;
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('small').textContent = on ? 'La mous tu' : 'Passeja';
    b.title = on ? 'Torna a mirar (Esc)' : `Mou ${name === 'Drac' ? 'el' : 'la'} ${name} amb WASD`;
  }
  const fig = FIGS.find(([f]) => PHOTO.on && f.id === PHOTO.id);
  tip.hidden = !fig;
  if (fig) tip.textContent = `WASD camina · Espai ${fig[1]} · Tab canvia · Esc torna a mirar`;
}
// Called when photo mode opens or closes: control always starts off, in plain viewing.
export function showAvatars(on) {
  shown = on;
  setPhotoControl(false);
  // a pending figure on the selector hides both models: nothing to drive
  avatarsEl.hidden = !on || COARSE.matches || G.state === 'select' && !!(sheets.select?.pending ?? sheets.select?.figure?.status === 'aviat');
  syncAvatars();
}
// Escape: drop control first; the next Escape leaves photo mode. true = handled.
export function stopControl() {
  if (!PHOTO.on) return false;
  setPhotoControl(false); syncAvatars();
  return true;
}
for (const b of buttons) b.addEventListener('click', () => {
  if (avatarsEl.hidden) return;
  if (PHOTO.on && PHOTO.id === b.dataset.id) setPhotoControl(false);
  else setPhotoControl(true, b.dataset.id, G.state === 'splash');
  syncAvatars();
});
COARSE.addEventListener?.('change', () => showAvatars(shown)); // DevTools device mode, a tablet's keyboard dock
