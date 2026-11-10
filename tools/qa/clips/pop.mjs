// Mulassa Pop's clips for the games selector (tools/qa/record-clip.mjs): the dev bot playing a run (?autoplay, the dev
// server), nothing but the board. Run `npm run dev` first; PORT if it is not 5178.
export const url = `http://localhost:${process.env.PORT ?? 5178}/pop/?autoplay`;
export const seconds = 10;
// the run's own page: no HUD, no points floating up, no combo flash (they run on the wall clock, not the recorder's)
export const css = '#hud, #combo, #combo-flash, #count, .float, #rotate { display: none !important; }';
export const crf = 29; // ~1 MB a clip
export const clips = [
  // a big screen's hero, 8:3: the selector fades its left side out under the game's name, so the board stands at the right
  { name: 'pop', viewport: [1920, 720], css: '#game { translate: 23vw 0; }' },
  { name: 'pop-tall', viewport: [768, 720] },   // a phone's backdrop
];
export async function prepare(page) {
  await page.waitForFunction(() => document.documentElement.classList.contains('ready'), null, { timeout: 120000 });
  for (const id of ['tap-start', 'play']) { await page.waitForSelector(`#${id}`, { state: 'visible' }); await page.click(`#${id}`, { force: true }); } // (force: they pulse)
  // «Com es juga» the first time, then the level; a run is on once its HUD shows and the 3, 2, 1 is gone
  for (let i = 0; i < 40 && !(await page.evaluate(() => !document.getElementById('hud').hidden && document.getElementById('count').hidden)); i++) {
    for (const id of ['help-go', 'level-go']) if (await page.isVisible(`#${id}`)) await page.click(`#${id}`, { force: true });
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1500); // the first figures are up
}
