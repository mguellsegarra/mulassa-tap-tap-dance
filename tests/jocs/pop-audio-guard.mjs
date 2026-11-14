// Mulassa Pop's audio (src/jocs/games/pop/audio.js), the page's real module through Vite:
// - no Web Audio (a browser that refuses the context): the effects that read the music (hit, sprout, goodie, bell, unbell) are
//   silent no-ops; they used to throw in the frame, which killed the rAF chain;
// - a context that is not running (iOS with the music off) drops the steps it is given instead of queueing them against a
//   frozen clock, and the music joins where the audio clock is once it runs;
// - a resumed run cuts what was queued when it paused, before the 3, 2, 1 brings the sound back up.
import assert from 'node:assert/strict';
import { viteLoad } from './pop-ssr.mjs';
import { createConductor } from '../../src/jocs/games/pop/conductor.js';

const mem = new Map();
Object.assign(globalThis, {
  localStorage: { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) },
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  addEventListener() {},
  document: { hidden: false, hasFocus: () => true, addEventListener() {}, documentElement: {} },
  fetch: async () => ({ arrayBuffer: async () => new ArrayBuffer(0) }),
});
const { load, close } = await viteLoad();
const audio = await load('audio.js');
const { SFX } = audio;

{ // no AudioContext at all
  delete globalThis.AudioContext;
  audio.armAudio();
  audio.startMusic(createConductor(0), 'mulassa');
  for (const name of ['hit', 'sprout', 'goodie', 'bell', 'unbell', 'count', 'fire', 'combo', 'wrong', 'boom', 'ui']) assert.doesNotThrow(() => SFX[name](3), `SFX.${name} with no Web Audio`);
  assert.doesNotThrow(() => { audio.followGame(5); audio.slowMusic(true); audio.pauseMusic(); audio.resumeMusic(); audio.stopMusic(); audio.setMusicOn(false); audio.setMusicOn(true); });
}

// A context of nodes that take any call: what the test reads is when the oscillators start and which buses were cut.
const log = { starts: [], gains: 0, disconnects: 0 };
const node = (own = {}) => new Proxy(function () {}, {
  get: (_, p) => (p in own ? own[p] : typeof p === 'symbol' || p === 'then' ? undefined : (own[p] = p === 'connect' ? (to => to ?? node()) : p === 'disconnect' ? (() => { log.disconnects++; }) : node())),
  set: (_, p, v) => { own[p] = v; return true; },
  apply: () => node(),
});
class FakeContext {
  state = 'suspended'; currentTime = 0; sampleRate = 48000; destination = node();
  constructor() { FakeContext.last = this; }
  createGain() { log.gains++; return node(); }
  createOscillator() { return node({ start: t => log.starts.push(t) }); }
  createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  createBiquadFilter() { return node(); }
  createDynamicsCompressor() { return node(); }
  createDelay() { return node(); }
  createBufferSource() { return node(); }
}
{ // a context made broken (WebKit: sample rate 0, a NaN clock): the game goes on silent, it does not throw on every call
  let closed = 0;
  globalThis.AudioContext = class extends FakeContext {
    sampleRate = 0; currentTime = NaN; state = 'running';
    createBuffer() { throw new DOMException('Length must be at least 1.', 'NotSupportedError'); }
    close() { closed++; return Promise.resolve(); }
  };
  assert.doesNotThrow(() => { audio.startHomeMusic(); audio.armAudio(); audio.startMusic(createConductor(0), 'mulassa'); }, 'a broken context: no throw');
  for (const name of ['hit', 'sprout', 'bell', 'count', 'boom', 'ui']) assert.doesNotThrow(() => SFX[name](2), `SFX.${name} on a broken context`);
  assert.doesNotThrow(() => { audio.pauseMusic(); audio.resumeMusic(); audio.watchAudio(1000); audio.setMusicOn(true); });
  assert.ok(closed >= 1, 'the broken context is closed, not kept half-made');
  delete globalThis.AudioContext;
  Object.assign(log, { starts: [], gains: 0, disconnects: 0 });
}

globalThis.AudioContext = FakeContext;

const tune = createConductor(0);
tune.advance(4); // four seconds of the tune laid out, none taken yet
audio.armAudio(); // the context exists now, still suspended
audio.startMusic(tune, 'mulassa');
const ctx = FakeContext.last;
assert.equal(log.starts.length, 0, 'a context that is not running plays no step: they are dropped, not queued behind a frozen clock');
assert.equal(tune.take().length, 0, '…and they were taken: the conductor does not keep piling them up');

// it runs, ten seconds on, the game at 5 s: the music joins at the audio clock, not at the game's time
ctx.state = 'running'; ctx.currentTime = 10;
tune.advance(5.5);
audio.resumeMusic();
assert.ok(log.starts.length > 0, 'steps are played once it runs');
assert.ok(Math.min(...log.starts) >= 10 && Math.max(...log.starts) < 11, `the first notes sound just after the audio clock (${Math.min(...log.starts)}…${Math.max(...log.starts)}), not seconds before or after it`);

// a pause, the context suspended, then «Continua»: what was queued is cut before the sound comes back
audio.pauseMusic();
ctx.state = 'suspended';
const gains = log.gains, cuts = log.disconnects;
audio.armAudio();
assert.equal(log.gains, gains + 1, 'a fresh bus for the resumed run');
assert.equal(log.disconnects, cuts + 1, 'the old bus is cut off: its queued notes never sound in the 3, 2, 1');

audio.stopMusic();
await close();
console.log('pop-audio-guard: ok');
