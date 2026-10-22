// Allowlisted lazy catalogue loading and its state, kept out of tr(). `ca` is bundled (catalog.js); every other released
// language is a chunk. A language change reloads the page (ui/lang-ui.js), so the catalogue is fixed once per page by ensureLocale().
//
// Adding a language `xx`: set released in meta.json, create src/i18n/locales/xx/{hud,game,ui,services,html,boot,figures}.json
// and src/i18n/locales/xx/index.js (`import hud from './hud.json' with { type: 'json' }; … export const PARTS = [hud, game, ui,
// services, html, boot, figures];`), add `xx: () => import('./locales/xx/index.js')` to LOADERS, run `node tools/gen-boot.mjs`.
import { CA_PARTS, ACTIVE_CATALOG, mergeCatalog } from './catalog.js';
import { DEFAULT_LANG, PSEUDO, initLang, setLang, localeMeta, applyDocumentLang } from './locale.js';

const LOADERS = {
  es: () => import('./locales/es/index.js'),
  en: () => import('./locales/en/index.js'),
  fr: () => import('./locales/fr/index.js'),
  it: () => import('./locales/it/index.js'),
  ro: () => import('./locales/ro/index.js'),
  pt: () => import('./locales/pt/index.js'),
  eu: () => import('./locales/eu/index.js'),
  gl: () => import('./locales/gl/index.js'),
  oc: () => import('./locales/oc/index.js'),
  de: () => import('./locales/de/index.js'),
  'zh-Hans': () => import('./locales/zh-Hans/index.js'),
  ja: () => import('./locales/ja/index.js'),
  uk: () => import('./locales/uk/index.js'),
  ru: () => import('./locales/ru/index.js'),
  ko: () => import('./locales/ko/index.js'),
};
const state = { status: 'idle', lang: null, error: null, notice: null };
export const localeState = () => ({ ...state });

// A catalogue must hold every Catalan key; a broken chunk or a half-translated one falls back to Catalan instead of throwing in tr().
export function assertParity(parts) {
  const have = mergeCatalog(parts), missing = Object.keys(mergeCatalog(CA_PARTS)).filter(key => !(key in have));
  if (missing.length) throw new Error(`i18n: ${missing.length} keys missing, e.g. ${missing[0]}`);
}

async function fetchParts(code) {
  if (code === DEFAULT_LANG) return CA_PARTS;
  if (code === PSEUDO) return [(await import('./pseudo.js')).pseudoCatalog(mergeCatalog(CA_PARTS))];
  if (!Object.hasOwn(LOADERS, code)) throw new Error(`i18n: unknown language ${code}`);
  const { PARTS } = await LOADERS[code]();
  assertParity(PARTS);
  return PARTS;
}

export async function loadLocale(code) {
  Object.assign(state, { status: 'loading', lang: code, error: null, notice: null });
  try {
    ACTIVE_CATALOG.parts = await fetchParts(code);
    ACTIVE_CATALOG.intl = localeMeta(code).intl;
    state.status = 'ready';
  } catch (error) {
    Object.assign(state, { status: 'failed', error });
    throw error;
  }
}

let ready;
// Chooses the language (URL > saved > ca), loads it, stamps <html lang>. Never rejects: a failure leaves Catalan in place,
// the error in localeState() and `notice` (boot.locale.failed, Catalan) for the UI to show.
export function ensureLocale(env) {
  return ready ??= (async () => {
    const wanted = initLang(env);
    try { await loadLocale(wanted); } catch (error) {
      setLang(DEFAULT_LANG);
      ACTIVE_CATALOG.parts = CA_PARTS;
      ACTIVE_CATALOG.intl = localeMeta(DEFAULT_LANG).intl;
      Object.assign(state, { status: 'failed', lang: wanted, error, notice: CA_PARTS.find(part => 'boot.locale.failed' in part)['boot.locale.failed'] });
    }
    applyDocumentLang();
    return state.status === 'ready' ? wanted : DEFAULT_LANG;
  })();
}
