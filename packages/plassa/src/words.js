// A game's own words, apart from the main game's catalogues so neither page loads the other's. The language is the main
// game's saved choice (locale.js). ca: the game's Catalan catalogue; chunks: its import.meta.glob of the others.
import { initLang, lang, setLang, applyDocumentLang, DEFAULT_LANG } from './locale.js';

export async function gameWords(ca, chunks) {
  initLang();
  const load = chunks[`./locales/${lang()}.json`];
  const words = load ? await load().then(m => m.default, () => (setLang(DEFAULT_LANG), ca)) : ca; // a failed chunk falls back to Catalan
  applyDocumentLang(); // the language shown, so a fallback is not read out as the one asked for
  const t = (key, params = {}) => (words[key] ?? ca[key]).replace(/\{(\w+)\}/g, (_, name) => params[name]);
  // the page keeps its Catalan inline; data-t is the text (ours, so it may hold <b>), data-t-aria the label
  function applyWords() {
    document.title = t('title');
    for (const el of document.querySelectorAll('[data-t]')) el.innerHTML = t(el.dataset.t);
    for (const el of document.querySelectorAll('[data-t-aria]')) el.setAttribute('aria-label', t(el.dataset.tAria));
  }
  return { t, applyWords };
}
