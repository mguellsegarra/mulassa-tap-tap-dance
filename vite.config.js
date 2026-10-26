import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import musicEditor from './tools/music/music-editor/vite-plugin.mjs';
import bestiariMedia from './tools/bestiari/media-plugin.mjs';

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
// Keep playtests intact until a manual reload; file watching still invalidates cached modules.
export default defineConfig({ define: { __APP_VERSION__: JSON.stringify(version), __APP_BUILD__: JSON.stringify(build) }, server: { https, hmr: false }, plugins: [musicEditor(), bestiariMedia(), buildStamp] }); // dev-only backends; buildStamp: the build's /version.json
