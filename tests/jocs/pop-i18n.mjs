// Every released language has every word of Pica, with the same placeholders and the same bold.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LANGS } from '#plassa/locale.js';

const read = code => JSON.parse(readFileSync(new URL(`../../src/jocs/games/pop/locales/${code}.json`, import.meta.url), 'utf8'));
const marks = text => (text.match(/\{\w+\}|<\/?b>/g) ?? []).sort().join();
const ca = read('ca');
for (const code of LANGS) {
  const words = read(code);
  assert.deepEqual(Object.keys(words).sort(), Object.keys(ca).sort(), code);
  for (const key of Object.keys(ca)) assert.equal(marks(words[key]), marks(ca[key]), `${code} ${key}`);
}
const html = readFileSync(new URL('../../pop/index.html', import.meta.url), 'utf8');
for (const [, key] of html.matchAll(/data-t(?:-aria)?="([^"]+)"/g)) assert.ok(key in ca, key);
console.log(`pop-i18n: ok (${LANGS.length} languages)`);
