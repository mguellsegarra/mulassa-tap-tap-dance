// A/B phases on a phone without a cable, through probe-proxy.mjs's command channel: waits for the newest live session
// in the wanted state, then runs each phase (an expression queued for the page) for N seconds and prints its frames:
// fps and the share of frames over 80 ms. The phone shows a short banner at each phase and a lasting «Fet!» at the end.
// Docs: docs/agents/device-profiling.md. A plan:
// { "proxyLog": "/tmp/mulassa-device/C-prod.log", "log": "/tmp/mulassa-device/C-prod.jsonl", "port": 5295,
//   "state": "idle", "seconds": 30,
//   "phases": [["A as is", "document.getElementById('ab')?.remove(), 'reset'"],
//              ["E hidden UI not rendered", {"css": "body.reel-idle #select { content-visibility: hidden }"}]] }
// usage: node tools/qa/device/ios-phases.mjs <plan.json>   (run it in the background: a chat message can interrupt a
// foreground command; the phone must stay on the page, Safari in front, until «Fet!»)
import { readFileSync } from 'node:fs';

const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const TOKEN = readFileSync(plan.proxyLog, 'utf8').match(/command token: (\w+)/)[1];
const rows = () => readFileSync(plan.log, 'utf8').trim().split('\n').map(JSON.parse);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const seconds = plan.seconds ?? 30, want = new RegExp(plan.state ?? '.');
// One expression a post (2 s): the result arrives with the next one, so wait before reading it.
const queue = async js => {
  await fetch(`http://127.0.0.1:${plan.port}/__cmd`, { method: 'POST', headers: { 'x-cmd-token': TOKEN }, body: js });
  await sleep(4500);
};
// A banner over the 3D is a visible layer: it changes what is measured (a visible UI hid the idle reel's hitch), so it
// shows a few seconds at each phase's start, at the bottom (the ?perf line covers the top), and only the end one stays.
const say = (text, secs) => `(()=>{document.getElementById('probe-say')?.remove();const d=document.createElement('div');d.id='probe-say';d.textContent=${JSON.stringify(text)};d.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 96px);z-index:99999;padding:12px 16px;border-radius:12px;background:#1d130c;color:#fff3d6;font:600 17px/1.3 system-ui;text-align:center;box-shadow:0 4px 16px #0008;pointer-events:none';document.body.append(d);${secs ? `setTimeout(()=>d.remove(),${secs * 1000})` : ''};return 'said'})()`;
const css = text => `(()=>{document.getElementById('ab')?.remove();const s=document.createElement('style');s.id='ab';s.textContent=${JSON.stringify(text)};document.head.append(s);return 'css on'})()`;

// the newest session that posted in the last 5 s, in the wanted state, on screen (a reload makes a new session)
let sid = null;
for (let i = 0; i < 300 && !sid; i++) {
  const all = rows(), hellos = new Map(all.filter(r => r.hello).map(r => [r.sid, r]));
  const last = all.filter(r => r.t != null && hellos.has(r.sid)).at(-1);
  const age = last ? (Date.now() - Date.parse(`${new Date().toISOString().slice(0, 11)}${last.at}Z`)) / 1000 : Infinity;
  if (last && age < 5 && want.test(last.state) && !/hidden/.test(last.state)) sid = last.sid; else await sleep(1000);
}
if (!sid) { console.log(`no live session in state ${plan.state} within 5 min`); process.exit(1); }
console.log('session', sid);
for (const [i, [name, step]] of plan.phases.entries()) {
  await queue(say(`Prova ${i + 1}/${plan.phases.length}: ${name.split(' ')[0]} · ${seconds} s · no toquis res ni surtis de Safari`, 6));
  await queue(typeof step === 'string' ? step : css(step.css));
  const from = rows().length; await sleep(seconds * 1000);
  const w = rows().slice(from).filter(r => r.sid === sid && r.t != null), ok = w.filter(r => want.test(r.state) && !/hidden/.test(r.state));
  const frames = ok.reduce((a, r) => a + r.fps * 2, 0), over = ok.reduce((a, r) => a + r.long.filter(x => x > 80).length, 0);
  console.log(`${name}: ${ok.length}/${w.length} windows in state, ${(ok.reduce((a, r) => a + r.fps, 0) / (ok.length || 1)).toFixed(1)} fps, frames over 80 ms ${(100 * over / (frames || 1)).toFixed(1)}%, quality ${[...new Set(ok.map(r => r.perf?.quality).filter(Boolean))].join(',') || '?'}`);
  if (w.some(r => /hidden/.test(r.state))) console.log('  (the page went to the background: this phase does not count)');
}
await queue(`(document.getElementById('ab')?.remove(), 'reset')`);
await queue(say('Fet! Ja pots tornar al xat', 0));
