// Bundle budget: the main JS chunk (three.js and the game) stays near its current gzip size. Builds into a temp dir
// (a few seconds); raise MAIN_GZIP_MAX only for a deliberate addition and record it in docs/agents/graphics.md.
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';

const MAIN_GZIP_MAX = 492_000; // measured 477,732 bytes (gzip -9) plus ~3%
const out = mkdtempSync(join(tmpdir(), 'mulassa-bundle-'));
try {
  await build({ root: fileURLToPath(new URL('../..', import.meta.url)), logLevel: 'silent', build: { outDir: out, emptyOutDir: true } });
  const assets = join(out, 'assets');
  const sizes = readdirSync(assets).filter(f => f.endsWith('.js')).map(f => [f, gzipSync(readFileSync(join(assets, f)), { level: 9 }).length]).sort((a, b) => b[1] - a[1]);
  const [name, size] = sizes[0];
  console.log(`bundle: main chunk ${name} ${size} bytes gzip (budget ${MAIN_GZIP_MAX})`);
  assert(size <= MAIN_GZIP_MAX, `main chunk ${size} bytes gzip exceeds ${MAIN_GZIP_MAX}`);
} finally { rmSync(out, { recursive: true, force: true }); }
