#!/usr/bin/env node
// Videoclip export (dev only): renders the clip frame by frame in one format with the real GPU (headless Chrome, Metal,
// sandboxed; queued on tools/qa's GPU lock) and encodes it with the song (encode.py). Needs `npm run dev` serving this tool.
// node tools/videoclip/render.mjs --fmt=reel|yt|post|square [--from=0] [--to=end] [--fps=30] [--scale=1] [--ss=2] [--crf=20] [--codec=h264|hevc] [--endcard=minim]
// endcard: endcard.html's card appended after the song (silent; the song's fade to black stays on the song's frames)
// ss: drawn at ss times the size and brought down with Lanczos (supersampling: thin edges, the skirt's fringe, stop
// stair-stepping and shimmering, and the cleaner frames compress smaller)
//   [--url=http://localhost:5178] [--pw=/tmp/ui-inv-pw] [--out=tools/videoclip/media/<fmt>-<from>-<to>.mp4] [--keep]
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lock } from '../qa/capture-lib.mjs';
import { proposalLength } from './proposal.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const a = Object.fromEntries(process.argv.slice(2).map(s => { const [k, ...v] = s.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : '1']; }));
const clip = JSON.parse(readFileSync(join(HERE, 'clip.json'), 'utf8'));
// --montage=<id>: a proposal (proposals/<id>.json) instead of the song: its own length, its pieces' sound (montage_audio.py)
const P = a.montage ? JSON.parse(readFileSync(join(HERE, 'proposals', `${a.montage.replace(/[^a-z0-9-]/g, '')}.json`), 'utf8')) : null;
const full = P ? proposalLength(P) : clip.duration;
const fmt = a.fmt ?? P?.format ?? 'yt', ss = +(a.ss ?? 2), fps = +(a.fps ?? 30), from = +(a.from ?? 0), to = Math.min(full, +(a.to ?? full)), scale = +(a.scale ?? 1);
if (!(to > from)) { console.error('--to must be after --from'); process.exit(2); }
const out = a.out ?? join(HERE, 'media', `${fmt}-${from}-${to}${scale !== 1 ? `-x${scale}` : ''}.mp4`);
let tail = 0; // frames after the song's (the end card)
const frames = mkdtempSync(join(tmpdir(), 'videoclip-frames-'));
const { chromium } = await import(pathToFileURL(join(a.pw ?? '/tmp/ui-inv-pw', 'node_modules/playwright/index.mjs')).href);
await lock();
const browser = await chromium.launch({ channel: 'chrome', headless: true, chromiumSandbox: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--mute-audio'] });
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${a.url ?? 'http://localhost:5178'}/tools/videoclip/?render=${fmt}&scale=${scale * ss}${P ? `&m=${P.id}` : ''}`);
  await page.waitForFunction(() => window.__clip);
  await page.evaluate(() => Promise.all([document.fonts.load("400 40px 'Jersey 10'"), document.fonts.load("40px 'VC Power'")])); // (the words' faces, before the first frame)
  const [w, h] = await page.evaluate(() => window.__clip.size);
  await page.setViewportSize({ width: w, height: h });
  const n = Math.round((to - from) * fps), started = Date.now();
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.__clip.frame(t), from + i / fps);
    writeFileSync(join(frames, `${String(i).padStart(6, '0')}.jpg`), await page.screenshot({ type: 'jpeg', quality: 96 }));
    if (i % (fps * 5) === 0) process.stdout.write(`\r${fmt} ${(i / fps).toFixed(0)} / ${(to - from).toFixed(0)} s · ${((Date.now() - started) / (i + 1)).toFixed(0)} ms/frame`);
  }
  if (a.endcard) { // the end card, numbered on after the song's frames, the same size
    const ar = fmt === 'reel' ? '916' : '169';
    await page.goto(`${a.url ?? 'http://localhost:5178'}/tools/videoclip/endcard.html?render=${a.endcard}&ar=${ar}&scale=${scale * ss}`);
    await page.waitForFunction(() => window.__card); await page.evaluate(() => window.__card.ready);
    const m = Math.round((await page.evaluate(() => window.__card.duration)) * fps);
    for (let i = 0; i < m; i++) { await page.evaluate(t => window.__card.frame(t), i / fps); writeFileSync(join(frames, `${String(n + i).padStart(6, '0')}.jpg`), await page.screenshot({ type: 'jpeg', quality: 96 })); }
    tail = m;
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally { await browser.close(); }
console.log('\nencoding…');
let wav = join(HERE, 'media', 'mix.wav');
if (P) { wav = join(frames, 'montage.wav'); const m = spawnSync('uv', ['run', '-q', '--python', '3.11', '--with', 'numpy', '--with', 'soundfile', 'python', '-I', join(HERE, 'montage_audio.py'), join(HERE, 'proposals', `${P.id}.json`), wav], { stdio: 'inherit' }); if (m.status) process.exit(m.status); }
const r = spawnSync('uv', ['run', '-q', '--python', '3.11', '--with', 'av', '--with', 'numpy', '--with', 'soundfile', 'python', '-I', join(HERE, 'encode.py'), frames, wav, String(from), String(to), String(fps), out, String(ss), String(a.crf ?? 20), a.codec ?? 'h264', String(tail)], { stdio: 'inherit', env: { ...process.env, VIDEOCLIP_LOOP: P?.loop || (P && P.group !== 'youtube') ? '1' : '' } }); // (vertical pieces open on their first frame: no 2 s of black, only the proposal's own fades)
if (!a.keep) rmSync(frames, { recursive: true, force: true }); else console.log('frames:', frames);
if (r.status) process.exit(r.status);
console.log(out);
