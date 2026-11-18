#!/usr/bin/env node
// Teaser A2 capture: steps the game frame by frame on the teaser's clock (headless Chrome, Metal, sandboxed, GPU lock).
// After make-cut.py, with `npm run dev` serving this checkout:
// node tools/social/instagram/campaigns/bou-teaser/film.mjs [--fps=60] [--stills=4.5,5.2] [--raw] [--cfg=<json>] [--out=<dir>] [--url=http://localhost:5178] [--grade=1|1.5|2]
// Frames go to output/instagram/bou-teaser/frames (emptied first); --stills writes only those film seconds.
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '../../../../..'), OUT = join(ROOT, 'output/instagram/bou-teaser');
const a = Object.fromEntries(process.argv.slice(2).map(s => { const [k, ...v] = s.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : '1']; }));
const cfg = JSON.parse(readFileSync(a.cfg ?? join(OUT, 'cut.json'), 'utf8')); cfg.raw = !!a.raw; if (a.grade) cfg.grade = +a.grade;
const { lock } = await import(pathToFileURL(join(ROOT, 'tools/qa/capture-lib.mjs')).href);
const { chromium } = await import(pathToFileURL('/tmp/ui-inv-pw/node_modules/playwright/index.mjs').href);
await lock();
const browser = await chromium.launch({ channel: 'chrome', headless: true, chromiumSandbox: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--mute-audio'] });
try {
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.clock.install(); // (before the page: swapped in mid-run, the frame clock's jump blew the scene's light out)
  await page.goto(`${a.url ?? 'http://localhost:5178'}/?mute&rawclock&figura=bou&autoplay&from=2`);
  await page.waitForTimeout(5000); await page.mouse.click(270, 700); await page.waitForTimeout(2500);
  await page.evaluate(() => window.__dbg.choose(1)); await page.waitForTimeout(3000);
  console.log(await page.evaluate(`(${readFileSync(join(HERE, 'film-page.js'), 'utf8').replace(/^\/\/.*\n/, '')})(${JSON.stringify(cfg)})`));
  const out = a.out ?? join(OUT, 'frames'); rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
  const fps = +(a.fps ?? 30), times = a.stills ? a.stills.split(',').map(Number) : Array.from({ length: Math.round(cfg.end * fps) }, (_, i) => i / fps);
  // the page's own clock stands still and is stepped a frame at a time: the crowd, the sparks and every other thing the
  // game moves by its frame time ran 12 times too fast between two screenshots (the owner: «el públic vibra, sembla bugejat»)
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 200);
  const tick = async t => { await page.evaluate(x => window.film.set(x), t); await page.clock.runFor(1000 / fps); };
  if (a.stills) for (const t of times) { for (let k = 45; k >= 0; k--) await tick(t - k / fps); await page.screenshot({ path: join(out, `t${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 90 }); }
  else for (let i = 0; i < times.length; i++) { await tick(times[i]); await page.screenshot({ path: join(out, `${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95 }); if (i % 100 === 0) console.log(i, '/', times.length); }
  console.log('errors', errors.slice(0, 3));
} finally { await browser.close(); }
process.exit(0);
