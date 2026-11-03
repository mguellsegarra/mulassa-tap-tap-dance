// Mulassa Alchemy's page loads its menu first (alchemy/index.html): the cover is there before any script, and every
// painting the menu shows is preloaded and exists. A renamed or moved picture would otherwise leave the cover waiting
// for a 404 until its timeout, and the menu half drawn.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync('alchemy/index.html', 'utf8'), css = readFileSync('src/jocs/games/alquimia/style.css', 'utf8');
const preloaded = [...html.matchAll(/<link rel="preload" href="([^"]+)" as="image"/g)].map(m => m[1]);
const menuArt = [...css.matchAll(/\.alq-menu \{[^}]*url\(([^)]+)\)/g)].map(m => m[1]);

test('the cover paints before the bundle', () => {
  assert(html.indexOf('id="loader"') > 0 && html.indexOf('id="loader"') < html.indexOf('<script'), 'the cover comes before the script');
  assert(/html, body \{[^}]*background: #1b1420/.test(html), 'the first paint is the night, not a black or white flash');
});

test("every menu painting is preloaded, and every preload exists", () => {
  assert.equal(menuArt.length, 2, 'portrait and landscape');
  for (const url of menuArt) assert(preloaded.includes(url), `${url} is preloaded`);
  for (const url of preloaded) assert(existsSync(`public${url}`), `${url} exists in public/`);
  for (const font of [...html.matchAll(/<link rel="preload" href="([^"]+)" as="font"/g)].map(m => m[1])) assert(existsSync(`public${font}`), `${font} exists`);
});
