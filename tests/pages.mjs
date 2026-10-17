import assert from 'node:assert/strict';
import { readPage } from './page.mjs';
import { mkdtemp, mkdir, writeFile, access, rm, symlink, open, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preparePages } from '../tools/prepare-pages.mjs';
import { pagesDeployNeeded } from '../tools/pages-deploy-needed.mjs';

const pkg = { version: '1.1.0', scripts: { build: 'vite build', check: 'node check.mjs' }, dependencies: { three: '1' } };
const backupOnly = { ...pkg, scripts: { ...pkg.scripts, check: 'node check.mjs && node tests/db-backup.mjs' } };
const backupFiles = ['.github/workflows/db-backup.yml', '.github/workflows/deploy-pages.yml', '.gitignore',
  'README.md', 'package.json', 'docs/db-backup.md', 'tests/db-backup.mjs', 'tests/db_backup_test.py',
  'tools/db_backup.py', 'tools/db-backup-requirements.txt', 'tools/pages-deploy-needed.mjs'];
assert.equal(pagesDeployNeeded(backupFiles, { beforePackage: pkg, afterPackage: backupOnly }), false);
assert.equal(pagesDeployNeeded(['.github/workflows/deploy-pages.yml']), false);
assert.equal(pagesDeployNeeded(['tests/pages.mjs', 'docs/example.md']), false);
for (const path of ['src/main.js', 'public/_headers', 'index.html', 'package-lock.json', '.node-version',
  'vite.config.js', 'tools/seo-pages.mjs', 'tools/prepare-pages.mjs', 'new-build-input.js']) {
  assert.equal(pagesDeployNeeded([...backupFiles, path], { beforePackage: pkg, afterPackage: backupOnly }), true, path);
}
for (const afterPackage of [{ ...pkg, version: '1.2.0' }, { ...pkg, dependencies: { three: '2' } },
  { ...pkg, scripts: { ...pkg.scripts, build: 'vite build --mode new' } }]) {
  assert.equal(pagesDeployNeeded(['package.json'], { beforePackage: pkg, afterPackage }), true);
}
assert.equal(pagesDeployNeeded(['package.json']), true, 'unknown package content fails toward deploying');
assert.equal(pagesDeployNeeded([], { manual: true }), true, 'manual dispatch always deploys');
assert.equal(pagesDeployNeeded([], { unknownBase: true }), true, 'unknown base cannot hide a game update');
const deployWorkflow = await readFile(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
assert.match(deployWorkflow, /needs: changes\n    if: needs\.changes\.outputs\.deploy == 'true'/);
assert.match(deployWorkflow, /DEPLOY_BASE_SHA: \$\{\{ github\.event\.before \}\}/);
console.log('Pages deployment change detection ok');

const song = { audio: 'music/main.mp3?v=abc123', ambient: 'music/menu.mp3?v=def456' };
const files = ['index.html', '404.html', '_headers', 'favicon.ico', 'favicon-32.png', 'apple-touch-icon.png',
  'icon-512.png', 'manifest.webmanifest', 'og.jpg', 'assets/index-abc.js', 'music/main.mp3', 'music/menu.mp3',
  'music/mulassa-taiko.wav', 'music/mulassa-taiko.mid', '.DS_Store'];
const root = await mkdtemp(join(tmpdir(), 'mulassa-pages-'));
async function fixture(name) {
  const folder = join(root, name);
  for (const file of files) {
    await mkdir(join(folder, file, '..'), { recursive: true });
    await writeFile(join(folder, file), file);
  }
  return folder;
}
try {
  // A client requiring a new schema must never reach Pages before its migration succeeds.
  const deployWorkflow = await readFile(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
  const migrationWorkflow = await readFile(new URL('../.github/workflows/supabase-migrations.yml', import.meta.url), 'utf8');
  assert.match(deployWorkflow, /  migrate:\n    uses: \.\/\.github\/workflows\/supabase-migrations\.yml/);
  assert.match(deployWorkflow, /  deploy:\n    needs: migrate\n/);
  assert(!/if:.*(?:always\(|failure\(|cancelled\()/.test(deployWorkflow), 'deployment cannot bypass a failed migration');
  assert.match(migrationWorkflow, /  workflow_call:\n    secrets:\n      SUPABASE_DB_PASSWORD:\n        required: true/);
  assert(!/  push:/.test(migrationWorkflow), 'one migration run per deployment, rather than a parallel push trigger');
  assert.match(migrationWorkflow, /supabase db push --db-url/);
  const valid = await fixture('valid');
  const result = await preparePages(valid, song);
  assert(result.includes('404.html'), 'ship the root 404 to disable the SPA fallback');
  assert(result.includes('music/main.mp3'));
  assert(!result.includes('music/mulassa-taiko.wav'));
  await assert.rejects(access(join(valid, 'music/mulassa-taiko.wav')));
  for (const unexpected of ['_worker.js', '.env', 'functions/api.js', 'music/private.wav']) {
    const folder = await fixture(unexpected.replaceAll('/', '-'));
    await mkdir(join(folder, unexpected, '..'), { recursive: true });
    await writeFile(join(folder, unexpected), 'unexpected');
    await assert.rejects(preparePages(folder, song), /Unexpected deployment file/);
    await access(join(folder, 'music/mulassa-taiko.wav')); // Validation fails before trimming.
  }
  const missing = await fixture('missing');
  await rm(join(missing, 'music/main.mp3'));
  await assert.rejects(preparePages(missing, song), /Missing deployment file/);
  const missing404 = await fixture('missing-404');
  await rm(join(missing404, '404.html'));
  await assert.rejects(preparePages(missing404, song), /Missing deployment file: 404\.html/);
  const notFound = await readFile(new URL('../public/404.html', import.meta.url), 'utf8');
  assert.match(notFound, /<html lang="ca">/);
  assert.match(notFound, /<meta name="robots" content="noindex">/);
  assert.match(notFound, /href="\/"/);
  assert.match(notFound, /href="\/projecte\/"/);
  assert(!/<script\b|http-equiv="refresh"/i.test(notFound), 'the 404 must not load or redirect to the game');
  await assert.rejects(preparePages(missing, { ...song, audio: 'https://example.com/main.mp3' }),
    /Expected local content-versioned MP3/);
  const linked = await fixture('symlink');
  await symlink(join(linked, 'index.html'), join(linked, 'assets/link.js'));
  await assert.rejects(preparePages(linked, song), /Symlink in deployment/);
  const oversized = await fixture('oversized');
  const handle = await open(join(oversized, 'music/main.mp3'), 'w');
  await handle.truncate(25 * 1024 * 1024 + 1);
  await handle.close();
  await assert.rejects(preparePages(oversized, song), /Pages file size exceeded/);
  console.log('Pages deployment contracts ok');

  // public/_headers: hashed assets and versioned music cached for a year, the page always revalidated.
  const rules = {};
  let rule = null;
  for (const line of (await readFile(new URL('../public/_headers', import.meta.url), 'utf8')).split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (!/^\s/.test(line)) rules[rule = line.trim()] = {};
    else { const [k, ...v] = line.trim().split(':'); rules[rule][k.toLowerCase()] = v.join(':').trim(); }
  }
  for (const path of ['/assets/*', '/music/*']) {
    assert.match(rules[path]?.['cache-control'] ?? '', /max-age=31536000/, `${path} cached for a year`);
    assert.match(rules[path]['cache-control'], /immutable/);
  }
  for (const path of ['/', '/index.html']) assert.equal(rules[path]?.['cache-control'], 'no-cache', `${path} revalidates`);
  assert.equal(rules['/*']['cache-control'], undefined, 'no site-wide Cache-Control (Pages would merge it into every rule)');
  assert.equal(rules['/*']['x-content-type-options'], 'nosniff');
  assert.equal(rules['/*']['strict-transport-security'], 'max-age=31536000', 'HSTS for a year, never includeSubDomains');
  const real = JSON.parse(await readFile(new URL('../src/song.json', import.meta.url), 'utf8'));
  for (const url of [real.audio, real.ambient]) assert.match(url, /^music\/[\w-]+\.mp3\?v=[a-f0-9]+$/, 'immutable music needs a versioned URL');
  console.log('Pages cache headers ok');

  // index.html: the old Pages host redirects to mulassa.cat before anything else loads (path, ?repte=… and hash kept);
  // preview deployments and dev hosts stay where they are. No CSP in _headers may block the inline script.
  const html = readPage();
  const head = html.slice(0, html.indexOf('</head>'));
  const redirect = head.match(/<script>([^<]*mulassa-tap-tap-dance\.pages\.dev[^<]*)<\/script>/)?.[1];
  assert(redirect, 'inline redirect script in <head>');
  assert(head.indexOf(redirect) < Math.min(...['<style', '<link rel="preload"', 'type="module"'].map(s => head.indexOf(s)).filter(i => i >= 0)),
    'the redirect runs before styles, preloads and the bundle');
  assert.match(head, /<link rel="canonical" href="https:\/\/mulassa\.cat\/">/);
  assert(!Object.values(rules).some(r => /(script|default)-src/.test(r['content-security-policy'] ?? '')), 'no CSP that would block the inline redirect (frame-ancestors alone is fine)');
  assert(Object.values(rules).some(r => /frame-ancestors 'none'/.test(r['content-security-policy'] ?? '') && r['x-frame-options'] === 'DENY'), 'the game cannot be framed');
  const { runInNewContext } = await import('node:vm');
  const visit = (hostname, pathname = '/', search = '', hash = '') => {
    const location = { hostname, pathname, search, hash, replaced: null, replace(url) { this.replaced = url; } };
    runInNewContext(redirect, { location });
    return location.replaced;
  };
  assert.equal(visit('mulassa-tap-tap-dance.pages.dev', '/', '?repte=abc123&mute', '#x'), 'https://mulassa.cat/?repte=abc123&mute#x');
  assert.equal(visit('mulassa-tap-tap-dance.pages.dev', '/index.html'), 'https://mulassa.cat/index.html');
  for (const host of ['abc123.mulassa-tap-tap-dance.pages.dev', 'mulassa.cat', 'localhost', '192.168.1.20'])
    assert.equal(visit(host, '/', '?repte=abc123'), null, `${host} stays`);
  console.log('Canonical host redirect ok');
} finally {
  await rm(root, { recursive: true, force: true });
}
