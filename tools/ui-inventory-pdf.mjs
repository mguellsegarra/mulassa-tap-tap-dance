#!/usr/bin/env node
// Eina de desenvolupament (no entra al build ni a Pages): PDF de l'inventari de pantalles de la revisió UI de l'i18n.
// i18n-ok: eina de dev — les cadenes catalanes d'aquest fitxer són text del document, no text del joc.
//
// Llegeix docs/i18n-ui-inventory/{findings.json, fixes.md i fixes-integrat.md (opcionals), shots/, shots-before/ (opcional)} i escriu
// docs/i18n-ui-inventory/inventari.pdf (A4, paginat) via HTML → Chromium `page.pdf`.
// Les miniatures (JPEG, via `sips` de macOS) i l'HTML intermedi es deixen fora del repo, a /tmp/ui-inv-thumbs.
//
// Ús (Playwright només en un directori sota /tmp, mai al repo ni global):
//   node tools/ui-inventory-pdf.mjs [--pw=/tmp/ui-inv-pw] [--dir=docs/i18n-ui-inventory] [--tmp=/tmp/ui-inv-thumbs]
// Estat de les troballes (només si hi ha fixes*.md): «arreglat» si un dels dos anomena el seu selector o el seu codi de captura.
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const DIR = resolve(ROOT, args.dir ?? 'docs/i18n-ui-inventory'), TMP = args.tmp ?? '/tmp/ui-inv-thumbs', PW = args.pw ?? '/tmp/ui-inv-pw';
const { chromium } = await import(pathToFileURL(join(PW, 'node_modules/playwright/index.mjs')).href);

const data = JSON.parse(readFileSync(join(DIR, 'findings.json'), 'utf8'));
const readme = readFileSync(join(DIR, 'README.md'), 'utf8');
const readOpt = f => (existsSync(join(DIR, f)) ? readFileSync(join(DIR, f), 'utf8') : null);
const fixesF1 = readOpt('fixes.md'), fixesF2 = readOpt('fixes-integrat.md'); // F1 = before the merge, F2 = the merged state
const fixes = [fixesF2, fixesF1].filter(Boolean).join('\n') || null;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- viewports i idiomes: del README (taula «Viewports»), que ja els documenta
const VPS = {};
for (const m of readme.matchAll(/^\| (V\d) \| (\d+)×(\d+) \| (.*?) \|$/gm)) VPS[m[1]] = { w: +m[2], h: +m[3], note: m[4] };
const LANGS = { ca: 'català (referència)', de: 'alemany (estrès de llargada)', ja: 'japonès (escriptura)', ru: 'rus (escriptura)', es: 'castellà', pseudo: 'pseudollengua (estrès de llargada; mostra el que no passa pel catàleg)' };
const VARIANTS = { fine: 'punter fi en un viewport de mòbil', rm: 'moviment reduït', s0: '0 estrelles', s3: '3 estrelles', feed: 'amb el formulari de feedback obert', confirm: 'confirmació de sortida', load: 'carregador', error: 'targeta d’error de càrrega', gpu: 'consell d’acceleració per maquinari', ios: 'consell d’iPhone / pantalla completa' };
const SEV = { alta: 0, mitjana: 1, baixa: 2 };
const sceneName = {}; for (const c of data.captures) sceneName[c.scene] ??= c.name;
const scenes = Object.keys(sceneName).sort();
const byCode = {};
for (const f of data.findings) (byCode[f.capture] ??= []).push(f);
const topSev = code => Math.min(3, ...(byCode[code] ?? []).map(f => SEV[f.severity] ?? 3));

// ---- miniatures (fora del repo)
mkdirSync(join(TMP, 'after'), { recursive: true }); mkdirSync(join(TMP, 'before'), { recursive: true });
const THUMB_PX = vp => (VPS[vp] && VPS[vp].w > VPS[vp].h ? 480 : 320);
function thumb(kind, srcDir, c) {
  const src = join(srcDir, `${c.code}.png`);
  if (!existsSync(src)) return null;
  const out = join(TMP, kind, `${c.code}.jpg`);
  if (!existsSync(out) || statSync(out).mtimeMs < statSync(src).mtimeMs) {
    const r = spawnSync('sips', ['-Z', String(THUMB_PX(c.vp)), '-s', 'format', 'jpeg', '-s', 'formatOptions', '62', src, '--out', out], { stdio: 'ignore' });
    if (r.status !== 0) return null;
  }
  return out;
}
const afterDir = join(DIR, 'shots'), beforeDir = join(DIR, 'shots-before');
const hasBefore = existsSync(beforeDir);
const caps = data.captures.filter(c => c.ok).sort((a, b) => a.scene.localeCompare(b.scene) || a.vp.localeCompare(b.vp) || Object.keys(LANGS).indexOf(a.lang) - Object.keys(LANGS).indexOf(b.lang) || a.variant.localeCompare(b.variant));
for (const c of caps) c.after = thumb('after', afterDir, c);

// ---- Markdown mínim per a fixes.md (títols, llistes, taules, codi en línia, negreta, paràgrafs)
const inline = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
function md(text) {
  const out = []; let list = false, table = [];
  const flush = () => { if (list) { out.push('</ul>'); list = false; } if (table.length) { const rows = table.filter(r => !/^\|[\s|:-]+\|$/.test(r)).map(r => r.slice(1, -1).split('|').map(x => inline(x.trim()))); out.push('<table class="t"><thead><tr>' + rows[0].map(x => `<th>${x}</th>`).join('') + '</tr></thead><tbody>' + rows.slice(1).map(r => '<tr>' + r.map(x => `<td>${x}</td>`).join('') + '</tr>').join('') + '</tbody></table>'); table = []; } };
  for (const line of text.split('\n')) {
    if (/^\|.*\|$/.test(line.trim())) { if (list) flush(); table.push(line.trim()); continue; }
    flush();
    const h = line.match(/^(#{1,4})\s+(.*)/), li = line.match(/^\s*[-*]\s+(.*)/);
    if (h) out.push(`<h${h[1].length + 2}>${inline(h[2])}</h${h[1].length + 2}>`);
    else if (li) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(li[1])}</li>`); }
    else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  flush(); return out.join('\n');
}
// l'estat «arreglat» d'una troballa: fixes.md en nomena el selector (sense el text) o la captura
const fixedBy = f => fixes && (fixes.includes(f.selector) || fixes.includes(f.capture));

// ---- HTML
const sevCount = Object.fromEntries(Object.keys(SEV).map(s => [s, data.findings.filter(f => f.severity === s).length]));
const kindCount = {}; for (const f of data.findings) kindCount[f.kind] = (kindCount[f.kind] ?? 0) + 1;
const langsUsed = [...new Set(caps.map(c => c.lang))], vpsUsed = [...new Set(caps.map(c => c.vp))].sort();
let branch = ''; try { branch = spawnSync('git', ['-C', ROOT, 'branch', '--show-current'], { encoding: 'utf8' }).stdout.trim(); } catch {}
const today = new Date().toISOString().slice(0, 10);
const url = p => pathToFileURL(p).href;

const toc = [['guia', 'Guia de codis'], ['inventari', 'Inventari per escena'], ['troballes', 'Taula de troballes'], ['arreglos', 'Arreglos (abans / després)']];
const parts = [];
parts.push(`<section class="cover"><h1>Inventari de pantalles i auditoria UI</h1><p class="sub">Mulassa Tap Tap Dance · revisió d’i18n</p>
<table class="t kv"><tr><th>Data</th><td>${today} (captures: ${esc(data.generated)})</td></tr><tr><th>Branca</th><td>${esc(branch)}</td></tr>
<tr><th>Escenes</th><td>${scenes.length}</td></tr><tr><th>Viewports</th><td>${vpsUsed.length} (${vpsUsed.join(', ')})</td></tr><tr><th>Idiomes</th><td>${langsUsed.length} (${langsUsed.join(', ')})</td></tr>
<tr><th>Captures</th><td>${caps.length} (${data.captures.length - caps.length} amb error)</td></tr>
<tr><th>Troballes</th><td>${data.findings.length}: ${sevCount.alta} altes · ${sevCount.mitjana} mitjanes · ${sevCount.baixa} baixes${fixes ? ` · ${data.findings.filter(fixedBy).length} amb arreglament a fixes.md` : ''}</td></tr></table>
<h3>Troballes per tipus</h3><table class="t"><thead><tr><th>Tipus</th><th>Nre</th></tr></thead><tbody>${Object.entries(kindCount).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<tr><td>${esc(k)}</td><td>${n}</td></tr>`).join('')}</tbody></table>
<h3>Per grup d’escena</h3><table class="t"><thead><tr><th>Grup</th><th>Captures</th><th>Troballes</th></tr></thead><tbody>${[...new Set(caps.map(c => c.group))].map(g => { const cs = caps.filter(c => c.group === g); return `<tr><td>${esc(g)}</td><td>${cs.length}</td><td>${cs.reduce((n, c) => n + (byCode[c.code]?.length ?? 0), 0)}</td></tr>`; }).join('')}</tbody></table>
<h3>Índex</h3><ul class="toc">${toc.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('')}</ul></section>`);

parts.push(`<section id="guia"><h2>Guia de codis</h2><p>Cada captura té un codi estable <code>S&lt;nn&gt;-V&lt;n&gt;-&lt;idioma&gt;[-&lt;variant&gt;]</code>, p. ex. <code>S03-V3-ja</code> (escena 3, iPhone 16, japonès) o <code>S13-V7-ca-s3</code> (resultats amb 3 estrelles, escriptori, català). Les captures són a mida real, tot amb <code>?mock</code> i <code>?mute</code>.</p>
<h3>Escenes</h3><table class="t"><thead><tr><th>Codi</th><th>Nom</th><th>Ruta</th></tr></thead><tbody>${scenes.map(s => `<tr><td><a href="#sc-${s}">${s}</a></td><td>${esc(sceneName[s])}</td><td>${esc(data.how[s] ?? '')}</td></tr>`).join('')}</tbody></table>
<h3>Viewports</h3><table class="t"><thead><tr><th>Codi</th><th>Mida</th><th>Tàctil / fi</th><th>Nota</th></tr></thead><tbody>${Object.entries(VPS).map(([k, v]) => `<tr><td>${k}</td><td>${v.w}×${v.h}</td><td>${['V1', 'V2', 'V3'].includes(k) ? 'tàctil' : 'punter fi'}</td><td>${esc(v.note)}</td></tr>`).join('')}</tbody></table>
<h3>Idiomes</h3><table class="t"><thead><tr><th>Codi</th><th>Significat</th></tr></thead><tbody>${Object.entries(LANGS).map(([k, v]) => `<tr><td>${k}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
<p>El català es captura a tots els viewports; la resta d’idiomes a V1, V3 i V7.</p>
<h3>Variants</h3><table class="t"><thead><tr><th>Sufix</th><th>Significat</th></tr></thead><tbody>${Object.entries(VARIANTS).map(([k, v]) => `<tr><td>-${k}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table></section>`);

const cell = c => {
  const fs = byCode[c.code] ?? [], sev = topSev(c.code), cls = sev === 0 ? ' hi' : sev === 1 ? ' mid' : '';
  return `<figure class="${cls.trim()}"><img src="${c.after ? url(c.after) : ''}"><figcaption><b>${esc(c.code)}</b><span>${fs.length ? `${fs.length} troball${fs.length > 1 ? 'es' : 'a'}${sev === 0 ? ' · ALTA' : ''}` : '0'}</span></figcaption></figure>`;
};
parts.push(`<section id="inventari"><h2>Inventari per escena</h2><p class="note">Marc vermell = hi ha troballes de gravetat alta; ocre = mitjana. Sota cada codi, el nombre de troballes.</p>${scenes.map(s => {
  const sc = caps.filter(c => c.scene === s);
  const vps = [...new Set(sc.map(c => c.vp))].sort();
  const head = `<h3 id="sc-${s}" class="scene">${s} · ${esc(sceneName[s])} <small>${esc(data.how[s] ?? '')} · ${sc.length} captures</small></h3>`;
  return vps.map((vp, i) => {
    const g = sc.filter(c => c.vp === vp), land = VPS[vp] && VPS[vp].w > VPS[vp].h;
    return `<div class="vp">${i ? '' : head}<h4>${vp} ${VPS[vp] ? `${VPS[vp].w}×${VPS[vp].h}` : ''}</h4><div class="grid ${land ? 'l' : 'p'}">${g.map(cell).join('')}</div></div>`;
  }).join('');
}).join('')}</section>`);

const rows = data.findings.map((f, i) => ({ ...f, i })).sort((a, b) => (SEV[a.severity] - SEV[b.severity]) || a.kind.localeCompare(b.kind) || a.capture.localeCompare(b.capture));
const grp = f => (f.severity === 'alta' ? 'A' : f.severity === 'mitjana' ? 'B' : 'C'); // grup per gravetat: A = cal arreglar, B = revisar, C = baix risc
parts.push(`<section id="troballes"><h2>Taula de troballes</h2><p class="note">${data.findings.length} troballes, per gravetat. Grup A = gravetat alta (cal arreglar), B = mitjana (revisar), C = baixa (baix risc).${fixes ? ' Estat: «arreglat» si fixes.md anomena el selector o la captura.' : ''}</p>
<table class="t f"><thead><tr><th>Captura</th><th>Selector</th><th>Tipus</th><th>Grav.</th><th>Mesura</th><th>Gr.</th>${fixes ? '<th>Estat</th>' : ''}</tr></thead><tbody>${rows.map(f => `<tr class="${f.severity}"><td class="nw">${esc(f.capture)}</td><td class="sel">${esc(f.selector)}</td><td>${esc(f.kind)}</td><td>${esc(f.severity)}</td><td>${esc(f.measure)}${f.text ? ` · «${esc(String(f.text).slice(0, 40))}»` : ''}</td><td>${grp(f)}</td>${fixes ? `<td>${fixedBy(f) ? 'arreglat' : 'pendent'}</td>` : ''}</tr>`).join('')}</tbody></table></section>`);

// ---- arreglos: parelles abans/després (només codis que existeixen a shots-before/)
let pairs = '';
if (hasBefore) {
  const before = readdirSync(beforeDir).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)).sort();
  const byC = Object.fromEntries(caps.map(c => [c.code, c]));
  const items = before.map(code => byC[code] && { c: byC[code], b: thumb('before', beforeDir, byC[code]) }).filter(x => x && x.b && x.c.after);
  pairs = items.length ? `<h3>Abans / després (${items.length} parelles)</h3><div class="pairs">${items.map(({ c, b }) => `<figure><div class="pr"><div><img src="${url(b)}"><small>abans</small></div><div><img src="${url(c.after)}"><small>després</small></div></div><figcaption><b>${esc(c.code)}</b><span>${(byCode[c.code] ?? []).length} troballes ara</span></figcaption></figure>`).join('')}</div>` : '<p class="note">shots-before/ no té cap codi que coincideixi amb les captures actuals.</p>';
}
parts.push(`<section id="arreglos"><h2>Arreglos (abans / després)</h2>${fixesF2 ? `<div class="fixes">${md(fixesF2)}</div>` : ''}${fixesF1 ? `<div class="fixes">${md(fixesF1)}</div>` : ''}${fixes ? '' : '<p class="note">Encara no hi ha fixes.md: res a descriure.</p>'}${pairs || (hasBefore ? '' : '<p class="note">Encara no hi ha shots-before/: sense parelles.</p>')}</section>`);

const css = `@page{size:A4;margin:14mm 12mm 16mm}*{box-sizing:border-box}body{font:8.5pt/1.35 -apple-system,Helvetica,Arial,sans-serif;color:#222;margin:0}
h1{font-size:24pt;margin:30mm 0 2mm}h2{font-size:15pt;margin:0 0 3mm;border-bottom:1.5px solid #b8860b;padding-bottom:1mm}h3{font-size:10.5pt;margin:4mm 0 1.5mm}h4{font-size:8.5pt;margin:2mm 0 1mm;color:#555}
section{break-before:page}section.cover{break-before:auto}.sub{font-size:12pt;color:#666;margin:0 0 8mm}.note{color:#666;font-size:7.5pt}
code{font:7.5pt ui-monospace,Menlo,monospace;background:#f1ece0;padding:0 1mm}a{color:#0b5cad;text-decoration:none}
table.t{border-collapse:collapse;width:100%;margin:1mm 0 3mm}.t th,.t td{border:.5px solid #ccc;padding:.8mm 1.4mm;text-align:left;vertical-align:top}.t th{background:#f3eee2}.t tr{break-inside:avoid}.t thead{display:table-header-group}
.kv th{width:28mm}.f{font-size:6.5pt}.f .sel{font:6pt ui-monospace,Menlo,monospace;word-break:break-all}.nw{white-space:nowrap}tr.alta td:nth-child(4){color:#b00020;font-weight:700}tr.mitjana td:nth-child(4){color:#b36b00;font-weight:700}
h3.scene{margin-top:5mm;break-after:avoid;font-size:11pt;background:#f3eee2;padding:1.5mm 2mm}h3.scene small{font-weight:400;color:#666;font-size:7pt;display:block}
.grid{display:grid;gap:2.5mm}.grid.p{grid-template-columns:repeat(5,1fr)}.grid.l{grid-template-columns:repeat(3,1fr)}
figure{margin:0;break-inside:avoid;border:1px solid #ddd;padding:1mm;border-radius:1mm}figure.hi{border:1.6px solid #d32f2f;background:#fff4f4}figure.mid{border:1.4px solid #d99a1a}
figure img{width:100%;display:block;border:.5px solid #bbb}figcaption{display:flex;justify-content:space-between;gap:1mm;font-size:6.5pt;margin-top:.7mm;flex-wrap:wrap}figcaption span{color:#666}figure.hi figcaption span{color:#b00020;font-weight:700}
.vp h4{break-after:avoid}.vp{break-inside:avoid;margin-bottom:2mm}.pairs{display:grid;grid-template-columns:repeat(2,1fr);gap:3mm}.pr{display:grid;grid-template-columns:1fr 1fr;gap:1mm}.pr small{font-size:6pt;color:#666;display:block;text-align:center}
.fixes h3,.fixes h4,.fixes h5{margin:3mm 0 1mm}.toc{padding-left:5mm}.toc li{margin:1mm 0}`;
const html = `<!doctype html><html lang="ca"><meta charset="utf-8"><style>${css}</style><body>${parts.join('\n')}</body></html>`;
writeFileSync(join(TMP, 'inventari.html'), html);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(url(join(TMP, 'inventari.html')), { waitUntil: 'load' });
  await page.pdf({ path: join(DIR, 'inventari.pdf'), format: 'A4', printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:7px;width:100%;text-align:center;color:#666">Inventari UI i18n · pàg. <span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
} finally { await browser.close(); }
console.log(`OK ${join(DIR, 'inventari.pdf')} (${(statSync(join(DIR, 'inventari.pdf')).size / 1e6).toFixed(1)} MB)`);
