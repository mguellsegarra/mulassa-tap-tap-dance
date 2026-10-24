#!/usr/bin/env node
// Eina de dev (no entra al build): captura d'una sessió del joc amb la GPU real (Chrome + Metal), no SwiftShader.
// Sortida a --out (def. /tmp/mulassa-capture/<hora>): frames.csv (ms de cada rAF), summary.json, video.mp4 i spike-N.jpg
// (contact sheet al voltant dels pitjors frames). Un lock a /tmp fa que els agents facin cua: només un Chrome GPU alhora.
// Ús: node tools/capture.mjs --url='http://localhost:5178/?mute&autoplay&from=40' [--seconds=20] [--vp=393x852] [--dpr=2] [--touch] [--pw=/tmp/ui-inv-pw] [--js='codi un cop carregat']
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lock, launchBrowser } from './capture-lib.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : '1']; }));
if (!args.url) { console.error('cal --url=…'); process.exit(2); }
const secs = +(args.seconds ?? 20), [W, H] = (args.vp ?? '1280x800').split('x').map(Number), dpr = +(args.dpr ?? 1);
const out = args.out ?? join('/tmp/mulassa-capture', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
// dins la pàgina: temps de cada rAF + tasques llargues
const PROBE = () => {
  const fr = (window.__frames = []), lt = (window.__long = []);
  let last = performance.now();
  const tick = t => { fr.push([Math.round(t * 10) / 10, Math.round((t - last) * 10) / 10]); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch {}
};

const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
await lock();
mkdirSync(out, { recursive: true });
const { chromium } = await import(pathToFileURL(join(args.pw ?? '/tmp/ui-inv-pw', 'node_modules/playwright/index.mjs')).href);
const browser = await launchBrowser(chromium);
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr, isMobile: !!args.touch, hasTouch: !!args.touch, recordVideo: { dir: out, size: { width: W, height: H } } });
  const page = await ctx.newPage();
  await page.addInitScript(PROBE);
  const errors = []; page.on('pageerror', e => errors.push(String(e.message).slice(0, 200)));
  await page.goto(args.url);
  const gpu = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  if (/swiftshader|llvmpipe/i.test(gpu)) throw new Error(`sense GPU real: ${gpu}`);
  // mesura només el joc ja carregat: sense la càrrega del dev server (cobertura del loader fora)
  await page.waitForFunction(() => document.getElementById('loader')?.hidden ?? true, null, { timeout: 120000 });
  if (args.js) await page.evaluate(args.js); // e.g. pick a figure and start: --js='document.querySelector(`[data-id=bou-tradicional-valls]`).click(); __dbg.choose(1)'
  await page.evaluate(() => { window.__frames.length = 0; window.__long.length = 0; });
  await page.waitForTimeout(secs * 1000);
  const { frames, long, hz } = await page.evaluate(() => ({ frames: window.__frames, long: window.__long, hz: null }));
  await ctx.close(); // tanca el vídeo
  const webm = readdirSync(out).find(f => f.endsWith('.webm'));
  const d = frames.slice(1).map(f => f[1]), sorted = [...d].sort((a, b) => a - b), med = pct(sorted, 0.5);
  const late = d.filter(x => x > med * 1.5).length;
  const spikes = frames.slice(1).filter(f => f[1] > Math.max(med * 2, 25)).sort((a, b) => b[1] - a[1]).slice(0, 5);
  writeFileSync(join(out, 'frames.csv'), 'ms,dt\n' + frames.map(f => f.join(',')).join('\n'));
  const summary = { url: args.url, gpu, viewport: `${W}x${H}@${dpr}`, seconds: secs, frames: d.length, fps: +(1000 / (d.reduce((a, b) => a + b, 0) / d.length)).toFixed(1), medianMs: med, p95Ms: pct(sorted, 0.95), p99Ms: pct(sorted, 0.99), worstMs: sorted.at(-1), lateFrames: late, longTasks: long.length, worstLongTaskMs: Math.max(0, ...long.map(l => l[1])), spikes: spikes.map(([t, dt]) => ({ atMs: Math.round(t), dtMs: dt })), pageErrors: errors };
  writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 1));
  if (webm && existsSync('/opt/homebrew/bin/ffmpeg')) {
    const src = join(out, webm), ff = (...a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a]);
    ff('-i', src, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '28', join(out, 'video.mp4'));
    // el vídeo comença a la creació de la pàgina ≈ performance.now() 0; ±0,1 s
    spikes.slice(0, 3).forEach(([t], i) => { try { ff('-ss', String(Math.max(0, (t - 200) / 1000)), '-t', '0.5', '-i', src, '-vf', 'fps=12,scale=240:-1,tile=6x1', '-frames:v', '1', join(out, `spike-${i + 1}.jpg`)); } catch {} });
    rmSync(src);
  }
  console.log(JSON.stringify(summary, null, 1) + `\nsortida: ${out}`);
} finally { await browser.close().catch(() => {}); }
