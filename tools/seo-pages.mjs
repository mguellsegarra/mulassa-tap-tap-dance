// One content, two renderings: /projecte/ (HTML) and /projecte/index.md + /index.md (Markdown for agents), written into dist/
// after the build. Edit the text here only; llms.txt, robots.txt and sitemap.xml are plain files in public/.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const SITE = 'https://mulassa.cat';
// The game's tiled cover pattern (index.html #loader.page::before), so the pages share one background; still here, it drifts only in the game.
const PATTERN = (await readFile(new URL('../index.html', import.meta.url), 'utf8')).match(/#loader\.page::before[^}]*?background: (url\("data:image\/svg\+xml,[^"]*"\) 0 0 \/ 180px 180px);/)[1];
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slug = h => h.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const html = s => esc(s).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

export const PAGES = {
  home: {
    title: 'Mulassa Tap Tap Dance',
    lead: 'Joc de ritme en català: balla la Mulassa de Valls al compàs de la música tocant GUA i PA.',
    sections: [
      ['Com es juga', ['Toca **GUA** (esquerra) i **PA** (dreta) quan les notes arribin al cercle. Si en surt una de dues colors, toca els dos botons alhora: és una **GUAPA!** i puntua el doble. Mantén premut a les notes llargues (**MANTÉN**) i pica sense parar als redobles (**GLOBUS**). Cada error desanima la plaça, i si es buida la Mulassa cau.', 'Hi ha tres nivells (fàcil, normal i difícil), una pràctica inicial, classificacions i targetes per compartir el resultat. Es juga des del navegador, al mòbil, a la tauleta o a l’ordinador.']],
      ['Més informació', ['[Sobre el projecte](https://mulassa.cat/projecte/): què és, d’on surt i qui l’ha fet.', 'El [codi és obert a GitHub](https://github.com/mguellsegarra/mulassa-tap-tap-dance), sense ànim de lucre, per difondre el bestiari de la cultura popular catalana.', 'Per jugar, obre [mulassa.cat](https://mulassa.cat/).']],
    ],
  },
  projecte: {
    title: 'Sobre Mulassa Tap Tap Dance',
    captures: [['/captures/titol.jpg', 'Pantalla de títol: la Mulassa de Valls a la plaça, amb el logotip Mulassa Tap Tap Dance.'], ['/captures/joc.jpg', 'En joc: les notes del carril, els botons GUA i PA i la Mulassa ballant davant la gent.'], ['/captures/resultats.jpg', 'Targeta de resultats per compartir: tres estrelles i un 92 % d’encerts.']],
    videos: [['/videos/promo-16x9.mp4', '/videos/promo-16x9.jpg', 'Vídeo promocional (horitzontal, 16:9)', 1920, 1080, '20 MB'], ['/videos/promo-9x16.mp4', '/videos/promo-9x16.jpg', 'Vídeo promocional (vertical, 9:16)', 1080, 1920, '17 MB']],
    lead: 'Mulassa Tap Tap Dance és un joc de ritme gratuït, en català, inspirat en el ball de la Mulassa de Valls. És un projecte de codi obert, sense ànim de lucre, per difondre el bestiari de la cultura popular catalana.',
    sections: [
      ['Què és', ['Un joc de ritme. Les notes avancen pel carril i les has de tocar a temps amb dos botons: GUA (taronja, esquerra) i PA (turquesa, dreta). Mentre toques, una Mulassa en 3D balla enmig d’una plaça plena de gent. Es juga des del navegador, sense instal·lar res ni registrar-se.']],
      ['La Mulassa de Valls i la Fira de Santa Úrsula', ['La Mulassa és una de les peces del bestiari festiu de Valls (Alt Camp). Surt al seguici de les festes, com la Fira de Santa Úrsula, i la fa ballar la Unió Anelles de la Flama. Aprofito la Fira de Santa Úrsula de Valls per llançar el joc, com a homenatge a la festa i a la Mulassa. El ball intenta reproduir el ball real, amb algunes petites exageracions per fer-lo més esbojarrat. És una adaptació meva a partir de vídeos públics, no la coreografia oficial.', 'La música és un arranjament nou, de festa major, que només aprofita la melodia del Ball de la Mulassa, composta per Francesc Bofarull i Figuerola.']],
      ['Com es juga', ['**GUA** i **PA**: toca el botó esquerre o el dret quan la nota arribi al cercle (al teclat, ← i → o D i K).', '**GUAPA!** Els dos botons alhora. Doble punt; un de sol és error.', '**MANTÉN**: manté premut fins al final de la nota llarga (normal i difícil).', '**GLOBUS**: als redobles, pica tantes vegades com puguis fins que peti.', '**ÀNIM**: cada error desanima la plaça; si es buida, la Mulassa cau.', '**FINAL ESBOJARRAT**: l’última frase de la cançó. Els punts valen el doble si portes almenys un 70 % d’encerts.', 'El primer ball és una pràctica guiada. Després tries entre fàcil, normal i difícil, i pots publicar el resultat a les classificacions amb un sobrenom o compartir-ne la targeta.']],
      ['Autoria i crèdits', ['Idea, disseny i desenvolupament: Marc Güell Segarra · [ondori.dev](https://ondori.dev).', 'Gràcies a la [Unió Anelles de la Flama](https://uaf.cat) per deixar-me fer aquest joc de la Mulassa.', 'Melodia: Francesc Bofarull i Figuerola. L’arranjament i els sons els genera el codi del joc.', 'Tipografies Baloo 2 i Jersey 10, amb llicència SIL Open Font License.', 'Fet amb carinyo {cor} i molta IA a Valls {campanar}']],
      ['Codi obert i col·laboració', ['El [codi és obert a GitHub](https://github.com/mguellsegarra/mulassa-tap-tap-dance) i tothom qui vulgui hi pot col·laborar: afegir-hi les seves mulasses i el seu bestiari, amb els seus balls i la seva música.', 'Si t’ha fet somriure, pots [convidar-me a un cafè](https://buymeacoffee.com/mguellsegarra).', 'El joc no fa servir galetes de seguiment. Pots consultar les dades que es tracten i els teus drets a «Privadesa», dins de Configuració. Per a imatges o qualsevol dubte: [holi@mulassa.cat](mailto:holi@mulassa.cat).']],
    ],
  },
};

const toMd = p => `# ${p.title}\n\n${p.lead}\n\n${(p.captures ?? []).map(([src, alt]) => `![${alt}](${SITE}${src})`).join('\n\n')}${p.captures ? '\n\n' : ''}${p.sections.map(([h, ps]) => `## ${h}\n\n${ps.join('\n\n').replace('{cor}', '♥').replace(' {campanar}', '')}`).join('\n\n')}${p.videos ? `\n\n## Vídeos\n\n${p.videos.map(([src,, t,,, size]) => `- [${t}, descarrega (MP4, ${size})](${SITE}${src})`).join('\n')}` : ''}\n`;

const HEART = '<svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.2 3.6 13A5.2 5.2 0 0 1 12 6.6a5.2 5.2 0 0 1 8.4 6.4z"/></svg>';
const inline = s => html(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace('{cor}', HEART).replace('{campanar}', '<img class="campanar" src="/campanar-valls.svg" alt="" width="29" height="65">');
const toHtml = (p, canonical, alternate) => `<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.lead)}">
<link rel="canonical" href="${SITE}${canonical}">
<link rel="alternate" type="text/markdown" href="${alternate}">
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
<meta property="og:locale" content="ca_ES">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'AboutPage', name: p.title, inLanguage: 'ca', url: `${SITE}${canonical}`,
  about: { '@type': 'VideoGame', name: 'Mulassa Tap Tap Dance', url: `${SITE}/`, inLanguage: 'ca', genre: 'Joc de ritme', applicationCategory: 'GameApplication', operatingSystem: 'Qualsevol navegador', isAccessibleForFree: true,
    author: { '@type': 'Person', name: 'Marc Güell Segarra', url: 'https://ondori.dev' } },
  ...(p.videos && { video: p.videos.map(([src, poster, t]) => ({ '@type': 'VideoObject', name: t, description: 'Vídeo promocional de Mulassa Tap Tap Dance.', thumbnailUrl: `${SITE}${poster}`, contentUrl: `${SITE}${src}`, uploadDate: '2026-10-01', duration: 'PT34S', inLanguage: 'ca' })) }),
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
  footer { margin-top: 3em; padding-top: 1em; border-top: 1px solid #f5c51855; font-size: 15px; }
</style>
</head>
<body>
<main>
<header>
<h1>${esc(p.title)}</h1>
<p>${html(p.lead)}</p>
<a class="play" href="/">Juga ara</a>
</header>
${p.captures ? `<div class="shots">${p.captures.map(([src, alt]) => `<figure><img src="${src}" alt="${esc(alt)}" width="540" height="1169" loading="lazy"><figcaption>${esc(alt)}</figcaption></figure>`).join('')}</div>` : ''}
${p.sections.map(([h, ps]) => `<section>\n<h2 id="${slug(h)}">${esc(h)}</h2>\n${ps.map(t => `<p>${inline(t)}</p>`).join('\n')}\n</section>`).join('\n')}
${p.videos ? `<section>\n<h2>Vídeos</h2>\n<div class="videos">${p.videos.map(([src, poster, t, w, h, size]) => `<figure><video controls preload="none" poster="${poster}" width="${w}" height="${h}" aria-label="${esc(t)}"><source src="${src}" type="video/mp4"></video><figcaption>${esc(t)} · <a href="${src}" download>Descarrega (MP4, ${size})</a></figcaption></figure>`).join('')}</div>\n</section>` : ''}
<footer><a href="/">Joc</a> · <a href="/projecte/">Sobre el projecte</a> · <a href="https://github.com/mguellsegarra/mulassa-tap-tap-dance">Codi</a> · <a href="https://ondori.dev">ondori.dev</a></footer>
</main>
</body>
</html>
`;

export async function writeSeoPages(dist) {
  await mkdir(resolve(dist, 'projecte'), { recursive: true });
  await writeFile(resolve(dist, 'index.md'), toMd(PAGES.home));
  await writeFile(resolve(dist, 'projecte/index.md'), toMd(PAGES.projecte));
  await writeFile(resolve(dist, 'projecte/index.html'), toHtml(PAGES.projecte, '/projecte/', '/projecte/index.md'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await writeSeoPages(fileURLToPath(new URL('../dist', import.meta.url)));
  console.log('SEO pages written: /projecte/, /projecte/index.md, /index.md');
}
