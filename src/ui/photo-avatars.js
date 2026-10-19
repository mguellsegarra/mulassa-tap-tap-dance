// «Mode foto» on desktop: a companion column on the left, «Vista lliure» and the two figures' frames. The view is free
// (menu orbit, figures on their own) until a figure is clicked: then WASD drives it. «Vista lliure», a click on the
// active figure or Escape go back to just looking. Touch screens (COARSE) never get the bar: there photo mode only looks.
import { PHOTO, setPhotoControl } from '../game/photo-control.js';
import { MULASSA, DRAC, portraitArt, portraitPalette } from '../game/figures.js';
import { escutField } from './escuts.js';
import { pixelSvg } from './select-ui.js';
import { COARSE } from '../core/env.js';
import { G } from '../game/state.js';

const PF_FIGS = [[MULASSA, [['Q', 's’alça'], ['E', 'guitza'], ['R', 'culada']]],
  [DRAC, [['Q', 'rugeix'], ['E', 'guspires'], ['R', 'gira']]]];
const photoHelpActions = fig => [['WASD', 'camina'], ['Espai', 'salta'], ...fig[1], ['Tab', 'canvia'], ['Esc', 'torna a mirar']];
const PF_TIP_MS = 7000; // allow time to read the actions, then fade without interrupting input
const PF_ORBIT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M4.5 9.5A8 8 0 0 1 18 6.3M19.5 14.5A8 8 0 0 1 6 17.7M18 2.5v4h-4M6 21.5v-4h4"/></svg>';
export const avatarsEl = document.createElement('div');
avatarsEl.id = 'photo-figs';
avatarsEl.hidden = true;
avatarsEl.setAttribute('role', 'group');
avatarsEl.setAttribute('aria-label', 'Mou una figura');
avatarsEl.innerHTML = '<button type="button" class="pf pf-free" data-id="" aria-pressed="true" title="Vista lliure (Esc)"><span class="pf-por">' + PF_ORBIT_SVG + '</span><span class="pf-nb"><span class="pf-name">Vista lliure</span></span></button>'
  + PF_FIGS.map(([f]) => `<button type="button" class="pf" data-id="${f.id}" aria-pressed="false" data-field="${escutField(f.town)}"><span class="pf-por">${pixelSvg(portraitArt(f), portraitPalette(f), '#2a1a10')}</span><span class="pf-nb"><span class="pf-name">${f.name}</span></span></button>`).join('')
  + '<p id="photo-help" class="sr-only"></p>';
document.getElementById('viewmode').after(avatarsEl);
const pfButtons = [...avatarsEl.querySelectorAll('.pf')], pfHelp = avatarsEl.querySelector('#photo-help');
// Outside the idle-fading column: instructions stay legible while the player reads.
const pfTip = document.createElement('div');
pfTip.id = 'photo-tip';
pfTip.hidden = true;
pfTip.setAttribute('role', 'status');
pfTip.setAttribute('aria-atomic', 'true');
avatarsEl.after(pfTip);

function clearPhotoTip() {
  clearTimeout(pfTipT);
  pfTip.hidden = true;
  pfTip.dataset.visible = 'false';
  pfTipUsed = false;
}
function fadePhotoTipAfter(ms) {
  clearTimeout(pfTipT);
  pfTipT = setTimeout(() => { pfTip.dataset.visible = 'false'; }, ms);
}
export function showPhotoHelp() {
  clearPhotoTip();
  if (!pfShown || avatarsEl.hidden || !PHOTO.on) return;
  const fig = PF_FIGS.find(([f]) => f.id === PHOTO.id);
  if (!fig) return;
  const actions = photoHelpActions(fig);
  pfTip.innerHTML = `<strong>${fig[0].fullName}</strong><div class="pf-help-grid">${actions.map(([key, label]) => `<span class="pf-help-action"><kbd>${key}</kbd><span>${label}</span></span>`).join('')}</div><small>Prem <kbd>?</kbd> per tornar a veure els controls</small>`;
  pfTip.hidden = false;
  pfTip.dataset.visible = 'true';
  fadePhotoTipAfter(PF_TIP_MS);
}

const pfAutoShown = new Set(); // once per figure for this page visit, including entry through Tab
let pfShown = false, pfTipFor = null, pfTipT = 0, pfTipUsed = false;
export const photoHelpAvailable = () => pfShown && !avatarsEl.hidden && PHOTO.on && pfTip.dataset.visible !== 'true';
export function syncAvatars() {
  const active = PHOTO.on ? PHOTO.id : '';
  for (const b of pfButtons) {
    const on = b.dataset.id === active;
    b.setAttribute('aria-pressed', String(on));
    if (!b.dataset.id) continue;
    const name = b.querySelector('.pf-name').textContent;
    b.title = on ? pfHelp.textContent : `Mou ${name === 'Drac' ? 'el' : 'la'} ${name} amb WASD`;
  }
  if (active !== pfTipFor) {
    pfTipFor = active;
    const fig = PF_FIGS.find(([f]) => f.id === active);
    pfHelp.textContent = fig ? `${fig[0].fullName}: ${photoHelpActions(fig).map(([key, label]) => `${key} ${label}`).join(' · ')}. Prem ? per tornar a veure els controls.` : '';
    for (const b of pfButtons) {
      b.setAttribute('aria-describedby', fig && b.dataset.id === active ? 'photo-help' : '');
      if (b.dataset.id === active && fig) {
        b.title = pfHelp.textContent;
        if (pfButtons.includes(document.activeElement)) b.focus({ preventScroll: true });
      }
    }
    if (fig && !pfAutoShown.has(active)) {
      pfAutoShown.add(active);
      showPhotoHelp(); // a newly discovered figure gets its own reading time
    } else clearPhotoTip();
  }
}
// Called when photo mode opens or closes: control always starts off, in plain viewing.
export function showAvatars(on) {
  pfShown = on;
  setPhotoControl(false);
  // (a pending figure on the selector too: the last playable one stands in, main.js)
  avatarsEl.hidden = !on || COARSE.matches;
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

// The first movement/action key gives the player one more second; repeats never postpone dismissal.
// ? (or the existing help button) always reopens the current figure's instructions.
addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || !pfShown || avatarsEl.hidden || !PHOTO.on) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable) return;
  if (e.key === '?') { e.preventDefault(); showPhotoHelp(); return; }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyQ'].includes(e.code) && pfTip.dataset.visible === 'true' && !pfTipUsed) {
    pfTipUsed = true;
    fadePhotoTipAfter(1000);
  }
});
