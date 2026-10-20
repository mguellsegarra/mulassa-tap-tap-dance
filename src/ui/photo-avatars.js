// Photo mode keeps the selector identity separate from the actor we drive. A playable selection starts driving;
// the splash, pending figures and touch start looking. Both scene figures stay present throughout.
import { PHOTO, setPhotoControl, clearPhotoKeys } from '../game/photo-control.js';
import { MULASSA, DRAC, portraitArt, portraitPalette } from '../game/figures.js';
import { pixelSvg } from './select-ui.js';
import { COARSE } from '../core/env.js';
import { hud } from '../hud/canvas.js';
import { lookLocked } from './mouse-look.js';
import { store } from '../platform/storage.js';
import { showStick, setStickSwitched } from './photo-stick.js';

const PF_FIGS = [[MULASSA, [['Q', 's’alça'], ['E', 'guitza'], ['R', 'culada']]],
  [DRAC, [['Q', 'rugeix'], ['E', 'guspires'], ['R', 'gira']]]];
const photoHelpActions = fig => [['WASD', 'camina'], ['Shift', 'corre'], ['Espai', 'salta'], ...fig[1], ['Tab', 'canvia figura'], ['Botó dret', 'mantén per mirar'], ['M', 'tria música'], ['Esc', lookLocked() ? 'allibera el ratolí' : 'torna a mirar']];
const photoHelpDescription = fig => `${fig[0].fullName}: ${photoHelpActions(fig).map(([key, label]) => `${key} ${label}`).join(' · ')}. Prem ? per tornar a veure els controls.`;
// Safari on an iPhone (not the home-screen app): its bars eat a landscape screen. Said on every entry (Marc).
const PF_HOME = /iPhone|iPod/.test(navigator.userAgent ?? '') && navigator.standalone === false ? '<small class="pf-home">Per jugar-hi a pantalla completa, afegeix el joc a la pantalla d’inici.</small>' : '';
const PF_TIP_MS = 6000; // brief discovery; manual help stays until toggled or the mode changes
const PF_ORBIT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M4.5 9.5A8 8 0 0 1 18 6.3M19.5 14.5A8 8 0 0 1 6 17.7M18 2.5v4h-4M6 21.5v-4h4"/></svg>';
export const avatarsEl = document.createElement('div');
avatarsEl.id = 'photo-figs';
avatarsEl.hidden = true;
avatarsEl.setAttribute('role', 'group');
avatarsEl.setAttribute('aria-label', 'Mou una figura');
avatarsEl.innerHTML = '<button type="button" class="pf pf-free" data-id="" aria-pressed="true" title="Mira la plaça"><span class="pf-por">' + PF_ORBIT_SVG + '</span><span class="pf-nb"><span class="pf-name">Mira la plaça</span></span></button>'
  + PF_FIGS.map(([f]) => `<button type="button" class="pf" data-id="${f.id}" aria-pressed="false" data-town="${f.town}"><span class="pf-por">${pixelSvg(portraitArt(f), portraitPalette(f), '#2a1a10')}</span><span class="pf-nb"><span class="pf-name">${f.name}</span></span></button>`).join('')
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
  pfTip.setAttribute('aria-hidden', 'true');
  pfTipManual = false;
}
function fadePhotoTipAfter(ms) {
  clearTimeout(pfTipT);
  pfTipT = setTimeout(() => { pfTip.dataset.visible = 'false'; pfTip.setAttribute('aria-hidden', 'true'); }, ms);
}
function presentPhotoTip(kind, html, ms) {
  clearPhotoTip();
  pfTip.dataset.kind = kind;
  pfTip.innerHTML = html;
  pfTip.hidden = false;
  pfTip.dataset.visible = 'true';
  pfTip.setAttribute('aria-hidden', 'false');
  if (ms) fadePhotoTipAfter(ms);
}
export function showPhotoHelp(manual = true) {
  if (manual && pfTipManual && pfTip.dataset.visible === 'true') {
    clearTimeout(pfTipT); pfTipManual = false; pfTip.dataset.visible = 'false'; pfTip.setAttribute('aria-hidden', 'true'); return;
  }
  clearPhotoTip();
  if (!pfShown) return;
  const fig = PHOTO.on && PF_FIGS.find(([f]) => f.id === PHOTO.id);
  let html;
  if (fig) {
    const actions = photoHelpActions(fig);
    html = COARSE.matches ? `<strong>Mou ${fig[0].id === DRAC.id ? 'el Drac' : 'la Mulassa'}</strong><p>Arrossega a l’esquerra per caminar; fins a la vora, corre.<br>Arrossega a la dreta per mirar.</p><small>Els botons rodons: salta, ${fig[1].map(([, label]) => label).join(', ')} i canvia de figura.<br>Botó ?: mostra o amaga l’ajuda.</small>${PF_HOME}`
      : `<strong>Mou ${fig[0].id === DRAC.id ? 'el Drac' : 'la Mulassa'}</strong><span class="sr-only">${fig[0].fullName}</span><div class="pf-help-grid">${actions.map(([key, label]) => `<span class="pf-help-action"><kbd>${key}</kbd><span${key === 'Esc' ? ' data-photo-escape' : ''}>${label}</span></span>`).join('')}</div><small>Tab als botons: navega.<br>? ${manual ? "amaga l'ajuda" : 'torna a mostrar els controls'}.</small>`;
  } else {
    html = '<strong>Vista lliure</strong>' + (COARSE.matches
      ? '<p>Arrossega per girar.<br>Pessiga per acostar o allunyar.</p><small>Botó ?: mostra o amaga l\'ajuda.</small>'
      : '<p>Arrossega per girar. Roda per fer zoom.<br>Tria una figura per moure-la.</p>');
  }
  presentPhotoTip('help', html, manual ? 0 : fig ? PF_TIP_MS : 6500);
  pfTipManual = manual;
}

const pfAutoShown = new Set(); // session fallback when browser storage is blocked
const photoHelpSeenKey = family => `photo-help-seen-${family}`; // Mulassa and Drac share the figure controls introduction
let pfShown = false, pfTipFor = null, pfTipT = 0, pfTipManual = false;
export const photoHelpAvailable = () => pfShown;
export function syncAvatars() {
  const active = PHOTO.on ? PHOTO.id : '';
  for (const b of pfButtons) {
    const on = b.dataset.id === active;
    b.setAttribute('aria-pressed', String(on));
    if (!b.dataset.id) continue;
    b.title = on ? pfHelp.textContent : b.querySelector('.pf-name').textContent;
  }
  const stickFig = PF_FIGS.find(([f]) => f.id === active);
  showStick(pfShown && PHOTO.on && COARSE.matches, stickFig?.[1], active);
  if (active !== pfTipFor) {
    const home = pfTipFor === null && COARSE.matches ? PF_HOME : ''; // on entry, not on each figure change
    pfTipFor = active;
    const fig = PF_FIGS.find(([f]) => f.id === active);
    const freeHelp = COARSE.matches ? 'Mira la plaça. Arrossega per girar. Pessiga per acostar o allunyar.'
      : 'Mira la plaça. Tria una figura per moure-la. Esc: mostra els botons.';
    pfHelp.textContent = fig ? photoHelpDescription(fig) : freeHelp;
    hud.setAttribute('aria-label', fig ? 'Plaça: controls de moviment' : 'Plaça: mira la plaça');
    for (const b of pfButtons) {
      b.setAttribute('aria-describedby', fig && b.dataset.id === active ? 'photo-help' : '');
      if (b.dataset.id === active && fig) {
        b.title = pfHelp.textContent;
      }
    }
    const family = COARSE.matches ? 'touch' : fig ? 'figure' : 'view';
    if (pfShown && !pfAutoShown.has(family) && store.get(photoHelpSeenKey(family)) !== '1') {
      pfAutoShown.add(family);
      store.set(photoHelpSeenKey(family), '1');
      showPhotoHelp(false);
    } else if (pfShown) {
      presentPhotoTip('notice', `<strong>${fig ? `Ara mous ${active === DRAC.id ? 'el Drac' : 'la Mulassa'}` : 'Vista lliure'}</strong>${home}`, home ? 4500 : 1800);
    }
    else clearPhotoTip();
  }
}
// Entry is derived anew from the selector, never from the previous photo actor.
export function showAvatars(on, id) {
  pfShown = on;
  const known = PF_FIGS.some(([f]) => f.id === id); // touch has no bar: it always drives, the Mulassa when the selection can't
  setPhotoControl(Boolean(on && (known || COARSE.matches)), known ? id : MULASSA.id, true);
  PHOTO.pair = on; // both existing scene figures, independent of selector identity
  avatarsEl.hidden = !on || COARSE.matches;
  hud.tabIndex = -1; // focusable by code or click for the world's keys, never a Tab stop: a full-viewport ring said nothing
  hud.setAttribute('aria-describedby', on ? 'photo-help' : '');
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
}
// A mouse or touch choice hands the keys to the world at once (keyboard activation keeps the focus on the button)
for (const b of pfButtons) b.addEventListener('click', e => { takeFigure(b.dataset.id); if (e.detail && PHOTO.on && !COARSE.matches) hud.focus({ preventScroll: true }); });
COARSE.addEventListener?.('change', () => showAvatars(pfShown)); // DevTools device mode, a tablet's keyboard dock
setStickSwitched(syncAvatars);

// Using a figure immediately clears discovery help, including an already-held movement key.
// ? (or the existing help button) always reopens the current figure's instructions.
addEventListener('keydown', e => {
  if (e.ctrlKey || e.altKey || e.metaKey || !pfShown) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable) return;
  if (e.key === '?') { e.preventDefault(); if (!e.repeat) showPhotoHelp(); return; }
  if (PHOTO.on && (e.target === hud || e.target?.tagName === 'BODY') && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyQ', 'KeyR', 'Space', 'ShiftLeft', 'ShiftRight'].includes(e.code) && pfTip.dataset.kind === 'help' && !pfTipManual) {
    clearPhotoTip();
  }
});
// Keep Escape's instruction true while the browser owns the pointer.
document.addEventListener('pointerlockchange', () => {
  const escape = pfTip.querySelector('[data-photo-escape]');
  if (escape) escape.textContent = lookLocked() ? 'allibera el ratolí' : 'torna a mirar';
  const fig = pfShown && PHOTO.on && PF_FIGS.find(([f]) => f.id === PHOTO.id);
  if (fig) pfHelp.textContent = photoHelpDescription(fig);
});
hud.addEventListener('blur', () => { if (pfShown) clearPhotoKeys(); });
addEventListener('blur', () => { if (pfShown) clearPhotoTip(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && pfShown) clearPhotoTip(); });
