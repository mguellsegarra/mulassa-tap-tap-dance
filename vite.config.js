import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { versionOf, git } from './tools/app-version.mjs';

// The build's version, shown in Configuració and sent with feedback and crash reports (src/core/version.js), +short sha:
// the rule (tools/app-version.mjs) is also the production tag's name. CI checks out the full history.
const { version: pkg } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const version = versionOf(pkg, git('rev-list', '--count', 'HEAD') || 0);
const build = `${version}+${git('rev-parse', '--short=7', 'HEAD') || 'dev'}`;
// `DEV_HTTPS=1 npm run dev`: https on the LAN with a self-signed certificate (.cert/, gitignored; made once with `openssl req -x509 -newkey rsa:2048 -nodes -keyout .cert/dev.key -out .cert/dev.crt -subj /CN=mulassa-dev -addext subjectAltName=IP:<LAN-IP>`
// «?final»). Phones need a secure context for Web Share with files and the clipboard; http://192.168.x.x has neither.
const https = process.env.DEV_HTTPS ? { key: readFileSync('.cert/dev.key'), cert: readFileSync('.cert/dev.crt') } : undefined;
// A tab or home-screen app woken from memory doesn't load the page again: src/services/update.js compares this file with its own build.
// index.html's #build-check carries the same build, so a page kept from before a deploy reloads before the game boots.
const buildStamp = { name: 'build-stamp', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build }) }); },
  transformIndexHtml: html => html.replace("'__MULASSA_BUILD__'", JSON.stringify(build)) };
export default defineConfig({ define: { __APP_VERSION__: JSON.stringify(version), __APP_BUILD__: JSON.stringify(build) }, server: { https }, plugins: [buildStamp] });
