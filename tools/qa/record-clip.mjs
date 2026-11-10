#!/usr/bin/env node
// Dev tool (not in the build): records a clip of a live page frame by frame, for the games selector's hero
// (public/jocs/menu/video, docs/ui/games-menu-images.md). No real-time screen recording: the page's requestAnimationFrame and
// performance.now are stepped by hand, an even 60 ticks a second, and every frame is a screenshot piped to ffmpeg, so the
// clip cannot stutter however slow the machine is. (A real-time capture stored frames grabbed late, early or twice.)
// What the page animates with CSS, timers or audio still runs on the wall clock: a recipe hides it or leaves it out.
// The clip loops without a jump: its last FADE frames dissolve into its first ones, and it starts after them.
// Usage: node tools/qa/record-clip.mjs tools/qa/clips/<recipe>.mjs [--only=<clip name>] [--pw=/tmp/ui-inv-pw] [--out=public/jocs/menu/video]
// A recipe exports { url, seconds, css, crf, prepare(page), clips: [{ name, viewport: [w, h], size: [w, h], css }] }; each clip gets
// <name>.mp4 at `size` and <name>.jpg, the clip's first frame (the poster the selector shows while the clip loads).
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser } from './capture-lib.mjs';

const args = Object.fromEntries(process.argv.slice(3).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || '1']; }));
if (!process.argv[2]) { console.error('usage: node tools/qa/record-clip.mjs <recipe.mjs> [--only=name] [--out=dir]'); process.exit(2); }
const recipe = await import(pathToFileURL(resolve(process.argv[2])).href);
const out = args.out ?? 'public/jocs/menu/video', FPS = 30, TICK = 1000 / 60, FADE = 12;
// in the page: real frames until hold(), then only step()'s
const CLOCK = () => {
  const raf = requestAnimationFrame.bind(window), now = performance.now.bind(performance), queue = [];
  let held = false, t = 0;
  window.requestAnimationFrame = cb => (held ? queue.push(cb) : raf(cb));
  performance.now = () => (held ? t : now());
  window.__clip = { hold() { held = true; t = now(); }, step(ms) { t += ms; for (const cb of queue.splice(0)) cb(t); } };
};
const { chromium } = await import(pathToFileURL(join(args.pw ?? '/tmp/ui-inv-pw', 'node_modules/playwright/index.mjs')).href);
const browser = await launchBrowser(chromium);
try {
  for (const clip of recipe.clips.filter(c => !args.only || c.name === args.only)) {
    const [width, height] = clip.viewport, [w, h] = clip.size ?? clip.viewport;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    page.on('pageerror', e => { throw e; });
    await page.addInitScript(CLOCK);
    await page.goto(recipe.url, { waitUntil: 'domcontentloaded' });
    await recipe.prepare(page);
    await page.addStyleTag({ content: `${recipe.css ?? ''}\n${clip.css ?? ''}` });
    await page.evaluate(() => window.__clip.hold());
    await page.waitForTimeout(100); // the frames already asked of the real clock run, and ask the held one for the next
    const file = join(out, `${clip.name}.mp4`), frames = recipe.seconds * FPS + FADE; // the dissolve takes FADE frames off
    const ffmpeg = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-vcodec', 'png', '-i', 'pipe:0',
      '-an', '-filter_complex', `[0:v]scale=${w}:${h}:flags=lanczos,split[m0][h0];[m0]trim=start_frame=${FADE},setpts=PTS-STARTPTS[m];[h0]trim=end_frame=${FADE},setpts=PTS-STARTPTS[h];[m][h]xfade=transition=fade:duration=${FADE / FPS}:offset=${(frames - 2 * FADE) / FPS}`, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(recipe.crf ?? 24), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = 0; f < frames; f++) {
      await page.evaluate(ms => { window.__clip.step(ms); window.__clip.step(ms); }, TICK);
      const png = await page.screenshot({ type: 'png' });
      if (f === FADE) { const jpg = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', 'pipe:0', '-vf', `scale=${w}:${h}:flags=lanczos`, '-q:v', '4', join(out, `${clip.name}.jpg`)], { stdio: ['pipe', 'inherit', 'inherit'] }); jpg.stdin.end(png); await once(jpg, 'close'); }
      if (!ffmpeg.stdin.write(png)) await once(ffmpeg.stdin, 'drain');
    }
    ffmpeg.stdin.end();
    const [code] = await once(ffmpeg, 'close');
    if (code) throw new Error(`ffmpeg failed on ${file}`);
    console.log(file, `${width}x${height} -> ${w}x${h}`, `${recipe.seconds} s`);
    await page.close();
  }
} finally { await browser.close(); }
