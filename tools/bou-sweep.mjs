#!/usr/bin/env node
// Dev tool (never built): the Bou in the dev viewer (tools/dev/bou.html), dancing the game's dance on its song, photographed
// from every side at the moments that move most (mouth shut on a nod, the gape with the tongue out, the tail's big
// flick), one contact sheet per moment and framing (whole body, head, tail). For the eye what bou-audit.mjs measures:
// fusions, flicker, parts that look detached. Real GPU (Chrome + Metal), sharing capture.mjs's lock.
// Usage: node tools/bou-sweep.mjs [--url=http://localhost:5178] [--cap=a] [--out=output/bou-sweep] [--pw=/tmp/ui-inv-pw]
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lock, launchBrowser } from './capture-lib.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const base = args.url ?? 'http://localhost:5178', out = args.out ?? 'output/bou-sweep';
const FRAMES = {   // target, distance, the two heights (rad above the horizon), the half circle it looks from (0 = the front)
  cos: [[0, 1.1, 0], 6.5, [.15, .7], 0], cap: [[0, 1.65, 1.8], 2.6, [.05, .6], 0], cua: [[0, 1.2, -1.6], 2.4, [.1, .7], Math.PI] };
const AZ = 8;
await lock(); mkdirSync(out, { recursive: true });
const { chromium } = await import(pathToFileURL(join(args.pw ?? '/tmp/ui-inv-pw', 'node_modules/playwright/index.mjs')).href);
const browser = await launchBrowser(chromium);
try {
  const page = await browser.newPage({ viewport: { width: 480, height: 360 } });
  page.on('pageerror', e => console.log('page error:', e.message));
  await page.goto(`${base}/tools/dev/bou.html?mute&cap=${args.cap ?? 'a'}`); await page.waitForFunction(() => window.__song);
  await page.addStyleTag({ content: '#bar,#views,#cam{display:none!important}' });
  await page.$eval('#music', b => b.click());
  // the moments, from the dance's own beat: mouth shut on a nod, the gape at its widest, the tail's flick
  const moments = await page.evaluate(() => {
    const at = want => { for (let t = 20; t < 150; t += .01) { const b = window.__bouPose(t).beat; if (Math.abs(b % 8 - want) < .02) return t; } };
    return { tancada: at(1), boca: at(5.8), cua: at(4.25) };
  });
  for (const [moment, t] of Object.entries(moments)) for (const [frame, [target, dist, els, face]] of Object.entries(FRAMES)) {
    const shots = [];
    for (const el of els) for (let i = 0; i < AZ; i++) {
      const az = face + (i / (AZ - 1) - .5) * Math.PI * 1.5;   // ±135° round the part: never from inside the body
      // lead in 1.5 s so the tail and springs arrive in motion, then freeze the song on the moment
      await page.evaluate(([t]) => {
        const s = window.__song; s.currentTime = t - 1.5; s.play();
      }, [t]);
      await page.waitForFunction(t => window.__song.currentTime >= t, t, { timeout: 10000 });
      await page.evaluate(() => window.__song.pause());   // held on the frame shown (the tail mid-swing, not reset)
      // the camera round the Bou where the dance has taken it, angles measured from its own front
      await page.evaluate(([target, dist, el, az]) => {
        const o = window.__orbit, root = o.rig.root, T = o.controls.target, a = az + root.rotation.y;
        T.set(...target); root.localToWorld(T); T.y = target[1];
        o.camera.position.set(T.x + dist * Math.cos(el) * Math.sin(a), T.y + dist * Math.sin(el), T.z + dist * Math.cos(el) * Math.cos(a));
      }, [target, dist, el, az]);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const file = join(out, `${moment}-${frame}-${shots.length}.png`); await page.screenshot({ path: file }); shots.push(file);
    }
    const sheet = join(out, `${moment}-${frame}.jpg`);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...shots.flatMap(f => ['-i', f]), '-filter_complex',
      `xstack=inputs=${shots.length}:layout=${shots.map((_, k) => `${(k % AZ) * 480}_${Math.floor(k / AZ) * 360}`).join('|')},scale=1920:-1`, sheet]);
    console.log(sheet, `t=${t.toFixed(2)} s`);
  }
} finally { await browser.close(); }
