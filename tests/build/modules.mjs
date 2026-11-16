// The shape of src/ and of Plassa (packages/plassa/src, imported as #plassa/*): every import resolves, no module imports its way back to itself, and no file grows into a monolith again.
// (A cycle would also change what evaluates first, and the vm-based tests would not notice.)
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');
const MAIN_MAX = 400, MODULE_MAX = 300;
const files = [];
const walk = dir => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } };
walk(root);
const PLASSA = resolve(root, '../packages/plassa/src');
walk(PLASSA);
const rel = f => (f.startsWith(PLASSA) ? `plassa/${relative(PLASSA, f)}` : relative(root, f)); // Plassa's files as plassa/<file>

const IMPORT = /^(?:import|export)\s[^;]*?from\s+'(\.[^']+|#plassa\/[^']+)'|^import\s+'(\.[^']+|#plassa\/[^']+)'/gm;
const deps = new Map();
for (const f of files) {
  const list = [];
  for (const m of readFileSync(f, 'utf8').matchAll(IMPORT)) {
    const spec = m[1] ?? m[2], path = spec.split('?')[0]; // Vite's ?raw names the same file
    const target = path.startsWith('#plassa/') ? join(PLASSA, path.slice(8)) : resolve(dirname(f), path);
    assert(existsSync(target), `${rel(f)} imports ${spec}, which does not exist`);
    if (target.endsWith('.js')) list.push(target);
  }
  deps.set(f, list);
}

// no cycles (depth-first, reporting the path)
const state = new Map(); // 1 = on the stack, 2 = done
const path = [];
const visit = f => {
  if (state.get(f) === 2) return;
  assert.notEqual(state.get(f), 1, `import cycle: ${[...path.slice(path.indexOf(f)), f].map(p => rel(p)).join(' -> ')}`);
  state.set(f, 1); path.push(f);
  for (const d of deps.get(f) ?? []) visit(d);
  path.pop(); state.set(f, 2);
};
files.forEach(visit);

// core/ is the leaf everyone imports: it reaches outside itself only through these two (docs/architecture.md)
const CORE_OUT = new Set(['core/anim.js', 'core/timing.js']);
for (const f of files.filter(f => rel(f).startsWith('core/') && !CORE_OUT.has(rel(f))))
  for (const d of deps.get(f)) assert(rel(d).startsWith('core/'), `${rel(f)} imports ${rel(d)}: core/ must stay a leaf`);
// game/'s rules and state never reach the drawing or the DOM (flow.js, judge.js and tick.js orchestrate the run, so they may);
// the low layers reach a figure's scene objects through figures/objects.js, never one figure's *-objects.js
const reaches = (f, dir) => (deps.get(f) ?? []).map(d => rel(d)).filter(d => d.startsWith(dir));
for (const f of files.filter(f => rel(f).startsWith('game/') && !/\/(flow|judge|tick)\.js$/.test(f)))
  assert.deepEqual(['hud/', 'scene/', 'ui/'].flatMap(dir => reaches(f, dir)), [], `${rel(f)}: game rules and state import no hud/, scene/ or ui/`);
// the src/ files that are only `export * from '#plassa/<same name>.js'`: the one way mulassa.cat reaches Plassa so far (one copy to fix, not two)
const THIN = new Set([
  'platform/render-quality.js', 'ui/badge-tip.js', 'platform/boot.js', 'platform/double-tap.js',
  'ui/focus.js', 'platform/haptics.js', 'platform/storage.js', 'services/update-rules.js',
  'services/errors.js', 'services/sentry-load.js', 'services/update-watch.js', 'i18n/locale.js',
]);
for (const n of THIN) assert.equal(
  readFileSync(join(root, n), 'utf8').split('\n').filter(l => l && !l.startsWith('//')).join(),
  `export * from '#plassa/${n.split('/')[1]}';`, `${n} must stay a one-line re-export of the Plassa module`,
);
// Plassa, the games' shared base (packages/plassa/README.md): it reaches outside itself only for src/core/;
// mulassa.cat uses thin re-exports and the shared audio-wake contract; a game never imports another game
for (const f of files) {
  const from = rel(f), game = from.match(/^jocs\/games\/([^/]+)\//)?.[1];
  for (const to of deps.get(f).map(d => rel(d))) {
    if (from.startsWith('plassa/')) assert(/^(plassa|core)\//.test(to), `${from} imports ${to}: Plassa imports only itself and src/core/`);
    else if (!from.startsWith('jocs/') && !THIN.has(from)) {
      const sharedWake = to === 'plassa/audio-wake.js' && ['platform/audio.js', 'ui/audio-resume.js'].includes(from);
      assert(sharedWake || !/^(jocs|plassa)\//.test(to), `${from} imports ${to}: use a declared shared contract`);
    }
    const other = to.match(/^jocs\/games\/([^/]+)\//)?.[1];
    if (game && other) assert.equal(other, game, `${from} imports ${to}: a game never imports another game`);
  }
}
// the layers below never import the ones above (docs/architecture.md); a ratchet: the known wrong-way edges are listed
// with their reason, so a new one fails here instead of hardening into the graph
const FORBID = {
  i18n: ['game', 'scene', 'hud', 'ui', 'services', 'figures', 'dev'],
  platform: ['game', 'scene', 'hud', 'ui', 'services', 'figures', 'dev'],
  services: ['scene', 'hud', 'ui', 'figures', 'dev'],
  figures: ['hud', 'ui', 'services', 'dev'],
  scene: ['ui', 'services', 'dev'],
  hud: ['ui', 'services', 'dev'],
};
const ALLOWED_UP = new Set(['services/errors.js', 'figures/index.js']); // any importer: the crash reporter every layer calls; the traits table is data with no imports
const ALLOWED_EDGES = new Set(`hud/balloon.js>ui/handles.js hud/draw.js>ui/handles.js hud/results.js>ui/sheets.js hud/results.js>services/share.js hud/share-card.js>services/share.js`.split(' ')); // the HUD reads the DOM handles and builds the share text
for (const f of files) {
  const from = rel(f);
  for (const d of deps.get(f)) {
    const to = rel(d), dir = to.split('/')[0];
    if (FORBID[from.split('/')[0]]?.includes(dir) && !ALLOWED_UP.has(to) && !ALLOWED_EDGES.has(`${from}>${to}`)) assert.fail(`${from} imports ${to}: ${from.split('/')[0]}/ must not reach ${dir}/ (docs/architecture.md)`);
  }
}
for (const name of ['scene/stage.js', 'scene/quality.js', 'scene/crowd-build.js'])
  assert.deepEqual(reaches(join(root, name), 'figures/').filter(d => /-objects\.js$/.test(d)), [], `${name} goes round figures/objects.js, not one figure's objects`);

for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n').length, name = rel(f);
  assert(lines <= (name === 'main.js' ? MAIN_MAX : MODULE_MAX), `${name} has ${lines} lines (max ${name === 'main.js' ? MAIN_MAX : MODULE_MAX}): split it by responsibility`);
}
// Line length: the line cap above is met by structure, not by joining statements, so a ratchet on long lines. LONG = 200 characters
// leaves the 427 worst lines (160 would flag 1250 and drown the signal; src/scene/cameras.js has one of 894).
// long-lines.json is the baseline {file: count of lines over LONG}: a file may not gain long lines, a new file starts at 0; fixing
// lines is always allowed. After fixing some, tighten it with: UPDATE_LONG_LINES=1 node tests/build/modules.mjs
const LONG = 200, BASE_FILE = join(dirname(fileURLToPath(import.meta.url)), 'long-lines.json');
const long = {};
for (const f of files) { const n = readFileSync(f, 'utf8').split('\n').filter(l => l.length > LONG).length; if (n) long[rel(f)] = n; }
const sorted = o => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
if (process.env.UPDATE_LONG_LINES) writeFileSync(BASE_FILE, JSON.stringify(sorted(long), null, 1) + '\n');
const base = JSON.parse(readFileSync(BASE_FILE, 'utf8'));
for (const [name, n] of Object.entries(long)) assert(n <= (base[name] ?? 0), `${name} has ${n} lines over ${LONG} characters (baseline ${base[name] ?? 0}): split the statement, do not join lines`);
console.log(`module graph ok: ${files.length} files, no import cycles, main.js ${readFileSync(join(root, 'main.js'), 'utf8').split('\n').length} lines`);
