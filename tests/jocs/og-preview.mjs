// The mini-games' pages show their own link preview (tools/social/og/build.py, docs/agents/seo.md): absolute production URLs
// (the beta deploy rewrites them by sed), a 1200×630 JPEG under 300 KB that ships (prepare-pages.mjs's list), og and twitter alike.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const prepare = readFileSync(new URL('../../tools/deploy/prepare-pages.mjs', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../../public/sitemap.xml', import.meta.url), 'utf8');
// a shipped JPEG's size, from its frame header (SOF0-2)
function jpegSize(file) {
  assert(prepare.includes(`'${file}'`), `${file} is in the Pages list`);
  const jpg = readFileSync(new URL(`../../public/${file}`, import.meta.url));
  assert(jpg[0] === 0xff && jpg[1] === 0xd8 && jpg.length < 300 * 1024, `${file}: a JPEG under 300 KB`);
  for (let i = 2; i < jpg.length - 8;) {
    const marker = jpg[i + 1], len = jpg.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc2) return [jpg.readUInt16BE(i + 7), jpg.readUInt16BE(i + 5)];
    i += 2 + len;
  }
}
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
  assert.deepEqual(jpegSize(file), [1200, 630], `${file}: 1200×630`);
  // indexed (no noindex), its own canonical and sitemap line, and a square twin in its JSON-LD for Google's thumbnail
  assert(!/name="robots" content="[^"]*noindex/.test(html), `${page}: indexed`);
  assert(html.includes(`<link rel="canonical" href="https://mulassa.cat/${path}">`), `${page}: canonical`);
  assert(sitemap.includes(`<loc>https://mulassa.cat/${path}</loc>`), `${page}: in the sitemap`);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]*)<\/script>/)[1]);
  const square = file.replace('.jpg', '-1x1.jpg');
  assert.deepEqual(ld.image, [`https://mulassa.cat/${square}`, image], `${page}: JSON-LD image, square first`);
  assert.deepEqual(jpegSize(square), [1200, 1200], `${square}: 1200×1200`);
  assert.equal(meta('property', 'og:image:width'), '1200');
  assert.equal(meta('property', 'og:image:height'), '630');
}
const home = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const homeLd = JSON.parse(home.match(/<script type="application\/ld\+json">([^<]*)<\/script>/)[1])['@graph'].find(n => n['@type'] === 'VideoGame');
assert.deepEqual(homeLd.image, ['https://mulassa.cat/og-1x1.jpg', 'https://mulassa.cat/og.jpg'], 'the home: square first');
assert.deepEqual(jpegSize('og-1x1.jpg'), [1200, 1200]);
console.log('link previews: tags, files, sizes, square twins and indexing ok');
