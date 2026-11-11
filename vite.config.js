import { defineConfig } from 'vite';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import musicEditor from './tools/music/music-editor/vite-plugin.mjs';
import bestiariMedia from './tools/bestiari/media-plugin.mjs';
import bouTimeline from './tools/dev/bou-timeline/plugin.mjs';
import { unreleasedFigure } from './tools/deploy/unreleased-figure.mjs';
import { UNRELEASED_IDS } from './src/figures/index.js';
import { bootAliases } from './src/i18n/locale.js';

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
// jocs/index.html is Mulassa Games, the games' selector.
const pages = ['index.html', 'pop/index.html', 'jocs/index.html', ...readdirSync('jocs', { withFileTypes: true }).filter(e => e.isDirectory()).map(e => `jocs/${e.name}/index.html`)];
// A game page's boot watchdog must run even when its module fails to load: inlined as a classic script, never bundled.
// Its boot screen's running Mulassa is painted before any script: one copy for every game (packages/plassa/src/mula-load.html).
const WATCHDOG = '<script id="boot-watchdog" src="/packages/plassa/src/boot-watchdog.js"></script>';
// and its first funny line, before the first paint (packages/plassa/src/boot-first-line.js), from every language's boot catalogue
const bootLinesTable = () => JSON.stringify({ aliases: bootAliases(), lines: Object.fromEntries(readdirSync('src/i18n/locales').filter(code => existsSync(`src/i18n/locales/${code}/boot.json`))
  .map(code => [code, Object.entries(JSON.parse(readFileSync(`src/i18n/locales/${code}/boot.json`, 'utf8'))).filter(([k]) => k.startsWith('boot.joke.')).map(([, v]) => v)])) });
// mulassa.cat's own sheets (Configuració, Perfil, Bústia, Privadesa…), one copy in index.html: a game page names them in
// <!-- mulassa-sheets: id … --> and gets those <dialog>s as they are, in a <template> (no DOM on the boot); their code is
// mulassa.cat's, loaded by the game, which puts them in the page
const mainSheet = id => readFileSync('index.html', 'utf8').match(new RegExp(`<dialog id="${id}"[\\s\\S]*?</dialog>`))?.[0] ?? (() => { throw new Error(`index.html has no <dialog id="${id}">`); })();
const jocsPage = { name: 'jocs-page', transformIndexHtml: { order: 'pre', handler: html => html
  .replace(/<!-- mulassa-sheets: ([\w\s-]+?) -->/, (_, ids) => `<template id="mulassa-sheets">${ids.split(/\s+/).map(mainSheet).join('\n')}</template>`)
  .replace('<!-- boot-first-line -->', () => `<script id="boot-first-line">${readFileSync('packages/plassa/src/boot-first-line.js', 'utf8').replace('__BOOT_LINES__', bootLinesTable)}</script>`)
  .replace(WATCHDOG, () => `<script id="boot-watchdog">${readFileSync('packages/plassa/src/boot-watchdog.js', 'utf8')}</script>`)
  .replace('<!-- mula-load -->', () => readFileSync('packages/plassa/src/mula-load.html', 'utf8').trim()) } };
// Keep playtests intact until a manual reload; file watching still invalidates cached modules.
export default defineConfig({ define: { __APP_VERSION__: JSON.stringify(version), __APP_BUILD__: JSON.stringify(build) }, build: { rollupOptions: { input: pages } }, server: { https, hmr: false }, plugins: [jocsPage, musicEditor(), bestiariMedia(), bouTimeline(), unreleasedFigure(UNRELEASED_IDS), buildStamp] }); // dev-only backends; buildStamp: the build's /version.json
