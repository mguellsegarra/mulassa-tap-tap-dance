// Text cards as transparent PNGs, set in the game's own fonts (public/fonts). Usage: node card.mjs out.png "Text" [px]
import { chromium } from 'playwright-core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

// inlined: a setContent page (about:blank) may not load file:// fonts, and a fallback serif would slip in unnoticed
const FONT = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../public/fonts/baloo-2-latin.woff2')).toString('base64');
const [out, text, px = 120, w = 1280, h = 720] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.setContent(`<style>
  @font-face { font-family: B; font-weight: 800; src: url(data:font/woff2;base64,${FONT}); }
  html, body { margin: 0; height: 100%; background: transparent; }
  body { display: grid; place-items: center; }
  p { margin: 0; font: 800 ${px}px/1 B; color: #fff3d6; letter-spacing: -0.01em; }
</style><p>${text}</p>`);
if (!(await page.evaluate(() => document.fonts.ready.then(f => f.check('800 20px B'))))) throw new Error('font not loaded');
await page.screenshot({ path: out, omitBackground: true });
await browser.close();
