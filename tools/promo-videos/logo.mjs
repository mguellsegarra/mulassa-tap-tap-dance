// The official logo, animated exactly as the game draws it on the title (src/hud/title.js logo(): MULASSA bouncing on the
// beat, the glint across its letters, TAP · TAP · DANCE hopping a word a beat), cut out of the HUD canvas frame by frame
// on the virtual clock, with a transparent background. Its beat is the promo's: the game's menu beat and song clock are
// driven from the closing's first beat (timeline.json close.beat), so TAP lands on the final roll and on the last hit;
// the glint (every 5 s on the game's clock) is placed to sweep on the last hit. Usage: node logo.mjs
// -> public/logo-anim/0000.png… + public/logo-anim.json (frame count, where the letters sit in the frame)
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { virtualClock } from './virtual-clock.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), GAME = resolve(HERE, '../..'), OUT = resolve(HERE, 'public/logo-anim');
const tl = JSON.parse(readFileSync(resolve(HERE, 'src/timeline.json'), 'utf8'));
const FPS = tl.fps, N = tl.frames - tl.close.from + 2, STEP = 1000 / FPS;
const GLINT = { every: 5, dur: 0.8 }; // src/hud/title-layout.js
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });

const server = await createServer({ root: GAME, configFile: resolve(GAME, 'vite.config.js'), server: { port: 5199, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/promo/**'] } }, logLevel: 'error' }); // no reloads while capturing (promo/ is inside the game's root)
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  await page.addInitScript(virtualClock);
  await page.goto('http://127.0.0.1:5199/?mute&still');
  await page.waitForFunction(() => window.__mulassaBooted === true, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__dbg.G.state === 'title' && window.__dbg.title && window.__dbg.chip, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.addStyleTag({ content: 'body > *:not(#hud) { visibility: hidden !important; } html, body { background: transparent !important; }' });
  await page.evaluate(() => window.__virt());
  // the game's clock to where the glint will start on the last hit (its sweep: the cycle's last GLINT.dur s)
  const want = ((GLINT.every - GLINT.dur - tl.close.hit / FPS) % GLINT.every + GLINT.every) % GLINT.every;
  for (let i = 0; ; i++) {
    const c = await page.evaluate(() => window.__dbg.clock);
    if (Math.abs(((c - want) % GLINT.every + GLINT.every) % GLINT.every) < STEP / 2000) break;
    await page.evaluate(ms => window.__step(ms), STEP * 0.5);
    if (i > 40000) throw new Error('never reached the glint phase');
  }
  // the beat from here on: the promo's (menu beat for TAP TAP DANCE, song clock for MULASSA's bounce)
  await page.evaluate(b0 => {
    const c = window.__dbg.chip, t0 = performance.now(), spb = 60 / 152, beat = () => b0 + (performance.now() - t0) / 1000 / spb;
    c.menuBeat = beat;
    c.now = () => 0.1 + beat() * spb; // song time of that beat (song.beats[0] = 0.1, fixed tempo)
  }, tl.close.beat);
  const box = await page.evaluate(() => { const L = window.__dbg.title, k = L.K, s = L.s * k, r = L.logo;
    return { x: r.x * k - 0.12 * s, y: r.y * k - 0.14 * s, width: r.w * k + 0.24 * s, height: r.h * k + 0.24 * s, lw: r.w * k, lh: r.h * k, lx: 0.12 * s, ly: 0.14 * s }; });
  const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
  await page.evaluate(ms => window.__step(ms), 0.001); // draw once with the new beat
  for (let i = 0; i < N; i++) {
    await page.evaluate(() => window.__settle());
    const shot = await page.screenshot({ clip, omitBackground: true });
    // the title dims the plaça with a flat veil on the same canvas, under the logo: take it back out (a corner pixel is the
    // veil alone), so only the logo and its own anti-aliased edges keep any alpha
    const png = await page.evaluate(async b64 => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, cv.width, cv.height), p = d.data, va = p[3] / 255, vr = p[0], vg = p[1], vb = p[2];
      for (let j = 0; j < p.length; j += 4) {
        const a = p[j + 3] / 255, la = Math.max(0, (a - va) / (1 - va));
        if (la < 0.004) { p[j + 3] = 0; continue; }
        const k = va * (1 - la);
        p[j] = (p[j] * a - vr * k) / la; p[j + 1] = (p[j + 1] * a - vg * k) / la; p[j + 2] = (p[j + 2] * a - vb * k) / la; p[j + 3] = la * 255;
      }
      g.putImageData(d, 0, 0);
      return cv.toDataURL('image/png').split(',')[1];
    }, shot.toString('base64'));
    writeFileSync(resolve(OUT, `${String(i).padStart(4, '0')}.png`), Buffer.from(png, 'base64'));
    await page.evaluate(ms => window.__step(ms), STEP);
  }
  // where the static logo's box sits in the frame (Remotion scales the frames so the letters keep their size)
  writeFileSync(resolve(HERE, 'public/logo-anim.json'), JSON.stringify({ frames: N, w: box.width, h: box.height, logoW: box.lw, logoH: box.lh, logoX: box.lx, logoY: box.ly }));
  console.log('logo frames', N, box);
} finally { await browser.close(); await server.close(); }
