import assert from 'node:assert/strict';
import { Chip } from '../../../src/platform/audio.js';
const savedFetch = globalThis.fetch;
try {
  const requests = new Map(), played = [];
  globalThis.fetch = url => new Promise(resolve => requests.set(url, resolve));
  const gain = () => ({ connect() { return this; }, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} } });
  const ctx = { state: 'running', currentTime: 10, createGain: gain,
    createBufferSource: () => ({ connect() { return this; }, start() { played.push(this.buffer.label); }, stop() {} }),
    decodeAudioData: async label => ({ label, duration: 200 }) };
  const chip = Object.create(Chip.prototype);
  Object.assign(chip, { ctx, out: gain(), music: gain(), urls: { audio: 'old-song', ambient: 'old-menu' }, menuUrls: { ambient: 'menu' }, menuMusic: true });
  chip.unlock = () => {};
  chip.beginRun = chip.endRun = () => {};
  chip.preload();
  chip.menu(true);
  const oldStart = chip.start();
  chip.menu(true);
  chip.setSong({ audio: 'new-song', ambient: 'new-menu' });
  assert.equal(chip.ctx, ctx, 'selection keeps the unlocked context');
  assert(!requests.has('new-menu') && !requests.has('old-menu'), 'the menu loop is the same tune for every figure');
  const newStart = chip.start();
  const resolve = url => requests.get(url)({ ok: true, arrayBuffer: async () => url });
  resolve('new-song'); resolve('menu');
  assert.equal(await newStart, true);
  resolve('old-song');
  assert.equal(await oldStart, false, 'old pending playback is cancelled');
  await new Promise(r => setTimeout(r, 0));
  assert.equal(chip.buf.label, 'new-song', 'late old decoding cannot replace the active recording');
  assert.deepEqual(played, ['new-song'], 'neither old song nor either menu loop can leak into play');
  assert.equal(chip.menuSrc, undefined);
  console.log('figure audio: context reuse, stale load cancellation, one menu loop for every figure and menu isolation ok');
} finally { globalThis.fetch = savedFetch; }
