#!/usr/bin/env node
// Eina de desenvolupament (no entra al build ni a Pages): inventari de MOVIMENT de la revisió UI de l'i18n.
// i18n-ok: eina de dev — les cadenes catalanes d'aquest fitxer són noms i missatges d'informe, no text del joc.
//
// Reutilitza les escenes de tools/ui-inventory.mjs (S01–S31) i, per cada unitat (grup × viewport × idioma), grava UN vídeo de Playwright
// de tota la càrrega i de totes les escenes seguides; el talla en un clip per escena, amb el codi
//   M<nn>-V<n>-<idioma>[-<variant>]      (M = moviment; <nn> és el mateix número que l'escena S<nn>)
// Durant la gravació una instrumentació dins la pàgina (PerformanceObserver 'layout-shift', document.fonts, estil calculat, text visible,
// opacitat/visibilitat) envia cada fet amb la seva hora; després ffmpeg analitza els fotogrames (en blanc, parpelleigs de lluminositat).
// Ho escriu tot a docs/i18n-ui-inventory/video/{findings-video.json, M…mp4, frames/*.jpg}; README-video.md amb --report.
//
// Ús (Playwright NOMÉS sota /tmp/ui-inv-pw; ffmpeg només si ja hi és):
//   node tools/ui-video.mjs [--pw=/tmp/ui-inv-pw] [--no-build] [--scenes=S02,S03] [--vps=V3,V7] [--langs=ca,de] [--soft]
//       [--list] [--report] [--out=<dir>] [--src=<dir> --dist=<dir> (referència «abans»)] [--tag=abans]
//   Cobertura per defecte: V3 (tàctil) en ca de ja ru es pseudo; V7 (punter fi) en ca de ja ru; V5 (852×393) en ca.
import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lock, launchBrowser } from './capture-lib.mjs';
import { SCENES, VPS, plan, codeOf, build, serve, bootPage, CAT_WORDS } from './ui-inventory.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const INV = join(ROOT, 'docs/i18n-ui-inventory'), OUT = args.out ?? join(INV, 'video'), STATIC = join(INV, 'shots'), RAW = '/tmp/ui-vid-raw', WORK = '/tmp/ui-vid-work';
const TAG = args.tag ?? '';
const CLS_WARN = 0.05, CLS_ERR = 0.1, CAP_MS = 14000, SKEW = +(args.skew ?? 0); // SKEW: seconds added to the page→video clock (calibrated once by the pilot)
// Catalan catalogue strings whose translation in `lang` differs: seeing one of them on screen in that language = text that skipped the catalogue
const NS = ['hud', 'game', 'ui', 'services', 'html', 'boot', 'figures'], catalogs = {};
const loadCat = code => (catalogs[code] ??= Object.assign({}, ...NS.map(n => JSON.parse(readFileSync(join(ROOT, `src/i18n/locales/${code}/${n}.json`), 'utf8')))));
function untranslatedSet(lang) {
  if (lang === 'ca' || lang === 'pseudo') return [];
  const ca = loadCat('ca'), other = loadCat(lang), out = new Set();
  for (const [k, v] of Object.entries(ca)) if (typeof v === 'string' && v.length >= 8 && !/[{<]/.test(v) && typeof other[k] === 'string' && other[k] !== v) out.add(v);
  return [...out];
}
const FIND_CATALAN = (set) => { // visible text nodes, attributes and canvas strings equal to one of the Catalan strings
  const S = new Set(set), hits = [], seen = new Set();
  const norm = t => t.replace(/\s+/g, ' ').trim();
  const add = (t, where, el) => { t = norm(t); if (t.length >= 8 && S.has(t) && !seen.has(t)) { seen.add(t); hits.push({ text: t.slice(0, 80), where, el }); } };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const e = n.parentElement; if (e && e.checkVisibility?.() && !e.closest('.sr-only, [lang=ca], script, style')) add(n.textContent, 'dom', e.id ? `#${e.id}` : e.tagName.toLowerCase()); }
  for (const e of document.querySelectorAll('[aria-label],[title],[placeholder]')) if (e.checkVisibility?.() && !e.closest('[lang=ca]')) for (const a of ['aria-label', 'title', 'placeholder']) { const v = e.getAttribute(a); if (v) add(v, a, e.id ? `#${e.id}` : e.tagName.toLowerCase()); }
  for (const c of window.__ct?.values() ?? []) add(c.text.replace(/…$/, '…'), 'canvas', 'canvas');
  if (document.documentElement.lang !== 'ca' && !/pseudo/.test(document.documentElement.lang)) for (const e of document.querySelectorAll('body *')) for (const ps of ['::before', '::after']) { // words written in the stylesheet (`content:`) never go through the catalogue
    const c = getComputedStyle(e, ps).content;
    if (c && /^["']/.test(c) && !/" \/ /.test(c) && /\p{L}{4}/u.test(c) && e.checkVisibility?.() && !seen.has(c)) { seen.add(c); hits.push({ text: c.slice(1, -1).slice(0, 80), where: ps, el: e.id ? `#${e.id}` : e.tagName.toLowerCase() }); }
  }
  return hits;
};
const mCode = code => 'M' + code.slice(1);
const nap = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------- instrumentació dins la pàgina
const COLLECT = ({ catWords, shared, lang }) => {
  const q = [], send = (k, d) => { const m = { k, t: performance.timeOrigin + performance.now(), ...d }; if (window.__vidPush) window.__vidPush(m); else q.push(m); };
  setInterval(() => { while (q.length && window.__vidPush) window.__vidPush(q.shift()); }, 100);
  const sel = el => { const parts = []; let e = el; for (let i = 0; e && e.nodeType === 1 && i < 3; i++, e = e.parentElement) { let s = e.tagName.toLowerCase(); if (e.id) { parts.unshift(`${s}#${e.id}`); break; } const c = [...e.classList].slice(0, 2).join('.'); if (c) s += `.${c}`; parts.unshift(s); } return parts.join(' > '); };
  const rc = r => r && [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
  try {
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) send('ls', { v: e.value, at: performance.timeOrigin + e.startTime, src: (e.sources || []).slice(0, 6).map(s => ({ n: s.node ? sel(s.node) : '?', p: rc(s.previousRect), c: rc(s.currentRect) })) }); })
      .observe({ type: 'layout-shift', buffered: true });
  } catch { /* no layout-shift entries in this browser */ }
  const nFonts = () => [...document.fonts].filter(f => f.status === 'loaded').length;
  document.fonts?.addEventListener?.('loadingdone', e => send('font', { loaded: nFonts(), faces: e.fontfaces.map(f => `${f.family} ${f.weight}`).slice(0, 4) }));
  const born = performance.now();
  const FF = ['body', '#loader', '.btn', '#select-name', '.sel-card', '#select-info'];
  let ffPrev = '';
  const visibleText = () => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), o = []; for (let n = w.nextNode(); n; n = w.nextNode()) { const e = n.parentElement; if (n.textContent.trim() && e.checkVisibility?.() && !e.closest('.sr-only, [lang=ca], script, style')) o.push(n.textContent); } return o.join(' '); }; // not the sr-only summary, not the deliberate Catalan note
  const CAT = new Set(catWords), SH = new Set(shared[lang.split('-')[0]] ?? []), isPseudo = /pseudo/.test(lang), isCa = lang === 'ca';
  setInterval(() => {
    const age = performance.now() - born;
    const sig = FF.map(s => { const e = document.querySelector(s); return e ? getComputedStyle(e).fontFamily.split(',')[0].trim() : '-'; }).join('|') + '|' + nFonts();
    if (sig !== ffPrev) { ffPrev = sig; send('ff', { sig }); }
    if (!isCa && !isPseudo && age < 25000) { // Catalan words visible in a page of another language (the flash at start)
      const txt = visibleText(), hits = (txt.match(/\p{L}[\p{L}'’·]*/gu) || []).map(w => w.toLowerCase()).filter(w => CAT.has(w) && !SH.has(w));
      if (hits.length) send('cat', { hits: [...new Set(hits)].slice(0, 6), lang: document.documentElement.lang });
    }
  }, 120);
  const seen = new WeakMap();
  setInterval(() => {
    const els = document.querySelectorAll('dialog, #loader, #lang-tip, #lang-notice, #select, #select-info, #select-bottom, #select-act, #select-strip, #select-nav, .sel-card, #pause, #results-actions, #hud-top, .btn');
    for (let i = 0; i < els.length && i < 200; i++) {
      const e = els[i], cs = getComputedStyle(e), s = `${cs.display === 'none' ? 'n' : 'v'}|${cs.visibility}|${Math.round(cs.opacity * 5) / 5}`, p = seen.get(e);
      if (p !== undefined && p !== s) send('vis', { n: sel(e), from: p, to: s });
      seen.set(e, s);
    }
  }, 50);
};

// ---------------------------------------------------------------- moviment mínim i realista per escena (després del `run` de l'inventari)
const press = (h, k) => h.page.keyboard.press(k);
const click = (h, s) => h.page.evaluate(x => document.querySelector(x)?.click(), s).catch(() => {});
const isTouch = h => h.touch;
async function cdp(h) { return (h.cdp ??= await h.ctx.newCDPSession(h.page)); }
async function swipe(h, x0, y0, x1, y1, steps = 8) {
  if (isTouch(h)) {
    const c = await cdp(h), pt = (x, y) => [{ x, y, id: 1 }];
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(x0, y0) });
    for (let i = 1; i <= steps; i++) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps) }); await nap(16); }
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else { const m = h.page.mouse; await m.move(x0, y0); await m.down(); for (let i = 1; i <= steps; i++) { await m.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); await nap(16); } await m.up(); }
}
const rectOf = (h, s) => h.page.evaluate(x => { const r = document.querySelector(x)?.getBoundingClientRect(); return r && r.width ? { x: r.x, y: r.y, w: r.width, h: r.height } : null; }, s);
async function carousel(h, dir) { // one card to the right (dir 1) or left (-1): swipe on touch, the capsule's arrow with a fine pointer
  if (isTouch(h)) { const r = await rectOf(h, '#select-strip'); if (r) await swipe(h, r.x + r.w / 2 + dir * 90, r.y + r.h / 2, r.x + r.w / 2 - dir * 90, r.y + r.h / 2); }
  else await click(h, dir > 0 ? '#select-forward' : '#select-prev');
  await nap(1100);
}
const dialogOpen = h => h.page.evaluate(() => Boolean(document.querySelector('dialog[open]'))).catch(() => false);
const MOTION = {
  S02: async h => { await carousel(h, 1); await carousel(h, 1); await carousel(h, -1); },
  S03: async h => { await click(h, '#select-level button:nth-child(1)'); await nap(700); await click(h, '#select-level button:nth-child(3)'); await nap(700); await click(h, '#select-figures-back'); await nap(1200); },
  S04: async h => { await click(h, '.sel-pill:not([data-town="tarragona"])'); await nap(1400); },
  S31: async h => { await click(h, '.sel-pill:not([data-town="tarragona"])'); await nap(1400); },
  S05: async h => { await h.page.keyboard.down('w'); await nap(900); await h.page.keyboard.up('w'); const r = h.page.viewportSize(); await swipe(h, r.width * 0.7, r.height * 0.5, r.width * 0.5, r.height * 0.5); await nap(800); await press(h, 'Escape'); await nap(1200); },
  S10: async h => { for (const k of ['f', 'j', 'f', 'j']) { await press(h, k); await nap(450); } },
  S12: async h => { await nap(1800); },
  S15: async h => { await h.page.mouse.wheel(0, 500); await nap(600); await h.page.mouse.wheel(0, -500); await nap(600); },
  S17: async h => { await nap(600); },
  S25: async h => { if (h.scene.variant === 'load') await h.page.waitForFunction(() => { const l = document.getElementById('loader'); return !l || l.hidden || getComputedStyle(l).display === 'none' || getComputedStyle(l).opacity === '0'; }, null, { timeout: 60000 }).catch(() => {}); await nap(1500); },
};
const BOOTISH = new Set(['S01', 'S25', 'S26', 'S27']); // the clip starts at the navigation: the load is the subject

// escenes pròpies del vídeo: canvi d'idioma des de ⚙ (desa, recarrega, torna a arrencar)
const SWITCH = {
  group: 'lang-switch', query: 'mock', storage: { 'gpu-hint': 'off', 'ios-hint': 'off' },
  scenes: [{ code: 'S06', variant: 'switch', name: 'Canvi d’idioma des de ⚙ (desa i recarrega)', how: '⚙ → botó d’un altre idioma → recàrrega amb ?lang=',
    run: async h => {
      await press(h, 'Enter'); await h.page.waitForFunction(() => window.__dbg?.G?.state === 'select', null, { timeout: 40000 }); await nap(1500);
      await click(h, '#settings'); await h.page.waitForFunction(() => document.getElementById('settings-menu')?.open, null, { timeout: 20000 }); await nap(800);
      const to = h.u.lang === 'ca' ? 'de' : 'ca';
      await click(h, `#lang-${to}`);
      await h.page.waitForFunction(() => { const l = document.getElementById('loader'); return '__dbg' in window && window.__dbg?.G?.state && (!l || getComputedStyle(l).display === 'none' || getComputedStyle(l).opacity === '0'); }, null, { timeout: 120000 }).catch(() => {});
      await nap(2500);
    } }],
};

// ---------------------------------------------------------------- ffmpeg
const FF = (...a) => spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { maxBuffer: 1 << 28 });
function cut(raw, a, b, out) { return FF('-ss', a.toFixed(2), '-to', b.toFixed(2), '-i', raw, '-an', '-c:v', 'libx264', '-crf', '31', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out).status === 0; }
function frameJpg(mp4, t, out, wmax = 480) { return FF('-ss', Math.max(0, t).toFixed(2), '-i', mp4, '-frames:v', '1', '-vf', `scale='min(${wmax},iw)':-2`, '-q:v', '6', out).status === 0; }
function grayFrames(mp4) { // 25 fps, 96×64 grey: mean and mean absolute difference per frame
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', mp4, '-vf', 'fps=25,scale=96:64,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 29 });
  const buf = r.stdout, n = Math.floor(buf.length / 6144), mean = [], range = [], mad = [];
  for (let i = 0; i < n; i++) { let s = 0, lo = 255, hi = 0, d = 0; for (let j = 0; j < 6144; j++) { const v = buf[i * 6144 + j]; s += v; if (v < lo) lo = v; if (v > hi) hi = v; if (i) d += Math.abs(v - buf[(i - 1) * 6144 + j]); } mean.push(s / 6144); range.push(hi - lo); mad.push(i ? d / 6144 : 0); }
  return { n, mean, range, mad };
}
function ssim(a, b, rect) { // only the open sheet: the 3D behind it keeps dancing and would never match the still
  const c = rect ? `crop=${rect[2] & ~1}:${rect[3] & ~1}:${Math.max(0, rect[0])}:${Math.max(0, rect[1])}` : 'null', r = spawnSync('ffmpeg', ['-hide_banner', '-i', a, '-i', b, '-lavfi', `[0]${c}[x];[1]${c}[y];[x][y]ssim`, '-f', 'null', '-'], { encoding: 'utf8' }); return +(/All:([\d.]+)/.exec(r.stderr)?.[1] ?? NaN) || null; }

function analyseFrames(g) {
  const blank = i => g.range[i] <= 4 && (g.mean[i] >= 245 || g.mean[i] <= 6);
  let first = 0; while (first < g.n && blank(first)) first++;
  const midBlank = []; for (let i = first; i < g.n; i++) if (blank(i)) midBlank.push(+(i / 25).toFixed(2));
  const flick = [];
  for (let i = 1; i < g.n - 1; i++) { const d = Math.abs(g.mean[i] - g.mean[i - 1]); if (d < 12) continue; for (let j = i + 1; j <= Math.min(g.n - 1, i + 6); j++) if (Math.abs(g.mean[j] - g.mean[i - 1]) <= 3) { flick.push(+(i / 25).toFixed(2)); i = j; break; } }
  const jumps = []; for (let i = 1; i < g.n; i++) if (g.mad[i] >= 30) jumps.push(+(i / 25).toFixed(2));
  return { frames: g.n, leadBlankS: +(first / 25).toFixed(2), blankAfterContent: midBlank.length, blankAt: midBlank.slice(0, 6), flickerVideo: flick, abruptCuts: jumps.slice(0, 8) };
}

// ---------------------------------------------------------------- una unitat
async function runUnit(browser, u, port, record) {
  const id = `${u.g.group}-${u.vp}-${u.lang}`, rawDir = join(RAW, id); rmSync(rawDir, { recursive: true, force: true }); mkdirSync(rawDir, { recursive: true });
  const [w, hgt] = VPS[u.vp], touch = (u.g.pointer ?? (['V1', 'V2', 'V3'].includes(u.vp) ? 'touch' : 'fine')) === 'touch';
  const h = { u, touch, ctxOpts: { recordVideo: { dir: rawDir, size: { width: w, height: hgt } }, ...(args.nomobile && { isMobile: false }) }, events: [] };
  h.onCtx = async ctx => {
    h.tPage = Date.now();
    // the game goes fullscreen on a touch device (goFullscreen): in headless that resizes the recorded surface to 800×600 and the clip shows the page shrunk in a corner
    await ctx.addInitScript(() => { Element.prototype.requestFullscreen = Element.prototype.webkitRequestFullscreen = () => Promise.resolve(); });
    await ctx.exposeFunction('__vidPush', m => { h.events.push(m); });
    await ctx.addInitScript(COLLECT, { catWords: CAT_WORDS, shared: { es: ['ball'], de: ['ball'] }, lang: u.lang === 'pseudo' ? 'ca-x-pseudo' : (u.g.forceLang ?? u.lang) });
  };
  h.catSet = untranslatedSet(u.lang === 'pseudo' ? 'pseudo' : (u.g.forceLang ?? u.lang));
  const done = []; let bootErr = null;
  try { h.tBoot0 = Date.now(); await bootPage(browser, u, port, h); } catch (e) { bootErr = String(e.message).split('\n')[0].slice(0, 160); }
  h.tBoot1 = Date.now();
  for (const [i, s] of u.scenes.entries()) {
    const rec = { s, i, t0: Date.now(), err: bootErr };
    if (!bootErr) {
      h.scene = s;
      try { await s.run(h); rec.runEnd = Date.now(); rec.dlg = await dialogOpen(h); const first = await h.page.evaluate(FIND_CATALAN, h.catSet).catch(() => []); await (MOTION[s.code] ?? (async () => {}))(h); if (await dialogOpen(h)) await nap(1500); rec.untranslated = [...first, ...(await h.page.evaluate(FIND_CATALAN, h.catSet).catch(() => [])).filter(x => !first.some(y => y.text === x.text))]; rec.dlgRect = await h.page.evaluate(() => { const d = [...document.querySelectorAll('dialog[open]')].pop(), r = d?.getBoundingClientRect(); return r && r.width ? [r.x, r.y, r.width, r.height].map(Math.round) : null; }).catch(() => null); if (await dialogOpen(h)) { rec.runEnd = Date.now(); await press(h, 'Escape'); await nap(900); } }
      catch (e) { rec.err = String(e.message).split('\n')[0].slice(0, 160); }
      rec.consoleErrors = [...new Set(h.errors ?? [])].slice(0, 3); h.errors = [];
    }
    if (!bootErr && Date.now() - rec.t0 < 4500) await nap(4500 - (Date.now() - rec.t0)); // 4–8 s per clip
    rec.t1 = Date.now(); done.push(rec);
  }
  const video = h.page?.video?.();
  const tClose = Date.now();
  await h.ctx?.close().catch(() => {});
  const rawPath = video ? await video.path().catch(() => null) : null;
  // the recording starts later than the page (the browser is busy compiling shaders): its end is the close, so the offset is what the raw length lacks
  if (rawPath) { const d = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', rawPath], { encoding: 'utf8' }).trim(); h.offset = Number.isFinite(d) ? (tClose - h.tPage) / 1000 - d : 0; }
  for (const rec of done) await finish(h, u, rec, rawPath, record);
}

async function finish(h, u, rec, rawPath, record) {
  const s = rec.s, code = codeOf(s, u.vp, u.lang), mc = mCode(code), vt = e => (e - h.tPage) / 1000 - (h.offset ?? 0) + SKEW;
  const meta = { code: mc, scene: s.code, static: code, vp: u.vp, lang: u.lang, variant: s.variant ?? '', group: u.g.group, name: s.name, how: s.how, pointer: h.touch ? 'tàctil' : 'punter fi', size: VPS[u.vp].slice(0, 2).join('×') };
  const fin = [];
  if (!rawPath || rec.err) { record({ ...meta, ok: false }, [{ kind: 'captura-fallida', severity: 'alta', measure: rec.err ?? 'sense vídeo', text: s.how }]); console.log(`✗ ${mc}  ${rec.err ?? 'sense vídeo'}`); return; }
  const first = rec.i === 0, bootish = BOOTISH.has(s.code) && first;
  const tA = bootish ? h.tBoot0 : first ? Math.max(h.tPage, h.tBoot1 - 3000) : rec.t0 - 300, tB = Math.min(rec.t1, tA + CAP_MS);
  const a = Math.max(0, vt(tA)), b = vt(tB), out = join(OUT, `${mc}${TAG ? `-${TAG}` : ''}.mp4`);
  if (!cut(rawPath, a, b, out)) { record({ ...meta, ok: false }, [{ kind: 'captura-fallida', severity: 'alta', measure: 'ffmpeg no ha tallat el clip', text: s.how }]); return; }
  const ev = h.events.filter(e => e.k !== 'ls' ? e.t >= tA && e.t <= tB : e.at >= tA && e.at <= tB);
  const loadEv = first ? h.events.filter(e => (e.k !== 'ls' ? e.t : e.at) <= h.tBoot1) : [];
  // --- CLS: tot el clip, i la càrrega a part (només a la primera escena de la unitat)
  const shifts = ev.filter(e => e.k === 'ls').sort((x, y) => x.at - y.at), cls = shifts.reduce((n, e) => n + e.v, 0), clsLoad = loadEv.filter(e => e.k === 'ls').reduce((n, e) => n + e.v, 0);
  const nodes = new Map(); for (const e of shifts) for (const sr of e.src) { const n = nodes.get(sr.n) ?? { selector: sr.n, shifts: 0, maxMovePx: 0, example: null }; n.shifts++; const d = sr.p && sr.c ? Math.max(Math.abs(sr.c[0] - sr.p[0]), Math.abs(sr.c[1] - sr.p[1]), Math.abs(sr.c[2] - sr.p[2]), Math.abs(sr.c[3] - sr.p[3])) : 0; if (d >= n.maxMovePx) { n.maxMovePx = d; n.example = { from: sr.p, to: sr.c }; } nodes.set(sr.n, n); }
  const shiftList = shifts.map(e => ({ t: +(vt(e.at) - a).toFixed(2), value: +e.v.toFixed(4), nodes: e.src.map(x => x.n) }));
  const clsAll = cls, tag = x => `${x}`;
  if (clsAll >= CLS_ERR) fin.push({ kind: 'cls-error', severity: 'alta', selector: [...nodes.keys()].slice(0, 3).join(' · '), measure: `CLS ${clsAll.toFixed(3)} en ${shifts.length} canvis`, text: tag([...nodes.values()].sort((x, y) => y.maxMovePx - x.maxMovePx).slice(0, 3).map(n => `${n.selector} (${n.maxMovePx}px)`).join(' · ')) });
  else if (clsAll >= CLS_WARN) fin.push({ kind: 'cls-avis', severity: 'mitjana', selector: [...nodes.keys()].slice(0, 3).join(' · '), measure: `CLS ${clsAll.toFixed(3)} en ${shifts.length} canvis`, text: [...nodes.values()].sort((x, y) => y.maxMovePx - x.maxMovePx).slice(0, 3).map(n => `${n.selector} (${n.maxMovePx}px)`).join(' · ') });
  else if (clsAll >= 0.001 && nodes.size) fin.push({ kind: 'cls-menor', severity: 'baixa', selector: [...nodes.keys()].slice(0, 3).join(' · '), measure: `CLS ${clsAll.toFixed(3)}`, text: [...nodes.values()].slice(0, 3).map(n => `${n.selector} (${n.maxMovePx}px)`).join(' · ') });
  // --- fonts i família efectiva
  const ffs = (first ? loadEv.concat(ev.filter(e => !loadEv.includes(e))) : ev).filter(e => e.k === 'ff'), fonts = (first ? loadEv.concat(ev) : ev).filter(e => e.k === 'font');
  const lateFonts = fonts.filter(e => e.t > h.tBoot1 - 500);
  if (first && ffs.length > 2) fin.push({ kind: 'canvis-de-font', severity: 'baixa', selector: 'document.fonts', measure: `${ffs.length} canvis de família efectiva, ${fonts.length} càrregues de font`, text: ffs.slice(0, 4).map(e => e.sig.split('|').slice(0, 3).join('/')).join(' → ') });
  if (lateFonts.length && cls > 0) fin.push({ kind: 'font-tardana-amb-salt', severity: 'mitjana', selector: 'document.fonts', measure: `${lateFonts.length} font(s) carregades amb la pantalla ja visible`, text: lateFonts.map(e => e.faces?.join(',')).join(' | ').slice(0, 120) });
  // --- flaix de català
  if (u.lang !== 'pseudo' && u.lang !== 'ca' && s.code !== 'S27') {
    const cats = (first ? loadEv.concat(ev.filter(e => !loadEv.includes(e))) : ev).filter(e => e.k === 'cat');
    if (cats.length) { const w = new Set(cats.flatMap(e => e.hits)); fin.push({ kind: 'flaix-de-catala', severity: cats.length >= 3 ? 'alta' : 'mitjana', selector: 'document', measure: `~${(cats.length * 0.12).toFixed(2)} s amb paraules catalanes visibles (html lang=${cats[0].lang})`, text: [...w].slice(0, 6).join(', ') }); }
  }
  // --- parpelleig al DOM: A → B → A en < 200 ms
  const vis = ev.filter(e => e.k === 'vis'), byEl = new Map(); for (const e of vis) (byEl.get(e.n) ?? byEl.set(e.n, []).get(e.n)).push(e);
  const flick = []; for (const [n, es] of byEl) for (let i = 0; i + 1 < es.length; i++) if (es[i].from === es[i + 1].to && es[i + 1].t - es[i].t < 200 && es[i].from !== es[i].to) flick.push({ n, from: es[i].from, mid: es[i].to, ms: Math.round(es[i + 1].t - es[i].t) });
  const flickN = new Map(); for (const f of flick) flickN.set(f.n, (flickN.get(f.n) ?? 0) + 1);
  if (flickN.size) fin.push({ kind: 'parpelleig-dom', severity: 'mitjana', selector: [...flickN.keys()].slice(0, 3).join(' · '), measure: `${flick.length} anada-i-tornada de visibilitat/opacitat en < 200 ms`, text: flick.slice(0, 2).map(f => `${f.from}→${f.mid}→${f.from} ${f.ms} ms`).join(' · ') });
  // --- fotogrames
  const g = analyseFrames(grayFrames(out)), dur = +(g.frames / 25).toFixed(1);
  if (g.blankAfterContent >= 3) fin.push({ kind: 'fotogrames-buits', severity: 'mitjana', selector: null, measure: `${g.blankAfterContent} fotogrames en blanc/negre ja amb contingut (a ${g.blankAt.join(', ')} s)`, text: s.name });
  if (g.flickerVideo.length) fin.push({ kind: 'parpelleig-video', severity: 'mitjana', selector: null, measure: `${g.flickerVideo.length} salt(s) de lluminositat que tornen en < 0,25 s (a ${g.flickerVideo.slice(0, 4).join(', ')} s)`, text: s.name });
  if (rec.untranslated?.length) fin.push({ kind: 'catala-sense-traduir', severity: 'alta', selector: [...new Set(rec.untranslated.map(x => x.el))].slice(0, 3).join(' · '), measure: `${rec.untranslated.length} text(os) del catàleg català a una pàgina en ${u.lang}`, text: rec.untranslated.slice(0, 3).map(x => `${x.where}: ${x.text}`).join(' | ') });
  for (const c of rec.consoleErrors ?? []) fin.push({ kind: 'error-de-consola', severity: 'mitjana', selector: null, measure: 'error durant el vídeo', text: c });
  // --- fotogrames clau (JPEG petits) i últim estat contra la captura estàtica
  mkdirSync(join(OUT, 'frames'), { recursive: true });
  const keys = [['inici', 0.1], ['mig', dur / 2], ['final', Math.max(0, dur - 0.3)]];
  for (const sh of [...shiftList].sort((x, y) => y.value - x.value).slice(0, 3)) keys.push([`salt-${sh.t.toFixed(1)}s`, sh.t + 0.05]);
  const frames = [];
  for (const [nm, t] of keys) { const f = `${mc}-${TAG ? TAG + '-' : ''}${nm}.jpg`; if (frameJpg(out, Math.min(t, Math.max(0, dur - 0.05)), join(OUT, 'frames', f))) frames.push({ name: nm, t: +t.toFixed(2), file: `frames/${f}` }); }
  let sim = null;
  const stat = join(STATIC, `${code}.png`);
  if (rec.runEnd && existsSync(stat) && rec.dlg) { mkdirSync(WORK, { recursive: true }); const lf = join(WORK, `${mc}-end.png`); for (const back of [1.0, 0.7, 0.4]) { // the clip's clock is only good to a few tenths: the best of three frames while the sheet stands
      if (FF('-ss', Math.max(0, vt(rec.runEnd) - a - back).toFixed(2), '-i', out, '-frames:v', '1', lf).status === 0) { const v = ssim(lf, stat, rec.dlgRect); if (v != null && (sim == null || v > sim)) sim = v; }
    }
    rmSync(lf, { force: true }); }
  if (sim != null && sim < 0.85) fin.push({ kind: 'final-vs-estatica', severity: 'baixa', selector: null, measure: `SSIM ${sim.toFixed(3)} entre l’últim estat del clip i la captura estàtica ${code}`, text: s.name });
  record({ ...meta, ok: true, tag: TAG, file: `${mc}${TAG ? `-${TAG}` : ''}.mp4`, durationS: dur, bytes: statSync(out).size, cls: +cls.toFixed(4), clsLoad: +clsLoad.toFixed(4), shifts: shiftList, nodes: [...nodes.values()].sort((x, y) => y.maxMovePx - x.maxMovePx).slice(0, 8),
    fontChanges: ffs.length, fontLoads: fonts.length, catalanFlashMs: u.lang === 'ca' ? 0 : Math.round(ev.filter(e => e.k === 'cat').length * 120), domFlicker: flick.length, video: g, ssimEnd: sim, frames }, fin.map(f => ({ capture: mc, ...f })));
  console.log(`✓ ${mc}  ${dur}s CLS ${cls.toFixed(3)}  ${fin.length} troballes`);
}

// ---------------------------------------------------------------- pla i execució
const dbFile = join(OUT, `findings-video${TAG ? `-${TAG}` : ''}.json`);
function planVideo() {
  const units = plan().filter(x => x.vp === 'V3' || (x.vp === 'V7' && ['ca', 'de', 'ja', 'ru'].includes(x.lang)) || (x.vp === 'V5' && x.lang === 'ca'));
  const sw = [['V3', 'ca'], ['V3', 'ja'], ['V7', 'ca'], ['V7', 'ru']].filter(([v, l]) => (!args.vps || args.vps.split(',').includes(v)) && (!args.langs || args.langs.split(',').includes(l)) && (!args.scenes || args.scenes.split(',').includes('S06')));
  for (const [vp, lang] of sw) units.push({ g: SWITCH, lang, vp, scenes: SWITCH.scenes });
  return units;
}
async function main() {
  mkdirSync(OUT, { recursive: true });
  const db = existsSync(dbFile) ? JSON.parse(readFileSync(dbFile, 'utf8')) : { captures: [], findings: [], config: { clsWarn: CLS_WARN, clsError: CLS_ERR, capMs: CAP_MS } };
  const save = () => { db.generated = new Date().toISOString().slice(0, 16).replace('T', ' '); writeFileSync(dbFile, JSON.stringify(db, null, 1)); };
  const units = planVideo();
  if (args.list) { for (const u of units) for (const s of u.scenes) console.log(mCode(codeOf(s, u.vp, u.lang))); console.log(`${units.reduce((n, u) => n + u.scenes.length, 0)} vídeos en ${units.length} càrregues`); return; }
  const pwPath = join(args.pw ?? '/tmp/ui-inv-pw', 'node_modules/playwright/index.mjs');
  if (!existsSync(pwPath)) throw new Error('Playwright no és a /tmp/ui-inv-pw');
  const { chromium } = await import(pathToFileURL(pwPath).href);
  build();
  const { srv, port } = await serve();
  await lock();
  const launch = () => launchBrowser(chromium, { soft: !!args.soft });
  const browsers = []; let next = 0, done = 0;
  const record = (cap, fs) => { db.captures = db.captures.filter(c => c.code !== cap.code).concat(cap); db.findings = db.findings.filter(f => f.capture !== cap.code).concat(fs); save(); };
  const worker = async () => {
    let b = await launch(); browsers.push(b);
    for (;;) {
      const u = units[next++]; if (!u) break;
      try { if (!b.isConnected()) { b = await launch(); browsers.push(b); } await runUnit(b, u, port, record); } catch (e) { console.error(`✗ unitat ${u.g.group} ${u.vp} ${u.lang}: ${String(e.message).split('\n')[0]}`); try { await b.close(); } catch {} b = await launch(); browsers.push(b); }
      console.log(`  [${++done}/${units.length} càrregues]`);
    }
    await b.close().catch(() => {});
  };
  try { await Promise.all(Array.from({ length: 1 }, worker)); }
  finally { for (const b of browsers) await b.close().catch(() => {}); srv.closeAllConnections?.(); srv.close(); rmSync(RAW, { recursive: true, force: true }); rmSync(WORK, { recursive: true, force: true }); }
  save();
  console.log(`fet: ${db.captures.length} vídeos, ${db.findings.length} troballes`);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
