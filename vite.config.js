import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// The build's version, shown in Configuració and sent with feedback and crash reports (src/core/version.js):
// MAJOR.MINOR from package.json (bumped by hand for a milestone), PATCH = commits on HEAD, +short sha. CI checks out the full history.
const { version: pkg } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const git = cmd => { try { return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };
const version = `${pkg.split('.').slice(0, 2).join('.')}.${git('rev-list --count HEAD') || 0}`;
const build = `${version}+${git('rev-parse --short=7 HEAD') || 'dev'}`;
// `DEV_HTTPS=1 npm run dev`: https on the LAN with a self-signed certificate (.cert/, gitignored; made once with `openssl req -x509 -newkey rsa:2048 -nodes -keyout .cert/dev.key -out .cert/dev.crt -subj /CN=mulassa-dev -addext subjectAltName=IP:<LAN-IP>`
// «?final»). Phones need a secure context for Web Share with files and the clipboard; http://192.168.x.x has neither.
const https = process.env.DEV_HTTPS ? { key: readFileSync('.cert/dev.key'), cert: readFileSync('.cert/dev.crt') } : undefined;
export default defineConfig({ define: { __APP_VERSION__: JSON.stringify(version), __APP_BUILD__: JSON.stringify(build) }, server: { https } });
