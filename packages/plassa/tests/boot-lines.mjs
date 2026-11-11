// The boot screen's lines come in the player's language: the lookup must hit the glob's real keys, or every player reads Catalan.
// Run through Vite (import.meta.glob is its feature), as the build does.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../../../', import.meta.url));
// its own cache folder and no dependency scan: the shared node_modules/.vite is a running dev server's, and touching it breaks that page
const vite = await createServer({ root, configFile: false, logLevel: 'silent', cacheDir: mkdtempSync(join(tmpdir(), 'plassa-vite-')), optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
try {
  const { bootChunk } = await vite.ssrLoadModule('/packages/plassa/src/boot-lines.js');
  const { LANGS } = await vite.ssrLoadModule('/packages/plassa/src/locale.js');
  const file = l => JSON.parse(readFileSync(`${root}src/i18n/locales/${l}/boot.json`, 'utf8'));
  assert(LANGS.length > 1 && file('en')['boot.joke.brigada'] !== file('ca')['boot.joke.brigada'], 'the languages differ, or this test proves nothing');
  for (const l of LANGS) assert.deepEqual((await bootChunk(l)()).default, file(l), `${l}: its own lines, not Catalan's`);
  assert.deepEqual((await bootChunk('xx')()).default, file('ca'), 'a language with no file: Catalan');
} finally { await vite.close(); }
console.log('boot lines: every released language reads its own lines ok');
