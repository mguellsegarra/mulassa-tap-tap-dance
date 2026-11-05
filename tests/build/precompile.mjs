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
const source = readFileSync(new URL('../../src/scene/precompile.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace('export function', 'function');
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
