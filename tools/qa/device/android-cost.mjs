// The synchronous part of an interaction's cost on the reference Android (the owner's Galaxy S10 over adb, Chrome DevTools
// Protocol): each step runs 3 times and prints the median ms of the action plus the style/layout it leaves (forced right
// after). A lower bound, good for A/B of a cause: it leaves out what comes after (ResizeObserver work, paint, GPU raster,
// the rest of the frame), so the AGENTS.md budget (task and frame) needs a trace too (docs/agents/device-profiling.md).
// Variants A/B a cause on the device: CSS injected (`css`), or rules deleted through CSSOM (`DROP:<selector regex>`).
// Docs: docs/agents/device-profiling.md. Needs `adb devices` to list the phone as `device` (accept its prompt once).
// usage: node tools/qa/device/android-cost.mjs <plan.json>
// plan.json: { "url": "http://<lan-ip>:<port>/?mute&mock&account=verified&board=me",
//              "viewport": "375x667" (optional: emulate a smaller phone on the S10),
//              "steps": [["notice", "document.getElementById('stats-notice-menu').showModal()"],
//                        ["profile", "document.getElementById('settings-profile').click()", ["document.getElementById('settings').click()"]]],
//              "variants": [["as is", ""], ["no :has", "DROP::has\\("]] }
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const ADB = process.env.ADB ?? `${process.env.ANDROID_HOME ?? `${process.env.HOME}/Library/Android/sdk`}/platform-tools/adb`;
const adb = (...a) => execFileSync(ADB, a, { encoding: 'utf8' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (!/\bdevice\b/.test(adb('devices').split('\n').slice(1).join('\n'))) { console.error('no authorized Android device (adb devices)'); process.exit(1); }
adb('forward', 'tcp:9333', 'localabstract:chrome_devtools_remote');
// Chrome must be in front: a background tab ignores Page.navigate, and /json/new is refused on Android
adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `'${plan.url}'`, 'com.android.chrome');
await sleep(2500);
const host = new URL(plan.url).host;
const tab = (await (await fetch('http://localhost:9333/json/list')).json()).find(t => t.type === 'page' && t.url.includes(host));
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); setTimeout(() => { if (pend.has(i)) { pend.delete(i); r({}); } }, 30000); });
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
await new Promise(r => { ws.onopen = r; });
const ev = x => send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }).then(r => r.result?.result?.value ?? r.result?.exceptionDetails?.exception?.description);
await send('Runtime.enable'); await send('Page.enable');
if (plan.viewport) { const [width, height] = plan.viewport.split('x').map(Number); await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 0, mobile: true }); }
await send('Page.navigate', { url: plan.url }); await sleep(10000);
for (const type of ['touchStart', 'touchEnd']) await send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: 150, y: 300 }] }); // past the splash
await sleep(3000);
const shut = () => ev(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);
await shut(); await sleep(800);
for (const [label, css] of plan.variants ?? [['as is', '']]) {
  if (css.startsWith('DROP:')) await ev(`(()=>{const R=new RegExp(${JSON.stringify(css.slice(5))});const walk=l=>{for(let i=l.length-1;i>=0;i--){const r=l[i];if(r.cssRules&&!r.selectorText)walk(r.cssRules);else if(r.selectorText&&R.test(r.selectorText))(r.parentRule||r.parentStyleSheet).deleteRule(i)}};for(const s of document.styleSheets)try{walk(s.cssRules)}catch{}})()`);
  else await ev(`(()=>{document.querySelectorAll('style.ab').forEach(s=>s.remove());const c=${JSON.stringify(css)};if(c){const s=document.createElement('style');s.className='ab';s.textContent=c;document.head.append(s)}})()`);
  await sleep(600);
  const out = [];
  for (const [name, act, prep = []] of plan.steps) {
    const runs = [];
    for (let i = 0; i < 3; i++) {
      await shut(); await sleep(400);
      for (const p of prep) { await ev(p); await sleep(500); }
      runs.push(await ev(`(()=>{const t=performance.now();${act};document.body.offsetHeight;return Math.round(performance.now()-t)})()`));
      await sleep(500);
    }
    out.push(`${name} ${[...runs].sort((a, b) => a - b)[1]}`);
  }
  console.log(`${(plan.viewport ?? 'native').padEnd(8)} ${label.padEnd(24)} ${out.join(' | ')}   (ms, median of 3)`);
}
await shut();
if (plan.viewport) await send('Emulation.clearDeviceMetricsOverride');
process.exit(0);
