// Validació del showreel (game/showreel.js) i de les propostes (tools/dev/reel-review/proposals.js): per figura, proposta, mode i
// mida, recorre una volta sencera en temps real i, 4 cops per segon, projecta els vèrtexs del que el pla enquadra (tota la figura;
// als primers plans, la part: el cap, la cua) i mesura quina part en queda fora de la zona lliure del mode:
//   idle: el selector sense UI (tota la pantalla); ui: el selector amb UI (la franja lliure sheets.select.band; pot pujar fins a
//   sota les píndoles, hardTop); watch: «Mira el ball» (sota el botó de pausa, playStage).
// Desa la pitjor captura de cada pla i una pàgina HTML (files: plans; columnes: mides; vermell: tallat).
//   npm run dev   (port 5178), i després:
//   node tools/qa/reel-review.mjs [--figs=drac,mulassa,bou] [--modes=idle,ui,watch] [--props=,A,B,C,D] [--vps=375x667,1440x700] [--par=3]
// --props: «» (buit) és el showreel actual. Llindar: un pla sencer amb >2% fora, un primer pla amb >10% fora.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lock, launchBrowser } from './capture-lib.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const URL0 = args.url ?? 'http://localhost:5178', OUT = args.out ?? '/tmp/reel-review', PAR = +(args.par ?? 3);
const FIGS = (args.figs ?? 'drac,mulassa').split(','), MODES = (args.modes ?? 'idle').split(','), PROPS = (typeof args.props === 'string' ? args.props : ',A,B,C').split(',');
const VPS = (args.vps ?? '375x667,393x852,1024x768,1440x700,1920x1080').split(',').map(s => s.split('x').map(Number));
const LIMIT = { body: 0.02, part: 0.1 };
const { chromium } = await import(pathToFileURL(join(args.pw ?? '/tmp/ui-inv-pw', 'node_modules/playwright/index.mjs')).href);
mkdirSync(OUT, { recursive: true });
await lock();
const browser = await launchBrowser(chromium);

// In the page: the reel now and the share of the framed target's screen box outside the mode's free room (inside the safe areas)
const PROBE = async mode => {
  const [{ REEL }, cv, { figureRoot }, { sheets }, { playStage }] = await Promise.all(['/src/game/showreel.js', '/src/hud/canvas.js', '/src/figures/objects.js',
    '/src/ui/sheets.js', '/src/hud/layout.js'].map(u => import(u)));
  if (mode === 'ui') dispatchEvent(new PointerEvent('pointermove')); // (keeps the UI up)
  const cam = window.__dbg.camera, root = figureRoot(REEL.id), part = REEL.shot.part, v = cam.position.clone();
  const target = part ? root.getObjectByName(part) ?? root : root, W = innerWidth, H = cv.HH * cv.K;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, behind = false;
  root.updateMatrixWorld(true);
  target.traverseVisible(o => {
    const pos = o.isMesh && o.geometry?.attributes.position;
    if (!pos) return;
    const step = Math.max(1, Math.floor(pos.count / 4000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).project(cam);
      if (v.z > 1) { behind = true; continue; }
      const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  });
  const S = cv.SAFE, band = sheets.select?.band, st = mode === 'watch' && playStage();
  let l = S.l, r = W - S.r, t = S.t, b = H - S.b;
  if (mode === 'ui' && band) { l = Math.max(l, band.left ?? 0); r = Math.min(r, band.right ?? W); t = band.hardTop ?? band.top; b = band.bottom; }
  if (st) { t = st.top * cv.K; b = st.bottom * cv.K; }
  const area = Math.max(1, (x1 - x0) * (y1 - y0)), inside = Math.max(0, Math.min(x1, r) - Math.max(x0, l)) * Math.max(0, Math.min(y1, b) - Math.max(y0, t));
  return { beat: REEL.beat, idx: REEL.idx, part: part ?? null, out: behind ? 1 : 1 - inside / area, box: [x0, y0, x1, y1].map(Math.round), room: [l, t, r, b].map(Math.round), state: window.__dbg.G.state };
};

const results = [];
async function run(fig, prop, mode, [w, h]) {
  const phone = w < 600, touch = w <= 1024, tag = `${fig}-${prop || 'actual'}-${mode}-${w}x${h}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: phone, hasTouch: touch });
  await ctx.addInitScript(() => { try { for (const k of ['gpu-hint', 'ios-hint']) localStorage.setItem(k, 'off'); } catch {} });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log(tag, 'pageerror', e.message));
  await page.goto(`${URL0}/?mute&mock&figura=${fig}`);
  await page.waitForFunction(() => window.__dbg?.G?.state, null, { timeout: 60000 });
  const info = await page.evaluate(async ([fig, prop, mode]) => {
    if (mode === 'idle') (await import('/src/ui/reel-idle.js')).REEL_IDLE.after = 0; // the UI out at once: the shot has the whole screen
    await (await import('/tools/dev/reel-review/proposals.js')).applyProposal(fig, prop, u => import(u));
    if (window.__dbg.G.state === 'splash') (await import('/src/game/flow.js')).unlock();
    const { REEL, SHOWREELS } = await import('/src/game/showreel.js');
    await new Promise(r => setTimeout(r, 2000));
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    const reel = SHOWREELS[REEL.id];
    if (mode === 'watch') document.getElementById('select-watch')?.click(); // the song once through, from its beat 0
    else REEL.anchor = reel.start + REEL.acc; // from beat 0: one whole loop
    return { shots: reel.shots, loop: reel.loop };
  }, [fig, prop, mode]);
  await page.waitForTimeout(1500); // (the first cut settled)
  const worst = info.shots.map(() => ({ out: 0, beat: null, file: null, part: null })), t0 = Date.now();
  let last = -1;
  while (Date.now() - t0 < 200000) {
    const m = await page.evaluate(PROBE, mode);
    if (mode === 'watch' ? m.state !== 'play' : m.beat < last - 50) break; // the song over / wrapped: one loop done
    last = m.beat;
    const i = info.shots.findLastIndex(s => s[0] <= m.beat), cut = info.shots.some(s => m.beat - s[0] >= 0 && m.beat - s[0] < 1.5); // (inside a cut's dissolve: the old shot still shows)
    if (i >= 0 && !cut && m.out > worst[i].out) {
      Object.assign(worst[i], { out: m.out, beat: m.beat, part: m.part, box: m.box, room: m.room });
      if (m.out > (m.part ? LIMIT.part : LIMIT.body)) {
        worst[i].file = `${tag}-${String(i + 1).padStart(2, '0')}.jpg`;
        await page.screenshot({ path: join(OUT, worst[i].file), type: 'jpeg', quality: 70 });
      }
    }
    await page.waitForTimeout(250);
  }
  info.shots.forEach(([b, kind, how], i) => results.push({ fig, prop, mode, w, h, i, b, kind, how, ...worst[i] }));
  const bad = worst.filter(x => x.out > (x.part ? LIMIT.part : LIMIT.body)).length;
  console.log(tag, bad ? `${bad} plans tallen` : 'cap pla talla');
  await ctx.close();
}

const jobs = FIGS.flatMap(f => PROPS.flatMap(p => MODES.flatMap(m => VPS.map(v => () => run(f, p, m, v).catch(e => console.log(f, p, m, v.join('x'), 'error', e.message))))));
await Promise.all(Array.from({ length: PAR }, async () => { while (jobs.length) await jobs.shift()(); }));
await browser.close();
writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 1));

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const badOf = r => r.out > (r.part ? LIMIT.part : LIMIT.body);
let html = `<!doctype html><meta charset="utf-8"><title>Showreel: es talla la figura?</title><style>body{font:13px system-ui;background:#111;color:#ddd;margin:16px}
td,th{padding:4px 8px;text-align:left;vertical-align:top;border-bottom:1px solid #2a2a2a}.bad{color:#f66;font-weight:600}.ok{color:#8c8}img{display:block;height:160px;margin-top:4px}</style>
<h1>Showreel: es talla la figura?</h1><p>Una volta sencera en temps real per mode (sense UI: tota la pantalla; amb UI: la franja lliure fins a sota les píndoles; «Mira el ball»: sota la pausa), 4 mostres per segon (sense comptar el fos de cada tall). Valor: la pitjor part de la caixa del que s'enquadra (la figura; als primers plans, la part) que queda fora de la zona lliure. Vermell: més del ${LIMIT.body * 100}% (pla sencer) o del ${LIMIT.part * 100}% (primer pla), amb la captura d'aquell moment.</p>`;
for (const fig of FIGS) for (const prop of PROPS) for (const mode of MODES) {
  const rows = results.filter(r => r.fig === fig && r.prop === prop && r.mode === mode);
  if (!rows.length) continue;
  const n = rows.filter(badOf).length;
  html += `<h2>${esc(fig)} · ${prop ? `proposta ${prop}` : 'actual'} · ${{ idle: 'sense UI', ui: 'amb UI', watch: '«Mira el ball»' }[mode]} <span class="${n ? 'bad' : 'ok'}">${n ? `${n} talls` : 'cap tall'}</span></h2><table><tr><th>pla</th>${VPS.map(([w, h]) => `<th>${w}×${h}</th>`).join('')}</tr>`;
  for (const s of [...new Set(rows.map(r => r.i))]) {
    const r0 = rows.find(r => r.i === s);
    html += `<tr><th>${prop ? `${prop}-` : fig[0].toUpperCase()}${s + 1} · ${r0.b} ${r0.kind}</th>${VPS.map(([w, h]) => { const r = rows.find(q => q.i === s && q.w === w && q.h === h);
      return !r ? '<td>–</td>' : `<td class="${badOf(r) ? 'bad' : 'ok'}">${(r.out * 100).toFixed(0)}% fora${r.beat != null ? ` (temps ${r.beat.toFixed(0)})` : ''}${r.file ? `<img src="${r.file}">` : ''}</td>`; }).join('')}</tr>`;
  }
  html += '</table>';
}
writeFileSync(join(OUT, 'index.html'), html);
console.log(`\n${results.filter(badOf).length} plans tallats de ${results.length} → ${join(OUT, 'index.html')}`);
