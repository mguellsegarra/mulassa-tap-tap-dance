// Pure rules of the language picker (no DOM, no storage): the reload URL, who gets the suggestion, when a reload waits.
export const LANG_KEY = 'ui-language-v1', SUGGESTED_KEY = 'ui-language-suggested';

// Replaces only `lang`; `repte` and every other parameter (and the hash) stay as they are. Catalan is the default, so it clears the parameter.
// A saved choice (`persisted`) is the whole story: no `lang` in the address (a stale one would beat it). Only blocked storage keeps `?lang=` for this visit.
export function reloadUrl(href, code, { persisted = true, base = 'ca' } = {}) {
  const url = new URL(href);
  if (code === base || persisted) url.searchParams.delete('lang'); else url.searchParams.set('lang', code);
  return url.href;
}

// The suggestion tip's words live here, not in a catalogue: the suggested language is not loaded yet (and `ca` is, so these would be dead weight there).
// One entry per released language other than `ca`; a language without one is never suggested.
export const SUGGEST = {
  es: { text: '¿Prefieres jugar en castellano?', yes: 'Sí', no: 'Continuar en català' }, // i18n-ok
  en: { text: 'Would you like to play in English?', yes: 'Yes', no: 'Continue in Catalan' }, // i18n-ok
};

// First visit only: no saved choice, no ?lang=, not seen before; the browser's first language is a released one other than `ca` and `ca` is nowhere in its list.
export function suggestion({ languages = [], saved = null, url = null, seen = null, released, base = 'ca' }) {
  if (saved || url || seen || released.length < 2) return null;
  const tags = languages.map(l => String(l).toLowerCase().split('-')[0]);
  if (!tags.length || tags.includes(base)) return null;
  const code = released.find(c => c === tags[0]);
  return code && code !== base && SUGGEST[code] ? code : null;
}

// A reload throws the run (or a half-written feedback message) away: only from the menus, with the feedback sheet closed.
export const reloadWaits = ({ state, feedbackOpen }) => feedbackOpen || !['splash', 'title', 'select'].includes(state);
