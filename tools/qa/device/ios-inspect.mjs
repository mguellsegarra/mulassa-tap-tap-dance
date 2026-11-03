// An iPhone's Safari through ios_webkit_debug_proxy (on this Mac or another one on the LAN): reload a tab into a URL with
// Safari's JavaScript profiler on, record N s, then print the long script spans, the hottest functions, the gaps with no
// JavaScript at all (the main thread waiting on something else: the GPU, layout) and the [load]/[quality] lines.
// Docs and the protocol's quirks: docs/agents/device-profiling.md.
// usage: node tools/qa/device/ios-inspect.mjs <url> [seconds=20] [--bridge=host:9222] [--tab=<regex of the tab's url>]
//        [--stay: no reload, record whatever the tab shows now (the selector, a song)] [--out=/tmp/mulassa-device/ios-profile.json] [--maps=<a `vite build --sourcemap` outDir: names the minified frames>]
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { SourceMap } from 'node:module';
import { dirname } from 'node:path';

const args = process.argv.slice(2), opt = k => args.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [url, secs = '20'] = args.filter(a => !a.startsWith('--'));
if (!url) { console.error('usage: ios-inspect.mjs <url> [seconds] [--bridge=host:9222] [--tab=regex] [--out=file]'); process.exit(2); }
const bridge = opt('bridge') ?? 'localhost:9222', out = opt('out') ?? '/tmp/mulassa-device/ios-profile.json';
const pages = await (await fetch(`http://${bridge}/json`)).json();
const tab = new RegExp(opt('tab') ?? new URL(url).host.replace(/\./g, '\\.'));
const page = pages.find(p => tab.test(p.url)) ?? pages.find(p => !/^(about:|safari-web-extension:)/.test(p.url) && p.url);
if (!page) { console.error('no Safari tab to drive: open the game (any URL on its host) in Safari first', pages.map(p => p.url)); process.exit(1); }
console.log('tab', page.url);
// (the bridge's own URL is ws://localhost:…; from another Mac, swap in the bridge host)
const ws = new WebSocket(page.webSocketDebuggerUrl.replace(/\/\/[^/]+/, `//${bridge}`));
let id = 0, inner = 0, target = null, samples = null, live = false; // live: after the reload (Console.enable replays old lines)
const pend = new Map(), spans = [], logs = [], t0 = Date.now();
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Target.targetCreated') { target ??= m.params.targetInfo.targetId; return; } // iOS 13+: everything goes through a target
  if (m.method !== 'Target.dispatchMessageFromTarget') return;
  const x = JSON.parse(m.params.message);
  if (x.id && pend.has(x.id)) { pend.get(x.id)(x); pend.delete(x.id); return; }
  if (x.method === 'ScriptProfiler.trackingUpdate') spans.push(x.params.event);
  else if (x.method === 'ScriptProfiler.trackingComplete') samples = x.params.samples;
  else if (x.method === 'Console.messageAdded') {
    const msg = x.params.message; // the text is only the first argument: the rest come as parameters
    if (live && /^\[(load|quality)\]/.test(msg.text)) logs.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${[msg.text, ...(msg.parameters ?? []).slice(1).map(p => p.description ?? p.value ?? '')].join(' ').slice(0, 200)}`);
  }
};
await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
for (let i = 0; i < 40 && !target; i++) await new Promise(r => setTimeout(r, 100));
if (!target) { console.error('the tab announced no target: unlock the iPhone and bring that Safari tab to the front'); process.exit(1); }
const send = (method, params = {}) => new Promise(r => {
  const i = ++inner; pend.set(i, r);
  ws.send(JSON.stringify({ id: ++id, method: 'Target.sendMessageToTarget', params: { targetId: target, message: JSON.stringify({ id: i, method, params }) } }));
  setTimeout(() => { if (pend.has(i)) { pend.delete(i); r({ timeout: method }); } }, 10000);
});
const run = async (method, params) => { const r = await send(method, params); if (r.error || r.timeout) console.log(method, r.error?.message ?? 'timed out'); return r; };
await run('Console.enable'); await run('Network.enable'); await run('Network.setResourceCachingDisabled', { disabled: true });
// The profiler only reports while the timeline records with its instrument on
await run('Timeline.enable'); await run('Timeline.setInstruments', { instruments: ['ScriptProfiler'] });
await run('ScriptProfiler.startTracking', { includeSamples: true }); await run('Timeline.start');
// No Page.navigate in WebKit's protocol; a same-origin navigation keeps the same target, so the profiler survives it.
live = true; if (!args.includes('--stay')) await run('Runtime.evaluate', { expression: `location.replace(${JSON.stringify(url)})` });
await new Promise(r => setTimeout(r, +secs * 1000));
await run('ScriptProfiler.stopTracking'); await new Promise(r => setTimeout(r, 2500)); // the samples arrive after the stop
await run('Timeline.stop');
await run('Network.setResourceCachingDisabled', { disabled: false });
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify({ url, spans, samples, logs }));

const base = spans[0]?.startTime ?? 0, at = s => `${(s - base).toFixed(2)}s`;
console.log(`\nscript spans: ${spans.length}; over 50 ms:`);
for (const s of spans.filter(s => s.endTime - s.startTime > 0.05)) console.log(`  @${at(s.startTime)} ${((s.endTime - s.startTime) * 1000).toFixed(0)} ms ${s.type}`);
const maps = new Map(), mapsDir = opt('maps');
const mapOf = file => { if (!maps.has(file)) { const p = `${mapsDir}/assets/${file}.map`; maps.set(file, existsSync(p) ? new SourceMap(JSON.parse(readFileSync(p, 'utf8'))) : null); } return maps.get(file); };
const key = f => { // the source's own file and function when a map is given (WebKit's lines and columns are 1-based)
  const file = String(f.url ?? '').split('/').pop().replace(/\?.*/, ''), m = mapsDir && mapOf(file)?.findEntry(f.line - 1, f.column - 1);
  return m?.originalSource ? `${m.name ?? f.name ?? '(anon)'} ${m.originalSource.split('/').slice(-2).join('/')}:${m.originalLine + 1}` : `${f.name || '(anon)'} ${file}:${f.line}`;
};
const traces = samples?.stackTraces ?? [];
const self = {}; for (const t of traces) { const f = t.stackFrames?.[0]; if (f) self[key(f)] = (self[key(f)] ?? 0) + 1; }
console.log(`\nhottest functions (self samples of ${traces.length}):`);
for (const [k, v] of Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${v} ${k}`);
const ts = traces.map(t => t.timestamp).sort((a, b) => a - b), gaps = [];
for (let i = 1; i < ts.length; i++) if (ts[i] - ts[i - 1] > 0.25) gaps.push(`@${at(ts[i - 1])} ${((ts[i] - ts[i - 1]) * 1000).toFixed(0)} ms`);
console.log(`\nno JavaScript for over 250 ms: ${gaps.join(', ') || 'none'}`);
console.log(`\n${logs.join('\n')}\nsaved ${out}`);
process.exit(0);
