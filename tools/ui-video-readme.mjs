#!/usr/bin/env node
// Eina de desenvolupament: escriu docs/i18n-ui-inventory/video/README-video.md des de findings-video*.json i triatge.json.
// i18n-ok: eina de dev — text del document.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { groupOf } from './ui-video-triage.mjs';
import { VPS } from './ui-inventory.mjs';

const VID = join(dirname(fileURLToPath(import.meta.url)), '../docs/i18n-ui-inventory/video');
const rd = f => (existsSync(join(VID, f)) ? JSON.parse(readFileSync(join(VID, f), 'utf8')) : null);
const before = rd('findings-video.json'), after = rd('findings-video-despres.json'), notes = rd('triatge.json');
const tag = d => d.findings.map(f => ({ ...f, ...groupOf(notes, f) }));
const fb = tag(before), fa = after ? tag(after) : [];
const scenes = new Map(); for (const c of before.captures) if (!scenes.has(c.scene)) scenes.set(c.scene, c);
const MB = readdirSync(VID).filter(f => f.endsWith('.mp4')).reduce((n, f) => n + statSync(join(VID, f)).size, 0) / 1e6;
const L = ['# Inventari de moviment (vídeo) de la UI — i18n', '',
  `Generat per \`tools/ui-video.mjs\` · ${before.generated} · ${before.captures.filter(c => c.ok).length} clips «abans»${after ? ` + ${after.captures.filter(c => c.ok).length} «després»` : ''} · ${MB.toFixed(0)} MB d'mp4. Resultats complets a \`findings-video.json\` (abans) i \`findings-video-despres.json\`; el triatge, a \`triatge.json\`. PDF: \`../inventari-video.pdf\`.`, '',
  'Tot amb `?mock` i `?mute`, Chromium amb swiftshader. Cada unitat (escena × viewport × idioma) es grava en **un** vídeo de Playwright des de la càrrega i es talla en un clip per escena (4–14 s) amb una interacció mínima (obrir/tancar la fulla, canviar de carta, prémer un nivell, deixar córrer la partida, tornar enrere, canviar d\'idioma i recarregar).', '',
  '## Codis', '', '`M<nn>-V<n>-<idioma>[-<variant>]` (M = moviment). `<nn>`, `V<n>`, idioma i variant són els de la captura estàtica `S<nn>-V<n>-<idioma>[-<variant>]` (`../shots/`): `M03-V3-ja` és el moviment de `S03-V3-ja`. Els clips «després» afegeixen `-despres` (`M05-V3-ja-despres.mp4`). Variant nova: `-switch` (M06: canvi d\'idioma des de ⚙).', '',
  '| M | S | Escena |', '| --- | --- | --- |', ...[...scenes].sort().map(([s, c]) => `| M${s.slice(1)} | ${s} | ${c.name.replace(/\|/g, '/')} — ${c.how.replace(/\|/g, '/')} |`), '',
  '## Cobertura', '', '| Viewport | Mida | Punter | Idiomes |', '| --- | --- | --- | --- |', '| V3 | 393×852 | tàctil | ca de ja ru es pseudo |', '| V7 | 1280×800 | fi | ca de ja ru |', `| V5 | ${VPS.V5[0]}×${VPS.V5[1]} | fi (la coberta tàctil és M28) | ca |`, '',
  '## Mesures automàtiques (per clip)', '', '- **CLS**: `PerformanceObserver` `layout-shift` (sense `hadRecentInput`), amb els nodes causants i el seu moviment en px; avís ≥ 0,05, error ≥ 0,1 (`cls`, `clsLoad`, `shifts`, `nodes`).',
  '- **Fonts**: canvis de família efectiva (`body`, `.btn`, `#select-name`…) i `document.fonts` `loadingdone`; «font tardana amb salt» = font carregada amb la pantalla visible i CLS > 0.',
  '- **Flaix de català**: paraules catalanes visibles (fora de `.sr-only` i `[lang=ca]`) en una pàgina d\'un altre idioma durant els primers 25 s.',
  '- **Text català sense traduir**: text visible, atributs, text de canvas i `content:` de pseudoelements iguals a una cadena del catàleg català que en l\'idioma de la pàgina té una altra traducció.',
  '- **Parpelleigs**: DOM (opacitat/visibilitat/display A→B→A en < 200 ms, mostreig de 50 ms) i vídeo (salts de lluminositat que tornen en < 0,25 s); **fotogrames en blanc/negre** un cop hi ha contingut.',
  '- **Últim estat vs captura estàtica**: SSIM de la fulla oberta (retallada) contra `S<nn>…png`, el millor de tres fotogrames.', '',
  '## Notes de mètode i límits', '', '- El fullscreen d\'Android tàctil s\'anul·la durant la gravació: en headless redimensiona la superfície a 800×600 i el clip surt reduït en un racó (descobert amb el primer intent).',
  '- L\'hora del clip es calibra amb la durada del vídeo cru (±0,3 s). El 3D va per programari: la partida i el selector van a pocs fotogrames per segon, sobretot a 1280×800.',
  '- Cap escena fabrica una partida real (autoplay, `?final`, `?stars`, mock en memòria). No emulat: tàctil real, Safari/iOS, DPR > 1.', '',
  '## Troballes', '', `Abans: ${fb.length} (A ${fb.filter(f => f.group === 'A').length} · B ${fb.filter(f => f.group === 'B').length} · C ${fb.filter(f => f.group === 'C').length}). Després: ${fa.length} (A ${fa.filter(f => f.group === 'A').length} · B ${fa.filter(f => f.group === 'B').length} · C ${fa.filter(f => f.group === 'C').length}).`, '',
  'A = defecte nou de la feina d\'i18n o de la fusió (arreglat); B = preexistent o de disseny (anotat); C = fals positiu o soroll.', '',
  '| Gr. | Tipus | Abans | Després | Estat i motiu |', '| --- | --- | --- | --- | --- |'];
const ids = [...new Set(fb.concat(fa).map(f => f.triage))];
for (const id of ids.sort((a, b) => (fb.concat(fa).find(f => f.triage === a).group).localeCompare(fb.concat(fa).find(f => f.triage === b).group))) {
  const s = fb.concat(fa).find(f => f.triage === id);
  L.push(`| ${s.group} | ${s.kind} | ${fb.filter(f => f.triage === id).length} | ${fa.filter(f => f.triage === id).length} | ${s.status}: ${s.why.replace(/\|/g, '/')} |`);
}
L.push('', '## Què s\'ha tocat', '');
for (const fx of notes.fixes) L.push(`### ${fx.id} · ${fx.title}`, '', fx.explain, '', `- Mesures: ${fx.measures}`, `- Fitxers: ${fx.files.map(f => `\`${f}\``).join(', ')}`, `- Prova: ${fx.test}`, ...fx.pairs.map(p => `- ${p.code}: ![abans](${p.before}) ![després](${p.after})`), '');
L.push('## Reexecutar', '', '```', 'node tools/ui-video.mjs --jobs=3                                  # abans (construeix /tmp/ui-inv-dist)', 'node tools/ui-video.mjs --dist=/tmp/ui-inv-dist-after --tag=despres # després', 'node tools/ui-video-readme.mjs && node tools/ui-video-pdf.mjs', '```');
writeFileSync(join(VID, 'README-video.md'), L.join('\n') + '\n');
console.log('README-video.md');
