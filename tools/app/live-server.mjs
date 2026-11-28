// A live-update site for the app's test builds (docs/app/native-shell.md, contract 5): builds this checkout into .live/ as a
// build newer than the app's own copy of the same commit (BUILD_TAG), lists it in app-bundle.json and serves it
// on the LAN over http, which only debug builds accept (Android's debug manifest, iOS debug.xcconfig), or behind an https proxy.
// The app's own copy must follow the same site: `VITE_LIVE_UPDATE_URL=<url> npm run build && npx cap sync`.
// node tools/app/live-server.mjs http://<lan-ip>:3791 3791
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const [url, port = '3790'] = process.argv.slice(2);
if (!/^https?:\/\//.test(url ?? '')) throw new Error('usage: node tools/app/live-server.mjs http(s)://<host>[:port] [local port]');
const env = { ...process.env, VITE_LIVE_UPDATE_URL: url, BUILD_TAG: `live${Date.now().toString(36)}` };
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', env });
run('npx', ['vite', 'build', '--outDir', '.live', '--emptyOutDir']);
run('node', ['tools/deploy/app-bundle.mjs', '.live']);
// as public/_headers serves app-bundle.json: the app's page reads it from another origin (vite preview also refuses the tailnet's name)
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };
const ROOT = resolve('.live');
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname); // a malformed escape: a 404, not a crash
    const file = resolve(ROOT, `.${path.endsWith('/') ? `${path}index.html` : path}`);
    if (!file.startsWith(ROOT + sep)) throw new Error('outside .live');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' }).end(body);
  } catch { res.writeHead(404).end(); }
  console.log(res.statusCode, req.url);
}).listen(+port, '0.0.0.0', () => console.log(`live bundle on port ${port}, for ${url}`)); // the LAN: the phones on the same network
