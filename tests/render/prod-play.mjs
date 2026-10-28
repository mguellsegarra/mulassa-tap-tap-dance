// The production build plays: built with the real vite.config.js (an unreleased figure swapped out by
// tools/deploy/unreleased-figure.mjs, which dev and every other test never run), a Mulassa run starts, the plaça moves
// and nothing throws; the pending Bou's card shows on the way. Needs Playwright (PLAYWRIGHT_DIR, default /tmp/ui-inv-pw)
// and a Chromium: skipped with a message otherwise.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build, preview } from 'vite';
import { launchBrowser } from '../../tools/qa/capture-lib.mjs';

const pw = process.env.PLAYWRIGHT_DIR ?? '/tmp/ui-inv-pw', entry = join(pw, 'node_modules/playwright/index.mjs');
if (!existsSync(entry)) { console.log(`prod play: skipped (no Playwright at ${pw})`); process.exit(0); }
const { chromium } = await import(pathToFileURL(entry).href);
let browser;
for (const soft of [false, true]) {
  try { browser = await launchBrowser(chromium, { soft }); break; }
  catch (err) { if (soft) { console.log(`prod play: skipped (no Chromium: ${String(err.message).split('\n')[0]})`); process.exit(0); } }
}

const root = fileURLToPath(new URL('../..', import.meta.url)), outDir = mkdtempSync(join(tmpdir(), 'prod-play-'));
let server;
try {
  await build({ root, logLevel: 'error', build: { outDir, emptyOutDir: true, reportCompressedSize: false } });
  server = await preview({ root, logLevel: 'error', build: { outDir }, preview: { port: 0, strictPort: false } });
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => localStorage.setItem('gpu-hint', 'off')); // on software GL (no Chrome) its once-ever tip would take the taps
  const errors = []; page.on('pageerror', e => errors.length < 3 && errors.push(e.stack ?? e.message));
  await page.goto(`${server.resolvedUrls.local[0]}?mute`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('loader')?.hidden ?? true, null, { timeout: 120000 });
  await page.mouse.click(187, 400); // the splash's tap
  await page.waitForFunction(() => window.__dbg.G.state === 'select', null, { timeout: 30000 });
  const selected = () => page.evaluate(() => document.querySelector('.sel-card[aria-selected="true"]')?.dataset.id);
  const step = async dir => { // (force: the buttons pulse)
    const was = await selected(); await page.click(`#select-${dir}`, { force: true });
    await page.waitForFunction(was => document.querySelector('.sel-card[aria-selected="true"]')?.dataset.id !== was, was, { timeout: 10000 });
  };
  await page.waitForFunction(() => document.querySelector('.sel-card[aria-selected="true"]')?.dataset.id === 'mulassa-valls', null, { timeout: 30000 });
  await step('forward'); await step('forward');
  assert.equal(await selected(), 'bou-tradicional-valls', 'the pending Bou is in the strip');
  assert(await page.evaluate(() => document.getElementById('select-next').disabled), 'the pending Bou cannot be played');
  await step('prev'); await step('prev');
  assert.equal(await selected(), 'mulassa-valls');
  await page.waitForFunction(() => !document.getElementById('select-next').disabled, null, { timeout: 10000 });
  // back from the pending Bou the dock slides «Tria la dificultat» up from below the screen: tap it once it rests on screen
  await page.waitForFunction(() => {
    const r = document.getElementById('select-next').getBoundingClientRect(), y = Math.round(r.top);
    const still = y === window.__nextY; window.__nextY = y;
    return still && r.bottom <= innerHeight;
  }, null, { timeout: 10000, polling: 100 });
  await page.click('#select-next', { force: true }); // (force: the button pulses)
  await page.waitForFunction(() => document.getElementById('select-next').hidden, null, { timeout: 2000 })
    .catch(() => assert.fail('one tap on a resting «Tria la dificultat» did not open the level step'));
  await page.locator('#select-act button:visible').first().click({ force: true });
  await page.getByText('A BALLAR', { exact: false }).click({ force: true });
  await page.waitForFunction(() => window.__dbg.G.state === 'play', null, { timeout: 30000 });
  await page.waitForTimeout(6000);
  const crowd = await page.evaluate(() => window.__dbg.crowd.map(p => [p.pos.x, p.pos.y]).flat());
  assert(crowd.length && crowd.every(Number.isFinite), 'every spectator stands somewhere');
  assert.deepEqual(errors, [], 'no page error in the production build');
  console.log('prod play: the production build plays a Mulassa run ok');
} finally { await server?.close(); await browser.close(); rmSync(outDir, { recursive: true, force: true }); }
