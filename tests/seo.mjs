// The SEO/agent files: tools/seo-pages.mjs writes /projecte/ (HTML + Markdown) and /index.md; public/ holds robots, sitemap, llms.txt.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeSeoPages } from '../tools/seo-pages.mjs';

const dist = await mkdtemp(join(tmpdir(), 'mulassa-seo-'));
const pub = name => readFile(new URL(`../public/${name}`, import.meta.url), 'utf8');
try {
  await writeSeoPages(dist);
  const page = await readFile(join(dist, 'projecte/index.html'), 'utf8');
  const md = await readFile(join(dist, 'projecte/index.md'), 'utf8');
  assert.equal(page.match(/<h1>/g).length, 1, 'one H1');
  assert.match(page, /<link rel="canonical" href="https:\/\/mulassa\.cat\/projecte\/">/);
  assert.match(page, /rel="icon"[^>]*favicon-32\.png/, 'the page has the game\'s favicon');
  assert.match(page, /rel="alternate" type="text\/markdown" href="\/projecte\/index\.md"/);
  assert.match(page, /og:image:width" content="1200"[\s\S]*og:image:height" content="630"[\s\S]*og:image:alt" content="La Mulassa i el Drac de Valls/); // same card as the home page
  assert.match(page, /mailto:holi@mulassa\.cat/, 'the contact address is a link');
  const ld = JSON.parse(page.match(/<script type="application\/ld\+json">([^<]*)<\/script>/)[1]);
  assert.equal(ld['@type'], 'AboutPage');
  assert.equal(ld.video.length, 2);
  assert(!/\{cor\}|\{campanar\}|\{uaf\}/.test(page + md), 'every placeholder is rendered');
  assert(/Marc Güell Segarra/.test(page + md) && !/Marc Güell(?! Segarra)/.test(page + md), 'always both surnames');
  for (const file of ['index.md', 'projecte/index.md']) await access(join(dist, file));
  // everything the page points at is a file we ship (public/ or generated)
  for (const [, url] of page.matchAll(/(?:src|href|poster)="(\/[^"#]+)"/g)) {
    if (url === '/' || url === '/projecte/' || url.endsWith('/index.md') || url === '/index.md') continue;
    await access(new URL(`../public${url}`, import.meta.url));
  }
  assert(page.includes('id="autoria-i-credits"') && /href="\/projecte\/#autoria-i-credits"[^>]*>Crèdits</.test(await readFile(new URL('../index.html', import.meta.url), 'utf8')), 'Configuració\'s «Crèdits» link lands on the credits section');
  const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const title = home.match(/<title>([^<]*)<\/title>/)[1];
  const desc = home.match(/<meta name="description" content="([^"]*)"/)[1];
  assert(title.length >= 30 && title.length <= 70, `title ${title.length} chars`);
  assert(desc.length >= 120 && desc.length <= 160, `description ${desc.length} chars`);
  const graph = JSON.parse(home.match(/<script type="application\/ld\+json">([^<]*)<\/script>/)[1])['@graph'];
  assert.deepEqual(graph.map(n => n['@type']), ['WebSite', 'Person', 'VideoGame']);
  assert(graph[1].sameAs.length >= 3 && graph[1].contactPoint.email, 'the author node has profiles and a contact');
  const robots = await pub('robots.txt');
  assert.match(robots, /Sitemap: https:\/\/mulassa\.cat\/sitemap\.xml/);
  const sitemap = await pub('sitemap.xml');
  for (const loc of ['https://mulassa.cat/', 'https://mulassa.cat/projecte/']) assert(sitemap.includes(`<loc>${loc}</loc>`), loc);
  const llms = await pub('llms.txt');
  assert(llms.startsWith('# Mulassa Tap Tap Dance'));
  for (const [, url] of llms.matchAll(/\]\((https:\/\/mulassa\.cat\/[^)]+)\)/g)) {
    const path = new URL(url).pathname;
    if (path.endsWith('.md')) await access(join(dist, path));
    else await access(new URL(`../public${path}`, import.meta.url));
  }
  console.log('seo pages ok');
} finally {
  await rm(dist, { recursive: true, force: true });
}
