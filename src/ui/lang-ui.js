// The language picker (a native dropdown in ⚙ Configuració; no button in the selector's corner row), the one-time suggestion tip and the safe reload (docs/i18n/strategy.md §3).
// Built from JS so index.html stays untouched; the rules are pure and live in lang-rules.js. Switching = save the choice, then reload with `?lang=`.
import { LANGS, lang, localeMeta } from '../i18n/locale.js';
import { tr } from '../i18n/messages.js';
import { LANG_KEY, SUGGESTED_KEY, SUGGEST, reloadUrl, suggestion, reloadWaits } from './lang-rules.js';

const LANG_GLOBE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>';
const LANG_CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const LANG_CSS = `#lang-tip,#lang-notice{position:fixed;z-index:5;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);box-sizing:border-box;width:min(360px,calc(100vw - 24px));padding:16px;border:2px solid #f5c518;border-radius:18px;background:#2a1a10;color:#fff3d6;font:700 18px/1.25 'Baloo 2',system-ui,sans-serif;text-align:center;box-shadow:0 16px 60px #0008}
#lang-tip{display:flex;flex-direction:column;gap:12px}#lang-notice{pointer-events:none}
#lang-tip p{margin:0}#lang-tip .row{display:flex;flex-direction:column;gap:8px}
.lang-pick{position:relative;color:#fff3d6;cursor:pointer}.lang-pick select{position:absolute;inset:0;z-index:1;width:100%;height:100%;margin:0;opacity:0;appearance:none;-webkit-appearance:none;font-size:16px;cursor:pointer}.lang-pick.kb{outline:var(--focus);outline-offset:var(--focus-off)}
.lang-pick .l,.lang-pick .v,.lang-pick .chev{display:flex;align-items:center;gap:8px;min-width:0;white-space:nowrap}.lang-pick .v{gap:4px;font-size:15px;font-weight:700;color:#e8d8b8;text-align:right}.lang-pick .endo{white-space:normal;overflow-wrap:anywhere}
.lang-pick svg{flex:none;width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.lang-pick .v svg{width:22px;height:22px;color:#fff3d6}
@media (max-width:359px){.lang-pick{gap:8px}.lang-pick .l{gap:6px}}`;
const mk = (tag, props = {}, html = '') => Object.assign(document.createElement(tag), props, html && { innerHTML: html });

// The chosen language failed to load and the game stayed in Catalan: one flat note, once per visit, on the first splash or idle selector.
export function langNotice({ state, doc = document, notice, ms = 6000 }) {
  if (!notice) return;
  const show = () => {
    const el = doc.createElement('div');
    Object.assign(el, { id: 'lang-notice', lang: 'ca', textContent: notice }); el.setAttribute('role', 'status');
    const css = doc.createElement('style'); css.textContent = LANG_CSS;
    doc.body.append(css, el);
    setTimeout(() => { el.remove(); css.remove(); }, ms).unref?.();
  };
  const idle = () => state() === 'splash' || state() === 'select';
  if (idle()) return show();
  const timer = setInterval(() => { if (idle()) { clearInterval(timer); show(); } }, 500); timer.unref?.();
}

export function setupLang({ store, state, location = globalThis.location, doc = document }) {
  // dynamic: load-locale.js is not part of the page-wide script the tests build; a failed import only loses this optional note
  import('../i18n/load-locale.js').then(m => langNotice({ state, notice: m.localeState().notice })).catch(() => {});
  const released = LANGS, current = lang();
  if (released.length < 2) return { hidden: true }; // a single language: nothing to choose
  doc.body.appendChild(mk('style', { textContent: LANG_CSS }));

  // --- safe reload: a run or an open feedback sheet makes it wait; it goes through when the menus are back
  let pending = null, timer = 0;
  const feedbackOpen = () => Boolean(doc.getElementById('feedback-menu')?.open);
  function flush() {
    if (!pending || reloadWaits({ state: state(), feedbackOpen: feedbackOpen() })) return;
    clearInterval(timer); const to = pending; pending = null; location.assign(to);
  }
  function switchTo(code) {
    if (!released.includes(code)) return;
    if (code === lang()) { if (pending) { pending = null; clearInterval(timer); store.set(LANG_KEY, code); } return; } // picking the current one cancels a waiting change
    store.set(LANG_KEY, code); // blocked storage is fine: then (and only then) the URL carries the choice for this visit
    pending = reloadUrl(location.href, code, { persisted: store.get(LANG_KEY) === code });
    clearInterval(timer); timer = setInterval(flush, 500); flush();
  }

  // --- ⚙ Configuració: a flat row (.switch-row) with the native <select> transparent over all of it (iOS opens its own wheel); endonyms, `lang`/`dir` on each option
  const pick = mk('div', { className: 'switch-row lang-pick', id: 'settings-lang' });
  const endo = mk('span', { className: 'endo' });
  const left = mk('span', { className: 'l' }, LANG_GLOBE), right = mk('span', { className: 'v' });
  left.appendChild(mk('span', { textContent: tr('ui.lang.title') })); right.appendChild(endo); right.appendChild(mk('span', { className: 'chev' }, LANG_CHEVRON));
  const select = mk('select', { id: 'settings-lang-select', lang: current });
  select.setAttribute('aria-label', tr('ui.lang.title'));
  for (const code of released) {
    const m = localeMeta(code);
    select.appendChild(mk('option', { value: code, lang: code, dir: m.dir, textContent: m.endonym, selected: code === current }));
  }
  const show = code => { endo.textContent = localeMeta(code).endonym; endo.lang = code; };
  show(current);
  select.addEventListener('change', () => { show(select.value); switchTo(select.value); });
  // Chromium also matches :focus-visible on a mouse-opened <select>: the ring is a class, set only when focus did not come from a pointer
  let pointer = false;
  select.addEventListener('pointerdown', () => { pointer = true; pick.classList.remove('kb'); });
  select.addEventListener('focus', () => pick.classList.toggle('kb', !pointer));
  select.addEventListener('keydown', () => pick.classList.add('kb'));
  select.addEventListener('blur', () => { pointer = false; pick.classList.remove('kb'); });
  pick.appendChild(left); pick.appendChild(right); pick.appendChild(select);
  doc.getElementById('settings-feedback')?.after(pick); // after the sheet's actions (sync, Bústia), before the switches

  // --- one suggestion on the splash: never an automatic switch
  const code = suggestion({ languages: navigator.languages, saved: store.get(LANG_KEY), url: new URLSearchParams(location.search).get('lang'), seen: store.get(SUGGESTED_KEY), released });
  if (code && state() === 'splash') {
    const words = SUGGEST[code], tip = mk('div', { id: 'lang-tip', lang: code, role: 'status' });
    const done = () => { store.set(SUGGESTED_KEY, '1'); cancelAnimationFrame(gone); tip.remove(); };
    const yes = mk('button', { type: 'button', className: 'btn btn-primary', textContent: words.yes }), no = mk('button', { type: 'button', className: 'btn btn-secondary', textContent: words.no });
    yes.addEventListener('click', () => { done(); switchTo(code); }); no.addEventListener('click', done);
    const actions = mk('div', { className: 'row' });
    actions.append(yes, no); tip.append(mk('p', { textContent: words.text }), actions); doc.body.appendChild(tip);
    // The splash ended unanswered: it was shown once, that is enough. Gone by the next frame, or it sits over the selector's dock and takes the tap.
    let gone = requestAnimationFrame(function watch() { if (state() !== 'splash') done(); else gone = requestAnimationFrame(watch); });
  }
  return {};
}
