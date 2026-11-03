// Moviment de la figura al showreel, per decidir on tallar i des d'on filmar (skill mulassacat-camera, references/directing.md).
// Recorre una volta sencera per figura al selector sense UI i escriu, cada 2 temps: on és, a quina velocitat va, cap on va
// respecte de la càmera de joc (0° = cap a la lent, ±90° = travessa el pla, 180° = se'n va; positiu = cap a la dreta de la
// pantalla) i quant gira (rad/temps). Al final, el gir màxim de la càmera dins d'un mateix pla (rad/s; el límit de mareig és 0,15).
//   npm run dev, i després: node tools/qa/reel-motion.mjs [--figs=mulassa,drac] [--reel=A] [--url=http://localhost:5178]
// --reel: una proposta de tools/dev/reel-review/proposals.js en lloc del showreel del joc.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser } from './capture-lib.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const URL0 = args.url ?? 'http://localhost:5178', FIGS = (args.figs ?? 'mulassa,drac').split(',');
const { chromium } = await import(pathToFileURL(join(args.pw ?? '/tmp/ui-inv-pw', 'node_modules/playwright/index.mjs')).href);
const browser = await launchBrowser(chromium);
const CAM_AZ = -81; // scene/stage.js: the play camera's azimuth, degrees
const wrap = d => ((d + 540) % 360) - 180, deg = r => r * 180 / Math.PI;

for (const fig of FIGS) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }), page = await ctx.newPage();
  await page.goto(`${URL0}/?mute&mock&figura=${fig}${args.reel ? `&reel=${args.reel}` : ''}`);
  await page.waitForFunction(() => window.__dbg?.G?.state, null, { timeout: 60000 });
  await page.evaluate(async () => {
    (await import('/src/ui/reel-idle.js')).REEL_IDLE.after = 0;
    if (window.__dbg.G.state === 'splash') (await import('/src/game/flow.js')).unlock();
    await new Promise(r => setTimeout(r, 2500));
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    const { REEL, SHOWREELS } = await import('/src/game/showreel.js');
    REEL.anchor = SHOWREELS[REEL.id].start + REEL.acc; // from beat 0: one whole loop
  });
  const rows = [], t0 = Date.now();
  let last = -1, prev = null, camMax = 0, camAt = 0;
  while (Date.now() - t0 < 200000) {
    const r = await page.evaluate(async () => {
      const [{ REEL, SHOWREELS }, { figureRoot }] = await Promise.all([import('/src/game/showreel.js'), import('/src/figures/objects.js')]);
      const root = figureRoot(REEL.id), cam = window.__dbg.camera, v = cam.position.clone(), d = cam.getWorldDirection(v.clone());
      root.updateMatrixWorld(true);
      let n = 0, x = 0, z = 0; // the visible body's middle (the pivot can sit off it)
      root.traverseVisible(o => { if (o.isMesh) { o.getWorldPosition(v); x += v.x; z += v.z; n++; } });
      const e = root.matrixWorld.elements;
      return { b: REEL.beat, x: x / n, z: z / n, yaw: Math.atan2(e[8], e[10]), shot: SHOWREELS[REEL.id].shots.findLastIndex(s => s[0] <= REEL.beat), d: [d.x, d.y, d.z], t: performance.now() / 1000 };
    });
    if (r.b < last - 50) break;
    last = r.b; rows.push(r);
    if (prev && prev.shot === r.shot && r.t > prev.t) {
      const a = Math.acos(Math.min(1, prev.d[0] * r.d[0] + prev.d[1] * r.d[1] + prev.d[2] * r.d[2])) / (r.t - prev.t);
      if (a > camMax) { camMax = a; camAt = r.b; }
    }
    prev = r;
    await page.waitForTimeout(80);
  }
  console.log(`\n== ${fig}${args.reel ? ` · proposta ${args.reel}` : ''}\n temps  posició       m/temps  cap a (vs càmera)  gir rad/temps`);
  for (let b = 0; b <= last; b += 2) {
    const w = rows.filter(r => r.b >= b && r.b < b + 2).sort((p, q) => p.b - q.b); // (the beat can step back while it catches up the music)
    if (w.length < 2) continue;
    const a = w[0], z = w.at(-1), db = z.b - a.b, dx = z.x - a.x, dz = z.z - a.z, v = Math.hypot(dx, dz) / db;
    const rel = v > 0.05 ? wrap(deg(Math.atan2(dx, dz)) - CAM_AZ) : null, turn = Math.atan2(Math.sin(z.yaw - a.yaw), Math.cos(z.yaw - a.yaw)) / db;
    const how = rel == null ? 'quieta' : Math.abs(rel) < 50 ? 'cap a la lent' : Math.abs(rel) > 130 ? 'se’n va' : 'travessa';
    console.log(`${String(b).padStart(5)}  (${a.x.toFixed(1).padStart(5)},${a.z.toFixed(1).padStart(5)})  ${v.toFixed(2)}     ${rel == null ? '     ' : `${String(Math.round(rel)).padStart(4)}°`} ${how.padEnd(13)} ${turn >= 0 ? '+' : ''}${turn.toFixed(2)}`);
  }
  console.log(`la càmera gira com a màxim ${camMax.toFixed(3)} rad/s dins d'un pla (temps ${camAt.toFixed(0)})`);
  await ctx.close();
}
await browser.close();
