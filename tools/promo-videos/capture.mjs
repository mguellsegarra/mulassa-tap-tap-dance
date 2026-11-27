// Frame-exact capture of the real game for the promo. Usage: node capture.mjs shots.json [shotName...]
// Vite runs in-process, Chrome (system, GPU) headless. After loading, the page's clock is virtual: performance.now,
// Date, rAF, setTimeout and AudioContext.currentTime only move when we step them, so every frame is exactly 1/FPS of
// song time apart whatever the render costs (a real-time browser recording drops and stretches frames).
// The camera: ?view=front keeps the HUD off and calls camera.lookAt() every frame; we wrap that call with our own shot.
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { virtualClock, padDriver, stepAnims } from './virtual-clock.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), GAME = resolve(HERE, '../..');
const [shotsPath, ...only] = process.argv.slice(2);
const cfg = JSON.parse(readFileSync(shotsPath, 'utf8'));
const { fps = 30, width = 1280, height = 720, scale = 2, outW = width, outH = height } = cfg; // css viewport; the file is outW x outH
const song = JSON.parse(readFileSync(resolve(GAME, 'src/song-mulassa.json'), 'utf8'));
for (const s of cfg.shots) { // beats instead of seconds: `beat` = song.beats[i], `beats` = a length in beats
  if (s.beat != null) s.from = song.beats[s.beat] + (s.nudge || 0);
  if (s.beats != null) s.len = s.beats * 60 / song.bpm;
}
const OUT = resolve(dirname(shotsPath), cfg.out || 'out/clips');
mkdirSync(OUT, { recursive: true });

// The shot's camera, installed on the game's camera once it exists. spec: { target: 'head'|'body', az (deg), el (deg),
// dist [from, to] (m), fov [from, to], azFrom: 'heading'|'world', lag (s): how slowly the aim follows her, up (m), fwd (m) }.
function installShot(spec) {
  return import('/src/scene/stage.js').then(({ camera, mula }) => {
    const V = camera.position.constructor, tgt = new V(), aim = new V(), tmp = new V();
    const S = window.__shot = { spec, t: 0, on: false, yawS: null };
    const orig = camera.lookAt.bind(camera), D = Math.PI / 180;
    camera.lookAt = () => {
      const s = S.spec, k = Math.min(1, S.t / (s.dur || s.len)), e = k * k * (3 - 2 * k);
      const lerp = (a, b) => (Array.isArray(a) ? a[0] + (a[1] - a[0]) * e : a);
      (s.target === 'head' ? mula.head : mula.body).updateWorldMatrix(true, false);
      (s.target === 'head' ? mula.head : mula.body).getWorldPosition(tgt);
      tgt.y += s.up || 0;
      if (s.fwd) { const y = mula.root.rotation.y; tgt.x += Math.sin(y) * s.fwd; tgt.z += Math.cos(y) * s.fwd; } // along her length (+ = towards the head)
      const dt = 1 / 60;
      if (!S.on) { aim.copy(tgt); S.yawS = mula.root.rotation.y; S.on = true; }
      else aim.lerp(tgt, 1 - Math.exp(-dt / (s.lag ?? 0.25)));
      if (s.azFrom === 'heading') { let d = mula.root.rotation.y - S.yawS; d = Math.atan2(Math.sin(d), Math.cos(d)); S.yawS += d * (1 - Math.exp(-dt / (s.yawLag ?? 0.6))); }
      const az = (s.azFrom === 'heading' ? S.yawS : 0) + lerp(s.az) * D, el = lerp(s.el) * D, dist = lerp(s.dist);
      tmp.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist);
      camera.position.copy(aim).add(tmp);
      const fov = lerp(s.fov ?? 40);
      if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
      orig(aim.x, aim.y, aim.z);
    };
  });
}

const server = await createServer({ root: GAME, configFile: resolve(GAME, 'vite.config.js'), server: { port: 5199, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/promo/**'] } }, logLevel: 'error' }); // no reloads while capturing (promo/ is inside the game's root)
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const log = {};
try {
  for (const shot of cfg.shots.filter(s => !only.length || only.includes(s.name))) {
    const mobile = shot.mobile ?? cfg.mobile; // a phone: touch pad (GUA | PA) and the phone layout
    const ctx = await browser.newContext({ viewport: { width: shot.width ?? width, height: shot.height ?? height }, deviceScaleFactor: shot.scale ?? scale, reducedMotion: 'no-preference', ...(mobile ? { isMobile: true, hasTouch: true } : {}) });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.error('[page]', e.message));
    page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text().slice(0, 300)); });
    await page.addInitScript(virtualClock);
    // hide the DOM chrome (pad, buttons, hints): the picture is the 3D plaça only
    // a phone starts at medium quality (stage.js reads (pointer: coarse) once, while the modules load, and sizes the crowd
    // and the confetti/firework pools for it); the promo wants the desktop's picture. So that one read sees no touch
    // screen: (pointer: coarse) answers false until DOMContentLoaded (the modules have run), true from then on (pad, layout).
    if (mobile) await page.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      let loaded = false; addEventListener('DOMContentLoaded', () => { loaded = true; });
      window.matchMedia = q => {
        const m = real(q);
        if (!/pointer:\s*coarse/.test(q)) return m;
        return new Proxy(m, { get: (t, k) => (k === 'matches' ? loaded && t.matches : typeof t[k] === 'function' ? t[k].bind(t) : t[k]) });
      };
    });
    // a phone's safe areas (iPhone 16: the notch 59 px, the home bar 34 px), as the game reads them (--sat/--sab, index.html
    // env() vars; the pad's own env() rules restated): its HUD and pad sit where they sit on a real iPhone
    if (mobile) await page.addInitScript(() => addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style');
      st.textContent = ':root { --sat: 59px !important; --sab: 34px !important; } #pad button { height: calc(208px + 34px) !important; padding-bottom: calc(34px + 18px) !important; }';
      document.head.append(st);
    }));
    if (!shot.play) await page.addInitScript(() => addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style');
      st.textContent = 'body > *:not(#gl) { visibility: hidden !important; } #gl { visibility: visible !important; }';
      document.head.append(st);
    }));
    const pre = shot.preroll ?? 3, from = Math.max(0, shot.from - pre);
    await page.goto(`http://127.0.0.1:5199/?mute&autoplay${shot.play ? '' : '&view=front'}&from=${from.toFixed(3)}`);
    await page.waitForFunction(() => window.__mulassaBooted === true, null, { timeout: 60000 });
    await page.waitForTimeout(1500); // the cover lifts
    await page.keyboard.press('Space'); // the splash's tap: makes the audio engine
    await page.waitForFunction(() => window.__dbg.G.state === 'title' && window.__dbg.chip, null, { timeout: 30000 });
    await page.waitForTimeout(1500); // the song decodes
    const gpu = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'), x = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(x.UNMASKED_RENDERER_WEBGL); });
    await page.evaluate(() => window.__virt());
    await page.evaluate(`(${stepAnims})()`);
    if (shot.play && mobile) await page.evaluate(`(${padDriver})()`);
    // every step: the game, then the pad's look, then the CSS animations by the same slice of time
    await page.evaluate(() => { const step = window.__step; window.__step = ms => { step(ms); window.__padDriver?.(); window.__stepAnims(ms); }; });
    await page.evaluate(d => window.__dbg.choose(d), shot.diff ?? 2);
    if (!shot.play) await page.evaluate(`(${installShot})(${JSON.stringify({ ...shot.cam, len: shot.len })})`);
    // scripted inputs at song times (e.g. a wrong press: she stumbles): [{ beat | t, js }]
    const events = (shot.events || []).map(e => ({ t: e.t ?? song.beats[Math.floor(e.beat)] + (e.beat % 1) * 60 / song.bpm, js: e.js })).sort((a, b) => a.t - b.t);
    const fire = async () => { while (events.length && (await page.evaluate(() => window.__dbg.drawTime)) >= events[0].t) await page.evaluate(events.shift().js); };
    const dt = 1000 / 60, per = 60 / fps;
    // run up to the shot's first frame: the drawn song time (drawTime) reaching `from`
    let guard = 0;
    while ((await page.evaluate(() => window.__dbg.G.state === 'play' ? window.__dbg.drawTime : -99)) < shot.from - 1e-4 - dt / 1000) {
      await page.evaluate(ms => window.__step(ms), dt);
      await fire();
      if (++guard > 60 * 60) throw new Error(`${shot.name}: never reached ${shot.from}`);
    }
    // a partial step lands exactly on it
    const now = await page.evaluate(() => window.__dbg.drawTime);
    await page.evaluate(ms => window.__step(ms), Math.max(0.001, (shot.from - now) * 1000));
    await page.evaluate(() => { if (window.__shot) window.__shot.t = 0; });
    const n = Math.round(shot.len * fps), times = [];
    // ffmpeg reads the PNGs from a pipe: no frame files
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
      '-vf', `scale=${outW}:${outH}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p', resolve(OUT, `${shot.name}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < n; i++) {
      times.push(await page.evaluate(() => window.__dbg.drawTime));
      await page.evaluate(() => window.__settle());
      const png = await page.screenshot({ type: 'png' });
      if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
      for (let j = 0; j < per; j++) { await page.evaluate(ms => { if (window.__shot) window.__shot.t += ms / 1000; window.__step(ms); }, dt); await fire(); }
    }
    ff.stdin.end();
    await new Promise((ok, no) => ff.on('close', c => (c ? no(new Error('ffmpeg ' + c)) : ok())));
    const steps = times.slice(1).map((t, i) => t - times[i]), bad = steps.filter(s => Math.abs(s - 1 / fps) > 1e-3).length;
    const quality = await page.evaluate(() => import('/src/scene/stage.js').then(m => m.renderProfile.name));
    if (quality !== 'high') throw new Error(`${shot.name}: rendered at ${quality} quality`);
    log[shot.name] = { quality, gpu, from: shot.from, first: times[0], last: times.at(-1), frames: n, uneven: bad };
    console.log(shot.name, log[shot.name]);
    await ctx.close();
  }
} finally {
  writeFileSync(resolve(OUT, 'capture-log.json'), JSON.stringify(log, null, 1));
  await browser.close();
  await server.close();
}
