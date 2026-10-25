// Per-language number/date formatting through meta.json (real Intl), and the registry shape.
import assert from 'node:assert/strict';
import meta from '../../src/i18n/meta.json' with { type: 'json' };
import { fmtNum, fmtDate, fmtDateRange } from '../../src/i18n/format.js';
import { ALL_LANGS, LANGS, setLang } from '../../src/i18n/locale.js';
import { loadLocale } from '../../src/i18n/load-locale.js';
import { setCatalog } from '../../src/i18n/messages.js';
import { ACTIVE_CATALOG, CA_PARTS, mergeCatalog } from '../../src/i18n/catalog.js';

assert.equal(fmtNum(12340), '12.340', 'ca: thousands dots, as before');
assert.equal(fmtNum(1234), '1.234');
assert.equal(fmtDate(new Date(Date.UTC(2026, 9, 21, 12)), { dateStyle: 'long', timeZone: 'Europe/Madrid' }), new Intl.DateTimeFormat('ca', { dateStyle: 'long', timeZone: 'Europe/Madrid' }).format(new Date(Date.UTC(2026, 9, 21, 12))));

for (const code of ALL_LANGS) {
  const m = meta[code];
  assert.equal(m.dir, 'ltr', code);
  assert.equal(typeof m.endonym, 'string', code);
  assert.equal(typeof m.released, 'boolean', code);
  assert.equal(Intl.NumberFormat.supportedLocalesOf(m.numberLocale).length, 1, `${code} number locale`);
  assert.equal(Intl.DateTimeFormat.supportedLocalesOf(m.dates.locale).length, 1, `${code} date locale`);
  const cats = new Set(); const r = new Intl.PluralRules(m.intl);
  for (let i = 0; i <= 1000; i++) cats.add(r.select(i));
  assert.deepEqual([...cats].sort(), [...m.plurals].sort(), `${code} plural categories are Intl's`);
}
assert.deepEqual(LANGS, ALL_LANGS.filter(c => meta[c].released));
// each language's own convention (no forced grouping): es/it leave 4 digits alone, en uses commas, fr a (narrow) space
assert.equal((12340).toLocaleString(meta.en.numberLocale), '12,340');
assert.equal((1234).toLocaleString(meta.es.numberLocale), '1234');
assert.equal((12340).toLocaleString(meta.es.numberLocale), '12.340');
assert.match((12340).toLocaleString(meta.fr.numberLocale), /^12\s340$/);
assert.equal((12340).toLocaleString(meta['zh-Hans'].numberLocale), '12,340');
await loadLocale('oc');
setLang('oc'); setCatalog(mergeCatalog(ACTIVE_CATALOG.parts), 'fr');
const dateOpts = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' };
const december = Date.UTC(2026, 11, 24, 12);
assert.equal(fmtDate(december, dateOpts), '24 de deseme de 2026');
assert.equal(fmtDate(Date.UTC(2026, 9, 24, 23, 30), dateOpts), '25 d’octobre de 2026', 'the calendar day follows the requested timezone');
assert.equal(fmtDateRange(Date.UTC(2026, 8, 27, 12), Date.UTC(2026, 9, 9, 12), dateOpts).replace(/[\u2009\u202f]/g, ' '), '27 de seteme – 9 d’octobre de 2026');
assert.equal(fmtDate(december, { ...dateOpts, month: 'short' }), '24 de deseme de 2026', 'Aranese keeps full month names rather than foreign abbreviations');
assert.equal(fmtDate(december, { ...dateOpts, month: '2-digit' }), '24/12/2026');
setLang('ca'); setCatalog(mergeCatalog(CA_PARTS));
console.log('format ok');
