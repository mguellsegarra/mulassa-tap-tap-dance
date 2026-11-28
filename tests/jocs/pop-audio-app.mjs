// Mulassa Pop's effects in the app (src/jocs/games/pop/audio.js): the launcher has «Música» and «So» apart, so its music
// switch off leaves the taps' notes, blasts and 3, 2, 1 sounding; its sound switch off silences them. On the website ♪ stays
// one switch for all of it (tests/jocs/pop-audio-guard.mjs). The launcher's snapshot is stubbed (plassa native.js).
import assert from 'node:assert/strict';
import { viteLoad } from './pop-ssr.mjs';

const mem = new Map([['menu-music', 'off']]); // the launcher's music off (GameHost/GameSession write it)
Object.assign(globalThis, {
  localStorage: { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) },
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  addEventListener() {},
  document: { hidden: false, hasFocus: () => true, addEventListener() {}, documentElement: {} },
  fetch: async () => ({ arrayBuffer: async () => new ArrayBuffer(0) }),
});
const shell = { covers: ['music'], off: [] };
globalThis.__testShell = shell;
const { load, close } = await viteLoad({
  '#plassa/native.js': 'export const appCovers = w => globalThis.__testShell.covers.includes(w); export const appOff = w => globalThis.__testShell.off.includes(w);',
});

const starts = [];
const node = (own = {}) => new Proxy(function () {}, {
  get: (_, p) => (p in own ? own[p] : typeof p === 'symbol' || p === 'then' ? undefined : (own[p] = p === 'connect' ? (to => to ?? node()) : node())),
  set: (_, p, v) => { own[p] = v; return true; },
  apply: () => node(),
});
globalThis.AudioContext = class {
  state = 'running'; currentTime = 0; sampleRate = 48000; destination = node();
  createGain() { return node(); } createOscillator() { return node({ start: t => starts.push(t) }); }
  createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; } createBiquadFilter() { return node(); }
  createDynamicsCompressor() { return node(); } createDelay() { return node(); } createBufferSource() { return node(); }
  resume() { return Promise.resolve(); } suspend() { return Promise.resolve(); }
};
const audio = await load('audio.js');
audio.armAudio();
assert.equal(audio.musicOn(), false, 'the launcher\'s music is off');

audio.SFX.wrong(); audio.SFX.fire();
assert.ok(starts.length > 0, 'music off, sound on: the effects still sound');

starts.length = 0; shell.off = ['sound'];
audio.SFX.wrong(); audio.SFX.fire();
assert.equal(starts.length, 0, 'the launcher\'s sound off silences them');

starts.length = 0; shell.covers = []; shell.off = []; // the website: ♪ is the one switch
audio.SFX.wrong();
assert.equal(starts.length, 0, 'on the website ♪ off silences the effects too');

await close();
console.log('Pop effects follow the launcher\'s sound switch in the app, ♪ on the website ok');
