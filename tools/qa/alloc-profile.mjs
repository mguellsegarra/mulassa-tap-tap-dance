// Who allocates per frame (garbage the collector must clear: on an iPhone in Low Power Mode its threads took 10-25% of the
// CPU, docs/agents/device-profiling.md). Headless Chrome on a dev server: V8's sampling heap profiler over 10 s of the splash
// and 10 s of the selector's idle reel; prints MB/s by function, and natives/three.js by the game function that called them.
// The JavaScript is the same on every phone, so the allocators found here are the phone's. Playwright: /tmp/ui-inv-pw.
// usage: node tools/qa/alloc-profile.mjs [url=http://127.0.0.1:5178/?mute]
const { chromium } = await import(`${process.env.PLAYWRIGHT_DIR ?? '/tmp/ui-inv-pw'}/node_modules/playwright/index.mjs`);
const b = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--js-flags=--expose-gc'] });
const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
await page.goto(process.argv[2] ?? 'http://127.0.0.1:5178/?mute', { waitUntil: 'load' }); await page.waitForTimeout(8000);
const sample = async (label, ms) => {
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.startSampling', { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
  await page.waitForTimeout(ms);
  const { profile } = await cdp.send('HeapProfiler.stopSampling');
  const self = new Map(); let total = 0;
  const via = new Map();
  const walk = (n, stack) => { const f = n.callFrame, k = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-2).join('/').replace(/\?.*/, '')}:${f.lineNumber + 1}`;
    const bytes = n.selfSize; total += bytes; if (bytes) self.set(k, (self.get(k) ?? 0) + bytes);
    if (bytes && (/:0$|deps\//.test(k))) { const owner = [...stack].reverse().find(s => !/:0$|deps\//.test(s)) ?? '?'; const kk = `${k.split(' ')[0]} <- ${owner}`; via.set(kk, (via.get(kk) ?? 0) + bytes); }
    for (const c of n.children) walk(c, [...stack, k]); };
  walk(profile.head, []);
  console.log(`\n== ${label}: ${(total / 1048576 / (ms / 1000)).toFixed(1)} MB/s allocated (sampled)`);
  for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`${(v / 1048576 / (ms / 1000)).toFixed(2).padStart(6)} MB/s  ${k}`);
  console.log('  natives and three.js, by the game function that called them:');
  for (const [k, v] of [...via].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`${(v / 1048576 / (ms / 1000)).toFixed(2).padStart(6)} MB/s    ${k}`);
};
await sample('splash', 10000);
await page.mouse.click(196, 426); await page.waitForTimeout(3000);
await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
await page.waitForTimeout(13000); // untouched: the idle reel
console.log('idle?', await page.evaluate(() => document.body.classList.contains('reel-idle')));
await sample('idle reel', 10000);
await b.close();
