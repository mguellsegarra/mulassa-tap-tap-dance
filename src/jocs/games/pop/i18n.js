// This game's own words, apart from the main game's catalogues so neither page loads the other's. The language is the main game's saved choice.
import { initLang, lang, applyDocumentLang } from '../../../i18n/locale.js';
import ca from './locales/ca.json' with { type: 'json' };

initLang();
applyDocumentLang();
const chunks = import.meta.glob(['./locales/*.json', '!./locales/ca.json']);
const load = chunks[`./locales/${lang()}.json`];
const words = load ? await load().then(m => m.default, () => ca) : ca; // a failed chunk falls back to Catalan

export const t = (key, params = {}) => (words[key] ?? ca[key]).replace(/\{(\w+)\}/g, (_, name) => params[name]);

// index.html keeps its Catalan inline; data-t is the text (ours, so it may hold <b>), data-t-aria the label.
export function applyWords() {
  document.title = t('title');
  for (const el of document.querySelectorAll('[data-t]')) el.innerHTML = t(el.dataset.t);
  for (const el of document.querySelectorAll('[data-t-aria]')) el.setAttribute('aria-label', t(el.dataset.tAria));
}
