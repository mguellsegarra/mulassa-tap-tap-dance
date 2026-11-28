// The app's catalogue (public/catalogue.json) must say what the web menu says: a game added to jocs/index.html without
// regenerating it would never show in the native launcher (docs/app/native-shell.md, contract 6).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { buildCatalogue } from '../../tools/app/catalogue.mjs';

const root = new URL('../../', import.meta.url).pathname;
const built = buildCatalogue();
assert.deepEqual(JSON.parse(readFileSync(`${root}public/catalogue.json`, 'utf8')), built, 'public/catalogue.json is stale: run node tools/app/catalogue.mjs');
for (const g of built.games) {
  assert.ok(g.soon || /^\/[\w/-]+\.html$/.test(g.path), `${g.id}: a playable game has a local .html entry path`);
  assert.ok(g.name.ca && g.name.en, `${g.id}: a name in Catalan and English`);
  assert.match(g.color, /^#[0-9a-f]{6}$/, `${g.id}: a colour for its cartridge`);
  // its pictures are in the bundle: a wrong path would show an empty window, or drop the two planes without a word
  assert.ok(g.layers === null || (g.layers.back && g.layers.front), `${g.id}: both planes or none`);
  for (const [what, path] of [['art', g.art], ['layers.back', g.layers?.back], ['layers.front', g.layers?.front]]) {
    if (path === undefined) continue;
    assert.ok(/^\/[\w/.-]+\.(jpg|png|webp)$/.test(path) && !path.includes('..'), `${g.id}: ${what} is a picture inside the bundle (${path})`);
    assert.ok(existsSync(`${root}public${path}`), `${g.id}: ${what} is missing from public (${path})`);
  }
}
assert.ok(built.games.some(g => !g.soon), 'at least one playable game');
console.log(`app catalogue: ${built.games.length} games, schema ${built.schema} ok`);
