// Writes the boot strings of index.html (first loading line, joke list, failure card) from the `boot` catalogue, so the page
// that paints before the bundle and src/ui/loader.js share one source. `node tools/gen-boot.mjs` rewrites; tests/loader.mjs
// fails if index.html drifts. Slots: `/* i18n:boot:NAME */…/* i18n:boot:end */` in scripts (JSON value) and
// `<!-- i18n:boot:NAME -->…<!-- i18n:boot:end -->` in markup (escaped text). NAME is `jokes`, `label` (the first joke) or a `boot.` key,
// plus two tables for the inline language picker: `aliases` (tag -> released language) and `others` ({ code: { jokes, title, text, retry } }
// for every released language but `ca`, whose strings stay in the slots above as the no-JS fallback).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { JOKE_IDS } from '../src/i18n/boot-jokes.js';
import { LANGS, DEFAULT_LANG, bootAliases } from '../src/i18n/locale.js';

const root = new URL('../', import.meta.url);
export const INDEX = new URL('index.html', root);
const catalog = () => JSON.parse(readFileSync(new URL('src/i18n/locales/ca/boot.json', root), 'utf8'));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const bootOf = cat => ({ jokes: JOKE_IDS.map(id => cat[`boot.joke.${id}`]), title: cat['boot.fail.title'], text: cat['boot.fail.text'], retry: cat['boot.fail.retry'] });
// A released language without a boot.json yet simply has no entry: the page then starts in Catalan text under its <html lang>.
export const otherBoots = () => Object.fromEntries(LANGS.filter(code => code !== DEFAULT_LANG && existsSync(new URL(`src/i18n/locales/${code}/boot.json`, root)))
  .map(code => [code, bootOf(JSON.parse(readFileSync(new URL(`src/i18n/locales/${code}/boot.json`, root), 'utf8')))]));

export function renderBoot(html, cat = catalog(), others = otherBoots(), aliases = bootAliases()) {
  const jokes = JOKE_IDS.map(id => cat[`boot.joke.${id}`]);
  const value = name => {
    if (name === 'aliases') return aliases;
    if (name === 'others') return others;
    if (name === 'jokes') return jokes;
    if (name === 'label') return jokes[0];
    const v = cat[`boot.${name}`];
    if (typeof v !== 'string') throw new Error(`gen-boot: no boot.${name}`);
    return v;
  };
  return html
    .replace(/\/\* i18n:boot:([\w.]+) \*\/[\s\S]*?\/\* i18n:boot:end \*\//g, (_, name) => `/* i18n:boot:${name} */${JSON.stringify(value(name)).replace(/</g, '\\u003c')}/* i18n:boot:end */`)
    .replace(/<!-- i18n:boot:([\w.]+) -->[\s\S]*?<!-- i18n:boot:end -->/g, (_, name) => `<!-- i18n:boot:${name} -->${esc(value(name))}<!-- i18n:boot:end -->`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const html = readFileSync(INDEX, 'utf8'), next = renderBoot(html);
  if (next !== html) { writeFileSync(INDEX, next); console.log('index.html boot block updated'); } else console.log('index.html boot block already current');
}
