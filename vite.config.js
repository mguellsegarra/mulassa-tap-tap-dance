import { defineConfig } from 'vite';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import musicEditor from './tools/music/music-editor/vite-plugin.mjs';
import bestiariMedia from './tools/bestiari/media-plugin.mjs';
import { unreleasedFigure } from './tools/deploy/unreleased-figure.mjs';
import { UNRELEASED_IDS } from './src/figures/index.js';

// The build's version, shown in Configuració and sent with feedback and crash reports (src/core/version.js):
// The release version comes from package.json; the build adds the short Git SHA.
const { version: pkg } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const git = cmd => { try { return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };
const version = pkg;
const build = `${version}+${git('rev-parse --short=7 HEAD') || 'dev'}`;
// `DEV_HTTPS=1 npm run dev`: https on the LAN with a self-signed certificate (.cert/, gitignored; made once with `openssl req -x509 -newkey rsa:2048 -nodes -keyout .cert/dev.key -out .cert/dev.crt -subj /CN=mulassa-dev -addext subjectAltName=IP:<LAN-IP>`
// «?final»). Phones need a secure context for Web Share with files and the clipboard; http://192.168.x.x has neither.
const https = process.env.DEV_HTTPS ? { key: readFileSync('.cert/dev.key'), cert: readFileSync('.cert/dev.crt') } : undefined;
// A home-screen app on iOS wakes from memory instead of reloading: src/services/update.js compares this file with its own build.
// index.html's #build-check carries the same build, so a page kept from before a deploy reloads before the game boots.
const buildStamp = { name: 'build-stamp', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build }) }); },
  transformIndexHtml: html => html.replace("'__MULASSA_BUILD__'", JSON.stringify(build)) };
// One page per mini-game (docs/jocs/README.md): a full navigation is what frees the main game's memory.
// Mulassa Pop lives at mulassa.cat/pop/; games still on their branches come back under jocs/<id>/.
const pages = ['index.html', 'pop/index.html', ...(existsSync('jocs') ? readdirSync('jocs').map(game => `jocs/${game}/index.html`) : [])];
// A game page's boot watchdog must run even when its module fails to load: inlined as a classic script, never bundled.
// Its boot screen's running Mulassa is painted before any script: one copy for every game (packages/plassa/src/mula-load.html).
const WATCHDOG = '<script id="boot-watchdog" src="/packages/plassa/src/boot-watchdog.js"></script>';
const jocsPage = { name: 'jocs-page', transformIndexHtml: { order: 'pre', handler: html => html
  .replace(WATCHDOG, () => `<script id="boot-watchdog">${readFileSync('packages/plassa/src/boot-watchdog.js', 'utf8')}</script>`)
  .replace('<!-- mula-load -->', () => readFileSync('packages/plassa/src/mula-load.html', 'utf8').trim()) } };
// Keep playtests intact until a manual reload; file watching still invalidates cached modules.
export default defineConfig({ define: { __APP_VERSION__: JSON.stringify(version), __APP_BUILD__: JSON.stringify(build) }, build: { rollupOptions: { input: pages } }, server: { https, hmr: false }, plugins: [jocsPage, musicEditor(), bestiariMedia(), unreleasedFigure(UNRELEASED_IDS), buildStamp] }); // dev-only backends; buildStamp: the build's /version.json
