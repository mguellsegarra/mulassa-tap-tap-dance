// Owner of the effective language, chosen once at startup (load-locale.js ensureLocale): ?lang= over the saved choice over Catalan.
// The browser's own languages never pick it. The saved key is written by ui/lang-ui.js only; this module just reads it.
import i18nMeta from './meta.json' with { type: 'json' };
import { store } from '../platform/storage.js';
import { DEV_HOST } from '../core/flags.js';

export const DEFAULT_LANG = 'ca';
export const PSEUDO = 'pseudo'; // ?lang=pseudo: the Catalan catalogue bracketed, longer and accented (dev hosts only)
export const SAVED_LANG_KEY = 'ui-language-v1';
export const ALL_LANGS = Object.keys(i18nMeta);
export const LANGS = ALL_LANGS.filter(code => i18nMeta[code].released); // only editions with a catalogue

// Explicit aliases only (lower case, `-`): a regional tag of a language we ship; nothing is inferred (no uk -> ru).
const ALIASES = {
  'ca-es': 'ca', 'es-es': 'es', 'es-mx': 'es', 'es-ar': 'es', 'es-419': 'es', 'en-gb': 'en', 'en-us': 'en', 'en-au': 'en',
  'fr-fr': 'fr', 'it-it': 'it', 'ro-ro': 'ro', pt: 'pt', 'pt-pt': 'pt', 'pt-br': 'pt', 'eu-es': 'eu', 'gl-es': 'gl', 'oc-es': 'oc',
  'de-de': 'de', zh: 'zh-Hans', 'zh-cn': 'zh-Hans', 'zh-hans-cn': 'zh-Hans', 'ja-jp': 'ja', 'uk-ua': 'uk', 'ru-ru': 'ru', 'ko-kr': 'ko',
};
const CANON = new Map([...ALL_LANGS.map(code => [code.toLowerCase(), code]), ...Object.entries(ALIASES)]);

// The tag -> language table index.html's inline script embeds (tools/deploy/gen-boot.mjs), limited to the released editions.
export const bootAliases = () => Object.fromEntries([...CANON].filter(([, code]) => LANGS.includes(code)));

// A tag to an allowed language, or null. Arbitrary strings never reach an import: the result is always one of `allowed`.
export function resolveTag(tag, allowed = LANGS) {
  if (typeof tag !== 'string' || tag.length > 16) return null;
  const code = CANON.get(tag.trim().toLowerCase().replace(/_/g, '-'));
  return code && allowed.includes(code) ? code : null;
}

export function pickLang({ url, saved, allowed = LANGS, dev = false } = {}) {
  if (dev && typeof url === 'string' && url.trim().toLowerCase() === PSEUDO) return PSEUDO;
  return resolveTag(url, allowed) ?? resolveTag(saved, allowed) ?? DEFAULT_LANG;
}

let effectiveLang = DEFAULT_LANG;
export const lang = () => effectiveLang;
export const setLang = code => { effectiveLang = code; };
export const localeMeta = (code = lang()) => i18nMeta[code] ?? i18nMeta[DEFAULT_LANG]; // pseudo wears Catalan's rules

// Reads the page's URL and the saved choice (never writes them) and fixes the effective language.
export function initLang({ search = globalThis.location?.search ?? '', hostname = globalThis.location?.hostname ?? '', read = k => store.get(k) } = {}) {
  const url = new URLSearchParams(search).get('lang');
  effectiveLang = pickLang({ url, saved: read(SAVED_LANG_KEY), dev: DEV_HOST.test(hostname) });
  return effectiveLang;
}

export const htmlLang = (code = lang()) => (code === PSEUDO ? 'ca-x-pseudo' : code);
export function applyDocumentLang(doc = globalThis.document) {
  if (!doc?.documentElement) return;
  doc.documentElement.lang = htmlLang();
  doc.documentElement.dir = localeMeta().dir;
}
