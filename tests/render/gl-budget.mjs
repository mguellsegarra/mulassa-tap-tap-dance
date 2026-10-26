// GPU resources and draw calls in a real (software) WebGL page. Cycling the figures and quality levels must leave
// renderer.info.memory where it was (a leaked geometry or texture fails), and each quality profile stays inside its
// draw-call budget at the selector and in play. Needs Playwright (PLAYWRIGHT_DIR, default /tmp/ui-inv-pw) and a Chromium:
// skipped with a message otherwise. The Bou is unreleased: a Vite plugin empties UNRELEASED_IDS for this server only.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const pw = process.env.PLAYWRIGHT_DIR ?? '/tmp/ui-inv-pw', entry = join(pw, 'node_modules/playwright/index.mjs');
if (!existsSync(entry)) { console.log(`gl budget: skipped (no Playwright at ${pw})`); process.exit(0); }
const { chromium } = await import(pathToFileURL(entry).href);
let browser;
try { browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'] }); } catch (err) { console.log(`gl budget: skipped (no Chromium: ${String(err.message).split('\n')[0]})`); process.exit(0); }

// Real GL draw calls a frame (the shadow pass included; renderer.info.render does not count it) per profile: the worst
// figure at the selector and in play, measured plus HEADROOM. Raise one only for a deliberate new draw, and say so in docs/agents/graphics.md.
const DRAWS = { selector: { minimal: 21, low: 22, medium: 33, high: 36 }, play: { minimal: 36, low: 37, medium: 59, high: 62 } };
const HEADROOM = 4, MAX_PROGRAMS = 90, LEVELS = { minimal: -1, low: 0, medium: 1, high: 2 };
const FIGURES = ['mulassa-valls', 'drac-valls', 'bou-tradicional-valls'];

const server = await createServer({ root: fileURLToPath(new URL('../..', import.meta.url)), logLevel: 'silent', server: { port: 0, strictPort: false },
  plugins: [{ name: 'release-bou', transform: (code, id) => id.endsWith('src/figures/index.js') ? code.replace("new Set(['bou-tradicional-valls'])", 'new Set([])') : null }] });
await server.listen();
const base = `http://localhost:${server.config.server.port}/`;
const open = async query => {
  const page = await (await browser.newContext({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 1 })).newPage();
  await page.addInitScript(() => {
    window.__draws = 0;
    for (const m of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) {
      const f = WebGL2RenderingContext.prototype[m];
      WebGL2RenderingContext.prototype[m] = function (...a) { window.__draws++; return f.apply(this, a); };
    }
  });
  page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
  await page.goto(`${base}?mute&perf${query}`);
  await page.waitForFunction(() => document.getElementById('loader')?.hidden ?? true, null, { timeout: 120000 });
  await page.waitForFunction(() => window.__representation && window.__perfLive, null, { timeout: 60000 });
  return page;
};
// Applies a level and samples it: the adaptive monitor may step a slow software page down meanwhile, so a sample that
// did not land on the asked profile is taken again.
const sample = async (page, name) => {
  for (let i = 0; i < 4; i++) {
    const s = await page.evaluate(async ([level, name]) => {
      window.__representation.quality(level);
      const frame = () => new Promise(r => requestAnimationFrame(r));
      await frame(); await frame();
      let draws = Infinity; // the steady frame: the least of six windows (a one-off burst, like a share render or a busy machine's
      // stalled frame, is not the budget; a real regression stays high in every window)
      for (let w = 0; w < 6; w++) { const d0 = window.__draws; for (let i = 0; i < 3; i++) await frame(); draws = Math.min(draws, Math.ceil((window.__draws - d0) / 3)); }
      return { ...window.__perfLive(), draws };
    }, [LEVELS[name], name]);
    if (s.quality === name) return s;
  }
  throw new Error(`could not hold the ${name} profile`);
};
const out = [], worst = { selector: {}, play: {} };
const note = (where, name, s) => { worst[where][name] = Math.max(worst[where][name] ?? 0, s.draws); };
try {
  { // selector: every figure at every profile; the second round (and the return to the start) must match the first
    const page = await open('');
    await page.keyboard.press('Enter'); // the splash's tap
    await page.waitForFunction(() => window.__dbg.G.state === 'select', null, { timeout: 30000 });
    for (let calm = 0, last = -1; calm < 8; await page.waitForTimeout(1000)) { // the idle selector's first showreel cuts build things lazily over ~10 s: wait them out
      const g = (await page.evaluate(() => window.__perfLive())).geos; calm = g === last ? calm + 1 : 0; last = g;
    }
    const pick = id => page.evaluate(i => document.querySelector(`[data-id="${i}"]`).click(), id);
    const round = async () => { const seen = {}; for (const id of FIGURES) { await pick(id); for (const name of Object.keys(LEVELS)) seen[`${id} ${name}`] = await sample(page, name); } return seen; };
    for (const id of FIGURES) { await pick(id); await sample(page, 'medium'); } // warms: a first visit builds some things lazily
    // rounds until two in a row match (at most four): on a busy machine the showreel's lazy builds trail on for a round or
    // two, while a leak grows every round and still fails below
    let first = await round(), second = await round();
    for (let r = 0; r < 2 && Object.keys(first).some(k => first[k].geos !== second[k].geos || first[k].texs !== second[k].texs); r++) [first, second] = [second, await round()];
    await pick(FIGURES[0]);
    const end = await sample(page, 'medium');
    for (const k of Object.keys(first)) {
      const a = first[k], b = second[k];
      out.push(`selector ${k}: ${a.draws} draws, ${a.calls} calls, ${a.tris} tris, ${a.geos} geometries, ${a.texs} textures, ${a.programs} programs`);
      assert.equal(b.geos, a.geos, `${k}: geometries after another round (${a.geos} -> ${b.geos})`);
      assert.equal(b.texs, a.texs, `${k}: textures after another round (${a.texs} -> ${b.texs})`);
      assert(b.programs <= MAX_PROGRAMS, `${k}: ${b.programs} shader programs`);
      note('selector', k.split(' ')[1], a); note('selector', k.split(' ')[1], b);
    }
    assert.equal(end.geos, first[`${FIGURES[0]} medium`].geos, 'geometries back at the start');
    assert.equal(end.texs, first[`${FIGURES[0]} medium`].texs, 'textures back at the start');
    assert.deepEqual(page.errors, []);
  }
  for (const [figura, id] of [['mulassa', FIGURES[0]], ['drac', FIGURES[1]]]) { // in play: the lane, the colla, the effects
    const page = await open(`&autoplay&from=40&figura=${figura}`);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__dbg.G.state === 'select', null, { timeout: 30000 });
    // ?figura opens the selector on its figure a moment later: choosing before that plays the Mulassa
    await page.waitForFunction(async id => (await import('/src/game/figure-song.js')).selectedFigure.id === id, id, { timeout: 30000 });
    await page.evaluate(() => window.__dbg.choose(1));
    await page.waitForFunction(() => window.__dbg.G.state === 'play', null, { timeout: 30000 });
    for (const name of Object.keys(LEVELS)) { const s = await sample(page, name); out.push(`play ${figura} ${name}: ${s.draws} draws, ${s.calls} calls, ${s.tris} tris`); note('play', name, s); }
    assert.deepEqual(page.errors, []);
  }
  console.log(out.join('\n'));
  for (const where of ['selector', 'play']) for (const name of Object.keys(LEVELS))
    assert(worst[where][name] <= DRAWS[where][name] + HEADROOM, `${where} ${name}: ${worst[where][name]} draws a frame, budget ${DRAWS[where][name]} + ${HEADROOM}`);
} finally { await browser.close(); await server.close(); }
console.log('gl budget ok');
