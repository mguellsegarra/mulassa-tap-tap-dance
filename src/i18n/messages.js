// Pure message lookup: no DOM, network or storage. tr('ns.area.key', { name }) fills {name}; a plural value is { one, other, ... } picked by params.count.
import { ACTIVE_CATALOG, mergeCatalog } from './catalog.js';
// preload.js: the chosen language is fetched before anything that imports tr() evaluates
import './preload.js';
export { mergeCatalog } from './catalog.js';

// `oc` has no Intl.PluralRules data (Chrome, Safari, Firefox, node 24): its CLDR rules are French's.
const pluralRules = intl => new Intl.PluralRules(Intl.PluralRules.supportedLocalesOf(intl).length ? intl : 'fr');

let catalog = mergeCatalog(ACTIVE_CATALOG.parts), rules = pluralRules(ACTIVE_CATALOG.intl);

export function setCatalog(next, intl = 'ca') { catalog = next; rules = pluralRules(intl); }

export function tr(key, params = {}) {
  let msg = catalog[key];
  if (msg === undefined) throw new Error(`i18n: missing key ${key}`);
  if (typeof msg === 'object') {
    if (typeof params.count !== 'number') throw new Error(`i18n: ${key} needs a numeric count`);
    msg = msg[rules.select(params.count)] ?? msg.other;
    if (msg === undefined) throw new Error(`i18n: ${key} has no "other" form`);
  }
  return msg.replace(/\{(\w+)\}/g, (_, name) => {
    if (!(name in params)) throw new Error(`i18n: ${key} is missing {${name}}`);
    return params[name];
  });
}
