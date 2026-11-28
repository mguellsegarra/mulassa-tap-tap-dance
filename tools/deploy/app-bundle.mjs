// The app's live update (packages/plassa/src/native.js checkLiveUpdate): writes dist/app-bundle.json { build, manifest }, every
// file of the prepared dist/ with its SHA-256. The updater fetches each one from the site itself and only those it lacks (a
// hashed asset already in the app is copied), so there is no zip and no Pages size limit to meet. Runs after prepare-pages.mjs,
// so each channel lists its own build.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dist = process.argv[2]?.replace(/\/?$/, '/') ?? fileURLToPath(new URL('../../dist/', import.meta.url)); // a folder: local tests
const OUT = 'app-bundle.json';
// /projecte/ and its screenshots and videos are the web's, never opened in the app
const webOnly = name => name === OUT || /^(videos|captures)\//.test(name) || /(^|\/)projecte\//.test(name);
const manifest = readdirSync(dist, { recursive: true, withFileTypes: true }).filter(e => e.isFile())
  .map(e => `${e.parentPath}/${e.name}`.slice(dist.length).replace(/^\//, '')).filter(name => !webOnly(name)).sort()
  .map(file_name => ({ file_name, file_hash: createHash('sha256').update(readFileSync(dist + file_name)).digest('hex') }));
if (!manifest.some(f => f.file_name === 'index.html')) throw new Error('app bundle without index.html');
const { build, seq } = JSON.parse(readFileSync(`${dist}version.json`, 'utf8'));
writeFileSync(dist + OUT, JSON.stringify({ build, seq, manifest })); // seq: the app only moves forwards (vite.config.js)
console.log(`App bundle ${build}: ${manifest.length} files`);
