// Verify the rendered rig, not only the source foot planner.
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('http://127.0.0.1:5196/tools/instagram/drac-teaser/index.html?night&mute&capture&preset=half');
  await page.waitForFunction(() => window.teaserReady);
  const result = await page.evaluate(() => {
    const stage = window.teaser.stage;
    let previous, maxSlide = 0, contacts = 0;
    for (let f = 1; f < 720; f++) {
      window.renderAt(f / 60);
      stage.rig.root.updateWorldMatrix(true, true);
      const feet = stage.rig.legs.map(({ shoe }) => ({
        x: shoe.matrixWorld.elements[12], y: shoe.matrixWorld.elements[13], z: shoe.matrixWorld.elements[14], lift: shoe.position.y,
      }));
      if (previous) feet.forEach((p, i) => {
        if (p.lift < 1e-7 && previous[i].lift < 1e-7) {
          contacts++;
          maxSlide = Math.max(maxSlide, Math.hypot(p.x - previous[i].x, p.z - previous[i].z));
        }
      });
      previous = feet;
    }
    return { contacts, maxSlide };
  });
  console.log(result);
  assert(result.contacts > 100);
  assert(result.maxSlide < 1e-5, 'Planted feet slide across the plaza');
  await page.evaluate(() => window.renderAt(3));
  await page.locator('#story').screenshot({ path: '/tmp/drac-fixed-feet.png' });
} finally { await browser.close(); }
