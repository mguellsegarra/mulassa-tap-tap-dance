import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Chip } from '../src/platform/audio.js';

// Exercise the actual picker with deferred decodes and Chip's real menu/radio transitions.
const tick = () => new Promise(resolve => setImmediate(resolve));
class Node {
  constructor(i) { this.dataset = { i }; this.style = { setProperty() {} }; this.listeners = {}; this.attrs = {}; this.parts = {}; }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(k, f) { this.listeners[k] = f; }
  querySelector(k) { return this.parts[k] ??= new Node(); }
  querySelectorAll() { return rows; }
  replaceChildren() { this.innerHTML = ''; }
  append() {}
  contains() { return false; }
  focus() {}
}
const rows = [0, 1, 2, 3].map(i => new Node(i));
const chip = Object.create(Chip.prototype), failures = [], requests = [];
const gain = () => ({ connect: t => t, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} } });
Object.assign(chip, {
  ctx: { currentTime: 10, state: 'running', createGain: gain,
    createBufferSource: () => ({ connect: t => t, start() {}, stop() {} }),
    addEventListener(_, f) { this.changed = f; }, removeEventListener() { this.changed = null; } },
  out: {}, music: {}, menuMusic: true, ambient: Promise.resolve({ duration: 30 }),
  unlock() {}, beginRun() {}, endRun() {}, wake() { this.ctx.state = 'running'; this.ctx.changed?.(); },
  radioLoad(url) { return new Promise((resolve, reject) => requests.push({ url, resolve, reject })); },
});
let button;
const figure = id => ({ id, song: id, composer: 'F. Bofarull', year: 1987 });
const context = vm.createContext({ chip, menuMusic: true, MULASSA: figure('mulassa'), DRAC: figure('drac'),
  figureSong: id => ({ audio: id, tail: 90, beats: [0, 1] }), portraitArt() {}, portraitPalette() {}, pixelSvg: () => '',
  mulaSpinner: () => ({}), PHOTO: { on: false }, clearPhotoKeys() {}, hud: {}, keyboardNav: false, beatAtTime() {},
  errors: { report: (...args) => failures.push(args) }, audioFailureTags: e => ({ name: e.name }),
  setMenuSound(on) { context.menuMusic = on; chip.setMenuMusic(on); },
  document: { createElement: () => new Node(), activeElement: null },
  addEventListener() {}, innerWidth: 1280, setTimeout: () => 0, clearTimeout() {},
});
vm.runInContext(readFileSync(new URL('../src/ui/free-music.js', import.meta.url), 'utf8')
  .replace(/^import .*;$/gm, '').replaceAll('export ', ''), context);
const player = context.setupFreeMusic({ eye: {
  after(btn) { button = btn; }, getBoundingClientRect: () => ({ right: 60, top: 10, bottom: 60, width: 50, height: 50 }),
}, onSound() {} });
const pick = i => rows[i].listeners.click();
const decode = async index => { requests[index].resolve({ duration: 92 }); await tick(); };
chip.menu(true); await tick(); player.visible(true);
pick(1); await decode(0);
const first = chip.radioSrc;
pick(1);
assert.equal(chip.radioSrc, first, 'picking the same song keeps its source');
pick(2); // a manual choice is decoding when the old song ends
first.src.onended(); await tick();
assert.equal(requests.length, 2, 'ended cannot supersede a newer pending manual choice');
await decode(1);
assert.equal(button.dataset.kind, 'drac');
assert(chip.radioSrc && !chip.menuSrc);
chip.radioSrc.src.onended(); await tick();
assert.equal(button.dataset.kind, 'menu');
assert(chip.menuSrc && !chip.radioSrc, 'the selected menu has a real source after natural completion');

pick(1); pick(3); await decode(2);
assert.equal(button.dataset.kind, 'off');
assert(!chip.radioSrc && !chip.menuSrc, 'a late decode cannot override Silenci');
pick(1); await decode(3);
chip.ctx.state = 'suspended'; chip.ctx.changed();
assert.equal(rows[1].querySelector('small').textContent, 'Toca per reprendre');
assert.equal(rows[1].querySelector('.fm-st').innerHTML, '', 'paused audio has no playing animation');
const suspended = chip.radioSrc;
pick(1);
assert.equal(chip.radioSrc, suspended, 'a resume gesture preserves the song position');
assert.equal(chip.ctx.state, 'running');

pick(2); player.visible(false); await decode(4);
assert(!chip.radioSrc && chip.menuSrc, 'leaving free mode cancels the pending song and restores the menu');
player.visible(true);
pick(1); await decode(5);
pick(2); chip.radioSrc.src.onended();
requests[6].reject(new Error('decode failed')); await tick();
assert(failures.some(([kind]) => kind === 'radio-load-failed'));
assert.equal(button.dataset.kind, 'menu');
assert(chip.menuSrc && !chip.radioSrc, 'failure after the old song ended restores a real menu transport');
pick(1); await decode(7);
pick(2); chip.radioSrc.src.onended();
player.visible(false);
await decode(8);
assert(chip.menuSrc && !chip.radioSrc, 'leaving between natural ended and the next decode restores the menu');
console.log('free music: natural handover, manual/ended/decode races, repeated choice, silence, resume and exit ok');
