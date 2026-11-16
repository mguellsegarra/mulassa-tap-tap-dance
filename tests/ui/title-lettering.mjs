// One MULASSA title across the family: the selector, Mulassa Games, Pop and the canvas splash draw the same lettering
// (Baloo, red on a cream outline, a darker cream extrusion, a thin dark line round it), so no page keeps an old one.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const RED = '#e8382f', CREAM = '#fff3d6', EXT = '#d8bf8f', INK = '#2a1a10';

for (const [page, n] of [['index.html', 2], ['jocs/index.html', 1], ['pop/index.html', 1]]) {
  const html = read(page);
  const titles = [...html.matchAll(/<g font-family="'Baloo 2'"[^>]*>(?:<text[^>]*>MULASSA<\/text>)+<\/g>/g)].map(m => m[0]);
  assert.equal(titles.length, n, `${page}: ${n} MULASSA title(s) in Baloo`);
  for (const t of titles) {
    const fills = [...t.matchAll(/fill="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(fills, [INK, INK, EXT, RED], `${page}: dark line, extrusion, then the red letters`);
    assert(t.includes(`stroke="${CREAM}"`), `${page}: cream outline`);
  }
  assert(!/<text[^>]*font-family="'Jersey 10'"[^>]*>MULASSA/.test(html), `${page}: no pixel MULASSA left`);
}

const title = read('src/hud/title.js');
assert(title.includes(`LOGO_RED = '${RED}'`) && title.includes(`LOGO_EXT = '${EXT}'`), 'the canvas splash uses the same colours');
// the sprite is sized by the ink, not the advance: with tight letters the last A reaches past it and was cut off
assert(/actualBoundingBoxRight/.test(title), 'the title sprite measures its ink');

console.log('MULASSA title lettering ok');
