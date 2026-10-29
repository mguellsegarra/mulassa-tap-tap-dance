// The SEO/agent files: tools/deploy/seo-pages.mjs writes /projecte/ (HTML + Markdown) and /index.md; public/ holds robots, sitemap, llms.txt.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, access, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeSeoPages, loadContent, sitemapXml, llmsTxt } from '../../tools/deploy/seo-pages.mjs';

const dist = await mkdtemp(join(tmpdir(), 'mulassa-seo-'));
const pub = name => readFile(new URL(`../../public/${name}`, import.meta.url), 'utf8');
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
    await access(new URL(`../../public${url}`, import.meta.url));
  }
  assert(page.includes('id="autoria-i-credits"') && /href="\/projecte\/#autoria-i-credits"[^>]*>Crèdits</.test(await readFile(new URL('../../index.html', import.meta.url), 'utf8')), 'Configuració\'s «Crèdits» link lands on the credits section');
  const home = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
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
    else await access(new URL(`../../public${path}`, import.meta.url));
  }
  // The generated sitemap/llms.txt equal the Catalan base while only `ca` exists
  assert.equal(sitemapXml(['ca']), sitemap);
  assert.equal(llmsTxt(llms, { ca: {} }), llms);
  assert((page.match(/hreflang="[^"]+"/g) ?? []).length === (await readdir(new URL('../../tools/deploy/seo-content/', import.meta.url))).filter(f => f.endsWith('.json')).length + 1, 'the Catalan page lists every edition and x-default');

  // Multi-language: a fixture (never a persistent file) copied from ca with changed text
  const ca = (await loadContent()).ca;
  const fx = structuredClone(ca);
  fx.lang = 'xx'; fx.ogLocale = 'xx_XX'; fx.projecte.title = 'Titol xx'; fx.projecte.lead = 'Lead xx'; fx.ui.play = 'Play xx';
  const multi = await mkdtemp(join(tmpdir(), 'mulassa-seo-xx-'));
  try {
    await writeSeoPages(multi, { ca, xx: fx });
    const pages = { ca: 'projecte/', xx: 'xx/projecte/' };
    const hrefs = { ca: 'https://mulassa.cat/projecte/', xx: 'https://mulassa.cat/xx/projecte/' };
    const shape = c => JSON.stringify({ s: c.projecte.sections.map(([, ps]) => ps.length), c: c.projecte.captures.length, v: c.projecte.videos.length, k: Object.keys(c.ui) });
    assert.equal(shape(fx), shape(ca), 'same structure in every language');
    for (const [l, dir] of Object.entries(pages)) {
      const h = await readFile(join(multi, dir, 'index.html'), 'utf8');
      await access(join(multi, dir, 'index.md'));
      assert(h.includes(`<link rel="canonical" href="${hrefs[l]}">`), `${l} canonical`);
      for (const [m, url] of Object.entries(hrefs)) assert(h.includes(`<link rel="alternate" hreflang="${m}" href="${url}">`), `${l} -> ${m} hreflang`);
      assert(h.includes(`hreflang="x-default" href="${hrefs.ca}"`), `${l} x-default is Catalan`);
      assert(h.includes(`<html lang="${l === 'ca' ? 'ca' : 'xx'}" translate="no">`) && h.includes(`"inLanguage":"${l === 'ca' ? 'ca' : 'xx'}"`), `${l} lang`);
      assert(h.includes(`href="/projecte/index.md"`) === (l === 'ca'), `${l} md twin is its own`);
    }
    const xx = await readFile(join(multi, 'xx/projecte/index.html'), 'utf8');
    assert(xx.includes('href="/">Play xx</a>'), 'Play links to / (the saved language decides)');
    assert(!xx.includes('?lang='), 'no ?lang= link on public pages');
    const sm = await readFile(join(multi, 'sitemap.xml'), 'utf8');
    for (const url of ['https://mulassa.cat/', ...Object.values(hrefs)]) assert(sm.includes(`<loc>${url}</loc>`), url);
    assert((await readFile(join(multi, 'llms.txt'), 'utf8')).includes('(https://mulassa.cat/xx/projecte/index.md)'));
    await assert.rejects(access(join(multi, 'yy/projecte/index.html')), 'no page outside the language list');
  } finally {
    await rm(multi, { recursive: true, force: true });
  }
  console.log('seo pages ok');
} finally {
  await rm(dist, { recursive: true, force: true });
}
