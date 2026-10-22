#!/usr/bin/env node
// Eina de desenvolupament (no entra al build ni a Pages): inventari de pantalles + auditoria automàtica per a la revisió UI de l'i18n.
// i18n-ok: eina de dev — les cadenes catalanes d'aquest fitxer són noms d'escena i heurístiques, no text del joc.
//
// Construeix el joc (`vite build --outDir /tmp/ui-inv-dist`), el serveix en local i, amb Chrome headless amb la GPU real (`--soft` = swiftshader per a tot; la unitat de S24 «gpu» ja el fa servir sola),
// captura cada ESCENA × VIEWPORT × IDIOMA a docs/i18n-ui-inventory/shots/<codi>.png; el CODI és estable:
//   S<nn>-V<n>-<idioma>[-<variant>]      p. ex. S03-V3-ja, S13-V7-ca-s3, S02-V3-ca-rm
// A cada captura passa l'auditoria (DOM + text del canvas) i escriu docs/i18n-ui-inventory/findings.json i README.md.
//
// Ús (Playwright NOMÉS en un directori nou sota /tmp, mai al repo ni global):
//   mkdir /tmp/ui-inv-pw && cd /tmp/ui-inv-pw && npm init -y && npm i playwright
//   node tools/ui-inventory.mjs [opcions]
//     --pw=<dir>        directori on és instal·lat playwright (defecte /tmp/ui-inv-pw)
//     --no-build        reutilitza /tmp/ui-inv-dist (si no, torna a construir)
//     --scenes=S02,S13  només aquestes escenes        --vps=V1,V3   només aquests viewports
//     --langs=ca,de     només aquests idiomes         --soft        SwiftShader per a tot (S24 «gpu» ho fa sola)
//     --list            escriu el pla (codis) i surt   --report     només regenera README.md des de findings.json
//     --src=<dir> --out=<dir> --dist=<dir>   construeix i desa des d'un altre checkout (referència HEAD)
//     --compress        passa pngquant (si és instal·lat) a les captures: mateixa mida, paleta quantitzada (per defecte NO)
// Les execucions parcials FUSIONEN amb findings.json (substitueixen els codis tornats a capturar).
// No arregla res del joc: només inventaria. Tot és `?mute`, sempre; els navegadors i el servidor es tanquen en acabar.
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { lock, launchBrowser } from './capture-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
// --src/--out/--dist: capture another checkout (e.g. `git archive HEAD` in /tmp) as a before/after reference without touching this one
const SRC = args.src ?? ROOT, OUT = args.out ?? join(ROOT, 'docs/i18n-ui-inventory'), SHOTS = join(OUT, 'shots'), DIST = args.dist ?? '/tmp/ui-inv-dist';
const list = k => (args[k] ? args[k].split(',') : null);

// ---------------------------------------------------------------- viewports, idiomes
export const VPS = {
  V1: [320, 568, 'mòbil petit, vertical (tàctil)'], V2: [375, 667, 'iPhone SE/8, vertical (tàctil)'], V3: [393, 852, 'iPhone 16, vertical (tàctil)'],
  V4: [667, 375, 'mòbil horitzontal petit (finestra d’escriptori; la coberta de gira és S28)'], V5: [852, 393, 'mòbil horitzontal gran (finestra d’escriptori; coberta de gira S28)'],
  V6: [768, 1024, 'tauleta vertical (finestra d’escriptori; coberta de gira S28)'], V7: [1280, 800, 'escriptori'], V8: [1440, 700, 'escriptori ample i baix'], V9: [1920, 1080, 'escriptori gran'],
};
const ALL_VPS = Object.keys(VPS), STRESS_VPS = ['V1', 'V3', 'V7'], TOUCH_VPS = new Set(['V1', 'V2', 'V3']);
const EXTRA_LANGS = ['de', 'ja', 'ru', 'es', 'pseudo']; // de i pseudo: estressos de llargada; ja/ru: escriptures; es: castellà
const ALL_LANGS = ['ca', ...EXTRA_LANGS];

// ---------------------------------------------------------------- escenes
// run(h) deixa la pantalla a punt; el harness captura i audita. `how` = com s'hi arriba (va al README).
const $c = (h, sel) => h.page.evaluate(s => { const e = document.querySelector(s); if (!e) throw new Error(`no ${s}`); e.click(); }, sel);
const has = (h, sel) => h.page.evaluate(s => { const e = document.querySelector(s); return Boolean(e && e.checkVisibility?.()); }, sel);
const closeAll = h => h.page.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
const wait = (h, ms = 900) => h.page.waitForTimeout(ms);
const press = (h, key) => h.page.keyboard.press(key);
const state = h => h.page.evaluate(() => window.__dbg?.G?.state);
const until = (h, fn, arg, ms = 30000) => h.page.waitForFunction(fn, arg, { timeout: ms });
const open = (h, id) => until(h, i => document.getElementById(i)?.open, id, 40000);

async function toSelect(h) {
  if ((await state(h)) === 'splash') await press(h, 'Enter');
  await until(h, () => window.__dbg.G.state === 'select' && document.getElementById('select')?.checkVisibility?.(), null, 40000);
  await wait(h, 2200);
}
const backToStepOne = async h => { if ((await state(h)) === 'splash') await toSelect(h); await closeAll(h); if (await has(h, '#select-figures-back')) await $c(h, '#select-figures-back').catch(() => {}); await wait(h, 400); };
const dialogFlow = (btn, id, from = '#settings') => async h => { await closeAll(h); await $c(h, from); await open(h, 'settings-menu'); if (btn) { await $c(h, btn); await open(h, id); } await wait(h, 900); };

const SELECT = [
  { code: 'S01', name: 'Splash («TOCA AQUÍ PER ENTRAR»)', how: 'càrrega de la pàgina; espera la coberta aixecada', run: async h => { await wait(h, 800); }, boot: 'splash' },
  { code: 'S02', name: 'Selector, pas 1 (Mulassa)', how: 'Enter a la splash → G.state=select', run: async h => { await toSelect(h); } },
  { code: 'S06', name: '⚙ Configuració (amb selector d’idioma)', how: 'clic a #settings', run: dialogFlow(null, 'settings-menu') },
  { code: 'S08', name: 'Ajusta la sincronia', how: '⚙ → #settings-sync', run: dialogFlow('#settings-sync', 'sync-menu') },
  { code: 'S21', name: 'Privadesa', how: '⚙ → #settings-privacy', run: dialogFlow('#settings-privacy', 'privacy-menu') },
  { code: 'S07', name: 'Com es juga', how: 'clic a #howto (o #select-howto)', run: async h => { await closeAll(h); await $c(h, (await has(h, '#howto')) ? '#howto' : '#select-howto'); await open(h, 'howto-menu'); await wait(h); } },
  { code: 'S20', name: 'Feedback (Bústia)', how: 'clic a #feedback', run: async h => { await closeAll(h); await $c(h, '#feedback'); await open(h, 'feedback-menu'); await wait(h); } },
  { code: 'S03', name: 'Selector, pas 2 (nivells)', how: 'pas 1 → #select-next («TRIA DIFICULTAT»)', run: async h => { await backToStepOne(h); await $c(h, '#select-next'); await wait(h, 1400); } },
  { code: 'S31', name: 'Aviat a la plaça (panell del plec, sense figura)', how: 'pas 1 → clic a la targeta del plec (.sel-more): el panell pendent mostra la invitació', run: async h => { await backToStepOne(h); await $c(h, '.sel-card.sel-more'); await wait(h, 2200); } },
  { code: 'S04', name: 'Figura pendent (informació inline)', how: 'pas 1 → pastilla d’una vila amb figures pendents (Tarragona)', run: async h => { await backToStepOne(h); await $c(h, '.sel-pill[data-town="tarragona"]'); await wait(h, 2200); } },
  { code: 'S05', name: 'Mode foto (joc lliure)', how: 'pas 1 amb figura jugable → #select-free', run: async h => { await closeAll(h); await $c(h, '.sel-card:not(.aviat):not(.sel-more)'); await wait(h, 900); await $c(h, '#select-free'); await wait(h, 2500); } },
];
const SELECT_FINE = [ // variant: punter fi en un viewport de mòbil
  { code: 'S02', variant: 'fine', name: 'Selector, pas 1 amb punter fi', how: 'com S02 però amb ratolí (sense hasTouch)', run: async h => { await toSelect(h); } },
  { code: 'S03', variant: 'fine', name: 'Selector, pas 2 amb punter fi', how: 'com S03 però amb ratolí', run: async h => { await toSelect(h); await $c(h, '#select-next'); await wait(h, 1400); } },
];
const SELECT_RM = [{ code: 'S02', variant: 'rm', name: 'Selector, pas 1 amb moviment reduït', how: 'com S02 amb prefers-reduced-motion', run: async h => { await toSelect(h); } }];
const HINTS = [
  { code: 'S24', variant: 'gpu', name: 'Consell de dispositiu: acceleració per maquinari', how: 'WebGL en programari (swiftshader) → greeting al selector inactiu', run: async h => { await toSelect(h); await open(h, 'gpu-hint-menu'); await wait(h); } },
  { code: 'S24', variant: 'ios', name: 'Consell de dispositiu: iPhone/pantalla completa', how: 'UA d’iPhone Safari fora de la icona + gpu-hint desat', run: async h => { await toSelect(h); await open(h, 'ios-hint-menu'); await wait(h); } },
];
const NOTICE = [{ code: 'S23', name: 'Avís d’estadístiques', how: '?mock&account=guest sense stats-notice vist → greeting al selector', run: async h => { await toSelect(h); await open(h, 'stats-notice-menu'); await wait(h); } }];

const PRACTICE = [
  { code: 'S10', name: 'Pràctica', how: 'selector → __dbg.startPractice()', run: async h => { await toSelect(h); await h.page.evaluate(() => window.__dbg.startPractice()); await wait(h, 6000); } },
  { code: 'S09', name: 'Pausa', how: 'a la pràctica, Escape → #pause-menu', run: async h => { await press(h, 'Escape'); await open(h, 'pause-menu'); await wait(h); } },
  { code: 'S09', variant: 'confirm', name: 'Pausa: confirmació de sortida', how: 'pausa → #exit → #pause-confirmation', run: async h => { await $c(h, '#exit'); await wait(h, 700); } },
];
const GAME = [
  { code: 'S11', name: 'Partida (HUD + carril)', how: '?autoplay&from=40 + tutorial fet → __dbg.choose(1)', run: async h => { await toSelect(h); await h.page.evaluate(() => window.__dbg.choose(1)); await wait(h, 5000); } },
  { code: 'S12', name: 'Col·lapse', how: 'a la partida, __dbg.collapse()', run: async h => { await h.page.evaluate(() => window.__dbg.collapse()); await wait(h, 1800); } },
];
const GAME_RM = [{ ...GAME[0], variant: 'rm', name: 'Partida amb moviment reduït' }];
const GAME_FINE = [{ ...GAME[0], variant: 'fine', name: 'Partida amb punter fi' }];
const results = (code, variant, name, query) => ({ code, variant, name, how: `${query}; espera els resultats`, group: 'results', query,
  run: async h => { await until(h, () => document.querySelector('#results-actions')?.checkVisibility?.(), null, 40000).catch(() => {}); await wait(h, 3500); } }); // no __dbg here: reading it marks a debug run
const review = (code, variant, name, state, dialog, extra) => ({ code, variant, name, how: `?final&review=${state}`, query: `final&review=${state}`, group: 'review',
  run: async h => { await open(h, dialog); await h.page.waitForFunction(() => !document.querySelector('dialog[open] .mula-spinner'), null, { timeout: 25000 }).catch(() => {}); await wait(h, 1800); await extra?.(h); } });
const WIDE = ALL_VPS; // el català a tots; la resta d'idiomes a STRESS_VPS (llevat que l'escena digui el contrari)

export const SCENES = [
  { group: 'select', scenes: SELECT, query: 'mock', storage: { 'gpu-hint': 'off', 'ios-hint': 'off' } },
  { group: 'select-fine', scenes: SELECT_FINE, query: 'mock', pointer: 'fine', vps: ['V3'], langs: ['ca'], storage: { 'gpu-hint': 'off', 'ios-hint': 'off' } },
  { group: 'select-rm', scenes: SELECT_RM, query: 'mock', rm: true, vps: ['V3'], langs: ['ca'], storage: { 'gpu-hint': 'off', 'ios-hint': 'off' } },
  { group: 'hint-gpu', scenes: [HINTS[0]], query: 'mock', storage: { 'ios-hint': 'off' }, vps: STRESS_VPS, langs: ['ca', 'de', 'ja'] },
  { group: 'hint-ios', scenes: [HINTS[1]], query: 'mock', storage: { 'gpu-hint': 'off' }, ua: 'iphone', vps: STRESS_VPS.slice(0, 2), langs: ['ca', 'de'] },
  { group: 'notice', scenes: NOTICE, query: 'mock&account=guest', storage: { 'gpu-hint': 'off', 'ios-hint': 'off' }, vps: [...STRESS_VPS, 'V8'] },
  { group: 'practice', scenes: PRACTICE, query: 'mock', storage: { 'gpu-hint': 'off', 'ios-hint': 'off' } },
  { group: 'game', scenes: GAME, query: 'mock&autoplay&from=40', storage: { tutorial: 'done', 'gpu-hint': 'off', 'ios-hint': 'off' } },
  { group: 'game-rm', scenes: GAME_RM, query: 'mock&autoplay&from=40', rm: true, vps: ['V3'], langs: ['ca'], storage: { tutorial: 'done', 'gpu-hint': 'off', 'ios-hint': 'off' } },
  { group: 'game-fine', scenes: GAME_FINE, query: 'mock&autoplay&from=40', pointer: 'fine', vps: ['V3'], langs: ['ca'], storage: { tutorial: 'done', 'gpu-hint': 'off', 'ios-hint': 'off' } },
  { group: 'results', scenes: [results('S13', '', 'Resultats (2 estrelles)', 'stars=2')] },
  { group: 'results-s0', scenes: [results('S13', 's0', 'Resultats amb 0 estrelles', 'stars=0')], vps: ['V3', 'V7'], langs: ['ca'] },
  { group: 'results-s3', scenes: [results('S13', 's3', 'Resultats amb 3 estrelles', 'stars=3')], vps: ['V3', 'V7'], langs: ['ca'] },
  { group: 'results-rm', scenes: [results('S13', 'rm', 'Resultats amb moviment reduït', 'stars=2')], rm: true, vps: ['V3'], langs: ['ca'] },
  { group: 'review-share', query: 'final', scenes: [{ ...review('S14', '', 'Compartir (Història 9:16)', 'final', 'share-menu'), how: '?final → «Publica el teu resultat» → «Ara no» → s’obre Comparteix',
      run: async h => { await open(h, 'publish-menu'); await wait(h, 800); await $c(h, '#publish-cancel'); await open(h, 'share-menu'); await h.page.waitForFunction(() => !document.querySelector('#share-menu .mula-spinner:not([hidden])') && document.getElementById('share-image') && !document.getElementById('share-image').disabled, null, { timeout: 30000 }).catch(() => {}); await wait(h, 1500); } },
    { ...review('S14', 'feed', 'Compartir (Publicació 4:5)', 'final', 'share-menu'), how: 'Comparteix → #share-format-feed', run: async h => { await $c(h, '#share-format-feed'); await wait(h, 3500); } }] },
  { group: 'review-board', scenes: [review('S15', '', 'Classificació', 'board', 'board-menu'),
    { ...review('S30', '', 'Classificació després del salt (#board-jump)', 'board', 'board-menu'), how: '?final&review=board → clic a #board-jump (al capdamunt: l’enllaç passa a «A la meva fila»)', run: async h => { await $c(h, '#board-jump'); await wait(h, 1600); } }] },
  { group: 'podium', scenes: [{ code: 'S29', name: 'Selector, pas 2: podi del nivell amb el teu nom', how: '?mock&board=me → pas 2 (#select-podium, només ≥ 600×600)', run: async h => { await toSelect(h); await open(h, 'stats-notice-menu').catch(() => {}); await $c(h, '#stats-notice-ok').catch(() => {}); await wait(h, 600); await $c(h, '#select-next'); await until(h, () => !document.getElementById('select-podium')?.hidden, null, 15000).catch(() => {}); await wait(h, 1400); } }],
    query: 'mock&board=me', vps: ['V6', 'V7', 'V8', 'V9'], vpsOther: ['V7'], storage: { 'gpu-hint': 'off', 'ios-hint': 'off' } },
  { group: 'review-profile', scenes: [review('S16', '', 'Perfil', 'profile-guest', 'account-menu')] },
  { group: 'review-seasons', scenes: [review('S17', '', 'Saló de la fama', 'seasons', 'seasons-menu')] },
  { group: 'review-season-end', scenes: [review('S18', '', 'Fi de temporada', 'season-end', 'season-end-menu')] },
  { group: 'review-card', scenes: [review('S19', '', 'Fitxa de jugador', 'card', 'card-menu')] },
  { group: 'review-publish', scenes: [review('S22', '', 'Publica el teu resultat', 'publish', 'publish-menu')] },
  { group: 'loader', scenes: [{ code: 'S25', variant: 'load', name: 'Carregador (Avisant a la brigada…)', how: 'càrrega, captura a ~1 s abans que el carregador s’aixequi', run: async () => {} }],
    boot: 'loader', vps: STRESS_VPS, langs: ALL_LANGS, vpsOther: ['V3'] },
  { group: 'loader-error', scenes: [{ code: 'S25', variant: 'error', name: 'Targeta d’error de càrrega', how: 'es bloqueja el paquet principal → el boot-watchdog mostra la targeta', run: async h => { await until(h, () => document.getElementById('loader')?.classList.contains('fail'), null, 90000); await wait(h, 1200); } }],
    boot: 'blocked', vps: STRESS_VPS, langs: ALL_LANGS, vpsOther: ['V3'] },
  { group: 'lang-suggest', scenes: [{ code: 'S26', name: 'Suggeriment d’idioma (navigator.languages=es, sense desat)', how: 'context locale es-ES sense ?lang ni desat → #lang-tip a la splash', run: async h => { await until(h, () => document.getElementById('lang-tip'), null, 30000); await wait(h, 800); } }],
    boot: 'splash', noLang: true, locale: 'es-ES', storage: { 'gpu-hint': 'off' }, vps: STRESS_VPS, langs: ['ca'] },
  { group: 'lang-notice', scenes: [{ code: 'S27', name: 'Avís d’idioma no carregat (ja)', how: '?lang=ja amb el paquet del català bloquejat → #lang-notice', run: async h => { await until(h, () => document.getElementById('lang-notice'), null, 40000); await h.page.evaluate(() => { document.getElementById('loader').style.display = 'none'; }); await wait(h, 300); } }], // the cover is lifted by hand: it would hide the 6 s notice
    boot: 'blockLocale', forceLang: 'ja', vps: STRESS_VPS, langs: ['ca'] },
  { group: 'rotate', scenes: [{ code: 'S28', name: 'Coberta «gira el mòbil» (tàctil)', how: 'context tàctil (hasTouch) en un viewport horitzontal/tauleta + mode foto', run: async h => { await toSelect(h); await $c(h, '#select-free').catch(() => {}); await wait(h, 2000); } }],
    pointer: 'touch', vps: ['V4', 'V5', 'V6'], vpsOther: ['V4'], query: 'mock', storage: { 'gpu-hint': 'off', 'ios-hint': 'off' } },
];

// ---------------------------------------------------------------- pla
export function plan() {
  const units = [], vpsF = list('vps'), langsF = list('langs'), scenesF = list('scenes');
  for (const g of SCENES) for (const lang of ALL_LANGS) for (const vp of ALL_VPS) {
    if (langsF && !langsF.includes(lang)) continue; if (vpsF && !vpsF.includes(vp)) continue;
    if (g.langs && !g.langs.includes(lang)) continue;
    const vpsOk = lang === 'ca' ? (g.vps ?? WIDE) : (g.vpsOther ?? (g.vps ? g.vps.filter(v => STRESS_VPS.includes(v)) : STRESS_VPS));
    if (!vpsOk.includes(vp)) continue;
    const scenes = g.scenes.filter(s => !scenesF || scenesF.includes(s.code));
    if (scenes.length) units.push({ g, lang, vp, scenes });
  }
  return units;
}
export const codeOf = (s, vp, lang) => `${s.code}-${vp}-${lang}${s.variant ? `-${s.variant}` : ''}`;

// ---------------------------------------------------------------- servidor i build
export function build() {
  if (args['no-build'] && existsSync(join(DIST, 'index.html'))) return;
  const r = spawnSync('npx', ['vite', 'build', '--outDir', DIST, '--emptyOutDir'], { cwd: SRC, stdio: 'inherit' });
  if (r.status) throw new Error('vite build failed');
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
export function serve() {
  return new Promise(res => {
    const srv = createServer((q, r) => {
      let p = join(DIST, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html';
      try { const d = readFileSync(p); r.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); r.end(d); } catch { r.writeHead(404); r.end(); }
    }).listen(0, '127.0.0.1', () => res({ srv, port: srv.address().port }));
  });
}

// ---------------------------------------------------------------- l'auditoria (s'executa a la pàgina)
export const CANVAS_HOOK = () => {
  const seen = (window.__ct = new Map());
  for (const fn of ['fillText', 'strokeText']) {
    const orig = CanvasRenderingContext2D.prototype[fn];
    CanvasRenderingContext2D.prototype[fn] = function (t, x, y, mw) {
      try {
        const s = String(t);
        if (s.trim() && seen.size < 700) {
          const tr = this.getTransform(), w = this.measureText(s).width * Math.hypot(tr.a, tr.b), X = tr.a * x + tr.c * y + tr.e, al = this.textAlign;
          const left = al === 'center' ? X - w / 2 : al === 'right' || al === 'end' ? X - w : X;
          seen.set(`${s}|${this.font}`, { text: s, font: this.font, left, right: left + w, cw: this.canvas.width, mw: mw ?? null });
        }
      } catch { /* the hook never breaks the game */ }
      return orig.apply(this, arguments);
    };
  }
};

function AUDIT({ lang, loader, catWords, shared }) {
  const out = [];
  const sel = el => {
    const parts = []; let e = el;
    for (let i = 0; e && e.nodeType === 1 && i < 4; i++, e = e.parentElement) {
      let s = e.tagName.toLowerCase(); if (e.id) { parts.unshift(`${s}#${e.id}`); break; }
      const c = [...e.classList].slice(0, 2).join('.'); if (c) s += `.${c}`; parts.unshift(s);
    }
    return parts.join(' > ');
  };
  const add = (kind, severity, el, measure, text) => out.push({ kind, severity, selector: typeof el === 'string' ? el : el ? sel(el) : null, measure, text: text ? String(text).slice(0, 90) : undefined });
  const modal = [...document.querySelectorAll('dialog[open]')].filter(d => d.matches(':modal')).pop();
  const root = modal || document.body, vw = innerWidth, vh = innerHeight;
  const skip = el => el.closest('#review-panel, #fps, script, style, template, noscript, .sr-only');
  const srOnly = el => { for (let p = el; p && p !== document.body; p = p.parentElement) { const r = p.getBoundingClientRect(); if (r.width <= 1 && r.height <= 1 && getComputedStyle(p).overflow !== 'visible' || getComputedStyle(p).clipPath === 'inset(50%)') return true; } return false; }; // visually hidden on purpose, read by screen readers
  const vis = el => el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) && !skip(el) && !srOnly(el);
  const scrollers = el => { const r = []; for (let p = el.parentElement; p && p !== root.parentElement; p = p.parentElement) { const o = getComputedStyle(p); if (/(auto|scroll)/.test(o.overflowX + o.overflowY)) r.push(p); } return r; };
  const clipped = el => { // the rect of el cut by every overflow-clipping ancestor; null when nothing of it shows
    let r = el.getBoundingClientRect(), L = r.left, T = r.top, R = r.right, B = r.bottom;
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const o = getComputedStyle(p); if (o.overflowX === 'visible' && o.overflowY === 'visible') continue;
      const q = p.getBoundingClientRect(); L = Math.max(L, q.left); T = Math.max(T, q.top); R = Math.min(R, q.right); B = Math.min(B, q.bottom);
    }
    return R - L > 0 && B - T > 0 ? { left: L, top: T, right: R, bottom: B } : null;
  };
  const els = [...root.querySelectorAll('*')].filter(vis);
  const KEY = /\b(ui|hud|game|html|boot|figures|services)\.[a-zA-Z]+\./, BAD = /\bundefined\b|\bNaN\b|\[object |\{\w+\}|\bnull\b/;
  const CAT = new Set(catWords), SH = new Set(shared[lang] ?? []);
  const KEEP = /\{\w+\}|(?<!\p{L})(?:GUAPA!?|GUA|PA|CREMA|CRE|MA)(?!\p{L})/gu;
  const checkString = (s, el, where, depth) => { // keys, placeholders, Catalan in a page of another language, pseudo text that skipped the catalogue
    if (KEY.test(s)) add('clau-visible', 'alta', el, where, s);
    else if (BAD.test(s)) add('placeholder-visible', 'alta', el, where, s);
    const elLang = (el?.closest?.('[lang]')?.lang || document.documentElement.lang).toLowerCase();
    const base = elLang.split('-')[0], isPseudo = elLang.includes('pseudo');
    if (base !== 'ca' && !isPseudo) {
      const hits = (s.match(/\p{L}[\p{L}'’·]*/gu) || []).map(w => w.toLowerCase()).filter(w => CAT.has(w) && !SH.has(w));
      if (hits.length) add('catala-en-altre-idioma', hits.length > 1 ? 'mitjana' : 'baixa', el, where, `${hits.join(',')}: ${s}`);
    } else if (isPseudo && depth !== undefined) {
      const bare = s.replace(KEEP, '').replace(/[\d\s\p{P}\p{S}~]/gu, '');
      if (/\p{L}/u.test(bare) && /(?<!\p{L})\p{Ll}{4,}/u.test(s.replace(KEEP, "")) && !/[\[\]~]/.test(s) && !depth.inside) add('pseudo-sense-passar-pel-cataleg', 'baixa', el, where, s);
      const hits = (s.match(/\p{L}[\p{L}'’·]*/gu) || []).map(w => w.toLowerCase()).filter(w => CAT.has(w));
      if (hits.length && !/[\[\]~]/.test(s) && !depth.inside) add('catala-en-altre-idioma', 'mitjana', el, where, `${hits.join(',')}: ${s}`);
    }
  };
  // --- text nodes: strings + ink overflow
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const chars = new Map(), noteChars = (s, fam) => { for (const ch of s) if (ch.codePointAt(0) > 127 && (ch.codePointAt(0) & 0xfffe) !== 0xfffe && !/[\s\u200b-\u200f\ufe00-\ufe0f]/u.test(ch)) chars.set(`${fam}|${ch}`, [fam, ch]); };
  const seenText = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement, t = n.textContent.trim(); if (!t || !el || !vis(el)) continue;
    const box = (() => { let b = el; while (b && getComputedStyle(b).display === 'inline') b = b.parentElement; return b || el; })();
    const full = box.textContent, at = full.indexOf(n.textContent);
    let depthN = 0; for (const c of full.slice(0, Math.max(0, at))) { if (c === '[') depthN++; else if (c === ']') depthN--; }
    checkString(t, el, 'text', { inside: depthN > 0 });
    noteChars(t, getComputedStyle(el).fontFamily);
    const r = document.createRange(); r.selectNodeContents(n); const q = r.getBoundingClientRect(); if (!q.width) continue;
    const bs = getComputedStyle(box), bq = box.getBoundingClientRect(), inScroll = scrollers(box).length;
    if (bs.display !== 'contents' && bq.width && !inScroll && !seenText.has(box)) {
      const over = Math.max(q.right - bq.right, bq.left - q.left);
      if (over > 1.5 && !/(auto|scroll)/.test(bs.overflowX)) { seenText.add(box); add('text-desbordat', 'alta', box, `text ${Math.round(q.left)}..${Math.round(q.right)} · caixa ${Math.round(bq.left)}..${Math.round(bq.right)} (+${Math.round(over)} px)`, t); }
      else if (q.bottom - bq.bottom > 6 && bs.overflowY === 'visible' && bs.height !== 'auto' && q.height) { seenText.add(box); add('text-desbordat-vertical', 'baixa', box, `+${Math.round(q.bottom - bq.bottom)} px per sota`, t); }
    }
  }
  // --- attributes and pseudo-element text
  for (const el of els) {
    for (const a of ['aria-label', 'title', 'placeholder', 'alt']) { const v = el.getAttribute(a); if (v && /\p{L}/u.test(v)) checkString(v, el, `@${a}`); }
    for (const ps of ['::before', '::after']) {
      const c = getComputedStyle(el, ps).content;
      if (c && c !== 'none' && c !== 'normal' && /^["']/.test(c)) { const s = c.slice(1, -1); if (/\p{L}{3}/u.test(s)) checkString(s, el, ps); }
    }
  }
  // --- clipping (overflow hidden/clip, ellipsis, line-clamp): only when text really sticks out (a decorative ::before bigger than its cover is no clipping)
  const inkOut = (el, axis) => {
    const b = el.getBoundingClientRect(), w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let worst = 0;
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!n.textContent.trim() || !n.parentElement.checkVisibility?.()) continue;
      const r = document.createRange(); r.selectNodeContents(n); const q = r.getBoundingClientRect(); if (!q.width) continue;
      worst = Math.max(worst, axis === 'x' ? Math.max(q.right - b.right, b.left - q.left) : Math.max(q.bottom - b.bottom, b.top - q.top));
    }
    return worst;
  };
  // y: a text range's rect is the font's content area (Baloo 2's runs past its letters), so a few px over the clip is no clipped ink
  for (const el of els) {
    const cs = getComputedStyle(el); if (cs.display === 'inline' || el.clientWidth < 3 || !el.textContent.trim() || el.id === 'select') continue;
    const hidX = /(hidden|clip)/.test(cs.overflowX), hidY = /(hidden|clip)/.test(cs.overflowY), ell = cs.textOverflow === 'ellipsis';
    if (hidX && el.scrollWidth > el.clientWidth + 2 && (ell || inkOut(el, 'x') > 2)) add('text-tallat', 'alta', el, `scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}${ell ? ' · text-overflow:ellipsis' : ''}`, el.textContent.trim());
    else if (hidY && el.scrollHeight > el.clientHeight + 2 && inkOut(el, 'y') > Math.max(2, 0.3 * parseFloat(cs.fontSize))) add('text-tallat', 'alta', el, `scrollHeight ${el.scrollHeight} > clientHeight ${el.clientHeight}`, el.textContent.trim());
  }
  // --- dialog / card overflow (an internal scroll the conventions forbid)
  if (modal) { const card = modal; if (card.scrollHeight > card.clientHeight + 2) add('scroll-intern', 'baixa', card, `scrollHeight ${card.scrollHeight} > clientHeight ${card.clientHeight}`); }
  // --- interactive elements: off-screen, tiny targets, overlaps
  const inter = els.filter(e => e.matches('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=switch], [role=option], summary') && !e.disabled && e.getAttribute('aria-hidden') !== 'true' && getComputedStyle(e).pointerEvents !== 'none');
  const hit = (el, x, y) => { if (x < 0 || y < 0 || x >= vw || y >= vh) return true; const h = document.elementFromPoint(x, y); return Boolean(h && (el === h || el.contains(h) || h.contains(el) && h.tagName === 'LABEL' || (el.closest('label') && el.closest('label') === h.closest('label')))); };
  const coverOf = (t, el) => { for (let p = t; p && p !== document.body; p = p.parentElement) { const r = p.getBoundingClientRect(); if (r.width >= 0.9 * vw && r.height >= 0.9 * vh) return !p.contains(el); } return false; };
  const rects = [];
  for (const el of inter) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const c = clipped(el); if (!c) continue;
    const cx0 = (c.left + c.right) / 2, cy0 = (c.top + c.bottom) / 2, top0 = cx0 >= 0 && cy0 >= 0 && cx0 < vw && cy0 < vh ? document.elementFromPoint(cx0, cy0) : el;
    if (top0 && top0 !== el && !el.contains(top0) && !top0.contains(el) && !(el.closest('label') && el.closest('label') === top0.closest('label')) && coverOf(top0, el)) continue; // under a full-screen cover (the rotate cover over photo mode): not reachable, so neither a target nor an overlap; a button over a button stays a finding
    rects.push([el, c]);
    if (!scrollers(el).length && (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1)) add('fora-del-viewport', 'alta', el, `${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)} en ${vw}x${vh}`, el.textContent.trim());
    const cut = scrollers(el).length && (c.top > r.top + 0.5 || c.bottom < r.bottom - 0.5 || c.top - 22 < scrollers(el)[0].getBoundingClientRect().top || c.bottom + 22 > scrollers(el)[0].getBoundingClientRect().bottom); // a row at a scroller's edge: scrolling brings its whole target in
    if (!cut && (r.width < 43.5 || r.height < 43.5)) {
      const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2, d = 21.5;
      if (![[cx - d, cy], [cx + d, cy], [cx, cy - d], [cx, cy + d]].every(([x, y]) => hit(el, x, y)))
        add('objectiu-menor-de-44', Math.min(r.width, r.height) < 32 ? 'alta' : 'mitjana', el, `${Math.round(r.width)}x${Math.round(r.height)} px`, el.getAttribute('aria-label') || el.textContent.trim());
    }
  }
  for (let i = 0; i < rects.length && i < 160; i++) for (let j = i + 1; j < rects.length && j < 160; j++) {
    const [a, A] = rects[i], [b, B] = rects[j]; if (a.contains(b) || b.contains(a)) continue;
    const w = Math.min(A.right, B.right) - Math.max(A.left, B.left), h = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top); if (w < 3 || h < 3) continue;
    const small = Math.min((A.right - A.left) * (A.bottom - A.top), (B.right - B.left) * (B.bottom - B.top));
    add('botons-solapats', w * h >= 0.25 * small ? 'alta' : 'mitjana', `${sel(a)} ⟷ ${sel(b)}`, `${Math.round(w)}x${Math.round(h)} px (${Math.round(100 * w * h / small)} % del més petit)`);
  }
  // --- canvas text (the HUD is drawn, not DOM): clipped sprites, keys, Catalan, pseudo
  for (const c of window.__ct?.values() ?? []) {
    checkString(c.text, 'canvas', 'canvas', lang === 'pseudo' ? { inside: false } : undefined);
    noteChars(c.text, c.font);
    if (c.mw == null && (c.left < -1.5 || c.right > c.cw + 1.5) && c.cw < 2000) add('text-canvas-tallat', 'mitjana', 'canvas', `text ${Math.round(c.left)}..${Math.round(c.right)} en un llenç de ${c.cw} px`, c.text);
  }
  for (const o of out.slice()) if (o.selector === 'canvas') o.selector = 'canvas (HUD/sprite)';
  // --- tofu: a character whose glyph is the font's .notdef box (same pixels as an unassigned code point)
  const cv = document.createElement('canvas'); cv.width = cv.height = 48; const g = cv.getContext('2d', { willReadFrequently: true });
  const sig = (fam, ch) => { g.clearRect(0, 0, 48, 48); g.font = `32px ${fam}`; g.fillText(ch, 4, 36); let s = 0; const d = g.getImageData(0, 0, 48, 48).data; for (let i = 3; i < d.length; i += 4) s = (s * 31 + d[i]) | 0; return s; };
  const nd = new Map();
  for (const [fam, ch] of [...chars.values()].slice(0, 400)) {
    const famC = fam.replace(/^\d+(\.\d+)?px\s+/, '').replace(/^(italic|bold|\d{3})\s+/g, '');
    if (!nd.has(famC)) nd.set(famC, [sig(famC, '\u{10FFFF}'), sig(famC, '￿')]);
    const s = sig(famC, ch);
    if (nd.get(famC).includes(s)) add('glif-absent-tofu', 'alta', null, `U+${ch.codePointAt(0).toString(16).toUpperCase()} amb ${famC.slice(0, 40)}`, ch);
  }
  // --- balanced layout (uipolish/scripts/measure-rows.js): margins and dead bands in the leaf cards
  if (window.measureRows) {
    const cands = modal ? [...modal.children].filter(c => vis(c) && [...c.children].filter(vis).length >= 3) : ['#select-info', '#select-bottom', '#select-act'].map(s => document.querySelector(s)).filter(e => e && vis(e));
    cands.slice(0, 8).forEach((el, i) => {
      el.setAttribute('data-mr', i); let m; try { m = window.measureRows(`[data-mr="${i}"]`); } catch { m = null; } el.removeAttribute('data-mr');
      if (!m || m.error || !m.gaps || m.gaps.length < 3 || m.overflow > 2 || m.gaps.some(x => x < -1)) return; // a scrolling or clipped card has no honest rhythm
      const top = m.gaps[0], bot = m.gaps.at(-1), inner = m.gaps.slice(1, -1).slice().sort((a, b) => a - b), med = inner[Math.floor(inner.length / 2)] || 0;
      if (Math.abs(top - bot) > Math.max(10, 0.5 * Math.max(top, bot))) add('marges-desiguals', Math.abs(top - bot) > 28 ? 'mitjana' : 'baixa', el, `marge superior ${top} · inferior ${bot} (gaps ${m.gaps.join('/')})`);
      const worst = Math.max(...inner); if (inner.length >= 2 && worst > 24 && worst > 2.5 * Math.max(med, 4)) add('buit-mort', 'baixa', el, `forat de ${worst} px entre files (mediana ${med}; gaps ${m.gaps.join('/')})`);
    });
  }
  return out;
}

// paraules catalanes freqüents i NO compartides amb altres idiomes d'aquest inventari (heurística; coincidència exacta, en minúscula)
export const CAT_WORDS = ('això amb però també perquè sense tens ets vols pots encara els tanca desa fitxa jugadors classificació puntuació cançó dificultat ' + // i18n-ok: eina de dev
  'fàcil mateix aquest aquesta aquests aquestes dels són està estan nostre teva teus teves resultat resultats estadístiques privadesa sobrenom classificacions temporades ' + // i18n-ok: eina de dev
  'estrelles contrasenya correu').split(/\s+/); // i18n-ok: eina de dev
const SHARED = { es: ['ball'], de: ['ball'] }; // words a tested language also uses

// ---------------------------------------------------------------- execució d'una unitat (grup × vp × idioma)
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

async function newCtx(browser, u, port, extra = {}) {
  const [w, h] = VPS[u.vp], g = u.g;
  const touch = (g.pointer ?? (TOUCH_VPS.has(u.vp) ? 'touch' : 'fine')) === 'touch';
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch, reducedMotion: g.rm ? 'reduce' : 'no-preference',
    locale: g.locale ?? 'ca-ES', ...(g.ua === 'iphone' && { userAgent: UA_IPHONE }), ...extra });
  await ctx.addInitScript(CANVAS_HOOK);
  if (u.lang === 'pseudo') await ctx.addInitScript(WATCHDOG_BYPASS);
  const storage = g.storage ?? {};
  await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('__ui_inv')) { sessionStorage.setItem('__ui_inv', '1'); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } } catch {} }, storage);
  if (g.ua === 'iphone') await ctx.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => false }));
  return ctx;
}
const entryScript = () => readFileSync(join(DIST, 'index.html'), 'utf8').match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1];
// ?lang=pseudo on the built bundle: index.html's boot watchdog fires 'module-init' (entry `load` before main.js finished awaiting the locale)
// and swaps the cover for the error card, so nothing could be captured. The harness ignores that one reason and reports it as a finding.
const WATCHDOG_BYPASS = () => {
  let real; Object.defineProperty(window, '__mulassaFail', { configurable: true, get: () => (...a) => { if (a[3] === 'module-init' && window.__mulassaBooted !== true) { window.__ignoredModuleInit = true; return; } return real?.(...a); }, set: f => { real = f; } });
};
let localeChunk = null;
function findLocaleChunk(code) { // the dist chunk holding that locale's catalogue: the one string of it that no other chunk contains
  if (localeChunk) return localeChunk;
  const chunks = readdirSync(join(DIST, 'assets')).filter(f => f.endsWith('.js')).map(f => [f, readFileSync(join(DIST, 'assets', f), 'utf8')]);
  const strings = Object.values(JSON.parse(readFileSync(join(ROOT, `src/i18n/locales/${code}/ui.json`), 'utf8'))).filter(v => typeof v === 'string' && v.length > 12);
  for (const v of strings) { const key = v.slice(0, 14), hit = chunks.filter(([, c]) => c.includes(key)); if (hit.length === 1) return (localeChunk = hit[0][0]); }
  return null;
}

export async function bootPage(browser, u, port, h) {
  const g = u.g, ctx = await newCtx(browser, u, port, h.ctxOpts); await h.onCtx?.(ctx); const page = await ctx.newPage();
  h.ctx = ctx; h.page = page; h.errors = [];
  page.on('pageerror', e => h.errors.push(String(e.message).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error' && !/WebGL|GL Driver|Failed to load resource|favicon/.test(m.text())) h.errors.push(m.text().slice(0, 160)); });
  const lang = g.forceLang ?? u.lang;
  if (g.boot === 'blocked') { const e = entryScript(); await page.route(x => x.pathname === e, r => r.abort()); }
  if (g.boot === 'blockLocale') { const f = findLocaleChunk(lang); if (!f) throw new Error('no locale chunk'); await page.route(x => x.pathname.endsWith(`/${f}`), r => r.abort()); }
  const q = ['mute', g.query ?? g.scenes[0].query, g.noLang || lang === 'ca' ? '' : `lang=${lang}`].filter(Boolean).join('&');
  await page.goto(`http://127.0.0.1:${port}/?${q}`, { waitUntil: 'commit', timeout: 120000 });
  if (g.boot === 'loader') { await page.waitForSelector('#loader', { timeout: 60000 }); await page.waitForTimeout(1100); return; }
  if (g.boot === 'blocked' || g.boot === 'blockLocale') return; // these capture while the cover is still up (the notice lasts 6 s from the splash state)
  await page.waitForFunction(() => { const l = document.getElementById('loader'); const gone = !l || l.hidden || getComputedStyle(l).display === 'none' || getComputedStyle(l).opacity === '0' || !l.checkVisibility?.();
    if (l?.classList.contains('fail')) throw new Error('el joc no ha arrencat (targeta d’error)'); return '__dbg' in window && gone; }, null, { timeout: 150000 });
  await page.waitForTimeout(900);
}

async function auditPage(h, u) {
  const loader = ['loader', 'blocked', 'blockLocale'].includes(u.g.boot);
  return h.page.evaluate(AUDIT, { lang: u.lang === 'pseudo' ? 'ca-x-pseudo' : u.g.forceLang ?? u.lang, loader, catWords: CAT_WORDS, shared: SHARED });
}

async function runUnit(browser, u, port, measureSrc, record) {
  const h = {}; let booted = false; // h.reported: the pseudo watchdog finding goes on the unit's first capture only
  const closeCtx = async () => { await h.ctx?.close().catch(() => {}); h.ctx = null; };
  for (const s of u.scenes) {
    const code = codeOf(s, u.vp, u.lang), file = join(SHOTS, `${code}.png`), meta = { code, scene: s.code, vp: u.vp, lang: u.lang, variant: s.variant ?? '', group: u.g.group };
    let ok = false, findings = [], err;
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      try {
        if (!booted) { await bootPage(browser, u, port, h); booted = true; }
        await s.run(h);
        if (measureSrc) await h.page.evaluate(measureSrc).catch(() => {});
        await h.page.screenshot({ path: file, type: 'png', timeout: 90000 });
        findings = await auditPage(h, u);
        if (!h.reported && await h.page.evaluate(() => window.__ignoredModuleInit === true)) { h.reported = true; findings.push({ kind: 'boot-watchdog-module-init', severity: 'alta', selector: 'script#boot-watchdog', measure: 'amb ?lang=pseudo el watchdog mostra la targeta d’error (reason module-init) abans que main.js acabi; l’inventari l’ignora', text: 'Ups! No s’ha pogut carregar' }); }
        if (h.errors.length) findings.push({ kind: 'error-de-consola', severity: 'mitjana', selector: null, measure: `${h.errors.length} error(s)`, text: [...new Set(h.errors)].join(' | ').slice(0, 200) });
        ok = true;
      } catch (e) { err = String(e.message).split('\n')[0].slice(0, 160); const dbg = await h.page?.evaluate(() => `${window.__dbg?.G?.state}; abertes: ${[...document.querySelectorAll('dialog[open]')].map(d => d.id)}; loader: ${document.getElementById('loader')?.className}`).catch(() => ''); err += dbg ? ` [${dbg}]` : ''; await closeCtx(); booted = false; }
    }
    if (!ok) findings = [{ kind: 'captura-fallida', severity: 'alta', selector: null, measure: err, text: s.how }];
    record({ ...meta, file: ok ? `shots/${code}.png` : null, ok, name: s.name }, findings.map(f => ({ capture: code, ...f })));
    console.log(`${ok ? '✓' : '✗'} ${code}  ${findings.length} troballes${ok ? '' : `  (${err})`}`);
    h.errors = [];
  }
  await closeCtx();
}

// ---------------------------------------------------------------- informe
const SEV = { alta: 0, mitjana: 1, baixa: 2 };
function writeReport(db) {
  const cap = db.captures, fin = db.findings, by = {}; for (const f of fin) (by[f.severity] ??= []).push(f);
  const cnt = c => fin.filter(f => f.capture === c.code).length;
  const sevN = s => (by[s] ?? []).length;
  const scenes = new Map(); for (const c of cap) if (!scenes.has(c.scene)) scenes.set(c.scene, c);
  const L = [];
  L.push('# Inventari de pantalles i auditoria UI (i18n)', '', `Generat per \`tools/ui-inventory.mjs\` · ${db.generated} · ${cap.length} captures (${cap.filter(c => c.ok).length} correctes) · captures a \`shots/\`, troballes completes a \`findings.json\`.`, '',
    `**Troballes:** ${sevN('alta')} altes · ${sevN('mitjana')} mitjanes · ${sevN('baixa')} baixes. Les captures són a mida real (deviceScaleFactor 1), sense reduir; ${db.config.compressed ? 'passades per pngquant (mateixa mida, paleta quantitzada)' : 'PNG sense comprimir'}.`, '',
    'Tot amb `?mock` (dades de prova, «MODE PROVA»), sempre `?mute`. Punter: tàctil a V1–V3, fi a la resta; les variants `-fine`, `-rm` (moviment reduït), `-s0/-s3` (estrelles), `-feed`, `-confirm`, `-load/-error`, `-gpu/-ios` s’indiquen al codi.', '', '## Viewports', '', '| Codi | Mida | Quan té sentit |', '| --- | --- | --- |');
  for (const [k, [w, h, n]] of Object.entries(VPS)) L.push(`| ${k} | ${w}×${h} | ${n} |`);
  L.push('', 'El català es captura a tots els viewports; de, ja, ru, es i `pseudo` a V1, V3 i V7 (de i pseudo = estressos de llargada; ja/ru = escriptures). Els mòbils horitzontals i les tauletes verticals es revisen com a finestres d’escriptori (AGENTS.md); amb tàctil mostren la coberta de gira (S28).', '',
    '## Escenes i rutes', '', '| Escena | Nom | Com s’hi arriba |', '| --- | --- | --- |');
  for (const [k, c] of [...scenes].sort()) L.push(`| ${k} | ${c.name.replace(/\|/g, '/')} | ${(db.how[k] ?? '').replace(/\|/g, '/')} |`);
  L.push('', '## Cobertura (idiomes capturats · troballes entre parèntesis)', '', `| Escena | ${Object.keys(VPS).join(' | ')} |`, `| --- | ${Object.keys(VPS).map(() => '---').join(' | ')} |`);
  for (const [k] of [...scenes].sort()) {
    const row = Object.keys(VPS).map(vp => {
      const cs = cap.filter(c => c.scene === k && c.vp === vp && !c.variant), extra = cap.filter(c => c.scene === k && c.vp === vp && c.variant);
      const cell = cs.map(c => `${c.ok ? '' : '✗'}${c.lang === 'pseudo' ? 'ps' : c.lang}(${cnt(c)})`).concat(extra.length ? [`+${extra.length} var.`] : []);
      return cell.join(' ') || '—';
    });
    L.push(`| ${k} | ${row.join(' | ')} |`);
  }
  const kinds = {}; for (const f of fin) { const e = (kinds[f.kind] ??= { n: 0, s: f.severity }); e.n++; if (SEV[f.severity] < SEV[e.s]) e.s = f.severity; }
  L.push('', '## Troballes per tipus', '', '| Tipus | Gravetat màx. | Nre |', '| --- | --- | --- |');
  for (const [k, v] of Object.entries(kinds).sort((a, b) => SEV[a[1].s] - SEV[b[1].s] || b[1].n - a[1].n)) L.push(`| ${k} | ${v.s} | ${v.n} |`);
  // grouped list: same kind+selector+text pattern across captures collapses to one line with its capture codes
  const grouped = new Map();
  for (const f of fin) { const key = `${f.severity}|${f.kind}|${f.selector}|${(f.text ?? '').slice(0, 40)}`; const g = grouped.get(key) ?? { ...f, codes: [] }; g.codes.push(f.capture); grouped.set(key, g); }
  const rows = [...grouped.values()].sort((a, b) => SEV[a.severity] - SEV[b.severity] || b.codes.length - a.codes.length);
  L.push('', `## Llista de troballes (agrupades per tipus + selector + text; ${rows.length} grups de ${fin.length})`, '', 'Cada fila: gravetat · tipus · selector · mesura d’una captura · codis (primers 6). Detall complet a `findings.json`.', '', '| Gravetat | Tipus | Selector | Mesura | Text | Captures |', '| --- | --- | --- | --- | --- | --- |');
  for (const g of rows.slice(0, 400)) L.push(`| ${g.severity} | ${g.kind} | \`${(g.selector ?? '—').replace(/\|/g, '/')}\` | ${(g.measure ?? '').replace(/\|/g, '/')} | ${(g.text ?? '').replace(/\|/g, '/')} | ${g.codes.length > 6 ? `${g.codes.slice(0, 6).join(', ')} (+${g.codes.length - 6})` : g.codes.join(', ')} |`);
  if (rows.length > 400) L.push('', `(… ${rows.length - 400} grups més a findings.json)`);
  L.push('', '## Límits coneguts', '', '- El text del canvas (HUD) només s’audita com a cadenes (claus, català, pseudo, glifs absents, esprits tallats), no com a posició final a la pantalla: es veu a les captures.',
    '- «Català en una pàgina d’un altre idioma» és una heurística de paraules; els noms propis i les dades de prova poden donar falsos positius (gravetat baixa/mitjana).',
    '- Els marges i buits morts usen `~/.agents/skills/uipolish/scripts/measure-rows.js` només a les targetes fulla (diàleg i els seus fills, `#select-info`, `#select-bottom`, `#select-act`).',
    '- Cap escena fabrica una partida real: S11/S12 van amb `?autoplay`, S13/S14/S15–S22 amb `?final`/`?stars` i el mock en memòria.');
  const fixes = join(OUT, 'fixes.md'); // the triage's B (already at HEAD) and C (tool false positives) with their reasons, kept by hand in fixes.md
  const fixes2 = join(OUT, 'fixes-integrat.md'); // F2: the merged state's triage, ahead of F1's
  if (existsSync(fixes2)) L.push('', '## Triatge F2 de l’estat integrat (`fixes-integrat.md`)', '', readFileSync(fixes2, 'utf8').replace(/^# .*\n/, '').replace(/^## /gm, '### ').trim());
  if (existsSync(fixes)) { const t = readFileSync(fixes, 'utf8'), at = t.indexOf('\n## B '); if (at >= 0) L.push('', '## Triatge F1 (de `fixes.md`; les A arreglades hi són detallades)', '', t.slice(at + 1).replace(/^## /gm, '### ').trim()); }
  writeFileSync(join(OUT, 'README.md'), `${L.join('\n')}\n`);
}

// ---------------------------------------------------------------- principal
async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const dbFile = join(OUT, 'findings.json'), db = existsSync(dbFile) ? JSON.parse(readFileSync(dbFile, 'utf8')) : { captures: [], findings: [], how: {}, config: {} };
  const save = () => { db.generated = new Date().toISOString().slice(0, 16).replace('T', ' '); writeFileSync(dbFile, JSON.stringify(db, null, 1)); };
  const units = plan();
  const total = units.reduce((n, u) => n + u.scenes.length, 0);
  for (const g of SCENES) for (const s of g.scenes) db.how[s.code] ??= s.how;
  if (args.list) { for (const u of units) for (const s of u.scenes) console.log(codeOf(s, u.vp, u.lang)); console.log(`${total} captures en ${units.length} càrregues`); return; }
  if (args.report) { writeReport(db); console.log('README.md regenerat'); return; }
  const pwDir = args.pw ?? '/tmp/ui-inv-pw', pwPath = join(pwDir, 'node_modules/playwright/index.mjs');
  if (!existsSync(pwPath)) throw new Error(`Playwright no és a ${pwDir}: mkdir ${pwDir} && cd ${pwDir} && npm init -y && npm i playwright`);
  const { chromium } = await import(pathToFileURL(pwPath).href);
  build();
  const measurePath = join(homedir(), '.agents/skills/uipolish/scripts/measure-rows.js');
  const measureSrc = existsSync(measurePath) ? readFileSync(measurePath, 'utf8') : null;
  if (!measureSrc) console.warn('measure-rows.js no trobat: sense auditoria de marges');
  const { srv, port } = await serve();
  await lock();
  let soft = !!args.soft; // S24 «gpu» needs a software renderer: its unit gets a SwiftShader browser, the rest the real GPU
  const launch = () => launchBrowser(chromium, { soft });
  const browsers = []; let next = 0, done = 0;
  const record = (cap, fs) => { // merge: a re-captured code replaces its old record and findings
    db.captures = db.captures.filter(c => c.code !== cap.code).concat(cap); db.findings = db.findings.filter(f => f.capture !== cap.code).concat(fs); save();
  };
  const worker = async () => {
    let b = await launch(); browsers.push(b);
    for (;;) {
      const u = units[next++]; if (!u) break;
      const need = !!args.soft || u.scenes.some(sc => sc.variant === 'gpu');
      if (need !== soft) { soft = need; await b.close().catch(() => {}); b = await launch(); browsers.push(b); }
      try { if (!b.isConnected()) { b = await launch(); browsers.push(b); } await runUnit(b, u, port, measureSrc, record); if (!b.isConnected()) { b = await launch(); browsers.push(b); await runUnit(b, u, port, measureSrc, record); } } catch (e) { console.error(`✗ unitat ${u.g.group} ${u.vp} ${u.lang}: ${String(e.message).split('\n')[0]}`); try { await b.close(); } catch {} b = await launch(); browsers.push(b); }
      console.log(`  [${++done}/${units.length} càrregues]`);
    }
    await b.close().catch(() => {});
  };
  try { await Promise.all(Array.from({ length: 1 }, worker)); }
  finally { for (const b of browsers) await b.close().catch(() => {}); srv.closeAllConnections?.(); srv.close(); }
  // optional: pngquant keeps the pixel size and quantises the palette; off unless --compress
  db.config.compressed = false;
  if (args.compress && spawnSync('pngquant', ['--version']).status === 0) {
    for (const f of readdirSync(SHOTS)) if (f.endsWith('.png')) spawnSync('pngquant', ['--force', '--skip-if-larger', '--quality', '80-100', '--speed', '3', '--output', join(SHOTS, f), join(SHOTS, f)]);
    db.config.compressed = true;
  }
  save(); writeReport(db);
  const size = readdirSync(SHOTS).reduce((n, f) => n + statSync(join(SHOTS, f)).size, 0);
  console.log(`fet: ${db.captures.length} captures, ${db.findings.length} troballes, ${(size / 1e6).toFixed(0)} MB de PNG → ${OUT}`);
}
// the video tool (ui-video.mjs) imports the scenes and the boot; only a direct run starts the inventory
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
