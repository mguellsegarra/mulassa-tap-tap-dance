// The shape of src/: every import resolves, no module imports its way back to itself, and no file grows into a monolith again.
// (A cycle would also change what evaluates first, and the vm-based tests would not notice.)
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');
const MAIN_MAX = 400, MODULE_MAX = 300;
const files = [];
const walk = dir => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } };
walk(root);

const IMPORT = /^(?:import|export)\s[^;]*?from\s+'(\.[^']+)'|^import\s+'(\.[^']+)'/gm;
const deps = new Map();
for (const f of files) {
  const list = [];
  for (const m of readFileSync(f, 'utf8').matchAll(IMPORT)) {
    const spec = m[1] ?? m[2], target = resolve(dirname(f), spec);
    assert(existsSync(target), `${relative(root, f)} imports ${spec}, which does not exist`);
    if (target.endsWith('.js')) list.push(target);
  }
  deps.set(f, list);
}

// no cycles (depth-first, reporting the path)
const state = new Map(); // 1 = on the stack, 2 = done
const path = [];
const visit = f => {
  if (state.get(f) === 2) return;
  assert.notEqual(state.get(f), 1, `import cycle: ${[...path.slice(path.indexOf(f)), f].map(p => relative(root, p)).join(' -> ')}`);
  state.set(f, 1); path.push(f);
  for (const d of deps.get(f) ?? []) visit(d);
  path.pop(); state.set(f, 2);
};
files.forEach(visit);

// core/ is the leaf everyone imports: it reaches outside itself only through these two (docs/architecture.md)
const CORE_OUT = new Set(['core/anim.js', 'core/timing.js']);
for (const f of files.filter(f => relative(root, f).startsWith('core/') && !CORE_OUT.has(relative(root, f))))
  for (const d of deps.get(f)) assert(relative(root, d).startsWith('core/'), `${relative(root, f)} imports ${relative(root, d)}: core/ must stay a leaf`);
// game/'s rules and state never reach the drawing or the DOM (flow.js and judge.js orchestrate the run, so they may);
// the low layers reach a figure's scene objects through figures/objects.js, never one figure's *-objects.js
const reaches = (f, dir) => (deps.get(f) ?? []).map(d => relative(root, d)).filter(d => d.startsWith(dir));
for (const f of files.filter(f => relative(root, f).startsWith('game/') && !/\/(flow|judge)\.js$/.test(f)))
  assert.deepEqual(['hud/', 'scene/', 'ui/'].flatMap(dir => reaches(f, dir)), [], `${relative(root, f)}: game rules and state import no hud/, scene/ or ui/`);
for (const name of ['scene/stage.js', 'scene/quality.js', 'scene/crowd-build.js'])
  assert.deepEqual(reaches(join(root, name), 'figures/').filter(d => /-objects\.js$/.test(d)), [], `${name} goes round figures/objects.js, not one figure's objects`);

for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n').length, name = relative(root, f);
  assert(lines <= (name === 'main.js' ? MAIN_MAX : MODULE_MAX), `${name} has ${lines} lines (max ${name === 'main.js' ? MAIN_MAX : MODULE_MAX}): split it by responsibility`);
}
console.log(`module graph ok: ${files.length} files, no import cycles, main.js ${readFileSync(join(root, 'main.js'), 'utf8').split('\n').length} lines`);
