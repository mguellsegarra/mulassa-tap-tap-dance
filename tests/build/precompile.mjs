// Entry must not make the first texture pay a synchronous GPU capability query.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const calls = [];
let cached = false;
const renderer = {
  capabilities: { getMaxAnisotropy() { if (!cached) { calls.push('driver-query'); cached = true; } return 8; } },
  compileAsync() { calls.push('compile'); return Promise.resolve(); },
};
const source = readFileSync(new URL('../../src/scene/precompile.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replaceAll('export function', 'function');
const ctx = vm.createContext({ renderer, scene: {}, camera: {}, balloonFx: null, dracWarm() {}, Promise });
vm.runInContext(source, ctx);
await vm.runInContext('precompile()', ctx);
assert.deepEqual(calls, ['driver-query', 'compile'], 'the driver limit is cached before scene compilation under the loader');
renderer.capabilities.getMaxAnisotropy(); // the later image's callback
assert.equal(calls.filter(c => c === 'driver-query').length, 1, 'first image uses the cached limit');
await vm.runInContext('precompile()', ctx);
assert.equal(calls.filter(c => c === 'driver-query').length, 1, 'quality warmup reuses the capability cache');
console.log('precompile: GPU texture capability cached before first-use entry ok');

// Removing the early query must make the ordering assertion fail for the intended reason.
const oldCtx = vm.createContext({ renderer: { ...renderer, compileAsync() { return Promise.resolve(); } }, scene: {}, camera: {}, balloonFx: null, dracWarm() {}, Promise });
vm.runInContext(source.replace('renderer.capabilities.getMaxAnisotropy();', ''), oldCtx);
cached = false; calls.length = 0;
await vm.runInContext('precompile()', oldCtx);
assert.notEqual(calls[0], 'driver-query', 'the old warmup leaves the synchronous query to the first texture');

// At boot (quad) everything is drawn once, hidden and empty objects too, and left as it was; a quality step's warm-up draws nothing.
{
  const objs = [{ visible: false, frustumCulled: true }, { visible: true, isInstancedMesh: true, count: 0, frustumCulled: false }, { visible: true, isInstancedMesh: true, count: 7, frustumCulled: true }];
  const seen = [], before = JSON.stringify(objs);
  const r = { ...renderer, getRenderTarget: () => null, setRenderTarget() {}, compileAsync: () => Promise.resolve(), render() { seen.push(objs.map(o => [o.visible, o.count ?? null, o.frustumCulled])); } };
  const c = vm.createContext({ renderer: r, scene: { traverse: fn => objs.forEach(fn) }, camera: {}, balloonFx: null, dracWarm() {}, Promise,
    THREE: { WebGLRenderTarget: class { dispose() {} } }, heroQuadMake: () => ({ scene: {}, cam: {} }) });
  vm.runInContext(source, c);
  await vm.runInContext('precompile()', c); await vm.runInContext('precompile(true)', c);
  assert.equal(seen.length, 0, 'compiling draws nothing: a quality step is on screen, and the boot links its programs first');
  vm.runInContext('warmDraw()', c);
  assert.deepEqual(seen, [[[true, null, false], [true, 1, false], [true, 7, false]]], 'the boot draws every object once: shown, one instance at least, not culled');
  assert.equal(JSON.stringify(objs), before, 'and puts each one back');
  assert.match(readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8'), /linkPrograms\(renderer\.info\.programs, \{[^}]*\}\); \}\)\.then\(\(\) => \{ if \(loader\.covering\) warmDraw\(\); \}\)/, 'the boot draws it after linking, and only under the cover');
  console.log('precompile: the boot warm-up draws the whole scene once and restores it ok');
}
