// «Mode foto» on desktop: a companion bar at the bottom, «Vista lliure» and the two figures' frames. The view is free
// (menu orbit, figures on their own) until a figure is clicked: then WASD drives it. «Vista lliure», a click on the
// active figure or Escape go back to just looking. Touch screens (COARSE) never get the bar: there photo mode only looks.
import { PHOTO, setPhotoControl } from '../game/photo-control.js';
import { MULASSA, DRAC, portraitArt, portraitPalette, townOf } from '../game/figures.js';
import { pixelSvg } from './select-ui.js';
import { sheets } from './sheets.js';
import { COARSE } from '../core/env.js';
import { G } from '../game/state.js';

const PF_FIGS = [[MULASSA, 'salta'], [DRAC, 'flamarada']];
const PF_TIP_MS = 4000; // the keys show for a moment each time a figure is taken
const PF_ORBIT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M4.5 9.5A8 8 0 0 1 18 6.3M19.5 14.5A8 8 0 0 1 6 17.7M18 2.5v4h-4M6 21.5v-4h4"/></svg>';
export const avatarsEl = document.createElement('div');
avatarsEl.id = 'photo-figs';
avatarsEl.hidden = true;
avatarsEl.setAttribute('role', 'group');
avatarsEl.setAttribute('aria-label', 'Mou una figura');
avatarsEl.innerHTML = '<button type="button" class="pf pf-free" data-id="" aria-pressed="true" title="Vista lliure (Esc)"><span class="pf-por">' + PF_ORBIT_SVG + '</span><span class="pf-nb"><span class="pf-name">Vista lliure</span></span></button>'
  + PF_FIGS.map(([f]) => `<button type="button" class="pf" data-id="${f.id}" aria-pressed="false" style="--c:${townOf(f).color}"><span class="pf-por">${pixelSvg(portraitArt(f), portraitPalette(f), '#2a1a10')}</span><span class="pf-nb"><span class="pf-name">${f.name}</span></span></button>`).join('')
  + '<p class="pf-tip" hidden></p>';
document.getElementById('viewmode').after(avatarsEl);
const pfButtons = [...avatarsEl.querySelectorAll('.pf')], pfTip = avatarsEl.querySelector('.pf-tip');

let pfShown = false, pfTipFor = null, pfTipT = 0;
export function syncAvatars() {
  const active = PHOTO.on ? PHOTO.id : '';
  for (const b of pfButtons) {
    const on = b.dataset.id === active;
    b.setAttribute('aria-pressed', String(on));
    if (!b.dataset.id) continue;
    const name = b.querySelector('.pf-name').textContent;
    b.title = on ? 'Torna a la vista lliure (Esc)' : `Mou ${name === 'Drac' ? 'el' : 'la'} ${name} amb WASD`;
  }
  if (active !== pfTipFor) { // a new figure taken (click or Tab): its keys, briefly
    pfTipFor = active; clearTimeout(pfTipT);
    const fig = PF_FIGS.find(([f]) => f.id === active);
    pfTip.hidden = !fig;
    if (fig) { pfTip.textContent = `WASD camina · Espai ${fig[1]} · Tab canvia · Esc torna a mirar`; pfTipT = setTimeout(() => { pfTip.hidden = true; }, PF_TIP_MS); }
  }
}
// Called when photo mode opens or closes: control always starts off, in plain viewing.
export function showAvatars(on) {
  pfShown = on;
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
// A frame's click: '' (Vista lliure) or the active figure again = look; another figure = drive it. Only while the bar shows.
export function takeFigure(id) {
  if (avatarsEl.hidden) return;
  if (!id || PHOTO.on && PHOTO.id === id) setPhotoControl(false);
  else setPhotoControl(true, id, G.state === 'splash');
  syncAvatars();
}
for (const b of pfButtons) b.addEventListener('click', () => takeFigure(b.dataset.id));
COARSE.addEventListener?.('change', () => showAvatars(pfShown)); // DevTools device mode, a tablet's keyboard dock
