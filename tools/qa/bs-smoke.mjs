// Bateria de proves de pre-producció contra beta.mulassa.cat en dispositius reals de BrowserStack (o el Chrome local
// amb --local, que no gasta minuts). Una partida de veritat, sense cap ganxo de depuració que marqui la sessió: només es
// llegeix __dbg.songTime() i la resta és DOM, perquè la publicació i les estadístiques continuïn actives.
//   node tools/qa/bs-smoke.mjs --local
//   node tools/qa/bs-smoke.mjs --devices="Samsung Galaxy S20@10.0,Samsung Galaxy Tab S8@12.0@landscape" [--mail=correu]
// Claus: BROWSERSTACK_USERNAME/BROWSERSTACK_ACCESS_KEY o la clau de macOS (browserstack-user, browserstack-key).
// Surt a /tmp/bs-smoke/<data>/<dispositiu>/: result.json (cada pas ✓/✗ amb nota) i una captura per pas.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { launchBrowser } from './capture-lib.mjs';

const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const has = name => process.argv.includes(`--${name}`);
const URL0 = arg('url') ?? 'https://beta.mulassa.cat/';
const MAIL = arg('mail'); // amb --mail el pas del correu espera el codi a <dir>/code.txt (algú el llegeix i l'hi deixa)
const LOCAL = has('local');
const pw = process.env.PLAYWRIGHT_DIR ?? '/tmp/ui-inv-pw';
const { chromium, _android } = await import(pathToFileURL(join(pw, 'node_modules/playwright/index.mjs')).href);
const PW_VERSION = JSON.parse(readFileSync(join(pw, 'node_modules/playwright/package.json'), 'utf8')).version;
const root = fileURLToPath(new URL('../..', import.meta.url));
const song = JSON.parse(readFileSync(join(root, 'src/song-mulassa.json'), 'utf8'));
const out = join('/tmp/bs-smoke', new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'));

// El chart de FÀCIL, com makeDanceChart (src/game/chart.js) amb diff 0: sense MANTÉN; els GLOBUS es piquen a ritme.
function easyChart() {
  const B = song.beats, win = (song.balloonBeats ?? []).map(([a, b]) => [B[a], B[b]]);
  const inBalloon = t => win.some(([a, b]) => t > a - 1e-3 && t < b - 1e-3);
  const notes = song.notes.filter(([t, , lvl]) => lvl === 0 && !inBalloon(t)).map(([t, kind, , big]) => ({ t, keys: big ? ['ArrowLeft', 'ArrowRight'] : [kind === 'don' ? 'ArrowLeft' : 'ArrowRight'] }));
  for (const [a, b] of win) for (let t = a + 0.05; t < b - 0.05; t += 0.12) notes.push({ t, keys: ['ArrowLeft'] });
  return notes.sort((x, y) => x.t - y.t);
}

const keychain = s => execFileSync('security', ['find-generic-password', '-s', s, '-w'], { encoding: 'utf8' }).trim();
const creds = () => ({ user: process.env.BROWSERSTACK_USERNAME || keychain('browserstack-user'), key: process.env.BROWSERSTACK_ACCESS_KEY || keychain('browserstack-key') });

async function waitCode(dir, since) {
  const f = join(dir, 'code.txt');
  console.log(`ESPERANT CODI: escriu-lo a ${f} (enviat ${new Date(since).toISOString()})`);
  for (let i = 0; i < 600; i++) { if (existsSync(f)) { const c = readFileSync(f, 'utf8').trim(); if (/^\d{6}$/.test(c)) return c; } await new Promise(r => setTimeout(r, 1000)); }
  throw new Error('cap codi en 10 min');
}

// iOS: Playwright no hi arriba en dispositius reals; Safari per WebDriver (selenium-webdriver a SELENIUM_DIR) darrere
// d'una page mínima amb el que fan servir els passos. Els tocs són tocs reals (Actions), que Safari vol per al so.
async function safariPage(dev) {
  const { Builder, By } = (await import(pathToFileURL(join(process.env.SELENIUM_DIR ?? '/tmp/bs-selenium', 'node_modules/selenium-webdriver/index.js')).href)).default;
  const { user, key } = creds();
  const driver = await new Builder().usingServer('https://hub.browserstack.com/wd/hub').withCapabilities({ browserName: 'safari',
    'bstack:options': { deviceName: dev.name, osVersion: dev.os, realMobile: 'true', userName: user, accessKey: key, buildName: 'mulassa 1.2.0 smoke', sessionName: dev.name, idleTimeout: 300, ...(dev.landscape ? { deviceOrientation: 'landscape' } : {}) } }).build();
  await driver.manage().setTimeouts({ script: 240000, pageLoad: 90000 });
  const evaluate = async (fn, arg) => {
    const r = await driver.executeAsyncScript(`const cb = arguments[arguments.length - 1];
      try { Promise.resolve((${typeof fn === 'string' ? `() => ${fn}` : fn})(arguments[0])).then(v => cb({ v }), e => cb({ e: String(e && e.message || e) })); } catch (e) { cb({ e: String(e && e.message || e) }); }`, arg ?? null);
    if (r?.e) throw new Error(r.e); return r?.v;
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const tapAt = (x, y) => driver.actions({ async: true }).move({ x: Math.round(x), y: Math.round(y), origin: 'viewport' }).press().release().perform();
  // ':visible' i '>> nth=0' (sintaxi de Playwright): el primer element visible
  const boxOf = (sel, text) => evaluate(([sel, text]) => { const css = sel.replace(/:visible|\s*>>\s*nth=0/g, '').trim();
    const els = text ? [...document.querySelectorAll('button, a, [role=button], span, div')].filter(e => e.textContent.includes(text)).reverse() : [...document.querySelectorAll(css)];
    const e = els.find(e => e.getClientRects().length && !e.closest('[hidden]')); if (!e) return null;
    e.scrollIntoView?.({ block: 'center', inline: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }, [sel, text]);
  const locator = (sel, text) => ({
    boundingBox: () => boxOf(sel, text),
    first() { return this; },
    async click({ timeout = 10000 } = {}) { // el clic natiu de safaridriver (un toc per coordenades no arriba a baix de tot)
      const by = text ? By.xpath(`//*[self::button or self::a or @role='button'][contains(., ${JSON.stringify(text)})]`) : By.css(sel.replace(/:visible|\s*>>\s*nth=0/g, '').trim());
      const t = Date.now();
      for (;;) { for (const el of await driver.findElements(by)) if (await el.isDisplayed().catch(() => false)) { await el.click(); return; }
        if (Date.now() - t > timeout) throw new Error(`${text ?? sel} no hi és`); await sleep(300); } },
    elementHandle: async () => { const b = await boxOf(sel, text); return b && { boundingBox: async () => b }; },
  });
  const page = {
    goto: url => driver.get(url),
    evaluate: async (fn, arg) => typeof arg === 'string' && arg.startsWith('browserstack_executor') ? driver.executeScript(arg) : evaluate(fn, arg),
    async waitForFunction(fn, arg, { timeout = 30000 } = {}) { const t = Date.now(); for (;;) { if (await evaluate(fn, arg).catch(() => false)) return; if (Date.now() - t > timeout) throw new Error(`waitForFunction: Timeout ${timeout}ms exceeded.`); await sleep(500); } },
    waitForTimeout: sleep,
    viewportSize: () => null,
    mouse: { click: tapAt },
    async fill(sel, v) { const el = await driver.findElement(By.css(sel)); await el.clear(); await el.sendKeys(v); },
    locator: sel => locator(sel),
    getByText: text => locator(null, text),
    on() {}, addInitScript: async fn => { page.init = fn; },
    screenshot: async ({ path }) => writeFileSync(path, Buffer.from(await driver.takeScreenshot(), 'base64')),
  };
  return { page, close: () => driver.quit().catch(() => {}) };
}

async function openDevice(dev) {
  if (dev.ios) return safariPage(dev);
  if (LOCAL) {
    const browser = await launchBrowser(chromium);
    const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    return { page: await ctx.newPage(), close: () => browser.close() };
  }
  const { user, key } = creds();
  const caps = { ...(dev.landscape ? { deviceOrientation: 'landscape' } : {}), osVersion: dev.os, deviceName: dev.name, realMobile: 'true', browserName: 'chrome', build: 'mulassa 1.2.0 smoke', name: dev.name,
    'browserstack.username': user, 'browserstack.accessKey': key, 'client.playwrightVersion': PW_VERSION, 'browserstack.idleTimeout': 300 };
  const device = await _android.connect(`wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify(caps))}`);
  await device.shell('am force-stop com.android.chrome');
  dev.android = device;
  const ctx = await device.launchBrowser();
  const page = await ctx.newPage(); // una pestanya pròpia al davant: la que Chrome ja tenia oberta tapava la nostra (about:blank)
  for (const p of ctx.pages()) if (p !== page) await p.close().catch(() => {});
  await page.bringToFront();
  return { page, close: async () => { await ctx.close().catch(() => {}); await device.close().catch(() => {}); } };
}

async function run(dev) {
  const dir = join(out, (dev.name + '-' + dev.os).replace(/[^\w.-]+/g, '_')); mkdirSync(dir, { recursive: true });
  const steps = [], errors = [];
  const t0 = Date.now();
  let page, close, n = 0;
  // Android: la captura de la pantalla del mòbil (adb); la de la pàgina per CDP es penja amb el WebGL i tanca la sessió.
  const shot = async name => { const path = join(dir, `${String(++n).padStart(2, '0')}-${name}.png`);
    try { if (dev.android) writeFileSync(path, await dev.android.screenshot()); else await page.screenshot({ scale: 'css', path, timeout: 15000 }); } catch {} };
  const step = async (name, fn) => {
    const s = Date.now();
    try { const note = await fn(); steps.push({ name, ok: true, ms: Date.now() - s, note }); console.log(`[${dev.name}] ✓ ${name}${note ? ` (${note})` : ''}`); }
    catch (e) { steps.push({ name, ok: false, ms: Date.now() - s, note: String(e.message).split('\n')[0] }); console.log(`[${dev.name}] ✗ ${name}: ${String(e.message).split('\n')[0]}`); }
    await shot(name);
    return steps.at(-1).ok;
  };
  const visible = sel => page.evaluate(s => { const e = document.querySelector(s); return !!e && !e.hidden && e.getClientRects().length > 0; }, sel);
  const waitVisible = (sel, timeout = 30000) => page.waitForFunction(s => { const e = document.querySelector(s); return !!e && !e.hidden && e.getClientRects().length > 0; }, sel, { timeout });
  const tap = async sel => { if (dev.ios) return page.locator(sel).click(); const b = await page.locator(sel).boundingBox(); if (!b) throw new Error(`${sel} sense caixa`); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
  // Fora de la pantalla de repòs (el showreel surt sol al cap d'una estona): un toc al mig només si la tira no es veu.
  const cardVisible = id => page.evaluate(id => { const e = document.querySelector(`.sel-card[data-id="${id}"]`); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight && !e.closest('[hidden]'); }, id);
  const toSelector = async vp => {
    for (let i = 0; i < 40 && !await visible('#select-strip'); i++) { if (i % 3 === 2) await page.mouse.click(vp.width / 2, vp.height * 0.45); await page.waitForTimeout(1000); }
    if (!await visible('#select-strip')) throw new Error('el selector no surt');
    await page.waitForTimeout(800);
  };
  // Turnstile: normalment no surt res; si demana la casella, un sol toc (com una persona). Torna què ha passat.
  const turnstile = async () => {
    for (let i = 0; i < 20; i++) {
      const fr = await page.locator('iframe[src*="challenges.cloudflare.com"]').elementHandle({ timeout: 500 }).catch(() => null);
      const b = fr && await fr.boundingBox();
      if (b && b.width > 50 && b.height > 30) { await page.waitForTimeout(1500); await page.mouse.click(b.x + 28, b.y + b.height / 2); await page.waitForTimeout(4000); return 'casella del Turnstile tocada'; }
      if (await page.evaluate(() => document.getElementById('publish-form')?.dataset.view === 'done')) return null;
      await page.waitForTimeout(500);
    }
    return null;
  };
  const selected = () => page.evaluate(() => document.querySelector('.sel-card[aria-selected="true"]')?.dataset.id);

  try {
    ({ page, close } = await openDevice(dev));
    await page.addInitScript(() => { // el full del sistema bloquejaria la sessió: es guarda el que rep
      window.__shared = []; navigator.canShare = () => true;
      navigator.share = d => { window.__shared.push({ text: d.text, url: d.url, files: (d.files ?? []).map(f => `${f.type} ${f.size}`) }); return Promise.resolve(); };
    });
    page.on('pageerror', e => errors.length < 10 && errors.push(String(e.message)));
    page.on('console', m => m.type() === 'error' && !/challenges\.cloudflare\.com/.test(m.location()?.url ?? '') && !/^%c%/.test(m.text()) && errors.length < 10 && errors.push(m.text()));

    if (!await step('carrega', async () => {
      await page.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => (document.getElementById('loader')?.hidden ?? true) || !!document.querySelector('#boot-watchdog:not([hidden])'), null, { timeout: 120000 });
      if (await visible('#boot-watchdog')) throw new Error('pantalla «No s’ha pogut carregar»');
      const v = await page.evaluate(() => fetch('/version.json', { cache: 'no-store' }).then(r => r.json()).then(j => j.build));
      return `${v}, ${Math.round((Date.now() - t0) / 1000)} s`;
    })) return;

    if (!await step('selector', async () => {
      const vp = page.viewportSize() ?? await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
      for (let i = 0; i < 5 && !await page.evaluate(() => !!document.querySelector('.sel-card[aria-selected="true"]')); i++) {
        await page.mouse.click(vp.width / 2, vp.height * 0.6); await page.waitForTimeout(1500);
      }
      await page.waitForFunction(() => document.querySelector('.sel-card[aria-selected="true"]')?.dataset.id === 'mulassa-valls', null, { timeout: 30000 });
      await toSelector(vp);
      return `${vp.width}×${vp.height}`;
    })) return;

    const pickCard = async id => { // la tira es mou amb el dit: toca la targeta (Playwright la porta a la vista)
      await page.locator(`.sel-card[data-id="${id}"]`).click({ timeout: 10000 });
      await page.waitForFunction(id => document.querySelector('.sel-card[aria-selected="true"]')?.dataset.id === id, id, { timeout: 10000 });
      await page.waitForTimeout(800);
    };
    await step('bou bloquejat', async () => {
      await toSelector(page.viewportSize() ?? await page.evaluate(() => ({ width: innerWidth, height: innerHeight })));
      await pickCard('bou-tradicional-valls');
      if (!await page.evaluate(() => document.getElementById('select-next').disabled)) throw new Error('el Bou es pot jugar');
      await pickCard('mulassa-valls');
    });

    if (!await step('entra a jugar (fàcil)', async () => {
      await page.waitForFunction(() => !document.getElementById('select-next').disabled, null, { timeout: 10000 });
      for (let i = 0; i < 10 && !await page.evaluate(() => document.getElementById('select-next').hidden); i++) { await tap('#select-next'); await page.waitForTimeout(700); }
      await tap('#select-act button:visible >> nth=0');
      await page.getByText('A BALLAR', { exact: false }).first().click({ force: true });
      await waitVisible('#pause, #skip', 60000);
      if (await visible('#skip')) { await tap('#skip'); await page.waitForTimeout(1500); return 'pràctica saltada'; }
    })) return;

    // Toca les notes de FÀCIL al seu temps (rellotge de la cançó) amb tecles reals del document, i mesura els frames.
    const chart = easyChart();
    if (!await step('partida sencera', async () => {
      await page.waitForFunction(() => window.__dbg?.songTime?.() > 0 && !!document.querySelector('#pause:not([hidden])'), null, { timeout: 90000 });
      const r = await page.evaluate(async ({ chart, end, pauseAt }) => {
        const press = (code, type) => document.body.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
        const st = () => window.__dbg.songTime();
        const frames = []; let last = performance.now(), go = true;
        const loop = now => { frames.push(now - last); last = now; if (go) requestAnimationFrame(loop); }; requestAnimationFrame(loop);
        let i = 0, paused = null, stuck = 0, prev = -1;
        const results = () => { const e = document.getElementById('results-actions'); return !!e && !e.hidden; };
        while (!results()) {
          const t = st();
          if (pauseAt && !paused && t > pauseAt) { // pausa a mitja cançó, comprova que el rellotge s'atura, continua
            press('KeyP', 'keydown'); press('KeyP', 'keyup'); await new Promise(r => setTimeout(r, 1500));
            const a = st(); await new Promise(r => setTimeout(r, 1000)); const b = st();
            paused = { open: !!document.getElementById('pause-menu')?.open, frozen: Math.abs(b - a) < 0.02 };
            document.getElementById('resume')?.click(); await new Promise(r => setTimeout(r, 300));
          }
          while (i < chart.length && t >= chart[i].t - 0.004) { for (const k of chart[i].keys) press(k, 'keydown'); for (const k of chart[i].keys) press(k, 'keyup'); i++; }
          stuck = t === prev ? stuck + 1 : 0; prev = t;
          if (stuck > 2000 || t > end + 30) break;
          await new Promise(r => setTimeout(r, 2));
        }
        go = false;
        const sorted = frames.slice(5).sort((a, b) => a - b), q = p => sorted[Math.floor(p * (sorted.length - 1))] ?? 0;
        const hits = [...document.querySelectorAll('#results-actions')].length;
        return { done: results(), pressed: i, of: chart.length, songEnd: st(), paused, fps: Math.round(1000 / q(0.5)), p99: Math.round(q(0.99)), long: sorted.filter(x => x > 50).length, hits };
      }, { chart, end: song.end, pauseAt: 40 });
      if (!r.done) throw new Error(`no surt el resultat (rellotge ${r.songEnd?.toFixed?.(1)} s, ${r.pressed}/${r.of} notes)`);
      if (r.paused && !(r.paused.open && r.paused.frozen)) throw new Error(`la pausa no atura el joc: ${JSON.stringify(r.paused)}`);
      return `${r.pressed}/${r.of} notes, ${r.fps} fps, p99 ${r.p99} ms, ${r.long} frames >50 ms, pausa ok`;
    })) return;

    await step('resultat', async () => {
      await page.waitForTimeout(2500);
      return page.evaluate(() => [...document.querySelectorAll('#results-actions button:not([hidden])')].map(b => b.textContent.trim()).join(' | '));
    });

    // Publicar: primer un sobrenom que s'ha de rebutjar, després un de bo com a convidat (Turnstile real a beta).
    const alias = `QA${dev.name.replace(/[^A-Za-z0-9]/g, '').slice(-5)}${Math.floor(100 + Math.random() * 900)}`;
    await step('sobrenom lleig rebutjat', async () => {
      if (!await visible('#publish-menu[open]')) await tap('#results-publish');
      await waitVisible('#publish-alias', 15000);
      await page.fill('#publish-alias', 'Pau1488');
      await page.waitForFunction(() => !document.getElementById('publish-send').disabled, null, { timeout: 20000 });
      await tap('#publish-send');
      await page.waitForFunction(() => document.getElementById('publish-alias').getAttribute('aria-invalid') === 'true', null, { timeout: 10000 });
      return page.evaluate(() => document.getElementById('publish-error')?.textContent.trim());
    });
    const published = await step('publica com a convidat', async () => {
      await page.fill('#publish-alias', alias);
      await tap('#publish-send');
      const box = await turnstile();
      await page.waitForFunction(() => document.getElementById('publish-form').dataset.view === 'done' || /\S/.test(document.getElementById('publish-status')?.textContent ?? '') && !document.getElementById('publish-send').disabled, null, { timeout: 90000 });
      const st = await page.evaluate(() => ({ view: document.getElementById('publish-form').dataset.view, status: document.getElementById('publish-status').textContent.trim() }));
      if (st.view !== 'done') throw new Error(`${st.status || 'no ha publicat'}${box ? ` (${box})` : ''}`);
      return `${st.status}${box ? `; ${box}` : ''}`;
    });

    if (published && MAIL) await step('correu, codi i nom', async () => {
      await page.fill('#publish-mail', MAIL);
      await tap('#publish-confirm');
      await waitVisible('#profile-menu[open]', 30000);
      if (await visible('#profile-mail-field')) { await page.waitForFunction(() => !document.getElementById('profile-send').disabled, null, { timeout: 20000 }); await tap('#profile-send'); await turnstile(); }
      await page.waitForFunction(() => !document.getElementById('profile-code-field').hidden || /\S/.test(document.getElementById('profile-status').textContent) && !document.getElementById('profile-send').disabled, null, { timeout: 90000 });
      if (!await visible('#profile-code-field')) throw new Error(`no envia el codi: ${await page.evaluate(() => document.getElementById('profile-status').textContent.trim())}`);
      const asked = Date.now();
      await page.fill('#profile-code', '000000'); await tap('#profile-send');
      await page.waitForFunction(() => /\S/.test(document.getElementById('profile-status').textContent) && !document.getElementById('profile-send').disabled, null, { timeout: 30000 });
      const wrong = await page.evaluate(() => document.getElementById('profile-status').textContent.trim());
      if (!await visible('#profile-code-field')) throw new Error(`el codi erroni no s'ha rebutjat: ${wrong}`);
      const code = await waitCode(dir, asked);
      await page.fill('#profile-code', code); await tap('#profile-send');
      await page.waitForFunction(() => !document.getElementById('profile-alias-field').hidden || !document.getElementById('profile-menu').open, null, { timeout: 30000 });
      if (await visible('#profile-alias-field')) { await page.fill('#profile-alias', alias); await tap('#profile-send');
        await page.waitForFunction(() => !document.getElementById('profile-menu').open, null, { timeout: 30000 }); }
      return `erroni: «${wrong}»`;
    });

    await step('classificació', async () => {
      for (const id of ['publish-menu', 'profile-menu', 'share-menu']) await page.evaluate(id => document.getElementById(id)?.open && document.getElementById(id).close(), id);
      await tap('#results-board');
      await waitVisible('#board-rows', 30000);
      await page.waitForFunction(() => document.querySelectorAll('#board-rows > *').length > 0, null, { timeout: 30000 });
      const mine = await page.evaluate(a => document.getElementById('board-rows').textContent.includes(a), alias);
      await page.evaluate(() => document.getElementById('board-menu').close());
      if (published && !mine) throw new Error(`${alias} no surt a la classificació`);
      return mine ? `${alias} hi és` : 'sense publicar';
    });

    // Comparteix: el full del sistema bloquejaria la sessió, així que es captura el que rep navigator.share.
    let link = null;
    await step('comparteix', async () => {
      for (const id of ['publish-menu', 'profile-menu', 'board-menu']) await page.evaluate(id => document.getElementById(id)?.open && document.getElementById(id).close(), id);
      if (dev.ios) await page.evaluate(page.init);
      await tap('#results-share');
      await waitVisible('#share-menu[open]', 15000);
      await page.waitForFunction(() => !document.getElementById('share-image').disabled && document.getElementById('share-image').dataset.mode === 'share', null, { timeout: 30000 });
      await page.waitForTimeout(500);
      await tap('#share-image');
      await page.waitForFunction(() => window.__shared.length >= 1, null, { timeout: 15000 });
      await tap('#share-more');
      await page.waitForFunction(() => window.__shared.length >= 2, null, { timeout: 15000 });
      const [img, txt] = await page.evaluate(() => window.__shared);
      link = txt.url ?? (txt.text ?? '').match(/https?:\/\/\S+/)?.[0] ?? null;
      await page.evaluate(() => document.getElementById('share-menu').close());
      if (!img.files.length) throw new Error('el botó de la imatge no envia cap imatge');
      return `imatge ${img.files.join(', ')}; text ${(txt.text ?? '').length} caràcters; ${link ?? 'sense enllaç'}`;
    });

    if (link) await step('enllaç del repte', async () => {
      await page.goto(link.replace(/^https:\/\/[^/]+/, new URL(URL0).origin), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => document.getElementById('loader')?.hidden ?? true, null, { timeout: 120000 });
      if (await visible('#boot-watchdog')) throw new Error('no carrega');
      return new URL(link).search;
    });

    await step('idioma (es)', async () => {
      await page.goto(new URL('?lang=es', URL0).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => document.documentElement.lang?.startsWith('es'), null, { timeout: 60000 });
      return page.evaluate(() => document.getElementById('skip')?.getAttribute('aria-label'));
    });

    // Girar el mòbil: BrowserStack no deixa canviar la rotació per shell (FAIL), així que no es prova aquí.
  } catch (e) {
    steps.push({ name: 'sessió', ok: false, note: String(e.message).split('\n')[0] });
    console.log(`[${dev.name}] ✗ sessió: ${String(e.message).split('\n')[0]}`);
  } finally {
    const ok = steps.length > 0 && steps.every(s => s.ok);
    if (!LOCAL && page) await page.evaluate(() => {}, `browserstack_executor: ${JSON.stringify({ action: 'setSessionStatus', arguments: { status: ok ? 'passed' : 'failed', reason: steps.filter(s => !s.ok).map(s => s.name).join(', ').slice(0, 250) || 'ok' } })}`).catch(() => {});
    await close?.();
    const result = { device: { name: dev.name, os: dev.os }, ok, minutes: +((Date.now() - t0) / 60000).toFixed(1), steps, errors };
    writeFileSync(join(dir, 'result.json'), JSON.stringify(result, null, 2));
    return result;
  }
}

const devices = LOCAL ? [{ name: 'local-chrome', os: 'mac' }]
  : (arg('devices') ?? '').split(',').filter(Boolean).map(s => { const [name, os, orient] = s.split('@'); return { name, os, landscape: orient === 'landscape', ios: /iPhone|iPad/.test(name) }; });
if (!devices.length) { console.log('cal --local o --devices="Nom@versió,..."'); process.exit(2); }
const results = await Promise.all(devices.map(run));
writeFileSync(join(out, 'summary.json'), JSON.stringify(results, null, 2));
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.device.name} ${r.device.os}: ${r.minutes} min, ${r.steps.filter(s => s.ok).length}/${r.steps.length} passos${r.errors.length ? `, ${r.errors.length} errors a la consola` : ''}`);
console.log(out);
