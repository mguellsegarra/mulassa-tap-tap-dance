#!/usr/bin/env node
// Eina de desenvolupament (no entra al build): inventari de modals, menús i submenús per FLUX × COMPTE × RESOLUCIÓ, en una pàgina
// HTML on el propietari comenta cada captura. Reutilitza el build, el servidor i l'arrencada de ui-inventory.mjs.
// i18n-ok: eina de dev — les cadenes catalanes d'aquest fitxer són noms de pantalla, no text del joc.
//
// El build amb VITE_FEEDBACK_URL=https://exemple.invalid VITE_FEEDBACK_ENABLED=true VITE_TURNSTILE_SITE_KEY=x perquè la Bústia no surti com a no disponible.
//   node tools/qa/ui-review.mjs [--no-build] [--only=P03,R01] [--vps=320,393] [--list]   captura i escriu la pàgina
//   node tools/qa/ui-review.mjs --base[=origin/main] [--force]                           captura la referència (una altra branca) a revisio/base/: el toggle «Només canviades»
//   node tools/qa/ui-review.mjs --serve[=5179]                                           serveix la pàgina (també al mòbil) i desa els comentaris
// Surt a docs/i18n-ui-inventory/revisio/ (git-ignored): index.html, shots/, screens.json i comentaris.json.
// Cada pantalla parteix d'una càrrega neta i prem els botons reals; `expect` ha de ser visible o la captura consta com a fallida.
import { execSync, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { availableParallelism } from 'node:os';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { VPS, bootPage, build, serve } from './ui-inventory.mjs';
import { lock } from './capture-lib.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..'), REVIEW = join(ROOT, 'docs/i18n-ui-inventory/revisio'), OUT = args.baseline ? join(REVIEW, 'base') : REVIEW, SHOTS = join(OUT, 'shots');
const WORKERS = +(args.jobs ?? Math.min(24, availableParallelism() + 6)); // most of a capture is waiting (boot 6 s whatever the load), so more than one per core fits

// La matriu d'AGENTS.md. Mode foto al mòbil és l'única pantalla de telèfon en horitzontal.
const PHONES = ['320x568', '375x667', '393x852', '430x932'], BIG = ['1024x768', '1280x800', '1440x700', '1920x1080'], ALL = [...PHONES, ...BIG];
const LANDSCAPE = ['852x393', '932x430'];
const family = vp => (PHONES.includes(vp) || LANDSCAPE.includes(vp) ? 'mòbil' : vp === '1024x768' ? 'tauleta' : 'escriptori');
const touchVp = vp => family(vp) !== 'escriptori';
for (const vp of [...ALL, ...LANDSCAPE]) { const [w, h] = vp.split('x').map(Number); VPS[vp] = [w, h, vp]; }

// ---------------------------------------------------------------- passos
// Short waits are for a sheet's CSS to settle: done as soon as nothing finite is animating. Long ones (a run, canvas animation) stay fixed.
const wait = (h, ms = 900) => (ms > 1800 ? h.page.waitForTimeout(ms) : h.page.waitForFunction(() => !document.getAnimations().some(a => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity), null, { timeout: ms, polling: 100 }).catch(() => {}).then(() => h.page.waitForTimeout(120)));
const until = (h, fn, arg, ms = 30000) => h.page.waitForFunction(fn, arg, { timeout: ms });
const click = (h, sel) => h.page.evaluate(s => { const e = document.querySelector(s); if (!e) throw new Error(`no ${s}`); e.click(); }, sel);
const open = (h, id) => until(h, i => document.getElementById(i)?.open, id, args.baseline ? 10000 : 40000); // the other branch may not have this sheet at all
const type = (h, sel, v) => h.page.evaluate(([s, x]) => { const e = document.querySelector(s); e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); }, [sel, v]);
const dbg = (h, m, ...a) => h.page.evaluate(([k, x]) => window.__dbg[k](...x), [m, a]);
async function toSelect(h) {
  if (await h.page.evaluate(() => window.__dbg.G.state) === 'splash') await h.page.keyboard.press('Enter');
  await until(h, () => window.__dbg.G.state === 'select' && document.getElementById('select')?.checkVisibility?.(), null, 40000);
  await wait(h, h.reused ? 300 : 2200); // a reused page is already settled on the selector
}
// una fulla que s'obre sola (avís d'estadístiques, final de temporada) no deixa prémer res al darrere; les de la pantalla que es vol capturar no passen per aquí
const clearGreeting = async h => { await h.page.waitForFunction(() => document.querySelector('dialog[open]'), null, { timeout: /account=(guest|reserved|released|verified)/.test(h.page.url()) ? 5000 : 700 }).catch(() => {}); await h.page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); await wait(h, 200);
  await h.page.waitForFunction(() => document.getElementById('badge-news-menu')?.open, null, { timeout: 600 }).then(() => h.page.evaluate(() => document.getElementById('badge-news-menu').close())).catch(() => {}); }; // the mock never remembers the news, and it follows the other sheets
const select = async h => { await toSelect(h); await clearGreeting(h); };
const settings = async h => { await select(h); await click(h, '#settings'); await open(h, 'settings-menu'); await wait(h); };
const fromSettings = (btn, id) => async h => { await settings(h); await click(h, btn); await open(h, id); await wait(h); };
const perfil = async h => { await settings(h); await click(h, '#settings-profile'); await open(h, 'account-menu');
  await until(h, () => { const r = document.getElementById('profile-row'); return r.dataset.state && !r.dataset.pending; }); await h.page.waitForFunction(() => !document.querySelector('#account-menu .mula-spinner'), null, { timeout: 15000 }).catch(() => {}); await wait(h); };
const profileStep = btn => async h => { await perfil(h); await click(h, btn); await open(h, 'profile-menu'); await wait(h); };
const mailStep = (address = 'prova@exemple.cat', code = false) => async h => { await profileStep('#profile-main')(h); await type(h, '#profile-email', address); await click(h, '#profile-send');
  await until(h, () => document.getElementById('profile-code')?.checkVisibility() && !document.getElementById('profile-send').disabled); if (code) { await type(h, '#profile-code', code); await click(h, '#profile-send'); await until(h, () => document.getElementById('profile-status').textContent); } await wait(h); };
const level2 = async h => { await select(h); await click(h, '#select-next'); await wait(h, 1400); await clearGreeting(h); }; // the greeting can arrive late, over the step
const practice = async h => { await select(h); await dbg(h, 'startPractice'); await wait(h, 6000); };
const pause = async h => { await practice(h); await h.page.keyboard.press('Escape'); await open(h, 'pause-menu'); await wait(h); };
const results = async h => { await until(h, () => document.querySelector('#results-actions')?.checkVisibility?.(), null, 40000); await wait(h, 3500); };
const review = async h => { await until(h, () => window.__review, null, 40000);
  const r = await h.page.evaluate(() => window.__review); if (r !== 'ready') throw new Error(r);
  await h.page.waitForFunction(() => !document.querySelector('dialog[open] .mula-spinner'), null, { timeout: 25000 }).catch(() => {});
  await wait(h, 1800); await h.page.evaluate(() => document.getElementById('review-panel')?.remove()); };
const shareSheet = async h => { await results(h); await clearGreeting(h); await click(h, '#results-share'); await open(h, 'share-menu');
  await until(h, () => !document.getElementById('share-image').disabled); await wait(h, 1500); };
const freePlay = async h => { await select(h); await click(h, '#free'); await wait(h, 3500); };

const OFF = { 'gpu-hint': 'off', 'free-hint': '1' }, SEEN = { ...OFF, tutorial: 'done' };
const IPHONE = 'iphone';
// flux, id estable, compte, nom, query, com hi arribes (els passos), selector que ho demostra
const S = (flow, id, account, name, query, run, expect, more = {}) => ({ flow, id, account, name, query, run, expect, storage: OFF, vps: ALL, ...more });
const acc = a => `mock&account=${a}`;
const rev = st => `final&review=${st}`;
const ACC = { new: 'sense perfil', reserved: 'convidat sense resultat', guest: 'convidat', released: 'convidat, nom alliberat', verified: 'registrat' };

const F1 = '1 · Entrada', F2 = '2 · Selector', F3 = '3 · Configuració i submenús', F4 = '4 · Perfil i compte', F5 = '5 · Joc i pausa', F6 = '6 · Resultats i publicar', F7 = '7 · Classificació, fitxes i temporades', F8 = '8 · Mode foto';
const blank = async () => {};
export const SCREENS = [
  S(F1, 'E01', 'tots', 'Carregador', 'mock', blank, '#loader', { boot: 'loader' }),
  S(F1, 'E02', 'tots', 'Targeta d\'error de càrrega', 'mock', h => until(h, () => document.getElementById('loader')?.classList.contains('fail'), null, 90000).then(() => wait(h, 1200)), '#loader.fail', { boot: 'blocked' }),
  S(F1, 'E03', 'tots', 'Splash', 'mock', h => wait(h, 800), 'canvas'),
  S(F1, 'E04', 'tots', 'Suggeriment d\'idioma (navegador en castellà)', 'mock', h => until(h, () => document.getElementById('lang-tip')).then(() => wait(h, 800)), '#lang-tip', { noLang: true, locale: 'es-ES' }),
  S(F1, 'E05', 'convidat', 'Avís d\'estadístiques (s\'obre sol)', acc('guest'), async h => { await toSelect(h); await open(h, 'stats-notice-menu'); await wait(h); }, '#stats-notice-menu', { greeting: true }),
  S(F1, 'E06', 'convidat', 'Final de temporada (s\'obre sol)', rev('season-end'), review, '#season-end-menu', { greeting: true }),
  S(F1, 'E07', 'tots', 'Consell d\'acceleració per maquinari', 'mock', async h => { await toSelect(h); await open(h, 'gpu-hint-menu'); await wait(h); }, '#gpu-hint-menu', { greeting: true, storage: { 'free-hint': '1' }, soft: true, vps: ['320x568', '393x852', '1280x800'] }),

  S(F1, 'E08', ACC.verified, 'Avís d\'insígnies: correu confirmat (s\'obre sol)', rev('badge-news-confirmed'), review, '#badge-news-menu', { greeting: true }),
  S(F1, 'E09', ACC.guest, 'Avís d\'insígnies: sense correu confirmat (s\'obre sol)', rev('badge-news-guest'), review, '#badge-news-menu', { greeting: true }),
  S(F1, 'E10', ACC.verified, 'Avís d\'insígnies → tria la insígnia', rev('badge-news-confirmed'), async h => { await review(h); await click(h, '#badge-news-go'); await open(h, 'badge-menu'); await wait(h); }, '#badge-menu', { greeting: true }),

  ...Object.entries({ new: 'S01', guest: 'S02', verified: 'S03' }).map(([a, id]) => S(F2, id, ACC[a], 'Selector, pas 1 (figura)', acc(a), select, '#select-next', { storage: { ...OFF, 'stats-notice': '1' } })),
  S(F2, 'S04', ACC.new, 'Selector, pas 2 (nivells), sense resultats', acc('new'), level2, '#select-play'),
  S(F2, 'S05', ACC.verified, 'Selector, pas 2 amb rècord i posició', 'demo&account=verified&board=me', level2, '#select-play'),
  S(F2, 'S06', ACC.verified, 'Selector, pas 1 del Drac', 'mock&account=verified&figura=drac', select, '#select-next'),
  S(F2, 'S07', 'tots', 'Figura pendent (panell)', 'mock', async h => { await select(h); await click(h, '.sel-pill[data-town="tarragona"]'); await wait(h, 2200); }, '#select-pending'),
  S(F2, 'S09', ACC.verified, 'Figura pendent: ofereix material', acc('verified'), async h => { await select(h); await click(h, '.sel-pill[data-town="tarragona"]'); await wait(h, 1500); await click(h, '#aviat-material'); await open(h, 'feedback-menu'); await wait(h); }, '#feedback-menu'),
  S(F2, 'S10', ACC.verified, 'Figura pendent: proposa una figura', acc('verified'), async h => { await select(h); await click(h, '.sel-card:last-child'); await wait(h, 1500); await click(h, '#aviat-propose'); await open(h, 'feedback-menu'); await wait(h); }, '#feedback-menu'),
  S(F2, 'S11', ACC.guest, 'Posar un cor sense correu confirmat', acc('guest'), async h => { await select(h); await click(h, '.sel-pill[data-town="tarragona"]'); await wait(h, 1500); await click(h, '#aviat-heart'); await open(h, 'gate-menu'); await wait(h); }, '#gate-menu'),
  S(F2, 'S12', ACC.new, 'Posar un cor sense perfil', acc('new'), async h => { await select(h); await click(h, '.sel-pill[data-town="tarragona"]'); await wait(h, 1500); await click(h, '#aviat-heart'); await open(h, 'gate-menu'); await wait(h); }, '#gate-menu'),
  S(F2, 'S13', ACC.new, 'Cor sense perfil: crea el perfil i segueix al correu', acc('new'), async h => { await select(h); await click(h, '.sel-pill[data-town="tarragona"]'); await wait(h, 1500); await click(h, '#aviat-heart'); await open(h, 'gate-menu'); await click(h, '#gate-go'); await open(h, 'profile-menu'); await type(h, '#profile-alias', 'Timbaler321'); await click(h, '#profile-send'); await until(h, () => document.getElementById('profile-email')?.checkVisibility()); await wait(h); }, '#profile-email'),
  S(F2, 'S08', 'tots', 'Com es juga', 'mock', async h => { await select(h); await click(h, '#select-howto'); await open(h, 'howto-menu'); await wait(h); }, '#howto-menu'),

  ...Object.entries({ new: 'C01', verified: 'C02' }).map(([a, id]) => S(F3, id, ACC[a], 'Configuració', acc(a), settings, '#settings-menu')),
  S(F3, 'C04', 'tots', 'Ajusta la sincronia: inici', 'mock', fromSettings('#settings-sync', 'sync-menu'), '#sync-menu'),
  S(F3, 'C07', 'tots', 'Ajusta la sincronia: compte enrere i cops', 'mock', async h => { await fromSettings('#settings-sync', 'sync-menu')(h); await click(h, '#sync-start'); await wait(h, 1500); }, '#sync-stop'),
  S(F3, 'C08', 'tots', 'Ajusta la sincronia: resultat sense tocs', 'mock', async h => { await fromSettings('#settings-sync', 'sync-menu')(h); await click(h, '#sync-start'); await until(h, () => document.getElementById('sync-menu').dataset.state === 'result', null, 40000); await wait(h, 900); }, '#sync-menu'),
  S(F3, 'C05', ACC.verified, 'Bústia: escriu', acc('verified'), fromSettings('#settings-feedback', 'feedback-menu'), '#feedback-menu'),
  S(F3, 'C10', ACC.guest, 'Bústia sense correu confirmat: confirma el correu', acc('guest'), fromSettings('#settings-feedback', 'gate-menu'), '#gate-menu'),
  S(F3, 'C11', ACC.new, 'Bústia sense perfil: crea un perfil', acc('new'), fromSettings('#settings-feedback', 'gate-menu'), '#gate-menu'),
  S(F3, 'C09', 'tots', 'Bústia: gràcies', 'mock', async h => { await select(h); await h.page.evaluate(() => document.getElementById('feedback-thanks').showModal()); await wait(h); }, '#feedback-thanks'),
  S(F3, 'C06', 'tots', 'Privadesa', 'mock', fromSettings('#settings-privacy', 'privacy-menu'), '#privacy-menu'),

  ...Object.entries({ new: 'P01', reserved: 'P02', guest: 'P03', released: 'P04', verified: 'P05' }).map(([a, id]) => S(F4, id, ACC[a], 'Perfil', acc(a), perfil, '#account-menu')),
  S(F4, 'P06', ACC.new, 'Crea el perfil: sobrenom', acc('new'), profileStep('#profile-main'), '#profile-alias'),
  S(F4, 'P07', ACC.new, 'Recupera el perfil: correu', acc('new'), profileStep('#profile-alt'), '#profile-email'),
  S(F4, 'P08', ACC.guest, 'Confirma el correu: adreça', acc('guest'), profileStep('#profile-main'), '#profile-email'),
  S(F4, 'P09', ACC.guest, 'Confirma el correu: codi', acc('guest'), mailStep(), '#profile-code'),
  S(F4, 'P10', ACC.guest, 'Correu d\'un altre perfil: canvi', rev('switch'), review, '#profile-code'),
  S(F4, 'P11', ACC.guest, 'Esborra el perfil: confirmació', acc('guest'), profileStep('#profile-alt'), '#profile-keep'),
  S(F4, 'P12', ACC.released, 'Tria un altre nom', rev('released-name'), review, '#profile-alias'),
  S(F4, 'P13', ACC.verified, 'Tanca la sessió: confirmació', acc('verified'), profileStep('#profile-main'), '#profile-keep'),
  S(F4, 'P14', ACC.verified, 'Esborra el perfil: confirmació', acc('verified'), profileStep('#profile-alt'), '#profile-keep'),

  S(F5, 'J01', 'tots', 'Pràctica', 'mock', practice, 'canvas'),
  S(F5, 'J02', 'tots', 'Pausa', 'mock', pause, '#pause-menu'),
  S(F5, 'J03', 'tots', 'Pausa: confirmació de sortida', 'mock', async h => { await pause(h); await click(h, '#exit'); await wait(h, 700); }, '#pause-confirmation'),
  S(F5, 'J04', 'tots', 'Partida', 'mock&autoplay&from=40', async h => { await select(h); await dbg(h, 'choose', 1); await wait(h, 5000); }, '#pause', { storage: SEEN }),
  S(F5, 'J05', 'tots', 'Col·lapse', 'mock&autoplay&from=40', async h => { await select(h); await dbg(h, 'choose', 1); await wait(h, 5000); await dbg(h, 'collapse'); await wait(h, 1800); }, 'canvas', { storage: SEEN }),
  S(F5, 'J06', 'tots', 'Demostració: fulla final', 'mock', async h => { await select(h); await click(h, '#select-watch'); await wait(h, 2500); await dbg(h, 'finish'); await open(h, 'watch-menu'); await wait(h); }, '#watch-menu', { storage: SEEN }),

  S(F6, 'R01', 'tots', 'Resultats, 0 estrelles', 'stars=0', results, '#results-actions'),
  S(F6, 'R02', 'tots', 'Resultats, 2 estrelles', 'stars=2', results, '#results-actions'),
  S(F6, 'R03', 'tots', 'Resultats, 3 estrelles', 'stars=3', results, '#results-actions'),
  S(F6, 'R04', ACC.new, 'Publica el teu resultat', rev('publish'), review, '#publish-menu'),
  S(F6, 'R05', ACC.new, 'Publicat! + confirma el correu', rev('published'), review, '#publish-menu'),
  S(F6, 'R06', ACC.new, 'Sobrenom agafat', rev('taken'), review, '#publish-error'),
  S(F6, 'R07', ACC.new, 'Sobrenom agafat: recupera', rev('recover'), review, '#profile-menu'),
  S(F6, 'R08', ACC.new, 'Publicar sense connexió', rev('retry'), review, '#publish-status'),
  S(F6, 'R09', ACC.new, 'Publicat: correu', rev('email'), review, '#profile-email'),
  S(F6, 'R10', ACC.new, 'Publicat: codi', rev('code'), review, '#profile-code'),
  S(F6, 'R11', ACC.new, 'Correu confirmat', rev('verified'), review, '#profile-status'),
  S(F6, 'R12', 'tots', 'Comparteix, Història 9:16', 'final', shareSheet, '#share-menu'),
  S(F6, 'R13', 'tots', 'Comparteix, Publicació 4:5', 'final', async h => { await shareSheet(h); await click(h, '#share-format-feed'); await wait(h, 3500); }, '#share-menu'),
  S(F6, 'R14', ACC.verified, 'Comparteix el Drac', rev('share-drac'), review, '#share-menu'),
  S(F6, 'R15', ACC.verified, 'Resultats d\'un registrat (es publica sol)', 'final&account=verified', results, '#results-actions'),

  S(F7, 'B01', ACC.verified, 'Classificació amb marques', rev('board'), review, '#board-menu'),
  S(F7, 'B02', ACC.verified, 'Classificació: al capdamunt', rev('board'), async h => { await review(h); await click(h, '#board-jump'); await wait(h, 1600); }, '#board-menu'),
  S(F7, 'B03', ACC.verified, 'La teva pròpia fitxa, des de la classificació', rev('board-tip'), review, '#card-menu'),
  S(F7, 'B04', ACC.guest, 'Classificació d\'un convidat', rev('board-guest'), review, '#board-menu'),
  S(F7, 'B05', ACC.guest, 'Classificació buida', rev('board-empty'), review, '#board-menu'),
  S(F7, 'B06', ACC.verified, 'Classificació del Drac', rev('board-drac'), review, '#board-menu'),
  S(F7, 'B07', ACC.verified, 'Classificació del Drac, buida', rev('board-drac-empty'), review, '#board-menu'),
  S(F7, 'B08', ACC.verified, 'Tria figura', rev('board'), async h => { await review(h); await click(h, '#board-figure'); await wait(h, 1000); }, '#board-picker'),
  S(F7, 'B09', ACC.guest, 'Fitxa d\'un verificat', rev('card'), review, '#card-menu'),
  S(F7, 'B10', ACC.new, 'Fitxa d\'un convidat', rev('card-guest'), review, '#card-menu'),
  S(F7, 'B11', ACC.new, 'Fitxa d\'un nom alliberat', rev('card-released'), review, '#card-menu'),
  S(F7, 'B12', ACC.new, 'Fitxa amb nom de 16 lletres', rev('card-long'), review, '#card-menu'),
  S(F7, 'B13', ACC.new, 'Fitxa sense estadístiques', rev('card-empty'), review, '#card-menu'),
  S(F7, 'B14', ACC.guest, 'Saló de la fama', rev('seasons'), review, '#seasons-menu'),
  S(F7, 'B15', ACC.guest, 'Saló de la fama: ball anterior', rev('seasons-later'), review, '#seasons-menu'),
  S(F7, 'B16', ACC.guest, 'Saló de la fama: 11 temporades', rev('seasons-many'), review, '#seasons-menu'),
  S(F7, 'B17', ACC.guest, 'Saló de la fama: Drac sense temporades', rev('seasons-drac'), review, '#seasons-menu'),
  S(F7, 'B18', ACC.guest, 'Final de temporada sense podi', rev('season-end-plain'), review, '#season-end-menu', { greeting: true }),
  S(F7, 'B19', ACC.guest, 'Saló de la fama: tria temporada', rev('seasons-many'), async h => { await review(h); await click(h, '#seasons-pick'); await wait(h, 1000); }, '#seasons-menu'),
  S(F7, 'B20', ACC.guest, 'Saló de la fama: tria figura', rev('seasons'), async h => { await review(h); await click(h, '#seasons-figure'); await wait(h, 1000); }, '#seasons-picker'),
  S(F7, 'B21', ACC.guest, 'Fitxa amb més estadístiques', rev('card'), async h => { await review(h); await click(h, '#card-menu button[aria-expanded]'); await wait(h, 1000); }, '#card-menu'),

  S(F8, 'F01', 'tots', 'iPhone a Safari: passos per a la pantalla completa', 'mock', async h => { await select(h); await click(h, '#free'); await open(h, 'free-fs-menu'); await wait(h); }, '#free-fs-menu', { storage: { 'gpu-hint': 'off' }, ua: IPHONE, vps: PHONES }),
  S(F8, 'F02', 'tots', 'iPhone: gira el mòbil', 'mock', async h => { await select(h); await click(h, '#free'); await open(h, 'free-hint-menu'); await wait(h); }, '#free-hint-menu', { ua: IPHONE, vps: PHONES }),
  S(F8, 'F03', 'tots', 'Mode foto (mòbil en horitzontal, tauleta, escriptori)', 'mock', freePlay, 'canvas', { vps: [...LANDSCAPE, ...BIG] }),
  S(F8, 'F05', 'tots', 'Mode foto: consell del botó de música (una vegada)', 'mock', async h => { await freePlay(h); await until(h, () => document.querySelector('.sel-heart-tip')); await h.page.waitForTimeout(500); }, '.sel-heart-tip', { vps: [...LANDSCAPE, ...BIG] }),
  S(F8, 'F04', 'tots', 'Coberta «gira el mòbil» (menús amb el telèfon de costat)', 'mock', async h => { await wait(h, 1500); }, '#rotate', { vps: LANDSCAPE }),
];

// ---------------------------------------------------------------- captura
// Sheets opened from the idle selector that change nothing behind them share one load per viewport, account and storage; the rest (a URL state, a run, a sent form) load clean.
const REUSE = new Set(['C01', 'C02', 'C04', 'C05', 'C10', 'C11', 'C06', 'C07', 'C08', 'C09', 'P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P11', 'P13', 'P14']);
const closeSheets = async h => { for (let i = 0; i < 6; i++) { if (!await h.page.evaluate(() => { const d = [...document.querySelectorAll('dialog[open]')]; d.forEach(x => x.close()); return d.length; })) return; await wait(h, 150); } }; // closing one can reopen the sheet it came from
const codeOf = (s, vp) => `${s.id}-${vp}`;
const planUnits = () => {
  const only = args.only?.split(','), vps = args.vps?.split(',');
  return SCREENS.filter(s => !only || only.includes(s.id)).flatMap(s => s.vps.filter(v => !vps || vps.some(x => v.startsWith(x))).map(vp => ({ s, vp })));
};
// A screen's fingerprint: what it shows (text, boxes, colours, type, icons), not its pixels, so the 3D behind a sheet and the animations don't count as a change.
// shortcut: canvas-drawn UI (HUD, results card) and the 3D aren't compared; extend it if those need a diff.
const FINGERPRINT = () => {
  const top = [...document.querySelectorAll('dialog[open]')].pop();
  const roots = top ? [top] : ['#select', '#results-actions', '#rotate', '#pause', '#loader', '#lang-tip'].map(q => document.querySelector(q)).filter(e => e?.checkVisibility());
  const skip = '#settings-version, #review-panel, .test-mode, .mula-spinner', out = { text: [], box: [], paint: [], title: [] };
  for (const root of roots) for (const el of [root, ...root.querySelectorAll('*')]) {
    if (el.closest(skip) || !el.checkVisibility() || el.tagName === 'CANVAS') continue;
    let moving = false; for (let e = el; e && !moving; e = e === root ? null : e.parentElement) moving = e.getAnimations().some(x => x.playState === 'running'); // a pulsing button has no fixed box
    const r = moving ? { left: 0, top: 0, width: 0, height: 0 } : el.getBoundingClientRect(), c = getComputedStyle(el), round = n => Math.round(n / 2) * 2;
    const text = el.closest('#loader') ? '' : [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ');
    out.text.push(text, el.getAttribute('d') ?? '');
    out.box.push(el.tagName, el.id, round(r.left), round(r.top), round(r.width), round(r.height), c.fontSize, c.fontWeight);
    (el.matches('h2') ? out.title : out.paint).push(c.color, c.backgroundColor, c.borderTopWidth, c.borderTopColor, c.borderTopLeftRadius);
  }
  const hash = list => { let h = 0x811c9dc5; for (const ch of list.join('\n')) h = Math.imul(h ^ ch.codePointAt(0), 16777619); return (h >>> 0).toString(16); };
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, hash(v)]));
};
async function capture(browser, { s, vp }, port, h = { ctxOpts: {} }) {
  const code = codeOf(s, vp), touch = touchVp(vp);
  const u = { vp, lang: 'ca', g: { group: s.id, scenes: [s], query: s.query, storage: s.storage, boot: s.boot, noLang: s.noLang, locale: s.locale, ua: s.ua, pointer: touch ? 'touch' : 'fine' } };
  let err = null;
  for (let attempt = 0; attempt < (args.baseline ? 1 : 2); attempt++) { // what the other branch lacks would only fail again
    try {
      err = null;
      if (h.reused = Boolean(h.page && attempt === 0)) await closeSheets(h);
      else { await h.ctx?.close().catch(() => {}); await bootPage(browser, u, port, h); }
      await s.run(h);
      if (!await h.page.evaluate(sel => document.querySelector(sel)?.checkVisibility?.() ?? false, s.expect)) throw new Error(`no es veu ${s.expect}`);
      const showing = await h.page.evaluate(() => [...document.querySelectorAll('dialog[open]')].map(d => d.id).join(','));
      if (/stats-notice|season-end|gpu-hint|badge-news/.test(showing) && !s.greeting) throw new Error(`fulla inesperada: ${showing}`); // would otherwise hide the screen and still pass `expect`
      await h.page.evaluate(() => { const st = document.getElementById('feedback-status'); if (st) st.textContent = ''; }); // the mock has no captcha: «no disponible» is never what a player reads
      const fp = await h.page.evaluate(FINGERPRINT);
      await h.page.screenshot({ path: join(SHOTS, `${code}.png`), timeout: 90000 });
      // una fulla amb scroll amaga el que té a sota: també el final
      const scrolled = await h.page.evaluate(() => { const top = [...document.querySelectorAll('dialog[open]')].pop(); if (!top) return false;
        const box = [top, ...top.querySelectorAll('*')].find(e => e.scrollHeight > e.clientHeight + 8 && /auto|scroll/.test(getComputedStyle(e).overflowY) && e.checkVisibility()); if (!box) return false;
        box.scrollTop = box.scrollHeight; return true; });
      const recs = [{ code, id: s.id, vp, ok: true, showing, fp }];
      if (scrolled) { await wait(h, 500); await h.page.screenshot({ path: join(SHOTS, `${code}-fi.png`), timeout: 90000 }); recs.push({ code: `${code}-fi`, id: s.id, vp, ok: true, showing, end: true }); }
      if (!h.keep) await h.ctx.close().catch(() => {});
      return recs;
    } catch (e) { err = String(e.message).split('\n')[0].slice(0, 180); await h.ctx?.close().catch(() => {}); h.page = null; }
  }
  return [{ code, id: s.id, vp, ok: false, err }];
}

// ---------------------------------------------------------------- pàgina
const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.png': 'image/png' };
const WHY = { text: 'text', box: 'posició o mida', paint: 'color', title: 'títol' };
// same | added (main can't reach it: new, or a flow that changed) | changed, with what changed
function statusOf(c, base) {
  if (!base) return { st: 'same', why: [] };
  const was = base.find(b => b.code === c.code);
  if (!was?.ok) return { st: 'added', why: [] };
  const why = Object.keys(WHY).filter(k => c.fp?.[k] !== was.fp?.[k]);
  return { st: why.length ? 'changed' : 'same', why: why.map(k => WHY[k]) };
}
function page(db) {
  const baseFile = join(REVIEW, 'base/screens.json'), base = !args.baseline && existsSync(baseFile) ? JSON.parse(readFileSync(baseFile, 'utf8')) : null;
  const baseRef = base && existsSync(join(REVIEW, 'base/ref.txt')) ? readFileSync(join(REVIEW, 'base/ref.txt'), 'utf8').trim() : '';
  const main = c => db.find(x => x.code === c.code.replace(/-fi$/, ''));
  db = db.map(c => { const r = statusOf(c.end ? main(c) ?? c : c, base); return { ...c, ...r, was: r.st === 'changed' }; });
  const screens = SCREENS.map(s => ({ flow: s.flow, id: s.id, account: s.account, name: s.name, how: `?${s.query}`, shots: s.vps.flatMap(v => db.filter(c => c.id === s.id && c.vp === v).sort((a, b) => a.code.length - b.code.length)) })).filter(s => s.shots.length);
  return `<!doctype html><html lang="ca"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Revisió UI · Mulassa</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#17100b;color:#fff3d6;font:15px/1.4 system-ui,sans-serif}
header{position:sticky;top:0;z-index:5;background:#2a1a10;border-bottom:2px solid #f5c518;padding:8px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
header b{margin-right:auto}select,button,textarea{font:inherit;color:inherit;background:#17100b;border:1px solid #e8d8b880;border-radius:8px;min-height:40px;padding:4px 10px}button{cursor:pointer}
label.tg{display:inline-flex;gap:6px;align-items:center;min-height:40px}
main{padding:12px;max-width:1800px;margin:auto}h2{margin:28px 0 8px;color:#f5c518;font-size:20px}
.scr{border:1px solid #e8d8b840;border-radius:12px;padding:12px;margin-bottom:14px;background:#20150e}.scr h3{margin:0;font-size:16px}.meta{opacity:.75;font-size:13px;margin:2px 0 8px}.chip{display:inline-block;padding:0 8px;border-radius:99px;background:#fff3d6;color:#17100b;font-size:12px;font-weight:700;margin-left:6px}
.all{width:100%;min-height:44px;margin-bottom:10px}
.row{display:flex;gap:12px;overflow-x:auto;padding-bottom:6px;align-items:flex-start}
figure{margin:0;flex:none;width:208px}figure.wide{width:330px}figure img{display:block;width:100%;height:auto;border-radius:6px;cursor:zoom-in;background:#000}figcaption{font-size:12px;font-weight:700;margin:4px 0}.st{margin-left:6px;padding:0 6px;border-radius:99px;background:#5cb2ff;color:#17100b}.st.added{background:#7ee081}.was{width:100%;min-height:36px;margin:4px 0;font-size:13px}
.mk{display:flex;gap:4px;margin-bottom:4px}.mk button{flex:1;min-height:36px;padding:0;font-size:13px}.mk button[aria-pressed=true][data-m=ok]{background:#2e7d32}.mk button[aria-pressed=true][data-m=refer]{background:#c62828}
figure textarea,.all{resize:vertical}figure textarea{width:100%;min-height:58px;font-size:14px}.noted{outline:2px solid #f5c518;outline-offset:2px;border-radius:6px}
.fail{border:1px dashed #ff8a7a;color:#ff8a7a;padding:8px;font-size:12px;border-radius:6px}
@media(max-width:700px){header{position:static}}
dialog{width:min(1500px,96vw);max-height:96vh;background:#20150e;color:inherit;border:2px solid #f5c518;border-radius:14px;padding:12px}dialog::backdrop{background:#000c}
.lb{display:flex;gap:12px;flex-wrap:wrap}.lb .im{flex:1 1 320px;overflow:auto;max-height:88vh;text-align:center}.lb img{max-width:100%}.lb .side{flex:0 0 300px}.lb textarea{width:100%;min-height:160px}
</style>
<header><b>Revisió UI · <span id="n"></span></b>
<select id="f-flow" aria-label="Flux"><option value="">Tots els fluxos</option>${[...new Set(screens.map(s => s.flow))].map(f => `<option>${f}</option>`).join('')}</select>
<select id="f-acc" aria-label="Compte"><option value="">Tots els comptes</option>${[...new Set(screens.map(s => s.account))].map(f => `<option>${f}</option>`).join('')}</select>
<select id="f-fam" aria-label="Dispositiu"><option value="">Totes les mides</option><option>mòbil</option><option>tauleta</option><option>escriptori</option></select>
${base ? `<label class="tg"><input type="checkbox" id="f-diff"> Només canviades respecte a ${baseRef} (<span id="n-diff"></span>)</label><label class="tg"><input type="checkbox" id="f-title"> Inclou les que només canvien el títol</label>` : ''}<label class="tg"><input type="checkbox" id="f-todo"> Només amb comentari</label>
<button id="copy">Copia els comentaris</button></header>
<main id="m"></main>
<dialog id="d"><div class="lb"><div class="im"><img id="d-img" alt=""></div><div class="side"><h3 id="d-t"></h3><div class="mk" id="d-mk"></div><textarea id="d-note" placeholder="Què no t'agrada?"></textarea><div class="mk" style="margin-top:8px"><button id="d-prev">← Anterior</button><button id="d-next">Següent →</button></div><button id="d-x" style="width:100%;margin-top:8px">Tanca</button></div></div></dialog>
<script>
const SCREENS=${JSON.stringify(screens).replace(/</g, '\\u003c')},FAM=${JSON.stringify(Object.fromEntries([...ALL, ...LANDSCAPE].map(v => [v, family(v)])))};
const KEY='mulassa-ui-review';let notes=JSON.parse(localStorage.getItem(KEY)||'{}'),timer;const $=i=>document.getElementById(i);
const live=location.protocol.startsWith('http');
function save(){localStorage.setItem(KEY,JSON.stringify(notes));if(!live)return;clearTimeout(timer);timer=setTimeout(()=>fetch('comentaris',{method:'POST',body:JSON.stringify(notes)}).catch(()=>{}),400)}
function set(k,p){notes[k]={...notes[k],...p};if(!notes[k].mark&&!notes[k].note)delete notes[k];save();count()}
function count(){const v=Object.values(notes);$('n').textContent=SCREENS.length+' pantalles · '+v.filter(x=>x.mark==='refer').length+' a refer · '+v.filter(x=>x.mark==='ok').length+' ok · '+v.filter(x=>x.note).length+' comentaris'}
const marks=(k,box)=>{box.replaceChildren();for(const[m,t]of[['ok','OK'],['refer','Refer']]){const b=document.createElement('button');b.dataset.m=m;b.textContent=t;b.setAttribute('aria-pressed',notes[k]?.mark===m);b.onclick=()=>{set(k,{mark:notes[k]?.mark===m?'':m});render()};box.append(b)}};
function area(k,ph){const t=document.createElement('textarea');t.placeholder=ph;t.value=notes[k]?.note||'';t.oninput=()=>set(k,{note:t.value});return t}
const visibleDiff=c=>c.st==='added'||(c.st==='changed'&&($('f-title')?.checked||c.why.join()!=='títol'));
const diffCount=()=>SCREENS.flatMap(s=>s.shots).filter(c=>!c.end&&visibleDiff(c)).length;
let visible=[],cur=0;
function render(){const y=scrollY,flow=$('f-flow').value,acc=$('f-acc').value,fam=$('f-fam').value,todo=$('f-todo').checked,diff=$('f-diff')?.checked,m=$('m');m.replaceChildren();visible=[];let last='';
 for(const s of SCREENS){if(flow&&s.flow!==flow||acc&&s.account!==acc)continue;
  const shots=s.shots.filter(c=>(!fam||FAM[c.vp]===fam)&&(!diff||visibleDiff(c))&&(!todo||notes[c.code]||notes[s.id]));if(!shots.length)continue;
  if(s.flow!==last){const h=document.createElement('h2');h.textContent=s.flow;m.append(h);last=s.flow}
  const box=document.createElement('section');box.className='scr';box.innerHTML='<h3></h3><div class="meta"></div>';box.querySelector('h3').textContent=s.id+' · '+s.name;
  const c=document.createElement('span');c.className='chip';c.textContent=s.account;box.querySelector('h3').append(c);box.querySelector('.meta').textContent=s.how;
  const all=area(s.id,'Comentari per a tota la pantalla, a totes les mides');all.className='all';box.append(all);
  const row=document.createElement('div');row.className='row';
  for(const sh of shots){const f=document.createElement('figure');const[w,h]=sh.vp.split('x').map(Number);if(w>h)f.className='wide';const cap=document.createElement('figcaption');cap.textContent=sh.vp+' · '+(sh.end?'final del scroll':FAM[sh.vp]);if(sh.st!=='same'){const t=document.createElement('span');t.className='st '+sh.st;t.textContent=sh.st==='added'?'nova':sh.why.join(', ');cap.append(t)}f.append(cap);
   if(sh.ok){const i=new Image();i.loading='lazy';i.src='shots/'+sh.code+'.png';i.alt=s.name+' '+sh.vp;i.width=w;i.height=h;if(notes[sh.code]?.mark||notes[sh.code]?.note)i.className='noted';const idx=visible.push({s,sh})-1;i.onclick=()=>show(idx);f.append(i);
    if(sh.was&&!sh.end){const w=document.createElement('button');w.className='was';w.textContent='Mira com era';let old=false;w.onclick=()=>{old=!old;i.src=(old?'base/':'')+'shots/'+sh.code+'.png';w.textContent=old?'Mira com és ara':'Mira com era'};f.append(w)}
    const mk=document.createElement('div');mk.className='mk';mk.style.marginTop='6px';marks(sh.code,mk);f.append(mk,area(sh.code,'Comentari a '+sh.vp+(sh.end?' (final)':'')));}
   else{const e=document.createElement('div');e.className='fail';e.textContent='Sense captura: '+sh.err;f.append(e)}
   row.append(f)}
  box.append(row);m.append(box)}
 scrollTo(0,y)}
function show(i){cur=(i+visible.length)%visible.length;const{s,sh}=visible[cur];$('d-img').src='shots/'+sh.code+'.png';$('d-t').textContent=s.id+' · '+s.name+' · '+sh.vp+' · '+s.account;marks(sh.code,$('d-mk'));$('d-note').value=notes[sh.code]?.note||'';$('d-note').oninput=e=>set(sh.code,{note:e.target.value});if(!$('d').open)$('d').showModal()}
$('d-prev').onclick=()=>show(cur-1);$('d-next').onclick=()=>show(cur+1);$('d-x').onclick=()=>$('d').close();$('d').onclose=render;
if($('f-diff')){$('n-diff').textContent=diffCount();$('f-title').onchange=()=>{$('n-diff').textContent=diffCount();render()};$('f-diff').checked=localStorage.getItem(KEY+'-diff')!=='0';$('f-diff').onchange=e=>{localStorage.setItem(KEY+'-diff',e.target.checked?'1':'0');render()}}
for(const i of['f-flow','f-acc','f-fam','f-todo'])$(i).onchange=render;
$('copy').onclick=async e=>{const t=Object.keys(notes).sort().map(k=>k+(notes[k].mark?' ['+notes[k].mark+']':'')+': '+(notes[k].note||'')).join('\\n');try{await navigator.clipboard.writeText(t);e.target.textContent='Copiat!'}catch{const a=document.createElement('textarea');a.value=t;e.target.after(a)}};
(live?fetch('comentaris').then(r=>r.json()).then(j=>{notes={...notes,...j}}).catch(()=>{}):Promise.resolve()).then(()=>{count();render()});
</script></html>`;
}

// ---------------------------------------------------------------- servidor de la pàgina: un sol fitxer de comentaris, compartit entre l'ordinador i el mòbil
function serveReview(port) {
  const file = join(OUT, 'comentaris.json');
  createServer((q, r) => {
    const path = decodeURIComponent(q.url.split('?')[0]);
    if (path === '/comentaris' && q.method === 'POST') {
      let body = ''; q.on('data', d => { body += d; if (body.length > 2e6) q.destroy(); });
      q.on('end', () => { try { JSON.parse(body); writeFileSync(file, body); r.writeHead(204); } catch { r.writeHead(400); } r.end(); });
      return;
    }
    const target = path === '/comentaris' ? file : join(OUT, normalize(path === '/' ? 'index.html' : path));
    if (!target.startsWith(OUT) || !existsSync(target)) { r.writeHead(path === '/comentaris' ? 200 : 404, { 'content-type': 'application/json' }); r.end(path === '/comentaris' ? '{}' : ''); return; }
    r.writeHead(200, { 'content-type': MIME[extname(target)] ?? 'application/octet-stream', 'cache-control': 'no-cache' }); r.end(readFileSync(target));
  }).listen(port, '0.0.0.0', () => console.log(`http://localhost:${port}/`));
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  if (args.serve) return serveReview(args.serve === '1' ? 5179 : +args.serve);
  if (args.base) { // the other branch, built from its own files with this tool's screens; a screen it can't reach counts as new
    const ref = args.base === '1' ? 'origin/main' : args.base, sha = execSync(`git rev-parse ${ref}`, { cwd: ROOT }).toString().trim(), dir = `/tmp/ui-review-base-${sha.slice(0, 10)}`;
    mkdirSync(join(REVIEW, 'base'), { recursive: true });
    if (!existsSync(join(dir, 'package.json'))) { mkdirSync(dir, { recursive: true }); execSync(`git archive ${sha} | tar -x -C ${dir}`, { cwd: ROOT, shell: '/bin/bash' }); execSync(`ln -sf ${join(ROOT, 'node_modules')} ${dir}/node_modules`); }
    const pass = process.argv.slice(2).filter(a => !a.startsWith('--base'));
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--baseline', `--src=${dir}`, `--dist=/tmp/ui-review-dist-${sha.slice(0, 10)}`, ...pass], { stdio: 'inherit' });
    if (r.status) throw new Error('la captura de la referència ha fallat');
    writeFileSync(join(REVIEW, 'base/ref.txt'), `${ref.replace('origin/', '')} (${sha.slice(0, 7)})\n`);
    if (existsSync(join(REVIEW, 'screens.json'))) writeFileSync(join(REVIEW, 'index.html'), page(JSON.parse(readFileSync(join(REVIEW, 'screens.json'), 'utf8'))));
    return;
  }
  const units = planUnits(), dbFile = join(OUT, 'screens.json');
  if (args.list) { units.forEach(u => console.log(codeOf(u.s, u.vp))); console.log(`${SCREENS.length} pantalles, ${units.length} captures`); return; }
  const { chromium } = await import(pathToFileURL(join(args.pw ?? '/tmp/ui-inv-pw', 'node_modules/playwright/index.mjs')).href);
  build();
  const { srv, port } = await serve();
  await lock();
  const real = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--mute-audio'] });
  let soft = null; // E07 només surt amb WebGL per programari
  const db = existsSync(dbFile) ? JSON.parse(readFileSync(dbFile, 'utf8')) : [];
  let next = 0, done = 0;
  const key = ({ s, vp }) => (REUSE.has(s.id) ? `${vp}|${s.query}|${JSON.stringify(s.storage)}` : `${s.id}|${vp}`);
  const groups = [...Map.groupBy(units, key).values()];
  const worker = async () => {
    for (let g; (g = groups[next++]);) {
      const h = { ctxOpts: {}, keep: true };
      for (const u of g) {
        const b = u.s.soft ? (soft ??= await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'] })) : real;
        const recs = await capture(b, u, port, h), rec = recs[0];
        for (const r of db.splice(0).filter(c => c.code !== rec.code && c.code !== `${rec.code}-fi`)) db.push(r);
        db.push(...recs);
        writeFileSync(dbFile, JSON.stringify(db, null, 1)); writeFileSync(join(OUT, 'index.html'), page(db));
        console.log(`${rec.ok ? '✓' : '✗'} ${rec.code} [${++done}/${units.length}]${rec.ok ? ` ${rec.showing}` : `  ${rec.err}`}`);
      }
      await h.ctx?.close().catch(() => {});
    }
  };
  try { await Promise.all(Array.from({ length: WORKERS }, worker)); }
  finally { await real.close().catch(() => {}); await soft?.close().catch(() => {}); srv.closeAllConnections?.(); srv.close(); }
  const covered = new Set(db.flatMap(c => (c.showing ?? '').split(',')));
  const missing = [...readFileSync(join(ROOT, 'index.html'), 'utf8').matchAll(/<dialog[^>]*id="([^"]+)"/g)].map(m => m[1]).filter(id => !covered.has(id));
  if (missing.length && !args.only && !args.vps) console.log(`fulles sense cap pantalla a SCREENS: ${missing.join(', ')}`);
  console.log(`fet: ${db.filter(c => c.ok).length} captures, ${db.filter(c => !c.ok).length} fallides → ${join(OUT, 'index.html')}`);
}
main().then(() => { if (!args.serve) process.exit(0); }).catch(e => { console.error(e); process.exit(1); }); // a closed browser can leave a handle open: without the exit the run ends but never returns
