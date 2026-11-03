// Deterministic lossless PNG frames -> H.264; no real-time screen-recording stage.
import {parseArgs} from 'node:util';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const {values} = parseArgs({options: {
  input: {type: 'string'}, ffmpeg: {type: 'string'}, pw: {type: 'string'},
  slide: {type: 'string'}, help: {type: 'boolean'},
}});
if (values.help) {
  console.log('node tools/social/instagram/export-hq.mjs --input <build directory> --ffmpeg <binary> [--pw <Playwright installation>] [--slide 1|2|3]');
  process.exit(0);
}
if (!values.input || !values.ffmpeg) throw Error('--input and --ffmpeg are required');
if (values.slide && !['1', '2', '3'].includes(values.slide)) throw Error('--slide must be 1, 2 or 3');
const modulePath = values.pw
  ? pathToFileURL(join(resolve(values.pw), 'node_modules/playwright/index.mjs')).href
  : (process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const {chromium} = await import(modulePath);
const dir = resolve(values.input);
await readFile(join(dir, 'stories.html'));
await mkdir(join(dir, 'posters'), {recursive: true});
const browser = await chromium.launch({headless: true, channel: 'chrome', args: ['--use-angle=metal']});
const fps = 30, frames = 450, results = [];
try {
  const page = await browser.newPage({viewport: {width: 1080, height: 1920}, deviceScaleFactor: 1});
  for (const n of (values.slide ? [Number(values.slide)] : [1, 2, 3])) {
    await page.goto(`${pathToFileURL(join(dir, 'stories.html')).href}?slide=${n}&still`);
    await page.waitForFunction(() => window.storyTimeline?.ready);
    const output = join(dir, `D${n}.mp4`);
    const encoder = spawn(values.ffmpeg, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'png', '-i', 'pipe:0',
      '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p',
      '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      '-movflags', '+faststart', output,
    ], {stdio: ['pipe', 'ignore', 'pipe']});
    let errors = '';
    encoder.stderr.on('data', data => {errors = (errors + data).slice(-8000);});
    // Keep spawn and pipe failures observable while capturing, without unhandled rejection.
    let processError;
    encoder.on('error', error => {processError = error;});
    encoder.stdin.on('error', error => {processError = error;});
    const finished = new Promise(resolve => encoder.on('close', code => resolve(code)));
    try {
      for (let frame = 0; frame < frames; frame++) {
        if (processError) throw processError;
        if (encoder.exitCode !== null) throw Error(`Encoder stopped: ${errors}`);
        await page.evaluate(t => {
          storyTimeline.seek(t);
          return new Promise(requestAnimationFrame);
        }, frame / fps);
        const png = await page.screenshot({type: 'png'});
        if (frame === 90) await writeFile(join(dir, 'posters', `D${n}.png`), png);
        if (!encoder.stdin.write(png)) await once(encoder.stdin, 'drain');
        if (frame % 150 === 0) console.log(`D${n}: ${frame}/${frames} frames`);
      }
      encoder.stdin.end();
      const code = await finished;
      if (code !== 0 || processError) throw Error(`Encoder failed: ${processError?.message ?? errors}`);
    } finally {
      if (encoder.exitCode === null) {encoder.kill('SIGTERM'); await finished;}
    }
    const row = {story: n, width: 1080, height: 1920, fps, frames, duration: frames / fps,
      codec: 'H.264', pixelFormat: 'yuv420p', crf: 16, source: 'lossless PNG frames', output};
    results.push(row);
    await writeFile(join(dir, 'export-hq-report.json'), JSON.stringify(results, null, 2));
    console.log(`D${n}: complete`);
  }
} finally {
  await browser.close();
}
