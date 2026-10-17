// Boot quality (src/scene/stage.js): every page load starts from the hardware guess (software WebGL: minimal), whatever an
// older version left in localStorage; the adaptive drops (main.js) stay this session's and are never written back.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import * as THREE from 'three';
import { loadMainSource } from './load-main.mjs';
import * as rq from '../src/platform/render-quality.js';
import * as finalTest from '../src/dev/final-test.js';
import * as progress from '../src/game/progress.js';

const stageSource = loadMainSource(new URL('../src/scene/stage.js', import.meta.url).pathname);
const stubModel = () => ({ group: new THREE.Group(), root: new THREE.Group(), neck: { rotation: {} }, head: { rotation: {} }, jaw: { rotation: {} }, body: { rotation: {} }, ears: [] });
class Renderer {
  constructor(opts) { Renderer.opts = opts; this.shadowMap = {}; }
}
const boot = ({ saved = {}, software = false, nav = {}, blocked = false } = {}) => {
  const writes = [];
  const context = vm.createContext({
    THREE: { ...THREE, WebGLRenderer: Renderer }, ...rq, ...finalTest, ...progress, song: { bpm: 120, beats: [], sections: [], notes: [] }, probeRenderer: () => ({ renderer: software ? 'llvmpipe' : 'Apple GPU', vendor: '', caveat: software, probe: 'test' }),
    errors: { report() {}, start() {}, breadcrumb() {} }, errorName: String, buildPlaza: stubModel, buildMulassa: stubModel,
    localStorage: blocked ? new Proxy({}, { get() { throw new Error('storage blocked'); } }) : { getItem: k => saved[k] ?? null, setItem: (k, v) => writes.push([k, v]), removeItem: k => writes.push([k]) },
    navigator: { hardwareConcurrency: 8, deviceMemory: 8, ...nav }, matchMedia: () => ({ matches: true }), window: {},
    document: { getElementById: () => ({ addEventListener() {}, dataset: {} }), hidden: false, hasFocus: () => true }, location: { search: '' },
    performance: { now: () => 0 }, addEventListener() {}, URLSearchParams, screen: { width: 390, height: 844 }, innerWidth: 390, innerHeight: 844, devicePixelRatio: 3,
  });
  vm.runInContext(stageSource, context);
  return { level: vm.runInContext('qualityLevel', context), guess: vm.runInContext('qualityGuess', context), writes, context, antialias: Renderer.opts.antialias };
};

const base = boot();
assert(base.guess >= 1, `a capable phone guesses a high level (${base.guess})`);
for (const level of [-1, 0, 1]) {
  const old = boot({ saved: { 'render-quality': JSON.stringify({ level, at: Date.now(), visits: 3 }) } });
  assert.equal(old.level, base.level, `an old persisted level ${level} cannot lower the boot`);
  assert.equal(old.antialias, true, 'a hardware phone boots with MSAA despite its old quality');
  assert.equal(old.writes.length, 0, 'boot writes nothing back');
}
assert.equal(boot({ saved: { 'render-quality': '{bad' } }).level, base.level, 'a corrupt old value is just ignored');
assert.equal(boot({ software: true, saved: { 'render-quality': JSON.stringify({ level: 2 }) } }).level, -1, 'software WebGL stays minimal');
assert.equal(Renderer.opts.antialias, false, 'minimal boots without MSAA');
assert.equal(boot({ nav: { connection: { saveData: true } } }).level, rq.initialQuality({ mobile: true, cores: 8, memory: 8, saveData: true }), 'the saveData hint still lowers the guess');

// Storage may be unavailable; choosing the renderer must not depend on it.
assert.equal(boot({ blocked: true }).antialias, true, 'blocked storage still boots with MSAA');
console.log('boot quality ok');
