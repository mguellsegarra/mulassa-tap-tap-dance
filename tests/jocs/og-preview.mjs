// The mini-games' pages show their own link preview (tools/social/og/build.py, docs/agents/seo.md): absolute production URLs
// (the beta deploy rewrites them by sed), a 1200×630 JPEG under 300 KB that ships (prepare-pages.mjs's list), og and twitter alike.
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const prepare = readFileSync(new URL('../../tools/deploy/prepare-pages.mjs', import.meta.url), 'utf8');
for (const [page, path] of [['jocs/index.html', 'jocs/'], ['pop/index.html', 'pop/']]) {
  const html = readFileSync(new URL(`../../${page}`, import.meta.url), 'utf8');
  const meta = (attr, key) => html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]+)"`))?.[1];
  const image = meta('property', 'og:image');
  assert.equal(meta('property', 'og:url'), `https://mulassa.cat/${path}`, `${page}: og:url`);
  assert.match(image ?? '', /^https:\/\/mulassa\.cat\/og-[a-z]+\.jpg$/, `${page}: og:image`);
  assert.equal(meta('name', 'twitter:image'), image, `${page}: twitter:image = og:image`);
  assert.equal(meta('name', 'twitter:card'), 'summary_large_image');
  for (const k of ['og:title', 'og:description', 'og:image:alt']) assert(meta('property', k), `${page}: ${k}`);
  const file = image.slice('https://mulassa.cat/'.length);
  assert(prepare.includes(`'${file}'`), `${file} is in the Pages list`);
  const jpg = readFileSync(new URL(`../../public/${file}`, import.meta.url));
  assert(jpg[0] === 0xff && jpg[1] === 0xd8 && statSync(new URL(`../../public/${file}`, import.meta.url)).size < 300 * 1024, `${file}: a JPEG under 300 KB`);
  let size = null;
  for (let i = 2; i < jpg.length - 8;) { // the frame header (SOF0-2) says its size
    const marker = jpg[i + 1], len = jpg.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc2) { size = [jpg.readUInt16BE(i + 7), jpg.readUInt16BE(i + 5)]; break; }
    i += 2 + len;
  }
  assert.deepEqual(size, [1200, 630], `${file}: 1200×630`);
  assert.equal(meta('property', 'og:image:width'), '1200');
  assert.equal(meta('property', 'og:image:height'), '630');
}
console.log('mini-games link previews: tags, files and sizes ok');
