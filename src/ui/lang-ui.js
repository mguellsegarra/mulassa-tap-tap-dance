// The language picker (a native dropdown in ⚙ Configuració; no button in the selector's corner row), the one-time suggestion tip and the safe reload (docs/i18n-strategy.md §3).
// Built from JS so index.html stays untouched; the rules are pure and live in lang-rules.js. Switching = save the choice, then reload with `?lang=`.
import { LANGS, lang, localeMeta } from '../i18n/locale.js';
import { tr } from '../i18n/messages.js';
import { LANG_KEY, SUGGESTED_KEY, SUGGEST, reloadUrl, suggestion, reloadWaits } from './lang-rules.js';

const LANG_GLOBE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>';
const LANG_CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const LANG_CSS = `#lang-tip{position:fixed;z-index:5;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);box-sizing:border-box;width:min(360px,calc(100vw - 24px));display:flex;flex-direction:column;gap:10px;padding:12px 14px 12px 12px;border-left:3px solid #f5c518;border-radius:4px;background:#2a1a10f2;color:#fff3d6;text-align:left}
#lang-tip p{margin:0}#lang-tip .row{display:flex;gap:8px;flex-wrap:wrap}#lang-tip .btn{flex:1 1 auto}
.lang-pick{position:relative}.lang-pick select{appearance:none;-webkit-appearance:none;padding:8px 46px;text-align:center;text-align-last:center;cursor:pointer}.lang-pick select:focus-visible{outline:var(--focus);outline-offset:var(--focus-off)}.lang-pick svg{position:absolute;z-index:1;top:50%;width:22px;height:22px;margin-top:-11px;fill:none;stroke:#fff3d6;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}.lang-pick svg:first-of-type{left:16px}.lang-pick svg:last-of-type{right:16px}`;
const NOTICE_CSS = '#lang-notice{position:fixed;z-index:5;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);box-sizing:border-box;width:min(360px,calc(100vw - 24px));padding:12px 14px 12px 12px;border-left:3px solid #f5c518;border-radius:4px;background:#2a1a10f2;color:#fff3d6;text-align:left;pointer-events:none}';
const mk = (tag, props = {}, html = '') => Object.assign(document.createElement(tag), props, html && { innerHTML: html });

// The chosen language failed to load and the game stayed in Catalan: one flat note, once per visit, on the first splash or idle selector.
export function langNotice({ state, doc = document, notice, ms = 6000 }) {
  if (!notice) return;
  const show = () => {
    const el = doc.createElement('div');
    Object.assign(el, { id: 'lang-notice', lang: 'ca', textContent: notice }); el.setAttribute('role', 'status');
    const css = doc.createElement('style'); css.textContent = NOTICE_CSS;
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
    store.set(LANG_KEY, code); // blocked storage is fine: the URL carries the choice for this visit
    pending = reloadUrl(location.href, code);
    clearInterval(timer); timer = setInterval(flush, 500); flush();
  }

  // --- ⚙ Configuració: a native <select> dressed as a .btn (iOS opens its own wheel); endonyms, `lang`/`dir` on each option
  const pick = mk('div', { className: 'lang-pick', id: 'settings-lang' }, `${LANG_GLOBE}${LANG_CHEVRON}`);
  const select = mk('select', { id: 'settings-lang-select', className: 'btn btn-secondary', lang: current });
  select.setAttribute('aria-label', tr('ui.lang.title'));
  for (const code of released) {
    const m = localeMeta(code);
    select.appendChild(mk('option', { value: code, lang: code, dir: m.dir, textContent: m.endonym, selected: code === current }));
  }
  select.addEventListener('change', () => switchTo(select.value));
  pick.appendChild(select);
  doc.getElementById('settings-practice')?.after(pick);

  // --- one suggestion on the splash: never an automatic switch
  const code = suggestion({ languages: navigator.languages, saved: store.get(LANG_KEY), url: new URLSearchParams(location.search).get('lang'), seen: store.get(SUGGESTED_KEY), released });
  if (code && state() === 'splash') {
    const words = SUGGEST[code], tip = mk('div', { id: 'lang-tip', lang: code, role: 'status' });
    const done = () => { store.set(SUGGESTED_KEY, '1'); clearInterval(gone); tip.remove(); };
    const yes = mk('button', { type: 'button', className: 'btn btn-primary', textContent: words.yes }), no = mk('button', { type: 'button', className: 'btn btn-secondary', textContent: words.no });
    yes.addEventListener('click', () => { done(); switchTo(code); }); no.addEventListener('click', done);
    const actions = mk('div', { className: 'row' });
    actions.append(yes, no); tip.append(mk('p', { textContent: words.text }), actions); doc.body.appendChild(tip);
    const gone = setInterval(() => { if (state() !== 'splash') done(); }, 500); // the splash ended unanswered: it was shown once, that is enough
  }
  return {};
}
