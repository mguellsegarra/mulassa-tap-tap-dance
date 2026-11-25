// Deterministic export: every output frame is rendered at its exact timestamp.
// PLAYWRIGHT_MODULE may point to an existing Playwright installation.
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const [url = 'http://127.0.0.1:5196/tools/instagram/drac-teaser/index.html', output = 'output/drac-teaser'] = process.argv.slice(2);
const out = resolve(output); mkdirSync(out, { recursive: true });
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = modulePath ? await import(pathToFileURL(modulePath).href) : await import('playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { width: 1080, height: 1920, fps: 60, seconds: 12, files: [], errors: [] };
try {
 const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
 page.on('pageerror', e => report.errors.push(e.message));
 await page.goto(`${url}?capture&record&mute`);
 await page.waitForFunction(() => window.teaserReady);
 for (const [index, id] of ['tail', 'wing', 'half'].entries()) {
  await page.evaluate(id => window.setPreset(id), id);
  const name = `A${index + 1}-${id}`;
  const file = join(out, `${name}-1080x1920-60fps.mp4`);
  const ff = spawn(process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg', ['-v','error','-y','-f','image2pipe','-framerate','60','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',file], {stdio:['pipe','inherit','inherit']});
  const finished = once(ff, 'close');
  for (let frame = 0; frame < 720; frame++) {
   const data = await page.evaluate(t => { window.renderAt(t); return document.querySelector('#story').toDataURL('image/jpeg', 0.98).split(',')[1]; }, frame / 60);
   if (!ff.stdin.write(Buffer.from(data, 'base64'))) await once(ff.stdin, 'drain');
   if ([60,180,360,540,660].includes(frame)) await page.locator('#story').screenshot({path:join(out, `${name}-${frame}.png`)});
   if (frame % 180 === 0) console.log(`${name}: ${frame}/720`);
  }
  ff.stdin.end(); const [code] = await finished; if (code !== 0) throw new Error(`ffmpeg: ${code}`);
  report.files.push(file);
 }
 if (report.errors.length) throw new Error(report.errors.join('\n'));
 writeFileSync(join(out,'validation.json'), JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
} finally { await browser.close(); }
