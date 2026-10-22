// Per-language number/date formatting through meta.json (real Intl), and the registry shape.
import assert from 'node:assert/strict';
import meta from '../src/i18n/meta.json' with { type: 'json' };
import { fmtNum, fmtDate } from '../src/i18n/format.js';
import { ALL_LANGS, LANGS } from '../src/i18n/locale.js';

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
console.log('format ok');
