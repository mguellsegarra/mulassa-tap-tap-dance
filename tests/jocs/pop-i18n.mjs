// Every released language has every word of Pica, with the same placeholders and the same bold.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LANGS } from '#plassa/locale.js';

const read = code => JSON.parse(readFileSync(new URL(`../../src/jocs/games/pop/locales/${code}.json`, import.meta.url), 'utf8'));
const marks = text => (text.match(/\{\w+\}|<\/?b>/g) ?? []).sort().join();
const forms = word => (typeof word === 'string' ? [word] : Object.values(word)); // a plural word: each form on its own
const ca = read('ca');
for (const code of LANGS) {
  const words = read(code);
  assert.deepEqual(Object.keys(words).sort(), Object.keys(ca).sort(), code);
  for (const key of Object.keys(ca)) for (const form of forms(words[key])) assert.equal(marks(form), marks(forms(ca[key])[0]), `${code} ${key}`);
}
const html = readFileSync(new URL('../../pop/index.html', import.meta.url), 'utf8');
for (const [, key] of html.matchAll(/data-t(?:-aria)?="([^"]+)"/g)) assert.ok(key in ca, key);
console.log(`pop-i18n: ok (${LANGS.length} languages)`);
