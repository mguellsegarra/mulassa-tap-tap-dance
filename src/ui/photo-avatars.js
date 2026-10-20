// Photo mode keeps the selector identity separate from the actor we drive. A playable selection starts driving;
// the splash, pending figures and touch start looking. Both scene figures stay present throughout.
import { PHOTO, setPhotoControl, clearPhotoKeys } from '../game/photo-control.js';
import { MULASSA, DRAC, portraitArt, portraitPalette } from '../game/figures.js';
import { pixelSvg } from './select-ui.js';
import { COARSE } from '../core/env.js';
import { hud } from '../hud/canvas.js';
import { lookLocked } from './mouse-look.js';

const PF_FIGS = [[MULASSA, [['Q', 's’alça'], ['E', 'guitza'], ['R', 'culada']]],
  [DRAC, [['Q', 'rugeix'], ['E', 'guspires'], ['R', 'gira']]]];
const photoHelpActions = fig => [['WASD', 'camina'], ['Espai', 'salta'], ...fig[1], ['Tab', 'canvia de figura a la plaça'], ['Ratolí', 'mantén premut per mirar'], ['Esc', lookLocked() ? 'allibera el ratolí' : 'deixa de moure la figura']];
const PF_TIP_MS = 7000; // allow time to read the actions, then fade without interrupting input
const PF_ORBIT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M4.5 9.5A8 8 0 0 1 18 6.3M19.5 14.5A8 8 0 0 1 6 17.7M18 2.5v4h-4M6 21.5v-4h4"/></svg>';
export const avatarsEl = document.createElement('div');
avatarsEl.id = 'photo-figs';
avatarsEl.hidden = true;
avatarsEl.setAttribute('role', 'group');
avatarsEl.setAttribute('aria-label', 'Mou una figura');
avatarsEl.innerHTML = '<button type="button" class="pf pf-free" data-id="" aria-pressed="true" title="Mira la plaça"><span class="pf-por">' + PF_ORBIT_SVG + '</span><span class="pf-nb"><span class="pf-name">Mira la plaça</span></span></button>'
  + PF_FIGS.map(([f]) => `<button type="button" class="pf" data-id="${f.id}" aria-pressed="false" data-town="${f.town}"><span class="pf-por">${pixelSvg(portraitArt(f), portraitPalette(f), '#2a1a10')}</span><span class="pf-nb"><span class="pf-name">Mou ${f.id === DRAC.id ? 'el' : 'la'} ${f.name}</span></span></button>`).join('')
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
  if (!pfShown) return;
  const fig = PHOTO.on && PF_FIGS.find(([f]) => f.id === PHOTO.id);
  if (fig) {
    const actions = photoHelpActions(fig);
    pfTip.innerHTML = `<strong>Ara mous ${fig[0].id === DRAC.id ? 'el Drac' : 'la Mulassa'}.</strong><span class="sr-only">${fig[0].fullName}</span><div class="pf-help-grid">${actions.map(([key, label]) => `<span class="pf-help-action"><kbd>${key}</kbd><span${key === 'Esc' ? ' data-photo-escape' : ''}>${label}</span></span>`).join('')}</div><small>Tab als botons: recorre els controls.<br>Prem <kbd>?</kbd> per tornar a veure els controls.</small>`;
  } else {
    pfTip.innerHTML = '<strong>Mira la plaça</strong>' + (COARSE.matches
      ? '<p>Arrossega per girar · Pessiga per acostar o allunyar.</p><small>Doble toc a la plaça: mostra els botons.</small>'
      : '<p>Tria una figura per moure-la.</p><small>Arrossega per girar · Roda per acostar o allunyar.<br>Esc: mostra els botons.</small>');
  }
  pfTip.hidden = false;
  pfTip.dataset.visible = 'true';
  fadePhotoTipAfter(PF_TIP_MS);
}

const pfAutoShown = new Set(); // once per figure for this page visit, including entry through Tab
let pfShown = false, pfTipFor = null, pfTipT = 0, pfTipUsed = false;
export const photoHelpAvailable = () => pfShown && pfTip.dataset.visible !== 'true';
export function syncAvatars() {
  const active = PHOTO.on ? PHOTO.id : '';
  for (const b of pfButtons) {
    const on = b.dataset.id === active;
    b.setAttribute('aria-pressed', String(on));
    if (!b.dataset.id) continue;
    b.title = on ? pfHelp.textContent : b.querySelector('.pf-name').textContent;
  }
  if (active !== pfTipFor) {
    pfTipFor = active;
    const fig = PF_FIGS.find(([f]) => f.id === active);
    pfHelp.textContent = fig ? `${fig[0].fullName}: ${photoHelpActions(fig).map(([key, label]) => `${key} ${label}`).join(' · ')}. Prem ? per tornar a veure els controls.` : '';
    for (const b of pfButtons) {
      b.setAttribute('aria-describedby', fig && b.dataset.id === active ? 'photo-help' : '');
      if (b.dataset.id === active && fig) {
        b.title = pfHelp.textContent;
      }
    }
    if (fig && !pfAutoShown.has(active)) {
      pfAutoShown.add(active);
      showPhotoHelp(); // a newly discovered figure gets its own reading time
    } else if (fig) {
      clearPhotoTip();
      pfTip.innerHTML = `<strong>Ara mous ${active === DRAC.id ? 'el Drac' : 'la Mulassa'}.</strong>`;
      pfTip.hidden = false; pfTip.dataset.visible = 'true';
      fadePhotoTipAfter(2000);
    } else if (pfShown) showPhotoHelp();
    else clearPhotoTip();
  }
}
// Entry is derived anew from the selector, never from the previous photo actor.
export function showAvatars(on, id) {
  pfShown = on;
  setPhotoControl(Boolean(on && !COARSE.matches && PF_FIGS.some(([f]) => f.id === id)), id, true);
  PHOTO.pair = on; // both existing scene figures, independent of selector identity
  avatarsEl.hidden = !on || COARSE.matches;
  pfTipFor = null;
  syncAvatars();
}
// Escape: drop control first; the next Escape leaves photo mode. true = handled.
export function stopControl() {
  if (!PHOTO.on) return false;
  setPhotoControl(false); syncAvatars();
  return true;
}
// Choosing the current actor is idempotent. Looking has its own explicit action.
export function takeFigure(id) {
  if (avatarsEl.hidden) return;
  if (!id) setPhotoControl(false);
  else if (!PHOTO.on || PHOTO.id !== id) setPhotoControl(true, id, true);
  syncAvatars();
  if (PHOTO.on && pfButtons.includes(document.activeElement)) {
    pfTip.innerHTML = `<strong>Ara mous ${PHOTO.id === DRAC.id ? 'el Drac' : 'la Mulassa'}.</strong><small>Ves a la plaça per moure la figura.<br>Tab: recorre els controls · Enter o Espai: tria.</small>`;
    pfTip.hidden = false; pfTip.dataset.visible = 'true'; fadePhotoTipAfter(PF_TIP_MS);
  }
}
for (const b of pfButtons) b.addEventListener('click', () => takeFigure(b.dataset.id));
COARSE.addEventListener?.('change', () => showAvatars(pfShown)); // DevTools device mode, a tablet's keyboard dock

// The first movement/action key gives the player one more second; repeats never postpone dismissal.
// ? (or the existing help button) always reopens the current figure's instructions.
addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || !pfShown) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable) return;
  if (e.key === '?') { e.preventDefault(); showPhotoHelp(); return; }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyQ'].includes(e.code) && pfTip.dataset.visible === 'true' && !pfTipUsed) {
    pfTipUsed = true;
    fadePhotoTipAfter(1000);
  }
});
// Keep Escape's instruction true while the browser owns the pointer.
document.addEventListener('pointerlockchange', () => {
  const escape = pfTip.querySelector('[data-photo-escape]');
  if (escape) escape.textContent = lookLocked() ? 'allibera el ratolí' : 'deixa de moure la figura';
});
hud.addEventListener('focus', () => { if (pfShown && PHOTO.on) showPhotoHelp(); });
hud.addEventListener('blur', () => { if (pfShown) clearPhotoKeys(); });
