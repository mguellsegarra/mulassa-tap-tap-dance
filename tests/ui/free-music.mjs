import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Chip } from '../../src/platform/audio.js';
import { tr } from '../../src/i18n/messages.js';

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
  getBoundingClientRect() { return { left: 0, width: 320, height: 300 }; }
}
const rows = [0, 1, 2, 3, 4].map(i => new Node(i));
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
let button, announcement;
const figure = id => ({ id, song: id, composer: 'F. Bofarull', year: 1987 });
const helpVars = {};
const context = vm.createContext({ tr, chip, menuMusic: true, MULASSA: figure('mulassa'), DRAC: figure('drac'), BOU: figure('bou'), playable: () => true, // every figure on the radio: the release gate is tests/figures/common/traits.mjs's
  figureSong: id => ({ audio: id, tail: 90, beats: [0, 1] }), portraitArt() {}, portraitPalette() {}, pixelSvg: () => '',
  mulaSpinner: () => ({}), PHOTO: { on: false }, clearPhotoKeys() {}, hud: {}, keyboardNav: false, beatAtTime() {},
  errors: { report: (...args) => failures.push(args) }, audioFailureTags: e => ({ name: e.name }),
  setMenuSound(on) { context.menuMusic = on; chip.setMenuMusic(on); },
  document: { createElement: () => new Node(), activeElement: null, body: { style: { setProperty: (k, v) => { helpVars[k] = v; } } } },
  addEventListener() {}, innerWidth: 1280, setTimeout: () => 0, clearTimeout() {},
});
vm.runInContext(readFileSync(new URL('../../src/ui/free-music.js', import.meta.url), 'utf8')
  .replace(/^import .*;$/gm, '').replaceAll('export ', ''), context);
const player = context.setupFreeMusic({ eye: {
  after(btn, menu, now) { button = btn; announcement = now; }, getBoundingClientRect: () => ({ right: 60, top: 10, bottom: 60, width: 50, height: 50 }),
}, onSound() {} });
const pick = i => rows[i].listeners.click();
const decode = async index => { requests[index].resolve({ duration: 92 }); await tick(); };
chip.menu(true); await tick(); player.visible(true);
assert.deepEqual([helpVars['--help-x'], helpVars['--help-y'], helpVars['--help-size']], ['126px', '10px', '50px'], 'the ? help button sits right of the radio, same size and row');
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
chip.radioSrc.src.onended(); await tick(); await decode(2);
assert.equal(button.dataset.kind, 'bou', 'the Drac\'s song hands over to the Bou\'s');
chip.radioSrc.src.onended(); await tick();
assert.equal(button.dataset.kind, 'menu');
assert(chip.menuSrc && !chip.radioSrc, 'the selected menu has a real source after natural completion');

pick(1); pick(4); await decode(3);
assert.equal(button.dataset.kind, 'off');
assert(!chip.radioSrc && !chip.menuSrc, 'a late decode cannot override Silenci');
pick(1); await decode(4);
chip.ctx.state = 'suspended'; chip.ctx.changed();
assert.equal(rows[1].querySelector('small').textContent, 'Toca per reprendre');
assert.equal(rows[1].querySelector('.fm-st').innerHTML, '', 'paused audio has no playing animation');
const suspended = chip.radioSrc;
pick(1);
assert.equal(chip.radioSrc, suspended, 'a resume gesture preserves the song position');
assert.equal(chip.ctx.state, 'running');

pick(2); player.visible(false); await decode(5);
assert(!chip.radioSrc && chip.menuSrc, 'leaving free mode cancels the pending song and restores the menu');
player.visible(true);
pick(1); await decode(6);
pick(2); chip.radioSrc.src.onended();
requests[7].reject(new Error('decode failed')); await tick();
assert(failures.some(([kind]) => kind === 'radio-load-failed'));
assert.equal(button.dataset.kind, 'menu');
assert(chip.menuSrc && !chip.radioSrc, 'failure after the old song ended restores a real menu transport');
pick(1); await decode(8);
pick(2); chip.radioSrc.src.onended();
player.visible(false);
await decode(9);
assert(chip.menuSrc && !chip.radioSrc, 'leaving between natural ended and the next decode restores the menu');
{ // the dock's «Ball lliure» starts the chosen figure's own song with its status; a speaker turned off stays off
  player.visible(true); const asked = requests.length;
  player.playFigure('drac'); await decode(asked);
  assert(button.dataset.kind === 'drac' && chip.radioSrc && !announcement.hidden && announcement.innerHTML.includes('drac'), 'Ball lliure plays her song and says so');
  player.visible(false); context.setMenuSound(false); player.visible(true);
  player.playFigure('mulassa');
  assert(requests.length === asked + 1 && button.dataset.kind === 'off', 'with the menu music off, nothing starts');
  player.visible(false); context.setMenuSound(true);
}
{
  const timers = new Map(); let id = 0;
  context.setTimeout = (fn, ms) => { timers.set(++id, { fn, ms }); return id; };
  context.clearTimeout = i => timers.delete(i);
  player.visible(true); pick(4);
  assert(!announcement.hidden && announcement.dataset.visible === 'true', 'a music choice shows the compact status');
  assert(announcement.innerHTML.includes('Música aturada'), 'silence has a distinct status instead of repeating its title');
  const first = [...timers.keys()].find(i => timers.get(i).ms === 2600);
  assert(first, 'the announcement keeps its proportional reading time');
  timers.get(first).fn();
  assert.equal(announcement.dataset.visible, 'false', 'expiry starts the CSS fade');
  assert(!announcement.hidden && announcement.attrs['aria-hidden'] === 'true', 'fade preserves the painted box without retaining a stale accessible status');
  pick(4); pick(4);
  assert(!timers.has(first) && [...timers.values()].filter(t => t.ms === 2600).length === 1, 'rapid choices replace the old announcement timer');
  player.visible(false);
  assert(announcement.hidden && timers.size === 0, 'leaving clears the status and its timer');
}
console.log('free music: natural handover, manual/ended/decode races, repeated choice, silence, resume and exit ok');
