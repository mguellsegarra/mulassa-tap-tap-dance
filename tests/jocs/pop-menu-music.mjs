// Mulassa Pop's home music (menu-music.js): «Juga» silences it under the 3, 2, 1. Its fade in (a ramp up over a second)
// may still be pending then, and once brought the music back under the count; one never heard (iOS: «Juga» is the first
// tap) is cut at once. Its file loops from the tune's first note (tools/music/build_pop_menu.py).
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createMenuMusic } from '../../src/jocs/games/pop/menu-music.js';

// An AudioParam's timeline, enough to read the value it heads for after a given time
function param() {
  let events = [{ t: -1, v: 0 }];
  return {
    value: 0, events: () => events,
    setValueAtTime(v, t) { events.push({ t, v }); },
    linearRampToValueAtTime(v, t) { events.push({ t, v, ramp: true }); },
    setTargetAtTime(v, t) { events.push({ t, v, target: true }); },
    cancelScheduledValues(t) { events = events.filter(e => e.t < t); },
  };
}
function fakeCtx(state) {
  const ctx = { state, currentTime: 0, stopped: [], destination: {},
    createGain: () => ({ gain: param(), connect() {} }),
    createBufferSource: () => ({ connect() {}, start() {}, stop(t) { ctx.stopped.push(t ?? ctx.currentTime); } }),
    decodeAudioData: async () => ({}) };
  return ctx;
}
globalThis.fetch = async () => ({ arrayBuffer: async () => new ArrayBuffer(0) });
const settle = () => new Promise(go => setTimeout(go));
const loop = JSON.parse(readFileSync(new URL('../../src/jocs/games/pop/menu-music.json', import.meta.url), 'utf8'));

{ // running: «Juga» 0.3 s into its fade in
  const ctx = fakeCtx('running');
  let gain;
  const make = ctx.createGain; ctx.createGain = () => (gain = make());
  const home = createMenuMusic(ctx, {}, { url: 'x.mp3', loop });
  home.play(); await settle(); await settle();
  ctx.currentTime = .3;
  assert.ok(gain.gain.events().some(e => e.ramp && e.t > .3), 'its fade in is still pending');
  home.stop();
  assert.ok(!gain.gain.events().some(e => e.ramp), 'nothing left to bring it back up after «Juga»');
  assert.ok(gain.gain.events().some(e => e.target && e.v === 0), 'it fades to silence');
  assert.ok(ctx.stopped[0] <= .6, 'and stops soon');
}
{ // never heard: cut at once
  const ctx = fakeCtx('suspended');
  let gain;
  const make = ctx.createGain; ctx.createGain = () => (gain = make());
  const home = createMenuMusic(ctx, {}, { url: 'x.mp3', loop });
  home.play(); await settle(); await settle();
  home.stop();
  assert.deepEqual(gain.gain.events().filter(e => e.t >= 0).map(e => e.v), [0], 'silent at once, no ramp left');
  assert.equal(ctx.stopped[0], 0);
}
// the file: one 64-beat loop at 152 BPM from its first note, and in the game's folder (Vite hashes its URL)
assert.equal(loop.start, 0, 'from the tune\'s first note');
assert.ok(Math.abs(loop.end - 64 * 60 / 152) < 1e-3, '64 beats at 152');
assert.ok(existsSync(new URL('../../src/jocs/games/pop/menu-music.mp3', import.meta.url)));
console.log('pop home music: silenced under the count, its fade in dropped, cut at once if never heard; loop points ok');
