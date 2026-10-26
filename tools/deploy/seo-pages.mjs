// One content, two renderings: /projecte/ (HTML) and /projecte/index.md + /index.md (Markdown for agents), written into dist/
// after the build. Edit the text in tools/deploy/seo-content/<lang>.json only; llms.txt, robots.txt and sitemap.xml are plain files in public/.
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const SITE = 'https://mulassa.cat';
// The game's tiled cover pattern (index.html #loader.page::before), so the pages share one background; still here, it drifts only in the game.
const PATTERN = (await readFile(new URL('../../index.html', import.meta.url), 'utf8')).match(/#loader\.page::before[^}]*?background: (url\("data:image\/svg\+xml,[^"]*"\) 0 0 \/ 180px 180px);/)[1];
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slug = h => h.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const html = s => esc(s).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

// One JSON per language in tools/deploy/seo-content/ (schema: README.md); ca first, the rest alphabetical.
export async function loadContent() {
  const dir = new URL('./seo-content/', import.meta.url);
  const codes = (await readdir(dir)).filter(f => /^[a-z]{2,3}(?:-[A-Za-z]{2,4})?\.json$/.test(f)).map(f => f.slice(0, -5)).sort((a, b) => (b === 'ca') - (a === 'ca') || a.localeCompare(b));
  return Object.fromEntries(await Promise.all(codes.map(async c => [c, JSON.parse(await readFile(new URL(`${c}.json`, dir), 'utf8'))])));
}
const base = code => (code === 'ca' ? '' : `/${code}`);
const projectPath = code => `${base(code)}/projecte/`;

const toMd = (p, ui) => `# ${p.title}\n\n${p.lead}\n\n${(p.captures ?? []).map(([src, alt]) => `![${alt}](${SITE}${src})`).join('\n\n')}${p.captures ? '\n\n' : ''}${p.sections.map(([h, ps]) => `## ${h}\n\n${ps.join('\n\n').replace('{cor}', '♥').replace(' {campanar}', '').replace(' {uaf}', '')}`).join('\n\n')}${p.videos ? `\n\n## ${ui.videos}\n\n${p.videos.map(([src,, t,,, size]) => `- [${ui.downloadMd.replace('{title}', t).replace('{size}', size)}](${SITE}${src})`).join('\n')}` : ''}\n`;

const HEART = '<svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.2 3.6 13A5.2 5.2 0 0 1 12 6.6a5.2 5.2 0 0 1 8.4 6.4z"/></svg>';
const inline = s => html(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace('{cor}', HEART).replace('{campanar}', '<img class="campanar" src="/campanar-valls.svg" alt="" width="29" height="65">')
  .replace(' {uaf}', '<a class="uaf" href="https://uaf.cat"><img src="/uaf-logo.jpg" alt="Unió Anelles de la Flama, Valls" width="640" height="327" loading="lazy"></a>');
const toHtml = (p, code, c, langs) => { const { ui } = c; const canonical = projectPath(code); const alternate = `${canonical}index.md`; return `<!doctype html>
<html lang="${c.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.lead)}">
<link rel="canonical" href="${SITE}${canonical}">
<link rel="alternate" type="text/markdown" href="${alternate}">
${langs.length > 1 ? `${langs.map(l => `<link rel="alternate" hreflang="${l}" href="${SITE}${projectPath(l)}">`).join('\n')}\n<link rel="alternate" hreflang="x-default" href="${SITE}${projectPath('ca')}">\n` : ''}<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preload" href="/fonts/baloo-2-latin.woff2" as="font" type="font/woff2" crossorigin>
<meta name="theme-color" content="#2a1a10">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.lead)}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:image" content="${SITE}/og.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(ui.ogImageAlt)}">
<meta property="og:locale" content="${c.ogLocale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image:alt" content="${esc(ui.ogImageAlt)}">
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'AboutPage', name: p.title, inLanguage: c.lang, url: `${SITE}${canonical}`,
  about: { '@type': 'VideoGame', name: 'Mulassa Tap Tap Dance', url: `${SITE}/`, inLanguage: c.lang, genre: ui.genre, applicationCategory: 'GameApplication', operatingSystem: ui.os, isAccessibleForFree: true,
    author: { '@type': 'Person', name: 'Marc Güell Segarra', url: 'https://ondori.dev' } },
  ...(p.videos && { video: p.videos.map(([src, poster, t]) => ({ '@type': 'VideoObject', name: t, description: ui.videoDescription, thumbnailUrl: `${SITE}${poster}`, contentUrl: `${SITE}${src}`, uploadDate: '2026-10-01', duration: 'PT34S', inLanguage: c.lang })) }),
})}</script>
<style>
  body { margin: 0; background: #2a1a10; color: #fff3d6; font: 400 18px/1.6 'Baloo 2', system-ui, sans-serif; }
  body::before { content: ''; position: fixed; inset: 0; z-index: -1; background: ${PATTERN}; } /* still pattern, the page scrolls over it (iOS ignores background-attachment: fixed) */
  @font-face { font-family: 'Baloo 2'; font-weight: 400 800; font-display: swap; src: url(/fonts/baloo-2-latin.woff2) format('woff2'); }
  main { max-width: 42rem; margin: 0 auto; padding: 32px 20px 64px; }
  h1 { font-size: 2rem; line-height: 1.15; color: #f5c518; font-weight: 800; } h2 { margin: 0 0 .4em; color: #f5c518; font-weight: 800; }
  /* the game's dark card (index.html .boot-fail), one per section, so the text reads over the pattern */
  section, header, .shots { margin-top: 20px; padding: 20px 24px 12px; border-radius: 20px; background: #0000008c; -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }
  section p:last-child { margin-bottom: 0; }
  header { padding-bottom: 24px; } h1 { margin: 0; } b { font-weight: 700; } a { font-weight: 600; }
  a { color: #ff7a1a; } .play { display: inline-block; margin-top: 8px; padding: 10px 22px; border-radius: 999px; background: #f5c518; color: #2a1a10; font-weight: 800; text-decoration: none; }
  p { margin: .8em 0; }
  .videos { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 12px; margin: 24px 0; } .videos figure:first-child { flex: 2 1 340px; } .videos figure:last-child { flex: 1 1 200px; max-width: 260px; } video { width: 100%; height: auto; display: block; border-radius: 12px; border: 2px solid #f5c518; box-sizing: border-box; background: #000; }
  .shots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding-bottom: 20px; } figure { margin: 0; } img { width: 100%; height: auto; display: block; border-radius: 12px; border: 2px solid #f5c518; box-sizing: border-box; } figcaption { font-size: 14px; line-height: 1.4; margin-top: 6px; opacity: .85; }
  @media (max-width: 560px) { .shots { grid-template-columns: 1fr; max-width: 280px; } }
  .heart { width: .9em; height: .9em; vertical-align: -.1em; fill: #c0283c; } img.campanar { display: inline; width: auto; height: .95em; border: 0; border-radius: 0; margin-left: .08em; }
  .uaf { display: block; width: min(100%, 320px); margin: 12px auto 0; } .uaf img { border: 0; } /* the entitat's logo as sent: on its own white, never recoloured */
  footer { margin-top: 3em; padding-top: 1em; border-top: 1px solid #f5c51855; font-size: 15px; text-align: center; }
</style>
</head>
<body>
<main>
<header>
<h1>${esc(p.title)}</h1>
<p>${html(p.lead)}</p>
<a class="play" href="/">${esc(ui.play)}</a>
</header>
${p.captures ? `<div class="shots">${p.captures.map(([src, alt]) => `<figure><img src="${src}" alt="${esc(alt)}" width="540" height="1169" loading="lazy"><figcaption>${esc(alt)}</figcaption></figure>`).join('')}</div>` : ''}
${p.sections.map(([h, ps]) => `<section>\n<h2 id="${slug(h)}">${esc(h)}</h2>\n${ps.map(t => `<p>${inline(t)}</p>`).join('\n')}\n</section>`).join('\n')}
${p.videos ? `<section>\n<h2>${esc(ui.videos)}</h2>\n<div class="videos">${p.videos.map(([src, poster, t, w, h, size]) => `<figure><video controls preload="none" poster="${poster}" width="${w}" height="${h}" aria-label="${esc(t)}"><source src="${src}" type="video/mp4"></video><figcaption>${esc(t)} · <a href="${src}" download>${esc(ui.download.replace('{size}', size))}</a></figcaption></figure>`).join('')}</div>\n</section>` : ''}
<footer><a href="/">${esc(ui.footerGame)}</a> · <a href="${canonical}">${esc(ui.footerProject)}</a> · <a href="https://github.com/mguellsegarra/mulassa-tap-tap-dance">${esc(ui.footerCode)}</a> · <a href="https://ondori.dev">ondori.dev</a></footer>
</main>
</body>
</html>
`; };

export const sitemapXml = langs => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/</loc></url>
${langs.map(l => `  <url><loc>${SITE}${projectPath(l)}</loc></url>`).join('\n')}
</urlset>
`;

// public/llms.txt is the Catalan base; each further language adds its project twin right after the Catalan one.
export const llmsTxt = (baseTxt, content) => {
  const extra = Object.entries(content).filter(([l]) => l !== 'ca').map(([l, c]) => `- [${c.projecte.title}](${SITE}${projectPath(l)}index.md): ${c.projecte.lead}`);
  return extra.length ? baseTxt.replace(/^(- \[Sobre el projecte\].*)$/m, `$1\n${extra.join('\n')}`) : baseTxt;
};

export async function writeSeoPages(dist, content) {
  content ??= await loadContent();
  const langs = Object.keys(content);
  await mkdir(resolve(dist, 'projecte'), { recursive: true });
  await writeFile(resolve(dist, 'index.md'), toMd(content.ca.home, content.ca.ui));
  for (const l of langs) {
    await mkdir(resolve(dist, base(l).slice(1), 'projecte'), { recursive: true });
    await writeFile(resolve(dist, base(l).slice(1), 'projecte/index.md'), toMd(content[l].projecte, content[l].ui));
    await writeFile(resolve(dist, base(l).slice(1), 'projecte/index.html'), toHtml(content[l].projecte, l, content[l], langs));
  }
  await writeFile(resolve(dist, 'sitemap.xml'), sitemapXml(langs));
  await writeFile(resolve(dist, 'llms.txt'), llmsTxt(await readFile(new URL('../../public/llms.txt', import.meta.url), 'utf8'), content));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await writeSeoPages(fileURLToPath(new URL('../../dist', import.meta.url)));
  console.log('SEO pages written: /projecte/, /projecte/index.md, /index.md (+ /<lang>/projecte/ per tools/deploy/seo-content/*.json)');
}
