import {parseArgs} from 'node:util';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFile, writeFile, mkdir} from 'node:fs/promises';

const {values} = parseArgs({options: {
  input: {type: 'string'}, slide: {type: 'string'},
  pw: {type: 'string'}, help: {type: 'boolean'},
}});
if (values.help) {
  console.log('node tools/social/instagram/export.mjs --input <build directory> [--slide 1|2|3] [--pw <Playwright installation>]');
  process.exit(0);
}
if (!values.input) throw Error('--input is required');
if (values.slide && !['1', '2', '3'].includes(values.slide)) throw Error('--slide must be 1, 2 or 3');
const modulePath = values.pw
  ? pathToFileURL(join(resolve(values.pw), 'node_modules/playwright/index.mjs')).href
  : (process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const {chromium} = await import(modulePath);
const dir = resolve(values.input);
await readFile(join(dir, 'stories.html')); // Fail before opening Chrome if the build is missing.
await mkdir(join(dir, 'video-sources'), {recursive: true});
const browser = await chromium.launch({headless: true, channel: 'chrome', args: [
  '--use-angle=metal', '--autoplay-policy=no-user-gesture-required',
]});

async function videoMetadata(page, src) {
  return page.evaluate(async src => {
    const video = document.createElement('video');
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
      video.src = src;
    });
    return {duration: video.duration, w: video.videoWidth, h: video.videoHeight};
  }, src);
}

async function encodeMP4(page, src, start) {
  return page.evaluate(async ({src, start}) => {
    const mimeType = 'video/mp4;codecs=avc1.42001E';
    if (!MediaRecorder.isTypeSupported(mimeType)) throw Error('Chrome cannot encode H.264 MP4');
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    await new Promise((resolve, reject) => {
      video.onloadeddata = resolve;
      video.onerror = reject;
      video.src = src;
    });
    await new Promise(resolve => {video.onseeked = resolve; video.currentTime = start;});
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0);
    const stream = canvas.captureStream(25);
    const chunks = [];
    const recorder = new MediaRecorder(stream, {mimeType, videoBitsPerSecond: 10000000});
    recorder.ondataavailable = event => {if (event.data.size) chunks.push(event.data);};
    const stopped = new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = reject;
    });
    let raf;
    try {
      recorder.start();
      await video.play();
      const draw = () => {context.drawImage(video, 0, 0); raf = requestAnimationFrame(draw);};
      draw();
      await new Promise(resolve => setTimeout(resolve, 15000));
      recorder.stop();
      await stopped;
    } finally {
      video.pause();
      cancelAnimationFrame(raf);
      if (recorder.state !== 'inactive') recorder.stop();
      stream.getTracks().forEach(track => track.stop());
    }
    const data = new Uint8Array(await new Blob(chunks, {type: 'video/mp4'}).arrayBuffer());
    let binary = '';
    for (let i = 0; i < data.length; i += 32768) binary += String.fromCharCode(...data.subarray(i, i + 32768));
    return btoa(binary);
  }, {src, start});
}

try {
  const encoder = await browser.newPage();
  const results = [];
  for (const n of (values.slide ? [Number(values.slide)] : [1, 2, 3])) {
    const context = await browser.newContext({
      viewport: {width: 1080, height: 1920}, deviceScaleFactor: 1,
      recordVideo: {dir: join(dir, 'video-sources'), size: {width: 1080, height: 1920}},
    });
    const page = await context.newPage();
    let timing;
    try {
      await page.goto(`${pathToFileURL(join(dir, 'stories.html')).href}?slide=${n}&still`);
      await page.waitForFunction(() => window.storyTimeline?.ready);
      await page.evaluate(() => {
        window.captureFrames = [];
        let last = 0;
        const tick = now => {
          if (storyTimeline.playing) {if (last) captureFrames.push(now - last); last = now;}
          else last = 0;
          window.captureRaf = requestAnimationFrame(tick);
        };
        captureRaf = requestAnimationFrame(tick);
        storyTimeline.play();
      });
      await page.waitForFunction(() => storyTimeline.time >= 15 && !storyTimeline.playing, {}, {timeout: 25000});
      timing = await page.evaluate(() => {
        cancelAnimationFrame(captureRaf);
        const frames = captureFrames.sort((a, b) => a - b);
        return {frames: frames.length, p95: frames[Math.floor(frames.length * .95)],
          p99: frames[Math.floor(frames.length * .99)], worst: frames.at(-1), time: storyTimeline.time};
      });
    } finally {
      await context.close();
    }
    await page.video().saveAs(join(dir, 'video-sources', `D${n}.webm`));
    await page.video().delete();
    const webm = 'data:video/webm;base64,' + (await readFile(join(dir, 'video-sources', `D${n}.webm`))).toString('base64');
    const metadata = await videoMetadata(encoder, webm);
    // Skip the recorder's leading frame, never duration-minus-15 (which cuts the animation).
    const start = .08;
    const base64 = await encodeMP4(encoder, webm, start);
    await writeFile(join(dir, `D${n}.mp4`), Buffer.from(base64, 'base64'));
    const mp4 = 'data:video/mp4;base64,' + (await readFile(join(dir, `D${n}.mp4`))).toString('base64');
    const output = await videoMetadata(encoder, mp4);
    if (Math.abs(output.duration - 15) > .12 || output.w !== 1080 || output.h !== 1920) {
      throw Error(`Invalid D${n} export: ${JSON.stringify(output)}`);
    }
    const row = {story: n, timing, source: metadata, trim: start, output};
    results.push(row);
    console.log(JSON.stringify(row));
    await writeFile(join(dir, 'export-report.json'), JSON.stringify(results, null, 2));
  }
} finally {
  await browser.close();
}
