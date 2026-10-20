import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the actual input listeners at the judge/audio boundary. Judging and
// synthesis have their own tests; a press must reach the judge once, without UI SFX.
const listeners = new Map();
const target = () => ({
  handlers: {}, dataset: {}, tagName: 'BUTTON',
  addEventListener(type, handler) { this.handlers[type] = handler; },
  closest(selector) { return selector === '#pad' ? this : null; },
});
const buttons = ['L', 'R'].map(d => Object.assign(target(), { dataset: { d } }));
const calls = [], sounds = [], releases = [];
const G = { state: 'play', paused: false };
const down = { keys: new Set(), ptr: new Map() };
const closed = () => ({ open: false });
const context = vm.createContext({
  G, down, chip: { wake() {}, sfx: kind => sounds.push(kind) },
  KEYS: { KeyD: 'L', KeyK: 'R' }, PHOTO: { keys: new Set() },
  sheets: { sync: closed(), board: closed(), share: closed(), feedback: closed() },
  privacyMenu: closed(), pauseMenu: closed(), howtoMenu: closed(), settingsMenu: closed(),
  hud: target(), padButtons: buttons, viewMode: false,
  photoKey: () => false, pageActive: () => true, sheetUp: () => false, menuState: () => G.state === 'title', photoScreen: () => G.state === 'select',
  press: (dir, e) => calls.push({ dir, type: e.type }),
  settleHold: () => releases.push(true), songTime() {}, eventAt() {},
  haptic() {}, padFeedback() {}, syncPad() {}, releaseAll() {}, clearPhotoKeys() {}, photoRelease() {},
  orbit: { ptrs: new Map() }, orbitUp() {}, pnow() {},
  openSelect() { G.state = 'select'; },
  addEventListener(type, handler) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(handler);
  },
});
context.document = { addEventListener: context.addEventListener };
vm.runInContext(readFileSync(new URL('../src/ui/mouse-look.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, ''), context);
vm.runInContext(readFileSync(new URL('../src/ui/input.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, ''), context);
const emit = (type, button, extra = {}) => {
  const e = { type, target: button, preventDefault() {}, pointerId: 1, ...extra };
  button.handlers[type]?.(e);
  for (const listener of listeners.get(type) || []) listener(e);
};
for (const practice of [null, { step: 0 }]) {
  G.practice = practice;
  for (const pointerType of ['mouse', 'touch']) for (const button of buttons) {
    calls.length = sounds.length = releases.length = 0;
    emit('pointerdown', button, { pointerType });
    assert.equal(down.ptr.get(1), button.dataset.d, 'pointer stays held until release');
    emit('pointerup', button, { pointerType });
    emit('click', button); // compatibility click after a mouse/touch press
    emit('click', button); // programmatic activation also must not play again
    assert.deepEqual(calls, [{ dir: button.dataset.d, type: 'pointerdown' }]);
    assert.equal(releases.length, 1, 'one release settles a hold once');
    assert.equal(down.ptr.size, 0);
    assert.deepEqual(sounds, [], 'the pad never requests menu audio');
  }
  for (const [code, dir] of [['KeyD', 'L'], ['KeyK', 'R'], ['Space', 'P']]) {
    calls.length = sounds.length = releases.length = 0;
    emit('keydown', buttons[0], { code });
    emit('keydown', buttons[0], { code, repeat: true });
    assert(down.keys.has(code), 'a held key remains down');
    emit('keyup', buttons[0], { code });
    emit('click', buttons[0]);
    assert.deepEqual(calls, [{ dir, type: 'keydown' }]);
    assert.equal(releases.length, 1);
    assert.deepEqual(sounds, []);
  }
  calls.length = sounds.length = 0;
  emit('pointerdown', buttons[0], { pointerId: 1, pointerType: 'touch' });
  emit('pointerdown', buttons[1], { pointerId: 2, pointerType: 'touch' });
  assert.deepEqual(calls.map(c => c.dir), ['L', 'R'], 'GUAPA sends each half once');
  assert.equal(down.ptr.size, 2, 'GUAPA holds both sides together');
  emit('pointerup', buttons[0], { pointerId: 1 });
  emit('pointercancel', buttons[1], { pointerId: 2 });
  assert.deepEqual(sounds, []);
}
G.state = 'title';
emit('keydown', { tagName: 'BODY', handlers: {} }, { code: 'Space' });
assert.deepEqual(sounds, ['menu'], 'the title action retains its menu sound');
console.log('pad pointer/keyboard/hold/GUAPA input stays separate from menu audio ok');
