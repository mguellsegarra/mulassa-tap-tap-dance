// Garbage per frame, in a real Chrome page (the JavaScript is every phone's): an iPhone in Low Power Mode spent 10-25% of
// its CPU in the collector when the splash allocated 12.8 MB/s (2026-11-03: the Drac's leg normals through Math.hypot, the
// crowd grid's cells emptied with length = 0, three.js's one shadow depth material shared by plain, instanced and skinned
// casters). V8's sampling heap profiler over the splash and the selector's idle reel must stay inside the budget below, and
// no material may be re-evaluated for its program every frame (the shared depth material did it ~4 times a frame).
// Raise a budget only with a measured reason, written in docs/agents/device-profiling.md. Needs Playwright
// (PLAYWRIGHT_DIR, default /tmp/ui-inv-pw) and a Chromium: skipped with a message otherwise. Runs with `npm run check:gpu`.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { launchBrowser } from '../../tools/qa/capture-lib.mjs';

const pw = process.env.PLAYWRIGHT_DIR ?? '/tmp/ui-inv-pw', entry = join(pw, 'node_modules/playwright/index.mjs');
if (!existsSync(entry)) { console.log(`alloc budget: skipped (no Playwright at ${pw})`); process.exit(0); }
const { chromium } = await import(pathToFileURL(entry).href);
let browser;
for (const soft of [false, true]) {
  try { browser = await launchBrowser(chromium, { soft }); break; }
  catch (err) { if (err.code === 'GPU_LOCK_BUSY') throw err; if (soft) { console.log(`alloc budget: skipped (no Chromium: ${String(err.message).split('\n')[0]})`); process.exit(0); } }
}
// MB/s allocated (sampled), measured 7.3 (splash) and 5.6 (idle reel) after the 2026-11-03 fixes, plus headroom
const BUDGET = { splash: 9, idle: 7 };

const server = await createServer({ root: fileURLToPath(new URL('../..', import.meta.url)), logLevel: 'silent', server: { port: 0, strictPort: false } });
await server.listen();
try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await context.newPage(), cdp = await context.newCDPSession(page);
  page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
  await page.goto(`http://localhost:${server.config.server.port}/?mute`);
  await page.waitForFunction(() => document.getElementById('loader')?.hidden ?? true, null, { timeout: 120000 });
  await page.waitForTimeout(4000); // past the first frames' one-off work
  const allocated = async ms => {
    await cdp.send('HeapProfiler.enable');
    await cdp.send('HeapProfiler.startSampling', { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    await page.waitForTimeout(ms);
    const { profile } = await cdp.send('HeapProfiler.stopSampling'), self = new Map();
    let total = 0;
    const walk = n => { const f = n.callFrame, k = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber + 1}`;
      total += n.selfSize; if (n.selfSize) self.set(k, (self.get(k) ?? 0) + n.selfSize); n.children.forEach(walk); };
    walk(profile.head);
    const rate = b => b / 1048576 / (ms / 1000);
    return { rate: rate(total), top: [...self].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${rate(v).toFixed(2)} ${k}`) };
  };
  // three.js calls a material's customProgramCacheKey() each time it re-evaluates its program: count them per frame
  const reEvaluations = () => page.evaluate(async () => {
    const { scene } = await import('/src/scene/stage.js');
    let mat = null; scene.traverse(o => { if (!mat && o.material && !Array.isArray(o.material)) mat = o.material; });
    let proto = mat; while (proto && !Object.prototype.hasOwnProperty.call(proto, 'customProgramCacheKey')) proto = Object.getPrototypeOf(proto);
    const orig = proto.customProgramCacheKey, seen = new Map(); let frames = 0;
    proto.customProgramCacheKey = function () { seen.set(this.type, (seen.get(this.type) ?? 0) + 1); return orig.call(this); };
    await new Promise(done => { const f = () => (++frames < 60 ? requestAnimationFrame(f) : done()); requestAnimationFrame(f); });
    proto.customProgramCacheKey = orig;
    return [...seen].map(([type, n]) => `${type} ${(n / frames).toFixed(1)}/frame`);
  });

  const splash = await allocated(8000), splashEval = await reEvaluations();
  await page.mouse.click(196, 426); await page.waitForTimeout(3000); // into the selector
  await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  await page.waitForFunction(() => document.body.classList.contains('reel-idle'), null, { timeout: 30000 }); // untouched: the idle reel
  // Its crowd's pose() reaches V8's top tier only seconds into the reel: sampled before, the same build read 6.0 or 6.8 MB/s
  // by luck (pose 0.3 or 0.65), after it a steady 5.2-5.4 (2026-11-03)
  await page.waitForTimeout(8000);
  const idle = await allocated(8000), idleEval = await reEvaluations();
  assert.deepEqual(page.errors, [], 'no page errors');
  assert.deepEqual([...splashEval, ...idleEval], [], 'no material re-evaluated for its program every frame (a material shared by plain, instanced and skinned meshes does it)');
  assert(splash.rate <= BUDGET.splash, `splash allocates ${splash.rate.toFixed(1)} MB/s (budget ${BUDGET.splash}); top: ${splash.top.join(' | ')}`);
  assert(idle.rate <= BUDGET.idle, `idle reel allocates ${idle.rate.toFixed(1)} MB/s (budget ${BUDGET.idle}); top: ${idle.top.join(' | ')}`);
  console.log(`alloc budget: splash ${splash.rate.toFixed(1)} MB/s, idle reel ${idle.rate.toFixed(1)} MB/s, no per-frame material re-evaluation ok`);
} finally {
  await browser.close(); await server.close();
}
