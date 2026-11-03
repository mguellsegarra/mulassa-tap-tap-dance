// A LAN proxy in front of a dev or preview server that injects a frame probe into the page's HTML: a phone (an iPhone
// without a cable) opens the proxy's URL and the probe posts every 2 s what its rAF saw (fps, frames over 40 ms), the
// game state (+idle, open sheets, hidden), `window.__perf` when the URL has ?perf, and the [load]/[quality] console lines.
// Nothing in the game changes; Vite's HMR socket is passed through. Docs: docs/agents/device-profiling.md.
// usage: node tools/qa/device/probe-proxy.mjs <listenPort> <targetPort> <label> [logDir=/tmp/mulassa-device]
// One JSON line per post in <logDir>/<label>.jsonl ({hello, ua, dpr…} first, then {t, fps, long, state, ev, perf, logs}).
// A/B on a phone without a cable: `curl -H 'x-cmd-token: <printed at start>' -d '<js>' http://<mac>:<port>/__cmd` queues an
// expression; the page runs it at its next post (2 s) and the result lands in the log as {cmd, result}. LAN dev tool only:
// the token (a custom header: no other web page can send it without a CORS preflight this server never grants) keeps
// anyone else from queueing code for the phone; requests that carry an Origin are refused.
import http from 'node:http';
import net from 'node:net';
import { appendFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const [port, target, label, logDir = '/tmp/mulassa-device'] = process.argv.slice(2);
const PAGE_KEY = randomBytes(16).toString('hex'); // in the probe the proxy serves: the page's own capability to take commands
if (!port || !target || !label) { console.error('usage: probe-proxy.mjs <listenPort> <targetPort> <label> [logDir]'); process.exit(2); }
mkdirSync(logDir, { recursive: true });
const LOG = `${logDir}/${label}.jsonl`;
const PERF_KEYS = ['state', 'fps', 'hz', 'half', 'late', 'frame', 'worst', 'js', '3d', 'hud', 'crowd', 'quality', 'lowPower', 'dpr', 'glPx', 'hudPx'];
// (innerWidth in `hello` is read before the viewport meta applies: Safari reports 980; the probe's own numbers are rAF's)
const PROBE = `<script>(()=>{const L=${JSON.stringify(label)},sid=Math.random().toString(36).slice(2,7),t0=performance.now();
let p=0,n=0,sum=0,long=[],last='',ev=[],logs=[];const cl=console.log;
console.log=(...a)=>{if(/^\\[(load|quality)\\]/.test(String(a[0])))logs.push(Math.round(performance.now()-t0)+' '+a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ').slice(0,300));return cl.apply(console,a)};
const st=()=>{let s='';try{s=window.__dbg?.G?.state??''}catch{};const d=[...document.querySelectorAll('dialog[open]')].map(x=>x.id).join(',');return s+(document.body?.classList.contains('reel-idle')?'+idle':'')+(d?'['+d+']':'')+(document.hidden?' hidden':'')};
const f=t=>{if(p){const d=t-p;n++;sum+=d;if(d>40)long.push(Math.round(d))}p=t;requestAnimationFrame(f)};requestAnimationFrame(f);
setInterval(()=>{const s=st();if(s!==last){ev.push(Math.round(performance.now()-t0)+':'+s);last=s}},250); // (per frame, this state read was the 4th hottest function on an iPhone)
const send=o=>{try{navigator.sendBeacon('/__probe',JSON.stringify({L,sid,...o}))}catch{}};
send({hello:1,ua:navigator.userAgent,dpr:devicePixelRatio,w:innerWidth,h:innerHeight});
setInterval(()=>{send({t:Math.round((performance.now()-t0)/1000),fps:n?+(n/(sum/1000)).toFixed(1):0,long,state:st(),ev,perf:window.__perf?Object.fromEntries(${JSON.stringify(PERF_KEYS)}.map(k=>[k,__perf[k]])):undefined,logs:logs.splice(0)});n=sum=0;long=[];ev=[]},2000);
addEventListener('error',e=>send({err:String(e.message).slice(0,200)}));
setInterval(()=>fetch('/__cmd',{headers:{'x-probe-page':'${PAGE_KEY}'}}).then(r=>r.text()).then(c=>{if(!c)return;let result;try{result=String((0,eval)(c))}catch(e){result='ERR '+e.message}send({cmd:c.slice(0,200),result:String(result).slice(0,500)})}).catch(()=>{}),2000);})()</script>`;

let pendingCmd = '';
const CMD_TOKEN = randomBytes(16).toString('hex');
const server = http.createServer((req, res) => {
  if (req.url === '/__cmd') { // POST queues one expression, GET hands it to the page once
    if (req.method === 'POST') {
      if (req.headers.origin || req.headers['x-cmd-token'] !== CMD_TOKEN) { res.writeHead(403); res.end('forbidden'); return; }
      let body = ''; req.on('data', c => { body += c; }); req.on('end', () => { pendingCmd = body; res.end('queued'); }); return;
    }
    // only the page takes it: a GET with the page key the probe carries (a custom header: no other site can send it);
    // anything else (another client polling, HEAD) would read or drop the queued code
    if (req.method !== 'GET' || req.headers.origin || req.headers['x-probe-page'] !== PAGE_KEY) { res.writeHead(403); res.end('forbidden'); return; }
    res.setHeader('cache-control', 'no-store'); res.end(pendingCmd); pendingCmd = ''; return;
  }
  if (req.url === '/__probe' && req.method === 'POST') {
    let body = ''; req.on('data', c => { body += c; });
    req.on('end', () => { try { appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString().slice(11, 19), ...JSON.parse(body || '{}') }) + '\n'); } catch {} res.end('ok'); });
    return;
  }
  const headers = { ...req.headers, host: `127.0.0.1:${target}` }; delete headers['accept-encoding']; // plain HTML to inject into
  const up = http.request({ host: '127.0.0.1', port: target, path: req.url, method: req.method, headers }, r => {
    if (!/text\/html/.test(r.headers['content-type'] || '')) { res.writeHead(r.statusCode, r.headers); r.pipe(res); return; }
    let body = ''; r.setEncoding('utf8'); r.on('data', c => { body += c; });
    r.on('end', () => { const h = { ...r.headers }; delete h['content-length']; res.writeHead(r.statusCode, h); res.end(body.replace('<head>', '<head>' + PROBE)); });
  });
  up.on('error', e => { res.writeHead(502); res.end(String(e)); });
  req.pipe(up);
});
server.on('upgrade', (req, sock, head) => { // Vite's HMR websocket, byte for byte
  const up = net.connect(target, '127.0.0.1', () => {
    up.write(`${req.method} ${req.url} HTTP/1.1\r\n` + Object.entries({ ...req.headers, host: `127.0.0.1:${target}` }).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n\r\n');
    up.write(head); sock.pipe(up).pipe(sock);
  });
  up.on('error', () => sock.destroy()); sock.on('error', () => up.destroy());
});
server.listen(port, '0.0.0.0', () => console.log(`${label}: :${port} -> :${target}, log ${LOG}\ncommand token: ${CMD_TOKEN}`));
