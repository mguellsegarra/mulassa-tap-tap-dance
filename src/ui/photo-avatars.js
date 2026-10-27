// Photo mode keeps the selector identity separate from the actor we drive: it always drives one figure, on show alone
// (the selected one, else the last playable); Tab or the bar hands the plaça to another.
import { PHOTO, setPhotoControl, clearPhotoKeys } from '../game/photo-control.js';
import { MULASSA, DRAC, BOU, playable, portraitArt, portraitPalette } from '../game/figures.js';
import { pixelSvg } from './select-ui.js';
import { COARSE } from '../core/env.js';
import { hud } from '../hud/canvas.js';
import { lookLocked } from './mouse-look.js';
import { store } from '../platform/storage.js';
import { showStick, setStickSwitched } from './photo-stick.js';
import { tr } from '../i18n/messages.js';

const PF_FIGS = [[MULASSA, ['q', 'e', 'r'].map(k => [k.toUpperCase(), tr(`ui.photo.act.mula.${k}`)])],
  [DRAC, ['q', 'e', 'r'].map(k => [k.toUpperCase(), tr(`ui.photo.act.drac.${k}`)])],
  [BOU, ['q', 'e', 'r'].map(k => [k.toUpperCase(), tr(`ui.photo.act.bou.${k}`)])]].filter(([f]) => playable(f));
const PF_WORDS = { [MULASSA.id]: ['ui.photo.moveMula', 'ui.photo.nowMula'], [DRAC.id]: ['ui.photo.moveDrac', 'ui.photo.nowDrac'], [BOU.id]: ['ui.photo.moveBou', 'ui.photo.nowBou'] };
const photoHelpActions = fig => [['WASD', tr('ui.photo.act.walk')], ['Shift', tr('ui.photo.act.run')], [tr('ui.photo.key.space'), tr(fig[0] === BOU ? 'ui.photo.act.bou.space' : 'ui.photo.act.jump')], ...fig[1], ['Tab', tr('ui.photo.act.swap')], [tr('ui.photo.key.rightButton'), tr('ui.photo.act.holdLook')], ['M', tr('ui.photo.act.music')], ['Esc', tr(lookLocked() ? 'ui.photo.act.unlock' : 'ui.photo.act.exit')]];
const photoHelpDescription = fig => tr('ui.photo.description', { figure: fig[0].fullName, actions: photoHelpActions(fig).map(([key, label]) => `${key} ${label}`).join(' · ') });
const PF_TIP_MS = 6000; // brief discovery; manual help stays until toggled or the mode changes
export const avatarsEl = document.createElement('div');
avatarsEl.id = 'photo-figs';
avatarsEl.hidden = true;
avatarsEl.setAttribute('role', 'group');
avatarsEl.setAttribute('aria-label', tr('ui.photo.group'));
avatarsEl.innerHTML = PF_FIGS.map(([f]) => `<button type="button" class="pf" data-id="${f.id}" aria-pressed="false" data-town="${f.town}"><span class="pf-por">${pixelSvg(portraitArt(f), portraitPalette(f), '#2a1a10')}</span><span class="pf-nb"><span class="pf-name">${f.name}</span></span></button>`).join('')
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
  clearTimeout(pfTipT); clearTimeout(pfIntroT);
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
  const fig = pfShown && PHOTO.on && PF_FIGS.find(([f]) => f.id === PHOTO.id);
  if (!fig) return;
  const actions = photoHelpActions(fig);
  const move = tr(PF_WORDS[fig[0].id][0]);
  const html = COARSE.matches ? `<strong>${move}</strong><p>${tr('ui.photo.touch.left')}<br>${tr('ui.photo.touch.right')}</p><small>${tr('ui.photo.touch.buttons', { actions: fig[1].map(([, label]) => label).join(', ') })}<br>${tr('ui.photo.touch.helpButton')}</small>`
      : `<strong>${move}</strong><span class="sr-only">${fig[0].fullName}</span><div class="pf-help-grid">${actions.map(([key, label]) => `<span class="pf-help-action"><kbd>${key}</kbd><span${key === 'Esc' ? ' data-photo-escape' : ''}>${label}</span></span>`).join('')}</div><small>${tr('ui.photo.tabHint')}<br>${tr(manual ? 'ui.photo.hideHelp' : 'ui.photo.showControls')}</small>`;
  presentPhotoTip('help', html, manual ? 0 : PF_TIP_MS);
  pfTipManual = manual;
}

const pfAutoShown = new Set(); // session fallback when browser storage is blocked
const photoHelpSeenKey = family => `photo-help-seen-${family}`; // Mulassa and Drac share the figure controls introduction
let pfShown = false, pfTipFor = null, pfTipT = 0, pfIntroT = 0, pfTipManual = false;
let radioHint = () => {}; // free-music's once-only «Ara sona», told when the entry tip is over
export const setRadioHint = f => (radioHint = f);
export const photoHelpAvailable = () => pfShown;
export function syncAvatars() {
  const active = PHOTO.on ? PHOTO.id : '';
  for (const b of pfButtons) {
    const on = b.dataset.id === active;
    b.setAttribute('aria-pressed', String(on));
    b.title = on ? pfHelp.textContent : b.querySelector('.pf-name').textContent;
  }
  const stickFig = PF_FIGS.find(([f]) => f.id === active);
  showStick(pfShown && PHOTO.on && COARSE.matches, stickFig?.[1], active);
  if (active !== pfTipFor) {
    pfTipFor = active;
    const fig = PF_FIGS.find(([f]) => f.id === active);
    if (!fig || !pfShown) { clearPhotoTip(); return; } // (leaving: controls.js gives the canvas its plaça name back)
    pfHelp.textContent = photoHelpDescription(fig);
    hud.setAttribute('aria-label', tr('ui.photo.hudMove'));
    for (const b of pfButtons) {
      b.setAttribute('aria-describedby', b.dataset.id === active ? 'photo-help' : '');
      if (b.dataset.id === active) b.title = pfHelp.textContent;
    }
    const family = COARSE.matches ? 'touch' : 'figure';
    if (!pfAutoShown.has(family) && store.get(photoHelpSeenKey(family)) !== '1') {
      pfAutoShown.add(family);
      store.set(photoHelpSeenKey(family), '1');
      showPhotoHelp(false);
      pfIntroT = setTimeout(radioHint, PF_TIP_MS + 600);
    } else {
      presentPhotoTip('notice', `<strong>${tr(PF_WORDS[active][1])}</strong>`, 1800);
      pfIntroT = setTimeout(radioHint, 1800 + 600);
    }
  }
}
// Entry is derived anew from the selector, never from the previous photo actor.
export function showAvatars(on, id) {
  pfShown = on;
  const known = PF_FIGS.some(([f]) => f.id === id); // it always drives (no «Mira la plaça»), the Mulassa when the selection can't
  setPhotoControl(on, known ? id : MULASSA.id); // one beast on show at a time; Tab or the bar swaps it
  avatarsEl.hidden = !on || COARSE.matches;
  hud.tabIndex = -1; // focusable by code or click for the world's keys, never a Tab stop: a full-viewport ring said nothing
  hud.setAttribute('aria-describedby', on ? 'photo-help' : '');
  pfTipFor = null;
  syncAvatars();
}
// Choosing the current actor is idempotent.
export function takeFigure(id) {
  if (avatarsEl.hidden) return;
  if (!PHOTO.on || PHOTO.id !== id) setPhotoControl(true, id);
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
  if (escape) escape.textContent = tr(lookLocked() ? 'ui.photo.act.unlock' : 'ui.photo.act.exit');
  const fig = pfShown && PHOTO.on && PF_FIGS.find(([f]) => f.id === PHOTO.id);
  if (fig) pfHelp.textContent = photoHelpDescription(fig);
});
hud.addEventListener('blur', () => { if (pfShown) clearPhotoKeys(); });
addEventListener('blur', () => { if (pfShown) clearPhotoTip(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && pfShown) clearPhotoTip(); });
