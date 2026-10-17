// Preview integration without a browser: real dance/data, a capture rig and controllable media/performance clocks.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import * as dance from '../src/game/aliga-dance.js';

const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const song = read('../src/game/aliga-song.json'), timeline = read('../src/game/aliga-dance.json');
const source = readFileSync(new URL('../src/dev/aliga-preview.js', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replace(/^export /gm, '').replace(/\bimport\(/g, '__load(');
const near = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} ~= ${b}`);
async function boot(query, model = null) {
  let now = 1000, loads = 0, applied = null, poseRef = null, setting = null, playCalls = 0, rejectPlay = false;
  const handlers = new Map(), media = [], added = [], styles = [], classes = [];
  const root = () => ({ visible: true, position: { set(...v) { this.value = v; } }, rotation: { y: 0 } });
  const rig = { root: root(), aligons: [0, 1, 2].map(() => ({ root: root() })) };
  class Audio {
    constructor(url) { this.src = url; this.currentTime = 0; this.paused = true; this.events = {}; media.push(this); }
    addEventListener(type, fn) { this.events[type] = fn; }
    pause() { this.paused = true; }
    play() {
      playCalls++;
      if (rejectPlay) return Promise.reject(new Error('NotAllowedError'));
      this.paused = false; return Promise.resolve();
    }
  }
  const fakeModel = { NEUTRAL: dance.standFeet(dance.newAligaPose()), buildAligaRig: () => rig,
    applyAligaPose: (_, p) => { poseRef = p; applied = structuredClone(p); } };
  const modules = { '../scene/models/aliga.js': model ?? fakeModel, '../game/aliga-dance.js': dance,
    '../game/aliga-song.json': { default: song }, '../game/aliga-dance.json': { default: timeline } };
  const ctx = vm.createContext({ Q: new URLSearchParams(query), TAU: Math.PI * 2, FRONT: 0.8,
    scene: { add: r => added.push(r) }, mula: { root: root() }, G: { state: 'splash' },
    M: { pos: { x: 2, y: 3 }, pivot: { x: 4, y: 5 } },
    engine: { out: { gain: { value: 0.8 } }, music: { gain: { value: 1 } } },
    setMenuMusic: value => { setting = value; }, performance: { now: () => now }, Audio, structuredClone,
    document: { createElement: () => ({}), head: { append: el => styles.push(el) },
      body: { classList: { add: name => classes.push(name) } } },
    window: { addEventListener: (type, fn, opts) => handlers.set(type, { fn, opts }) },
    __load: async p => { loads++; return modules[p]; },
  });
  vm.runInContext(source, ctx);
  await new Promise(resolve => setImmediate(resolve));
  const tick = () => vm.runInContext('aligaTick(19)', ctx);
  const event = (type, trusted = true) => {
    let stopped = false, prevented = false;
    handlers.get(type)?.fn({ type, isTrusted: trusted, cancelable: true,
      stopImmediatePropagation() { stopped = true; }, preventDefault() { prevented = true; } });
    return { stopped, prevented };
  };
  return { ctx, tick, event, handlers, media, added, styles, classes, get debug() { return ctx.window.__aligaPreview; },
    get loads() { return loads; }, get setting() { return setting; }, get applied() { return applied; },
    get poseRef() { return poseRef; }, get rig() { return model ? added[0] : rig; },
    get playCalls() { return playCalls; }, reject: v => { rejectPlay = v; }, advance: ms => { now += ms; } };
}

const off = await boot('mute'); off.tick();
assert.equal(off.loads, 0); assert.equal(off.debug, undefined); assert.equal(off.handlers.size, 0);
assert.equal(off.ctx.mula.root.visible, true); assert.equal(off.setting, null);
assert.equal(off.ctx.engine.out.gain.value, 0.8);
assert.equal(off.styles.length, 0); assert.equal(off.classes.length, 0);

const muted = await boot('mute&aliga');
assert.equal(muted.debug.ready, true); assert.equal(muted.debug.error, null); assert.equal(muted.debug.mode, 'dance');
assert.equal(muted.debug.clock, 'performance'); assert.equal(muted.media.length, 0); assert.equal(muted.setting, false);
assert.deepEqual(muted.classes, ['aliga-preview']); assert(muted.styles[0].textContent.includes('#hud'));
assert(muted.styles[0].textContent.includes('#viewmode')); assert(!muted.styles[0].textContent.includes('#loader'));
const sharedPose = muted.poseRef;
muted.advance(23125); muted.tick(); near(muted.debug.time, 23.125);
assert.deepEqual(muted.applied, dance.aligaPose(23.125, song, timeline));
assert.equal(muted.poseRef, sharedPose, 'one reused output pose');
assert.deepEqual(muted.rig.root.position.value, [0, 0, 0]);
muted.ctx.M.pos.x = 100; muted.ctx.M.pivot.y = -100; muted.tick();
assert.deepEqual(muted.rig.root.position.value, [0, 0, 0], 'planted rig ignores the hidden demo');
assert.equal(muted.ctx.engine.out.gain.value, 0); assert.equal(muted.ctx.engine.music.gain.value, 0);
muted.debug.seek(0); muted.debug.seek(null); muted.advance((song.duration + 2.25) * 1000); muted.tick(); near(muted.debug.time, song.end);
muted.event('click', false); near(muted.debug.time, song.end);
muted.event('click'); near(muted.debug.time, 0); muted.advance(1000); near(muted.debug.time, 1);
muted.debug.seek(0); muted.debug.seek(null); muted.advance((song.end + 0.4) * 1000); muted.tick(); near(muted.debug.time, song.end);
muted.advance((song.duration - song.end - 0.4 + 0.1) * 1000); muted.tick(); near(muted.debug.time, song.end);
muted.debug.seek(47); const frozen = muted.applied; muted.advance(10000); muted.tick();
assert.deepEqual(muted.applied, frozen); near(muted.debug.time, 47);
muted.debug.seek(null); muted.advance(2000); muted.tick(); near(muted.debug.time, 49);
for (const [value, expected] of [[-5, 0], [song.end + 100, song.end], [NaN, 0]]) {
  muted.debug.seek(value); near(muted.debug.time, expected);
}
for (const type of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup', 'touchend']) {
  assert.equal(muted.handlers.get(type).opts.capture, true);
  assert.deepEqual(muted.event(type), { stopped: true, prevented: true });
  assert.equal(muted.ctx.G.state, 'splash', 'preview input never reaches gameplay');
}
for (const [value, expected] of [['23.125', 23.125], ['-1', 0], ['bad', 0], ['99999', song.end]]) {
  const held = await boot(`mute&aliga&aligat=${value}`); held.advance(2000); held.tick();
  near(held.debug.time, expected); assert.equal(held.debug.frozen, true);
}
for (const mode of ['turntable', '90', 'bow']) {
  const inspection = await boot(`mute&aliga=${mode}&view=front&aligat=12`);
  assert.equal(inspection.debug.ready, true); assert.equal(inspection.media.length, 0);
  inspection.tick();
  if (mode === 'bow') {
    near(inspection.applied.aliga.pitch, 1.15); assert(inspection.applied.aligons.every(g => g.crouch === 1));
  } else {
    assert(inspection.rig.aligons.every(g => !g.root.visible));
    near(inspection.rig.root.rotation.y, mode === '90' ? Math.PI / 2 : Math.PI);
  }
}

// Resuming a turntable seek must stay on its own clock on every following frame.
const turn = await boot('mute&aliga=turntable&aligat=12');
turn.debug.seek(null); turn.tick(); near(turn.rig.root.rotation.y, Math.PI);
turn.advance(1000); turn.tick(); near(turn.rig.root.rotation.y, 13 * Math.PI * 2 / 24);
turn.advance(song.duration * 1000); turn.tick();
near(turn.rig.root.rotation.y, (13 + song.duration) * Math.PI * 2 / 24);

// Simulated HTMLAudioElement only: no browser, device or audible output is opened by this test.
const audible = await boot('aliga'), audio = audible.media[0];
assert.equal(audible.debug.clock, 'audio'); assert.equal(audio.src, song.audio); assert.equal(audio.loop, false);
assert.equal(audible.playCalls, 0, 'no autoplay attempt'); audible.advance(5000); near(audible.debug.time, 0);
audible.event('click', false); assert.equal(audible.playCalls, 0, 'synthetic clicks cannot start audio');
audible.reject(true); audible.event('click'); await new Promise(resolve => setImmediate(resolve));
assert.equal(audio.paused, true); audible.reject(false); audible.event('keydown'); assert.equal(audio.paused, false);
audio.currentTime = 75.25; audible.advance(10000); audible.tick(); near(audible.debug.time, 75.25);
assert.deepEqual(audible.applied, dance.aligaPose(75.25, song, timeline));
audible.debug.seek(19); assert.equal(audio.paused, true); near(audio.currentTime, 19);
const plays = audible.playCalls; audible.event('click'); assert.equal(audible.playCalls, plays, 'a frozen seek stays silent');
audible.debug.seek(null); assert.equal(audio.paused, true); audible.event('click'); assert.equal(audio.paused, false);
const heldAudio = await boot('aliga&aligat=90'); heldAudio.media[0].events.loadedmetadata(); near(heldAudio.media[0].currentTime, Math.min(90, song.end));
heldAudio.event('click'); assert.equal(heldAudio.playCalls, 0);
audio.events.error(); assert(audible.debug.error); audible.event('pagehide'); assert.equal(audio.paused, true);
console.log('aliga preview clocks, seeks, static modes, lazy loading and input/audio isolation ok');

// Integration gate: the real model must consume the dance's current pose schema.
const actual = await boot('mute&aliga&aligat=47', await import('../src/scene/models/aliga.js'));
assert.equal(actual.debug.error, null, `real rig rejected the dance pose: ${actual.debug.error}`);
assert.equal(actual.debug.ready, true);
actual.rig.updateMatrixWorld(true);
actual.rig.traverse(o => assert(o.matrixWorld.elements.every(Number.isFinite), `finite transform for ${o.name || o.type}`));
console.log('aliga preview real rig pose API ok');

// Exercise the actual preview camera against posed vertices, including narrow screens and the held ending.
const model = await import('../src/scene/models/aliga.js'), point = new THREE.Vector3();
for (const [width, height] of [[375, 667], [393, 852], [667, 375], [1280, 800]]) {
  for (const view of ['front', 'back', 'side', 'left', 'top', 'low']) {
    const page = await boot(`mute&aliga&view=${view}&aligaseed=1991`, model);
    const camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 100);
    page.ctx.previewCamera = camera;
    for (const time of [0, 5, 10, 20, 30, 45, 60, 80, song.end]) {
      page.debug.seek(time); page.rig.updateMatrixWorld(true);
      vm.runInContext('aligaFrameCamera(previewCamera)', page.ctx); camera.updateMatrixWorld(true);
      page.rig.traverse(mesh => {
        if (!mesh.isMesh) return;
        const positions = mesh.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).project(camera);
          assert(Math.abs(point.x) < 0.98 && Math.abs(point.y) < 0.98 && point.z > -1 && point.z < 1,
            `framing ${width}x${height}/${view} at ${time}: ${point.toArray()}`);
        }
      });
    }
  }
}
console.log('aliga preview actual-vertex framing: 4 viewports × 6 views × 9 times ok');
