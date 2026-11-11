// The frames an interaction really costs on the reference Android (the owner's Galaxy S10 over adb, Chrome DevTools
// Protocol): a cold start (Chrome stopped, the site's data cleared), the splash's tap, then `seconds` of the selector left
// alone. Per run: every frame over 50 ms with its time from the selector's showing, the ms lost in them (what a steady
// 60 Hz would not have spent) around the opening and over the whole watch, and how long the page cover stayed. Variants
// A/B a cause on the same build (injected CSS, a query, or script run before the page), alternated across `reps`.
// With `trace`, each run also saves a Chrome trace and prints, for every frame over 80 ms, the GPU programs compiled in it
// (VulkanCreateGraphicsPipelines): the usual owner of a hitch with no long JavaScript (docs/agents/graphics.md).
// It stops Chrome on the phone at every run: the phone must be this run's alone (docs/agents/device-profiling.md).
// usage: node tools/qa/device/android-frames.mjs <plan.json>
// plan.json: { "url": "http://<lan-ip>:<preview-port>/?mute", "seconds": 17, "reps": 2, "trace": "/tmp/dir" (optional),
//              "variants": [["as is"], ["no ribbon", ".sel-heart-tip { display: none !important; }"],
//                           ["played", "", "", "localStorage.setItem('record-bou-tradicional-valls-1', '{\"score\":1}')"]] }
//              a variant: [label, css = "", query suffix = "", script before the page = ""]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const plan = JSON.parse(readFileSync(process.argv[2], 'utf8')), SECONDS = plan.seconds ?? 17, REPS = plan.reps ?? 2;
const ADB = process.env.ADB ?? `${process.env.ANDROID_HOME ?? `${process.env.HOME}/Library/Android/sdk`}/platform-tools/adb`;
const adb = (...a) => execFileSync(ADB, a, { encoding: 'utf8' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (!/\bdevice\b/.test(adb('devices').split('\n').slice(1).join('\n'))) { console.error('no authorized Android device (adb devices)'); process.exit(1); }
adb('forward', 'tcp:9333', 'localabstract:chrome_devtools_remote');
if (plan.trace) mkdirSync(plan.trace, { recursive: true });
const origin = new URL(plan.url).origin;

async function run(label, css = '', query = '', js = '', n = 0) {
  adb('shell', 'am', 'force-stop', 'com.android.chrome'); await sleep(1500);
  const blank = `${origin}/blank-${Date.now()}`; // (a 404 of the same origin: its storage is cleared before the game loads)
  adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `'${blank}'`, 'com.android.chrome'); await sleep(3000);
  let tab; // Chrome opens its debugging socket a moment after it starts
  for (let i = 0; i < 30 && !tab; i++) { try { tab = (await (await fetch('http://localhost:9333/json/list')).json()).find(t => t.type === 'page' && t.url.startsWith(origin)); } catch { /* not yet */ } if (!tab) await sleep(1000); }
  if (!tab) throw new Error('no Chrome tab on the phone for ' + origin);
  const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => { ws.onopen = r; });
  let id = 0, traced; const pend = new Map(), chunks = [], traceDone = new Promise(r => { traced = r; });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Tracing.dataCollected') chunks.push(m.params.value); else if (m.method === 'Tracing.tracingComplete') traced(); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); setTimeout(() => { if (pend.has(i)) { pend.delete(i); r({}); } }, 60000); });
  const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  await send('Storage.clearDataForOrigin', { origin, storageTypes: 'all' });
  await send('Page.enable');
  // __shown: the selector's real opening, after the page cover is gone (it is also shown once under the cover: ui/select-warm.js)
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('gpu-hint', 'off'); localStorage.setItem('ui-language-v1', 'ca'); ${js}
    window.__fr = []; (function f(t) { __fr.push(t); requestAnimationFrame(f); })(performance.now());
    addEventListener('DOMContentLoaded', () => {
      ${css ? `const s = document.createElement('style'); s.textContent = ${JSON.stringify(css)}; document.head.append(s);` : ''}
      const L = document.getElementById('loader'), S = document.getElementById('select');
      new MutationObserver(() => { if (!window.__cover && L.hidden) window.__cover = performance.now(); }).observe(L, { attributes: true });
      new MutationObserver(() => { if (!window.__shown && window.__cover && S.hasAttribute('data-shown')) { window.__shown = performance.now(); console.timeStamp('SHOWN'); } }).observe(S, { attributes: true });
    });` });
  await send('Page.navigate', { url: plan.url + query });
  for (let i = 0; i < 120 && !(await evalJs(`!!window.__dbg && window.__dbg.G.state === 'splash' && (document.getElementById('loader')?.hidden ?? true)`)); i++) await sleep(1000);
  await sleep(1500);
  const { w, h } = await evalJs('({ w: innerWidth, h: innerHeight })');
  // narrow categories: a wide trace of this length never completes on the phone
  if (plan.trace) await send('Tracing.start', { categories: 'gpu,devtools.timeline,blink.console', transferMode: 'ReportEvents' });
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: w / 2, y: h * 0.6 }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  for (let s = 0; s < SECONDS / 2 + 1; s++) { await sleep(2000); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5 + s, y: 5 }); } // a pointer move: the idle screen stays away
  const r = await evalJs(`(() => {
    const fr = __fr, S = window.__shown, lost = (a, b) => { let j = 0; for (let i = 1; i < fr.length; i++) if (fr[i] > a && fr[i] <= b && fr[i] - fr[i - 1] > 50) j += fr[i] - fr[i - 1] - 16.7; return Math.round(j); };
    const slow = []; for (let i = 1; i < fr.length; i++) if (fr[i] > S - 300 && fr[i] <= S + ${SECONDS * 1000} && fr[i] - fr[i - 1] > 50) slow.push([Math.round(fr[i - 1] - S), Math.round(fr[i] - fr[i - 1])]);
    return { selected: document.querySelector('.sel-card[aria-selected="true"]')?.dataset.id, coverMs: Math.round(window.__cover ?? 0), lostOpening: lost(S - 300, S + 900), lostAll: lost(S - 300, S + ${SECONDS * 1000}), longest: Math.max(0, ...slow.map(x => x[1])), slow };
  })()`);
  if (plan.trace) {
    await send('Tracing.end'); await traceDone;
    const tr = chunks.flat(), file = `${plan.trace}/${label.replace(/\W+/g, '_')}-${n}.json`; writeFileSync(file, JSON.stringify(tr));
    const main = new Set(tr.filter(e => e.name === 'thread_name' && e.args?.name === 'CrRendererMain').map(e => `${e.pid}/${e.tid}`));
    const frames = tr.filter(e => e.name === 'FireAnimationFrame' && main.has(`${e.pid}/${e.tid}`)).map(e => e.ts).sort((a, b) => a - b);
    const shown = tr.find(e => e.name === 'TimeStamp' && e.args?.data?.message === 'SHOWN')?.ts ?? frames[0];
    r.compiles = []; // [ms from the selector's showing, the frame's ms, programs compiled, their ms]
    for (let i = 1; i < frames.length; i++) if (frames[i] - frames[i - 1] > 80000) {
      const c = tr.filter(e => e.name === 'VulkanCreateGraphicsPipelines' && e.ts > frames[i - 1] - 60000 && e.ts < frames[i] + 20000);
      r.compiles.push([Math.round((frames[i - 1] - shown) / 1000), Math.round((frames[i] - frames[i - 1]) / 1000), c.length, Math.round(c.reduce((s, e) => s + (e.dur ?? 0), 0) / 1000)]);
    }
    r.trace = file;
  }
  ws.close();
  return r;
}
const order = [], all = {};
for (let rep = 0; rep < REPS; rep++) order.push(...(rep % 2 ? [...plan.variants].reverse() : plan.variants)); // alternated: neither side always runs on the warmer phone
for (const [n, v] of order.entries()) { const r = await run(v[0], v[1], v[2], v[3], n); console.log(v[0].padEnd(20), JSON.stringify(r)); (all[v[0]] ??= []).push(r); }
console.log('\nper variant, a value per run');
for (const [label, rs] of Object.entries(all)) console.log(label.padEnd(20), ['coverMs', 'lostOpening', 'lostAll', 'longest'].map(k => `${k} ${rs.map(r => r[k]).join('/')}`).join('   '));
