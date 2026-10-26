// The share card's photos (public/share/), taken once here instead of on each player's GPU: rendering it on the phone
// lost the WebGL context on some (an Adreno 618 on every results screen). Run it again when the Mulassa or the plaça changes.
//   npm run dev, then: PLAYWRIGHT=<path to playwright/index.mjs> node tools/share-photos.mjs [http://localhost:5178/]
// It needs a real GPU (headed Chrome): a software renderer draws a flatter plaça.
import { writeFileSync, mkdirSync } from 'node:fs';
import { PHOTO } from '../src/hud/share-card.js';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const url = process.argv[2] || 'http://localhost:5178/';
const browser = await chromium.launch({ headless: false, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${url}?mute`);
  await page.waitForFunction(() => window.__dbg?.hero && window.__mulassaBooted, null, { timeout: 60000 });
  await page.waitForTimeout(4000); // the crowd and the plaça settle, the quality has its first say
  mkdirSync('public/share', { recursive: true });
  for (const f of ['story', 'square']) { // the share sheet's two formats (og.jpg is the link preview, made apart)
    const [w, h] = PHOTO[f];
    const jpg = await page.evaluate(async ([w, h]) => (await window.__dbg.hero(w, h))?.toDataURL('image/jpeg', 0.9), [w, h]);
    if (!jpg) throw new Error(`${f}: no photo (WebGL?)`);
    writeFileSync(`public/share/mulassa-${f}.jpg`, Buffer.from(jpg.split(',')[1], 'base64'));
    console.log(`public/share/mulassa-${f}.jpg ${w}×${h}`);
  }
} finally { await browser.close(); }
