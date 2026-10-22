#!/usr/bin/env node
// Eina de desenvolupament (no entra al build ni a Pages): PDF de l'inventari de moviment (vídeos) de la revisió UI de l'i18n.
// i18n-ok: eina de dev — les cadenes catalanes d'aquest fitxer són text del document, no text del joc.
//
// Llegeix docs/i18n-ui-inventory/video/{findings-video.json (abans), findings-video-despres.json (opcional), triatge.json, frames/} i escriu
// docs/i18n-ui-inventory/inventari-video.pdf (A4, paginat) via HTML → Chromium `page.pdf`. Les miniatures (JPEG via `sips`) viuen a /tmp/ui-vid-thumbs.
//   node tools/ui-video-pdf.mjs [--pw=/tmp/ui-inv-pw] [--tmp=/tmp/ui-vid-thumbs]
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { VPS } from './ui-inventory.mjs';
import { groupOf } from './ui-video-triage.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const DIR = join(ROOT, 'docs/i18n-ui-inventory'), VID = join(DIR, 'video'), TMP = args.tmp ?? '/tmp/ui-vid-thumbs', PW = args.pw ?? '/tmp/ui-inv-pw';
const { chromium } = await import(pathToFileURL(join(PW, 'node_modules/playwright/index.mjs')).href);
const rd = f => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null);
const before = rd(join(VID, 'findings-video.json')), after = rd(join(VID, 'findings-video-despres.json')), notes = rd(join(VID, 'triatge.json')) ?? { rules: [], fixes: [] };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
mkdirSync(TMP, { recursive: true });
const url = p => pathToFileURL(p).href;
const thumb = (rel, px = 150) => { // frames/<x>.jpg → a small JPEG outside the repo
  const src = join(VID, rel), out = join(TMP, rel.replace(/\//g, '_'));
  if (!existsSync(src)) return null;
  if (!existsSync(out)) spawnSync('sips', ['-Z', String(px), '-s', 'format', 'jpeg', '-s', 'formatOptions', '55', src, '--out', out], { stdio: 'ignore' });
  return existsSync(out) ? out : null;
};
const LANGS = { ca: 'català (referència)', de: 'alemany (llargada)', ja: 'japonès (escriptura)', ru: 'rus (escriptura)', es: 'castellà', pseudo: 'pseudollengua (llargada; text que no passa pel catàleg)' };
const VARIANTS = { fine: 'punter fi en un viewport de mòbil', rm: 'moviment reduït', s0: '0 estrelles', s3: '3 estrelles', feed: 'Publicació 4:5', confirm: 'confirmació de sortida', load: 'carregador', error: 'targeta d’error de càrrega', gpu: 'consell d’acceleració', ios: 'consell d’iPhone', switch: 'canvi d’idioma des de ⚙ (desa i recarrega)' };
const SEV = { alta: 0, mitjana: 1, baixa: 2 };
const caps = before.captures.filter(c => c.ok).sort((a, b) => a.scene.localeCompare(b.scene) || a.vp.localeCompare(b.vp) || Object.keys(LANGS).indexOf(a.lang) - Object.keys(LANGS).indexOf(b.lang) || a.variant.localeCompare(b.variant));
const byCode = {}; for (const f of before.findings) (byCode[f.capture] ??= []).push({ ...f, ...groupOf(notes, f) });
const afterBy = {}; for (const f of after?.findings ?? []) (afterBy[f.capture] ??= []).push({ ...f, ...groupOf(notes, f) });
const aCap = Object.fromEntries((after?.captures ?? []).map(c => [c.code, c]));
const sceneName = {}; for (const c of before.captures) sceneName[c.scene] ??= c.name;
const scenes = Object.keys(sceneName).sort();
const real = fs => fs.filter(f => f.group !== 'C');

const parts = [];
const allF = before.findings.map(f => ({ ...f, ...groupOf(notes, f) }));
const cnt = (arr, g) => arr.filter(f => f.group === g).length;
parts.push(`<section class="cover"><h1>Inventari de moviment (vídeo) i auditoria UI</h1><p class="sub">Mulassa Tap Tap Dance · revisió d’i18n · 22/10/2026</p>
<table class="t kv"><tr><th>Vídeos</th><td>${caps.length} clips «abans» (${(before.captures.length - caps.length)} amb error)${after ? ` · ${after.captures.filter(c => c.ok).length} clips «després»` : ''}</td></tr>
<tr><th>Viewports</th><td>V3 393×852 tàctil (ca de ja ru es pseudo) · V7 1280×800 punter fi (ca de ja ru) · V5 852×393 (ca)</td></tr>
<tr><th>Mesures</th><td>CLS per clip (avís ≥ 0,05, error ≥ 0,1), nodes que es mouen, canvis de font, flaix de català, parpelleigs (DOM i vídeo), fotogrames en blanc, text del catàleg català en una altra llengua, últim estat vs captura estàtica</td></tr>
<tr><th>Troballes «abans»</th><td>${allF.length}: grup A ${cnt(allF, 'A')} · grup B ${cnt(allF, 'B')} · grup C ${cnt(allF, 'C')}</td></tr>
${after ? `<tr><th>Troballes «després»</th><td>${after.findings.length}: grup A ${cnt(after.findings.map(f => ({ ...f, ...groupOf(notes, f) })), 'A')}</td></tr>` : ''}</table>
<h3>Índex</h3><ul><li><a href="#guia">Guia de codis M</a></li><li><a href="#inventari">Inventari per vídeo</a></li><li><a href="#troballes">Taula de troballes (A/B/C)</a></li><li><a href="#tocat">Què s’ha tocat (abans / després)</a></li></ul></section>`);

parts.push(`<section id="guia"><h2>Guia de codis</h2><p>Cada vídeo té un codi <code>M&lt;nn&gt;-V&lt;n&gt;-&lt;idioma&gt;[-&lt;variant&gt;]</code> (M = moviment). <code>&lt;nn&gt;</code> és el mateix número que l’escena estàtica <code>S&lt;nn&gt;</code> i la resta del codi és idèntic: <code>M03-V3-ja</code> és el moviment de la captura <code>S03-V3-ja</code>. Cada unitat (escena × viewport × idioma) es grava en un sol vídeo de Playwright, des de la càrrega, i es talla en un clip per escena (4–14 s). Tot amb <code>?mock</code> i <code>?mute</code>.</p>
<h3>Taula M → S</h3><table class="t"><thead><tr><th>M</th><th>S</th><th>Escena i moviment gravat</th></tr></thead><tbody>${scenes.map(s => `<tr><td>M${s.slice(1)}</td><td>${s}</td><td>${esc(sceneName[s])} — ${esc(before.captures.find(c => c.scene === s)?.how ?? '')}</td></tr>`).join('')}</tbody></table>
<h3>Viewports</h3><table class="t"><thead><tr><th>Codi</th><th>Mida</th><th>Punter</th></tr></thead><tbody>${['V3', 'V5', 'V7'].map(k => `<tr><td>${k}</td><td>${VPS[k][0]}×${VPS[k][1]}</td><td>${k === 'V3' ? 'tàctil (hasTouch + isMobile)' : 'fi'}</td></tr>`).join('')}</tbody></table>
<h3>Idiomes</h3><table class="t"><tbody>${Object.entries(LANGS).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</tbody></table>
<h3>Variants</h3><table class="t"><tbody>${Object.entries(VARIANTS).map(([k, v]) => `<tr><td>-${k}</td><td>${v}</td></tr>`).join('')}</tbody></table>
<p class="note">Notes de mètode: el navegador és Chromium amb swiftshader (3D per programari), per això la partida va a pocs fotogrames per segon; el fullscreen d’Android tàctil s’anul·la durant la gravació (si no, el clip surt reduït); l’hora del clip es calibra amb la durada del vídeo cru (±0,3 s).</p></section>`);

const rowFor = c => {
  const fs = byCode[c.code] ?? [], fr = (c.frames ?? []).map(f => ({ ...f, th: thumb(f.file) })).filter(f => f.th);
  const sev = fs.some(f => f.group === 'A') ? 'hi' : fs.some(f => f.group === 'B') ? 'mid' : '';
  return `<tr class="${sev}"><td class="nw"><b>${c.code}</b><br><small>${c.scene} · ${c.vp} ${c.size}<br>${c.lang}${c.variant ? ` · ${c.variant}` : ''} · ${c.durationS}s</small></td>
<td class="th">${fr.map(f => `<figure><img src="${url(f.th)}"><figcaption>${esc(f.name)}</figcaption></figure>`).join('')}</td>
<td class="tx"><b>${esc(c.name)}</b><br>CLS ${c.cls}${c.clsLoad ? ` (càrrega ${c.clsLoad})` : ''}${c.shifts?.length ? ` · ${c.shifts.length} canvi(s)` : ''}${c.ssimEnd != null ? ` · SSIM ${c.ssimEnd.toFixed(2)}` : ''}<br>${fs.length ? fs.map(f => `<span class="g${f.group}">${f.group}</span> ${esc(f.kind)}`).join('<br>') : '<span class="ok">sense troballes</span>'}</td></tr>`;
};
parts.push(`<section id="inventari"><h2>Inventari per vídeo</h2><p class="note">Fila vermella = té una troballa de grup A; ocre = grup B. Fotogrames: inici, mig, final i els salts de layout més grans. Els vídeos són a <code>docs/i18n-ui-inventory/video/&lt;codi&gt;.mp4</code>.</p>
${scenes.map(s => `<h3 class="scene">M${s.slice(1)} · ${esc(sceneName[s])}</h3><table class="t inv"><tbody>${caps.filter(c => c.scene === s).map(rowFor).join('')}</tbody></table>`).join('')}</section>`);

const groups = new Map();
for (const f of allF) { const k = `${f.group}|${f.kind}|${(f.selector ?? '').slice(0, 50)}|${f.triage ?? ''}`; const g = groups.get(k) ?? { ...f, codes: [] }; g.codes.push(f.capture); groups.set(k, g); }
const rows = [...groups.values()].sort((a, b) => a.group.localeCompare(b.group) || b.codes.length - a.codes.length);
parts.push(`<section id="troballes"><h2>Taula de troballes</h2><p class="note">${allF.length} troballes en ${rows.length} grups. A = defecte nou de la feina d’i18n o de la fusió (arreglat); B = preexistent o de disseny (anotat, no es toca); C = fals positiu o soroll de la mesura.</p>
<table class="t f"><thead><tr><th>Gr.</th><th>Tipus</th><th>Selector / text</th><th>Mesura</th><th>Estat i motiu</th><th>Vídeos</th></tr></thead><tbody>${rows.map(g => `<tr class="g${g.group}"><td>${g.group}</td><td>${esc(g.kind)}</td><td class="sel">${esc((g.selector ?? '').slice(0, 90))}${g.text ? `<br>«${esc(String(g.text).slice(0, 70))}»` : ''}</td><td>${esc(g.measure)}</td><td>${esc(g.status)}: ${esc(g.why)}</td><td class="sel">${esc(g.codes.slice(0, 6).join(', '))}${g.codes.length > 6 ? ` (+${g.codes.length - 6})` : ''}</td></tr>`).join('')}</tbody></table></section>`);

const pair = fx => `<div class="pr">${[['abans', fx.before], ['després', fx.after]].map(([k, f]) => { const th = f && thumb(f, 260); return `<div>${th ? `<img src="${url(th)}">` : '<div class="miss">—</div>'}<small>${k}</small></div>`; }).join('')}</div>`;
parts.push(`<section id="tocat"><h2>Què s’ha tocat (abans / després)</h2>${notes.fixes.map(fx => `<div class="fix"><h3>${esc(fx.id)} · ${esc(fx.title)}</h3><p>${esc(fx.explain)}</p>
${fx.pairs?.length ? `<div class="pairs">${fx.pairs.map(p => `<figure>${pair(p)}<figcaption><b>${esc(p.code)}</b> ${esc(p.note ?? '')}</figcaption></figure>`).join('')}</div>` : ''}
<table class="t"><tbody><tr><th>Mesures</th><td>${esc(fx.measures)}</td></tr><tr><th>Fitxers</th><td>${fx.files.map(f => `<code>${esc(f)}</code>`).join(' ')}</td></tr><tr><th>Prova</th><td>${esc(fx.test ?? '')}</td></tr></tbody></table></div>`).join('')}
${after ? `<h3>Resum abans / després</h3><table class="t"><thead><tr><th>Tipus</th><th>Abans</th><th>Després</th></tr></thead><tbody>${[...new Set([...before.findings, ...after.findings].map(f => f.kind))].sort().map(k => `<tr><td>${k}</td><td>${before.findings.filter(f => f.kind === k).length}</td><td>${after.findings.filter(f => f.kind === k).length}</td></tr>`).join('')}</tbody></table>
<h3>CLS dels clips que tenen troballes (abans → després)</h3><table class="t f"><thead><tr><th>Codi</th><th>CLS abans</th><th>CLS després</th></tr></thead><tbody>${caps.filter(c => (c.cls ?? 0) >= 0.05 && aCap[c.code]).map(c => `<tr><td>${c.code}</td><td>${c.cls}</td><td>${aCap[c.code].cls}</td></tr>`).join('')}</tbody></table>` : ''}</section>`);

const css = `@page{size:A4;margin:13mm 11mm 15mm}*{box-sizing:border-box}body{font:8pt/1.3 -apple-system,Helvetica,Arial,sans-serif;color:#222;margin:0}
h1{font-size:23pt;margin:28mm 0 2mm}h2{font-size:15pt;margin:0 0 3mm;border-bottom:1.5px solid #b8860b;padding-bottom:1mm}h3{font-size:10pt;margin:4mm 0 1.5mm}section{break-before:page}section.cover{break-before:auto}
.sub{font-size:12pt;color:#666;margin:0 0 7mm}.note{color:#666;font-size:7.3pt}code{font:7pt ui-monospace,Menlo,monospace;background:#f1ece0;padding:0 1mm}a{color:#0b5cad;text-decoration:none}
table.t{border-collapse:collapse;width:100%;margin:1mm 0 3mm}.t th,.t td{border:.5px solid #ccc;padding:.7mm 1.3mm;text-align:left;vertical-align:top}.t th{background:#f3eee2}.t tr{break-inside:avoid}.t thead{display:table-header-group}.kv th{width:30mm}
.f{font-size:6.4pt}.sel{font:5.8pt ui-monospace,Menlo,monospace;word-break:break-all}.nw{white-space:nowrap}
h3.scene{margin:4mm 0 1mm;background:#f3eee2;padding:1.2mm 2mm;font-size:9.5pt;break-after:avoid}
.inv td{padding:.6mm 1mm}.inv td.th{width:101mm}.inv .th figure{display:inline-block;margin:0 .6mm 0 0;vertical-align:top}.inv .th img{max-height:26mm;max-width:33mm;width:auto;height:auto;display:block;border:.4px solid #aaa}.inv figcaption{font-size:5.5pt;color:#666}
.inv tr.hi td{background:#fff1f1}.inv tr.mid td{background:#fff8e8}.inv small{color:#555;font-size:6pt}.inv td.tx{font-size:6.6pt}.ok{color:#2e7d32}
.gA{color:#b00020;font-weight:700}.gB{color:#b36b00;font-weight:700}.gC{color:#777}tr.gA td:first-child{color:#b00020;font-weight:700}tr.gB td:first-child{color:#b36b00;font-weight:700}
.pairs{display:grid;grid-template-columns:repeat(2,1fr);gap:3mm}.pairs figure{margin:0;break-inside:avoid;border:1px solid #ddd;padding:1mm}.pr{display:grid;grid-template-columns:1fr 1fr;gap:1mm}.pr img{width:100%;display:block;border:.4px solid #aaa}.pr small{font-size:6pt;color:#666;display:block;text-align:center}.pairs figcaption{font-size:6.5pt;margin-top:.8mm}
.fix{break-inside:avoid-page;margin-bottom:5mm}.fix h3{background:#f3eee2;padding:1mm 2mm}.miss{height:30mm;background:#eee}`;
const html = `<!doctype html><html lang="ca"><meta charset="utf-8"><style>${css}</style><body>${parts.join('\n')}</body></html>`;
writeFileSync(join(TMP, 'inventari-video.html'), html);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(url(join(TMP, 'inventari-video.html')), { waitUntil: 'load' });
  const out = join(DIR, 'inventari-video.pdf');
  await page.pdf({ path: out, format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:7px;width:100%;text-align:center;color:#666">Inventari de moviment UI i18n · pàg. <span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
  console.log(`OK ${out} (${(statSync(out).size / 1e6).toFixed(1)} MB)`);
} finally { await browser.close(); }
