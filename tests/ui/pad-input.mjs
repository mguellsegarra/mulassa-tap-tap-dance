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
  photoKey: () => false, pageActive: () => true, sheetUp: () => false, menuState: () => ['splash', 'select'].includes(G.state), photoScreen: () => G.state === 'select',
  press: (dir, e) => calls.push({ dir, type: e.type }), bouTap: () => false, // (no Bou close-up waiting)
  settleHold: () => releases.push(true), songTime() {}, eventAt() {},
  haptic() {}, padFeedback() {}, syncPad() {}, releaseAll() {}, clearPhotoKeys() {}, photoRelease() {},
  orbit: { ptrs: new Map() }, look: { ptrs: new Map() }, orbitUp() {}, pnow() {},
  // Android's back button in the app (platform/native.js): the handler is kept to be pressed below
  onNativeBack(f) { context.nativeBack = f; }, performance: { now: () => 0 }, // (Escape asks the mouse look first)
  togglePause() { context.pauses = (context.pauses || 0) + 1; }, clock: 10,
  toTitle() { context.titles = (context.titles || 0) + 1; }, exitGame(url) { context.left = url; },
  KeyboardEvent: class { constructor(type, o) { Object.assign(this, o, { type }); this.defaultPrevented = false; } preventDefault() { this.defaultPrevented = true; } },
  addEventListener(type, handler) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(handler);
  },
});
const body = { tagName: 'BODY', dispatchEvent: e => { e.target = body; (listeners.get(e.type) || []).forEach(h => h(e)); } }; // a real dispatch sets the target
context.document = { addEventListener: context.addEventListener, body };
vm.runInContext(readFileSync(new URL('../../src/ui/mouse-look.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, ''), context);
vm.runInContext(readFileSync(new URL('../../src/platform/double-tap.js', import.meta.url), 'utf8').replace(/^export /gm, ''), context);
vm.runInContext(readFileSync(new URL('../../src/ui/input.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, ''), context);
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
G.state = 'select';
const hitsBeforeSelect = calls.length;
emit('keydown', { tagName: 'BODY', handlers: {} }, { code: 'Space' });
assert.deepEqual(sounds, [], 'Space on the selector does not play a hidden menu action');
assert.equal(calls.length, hitsBeforeSelect, 'Space on the selector does not judge a hit');

// Android's back button: in a song it is Escape (the pause), on the results it goes to the selector, elsewhere to the games menu
G.state = 'play'; G.paused = false; context.nativeBack();
assert.equal(context.pauses, 1, 'back in a song opens the pause'); assert.equal(context.left, undefined, 'and stays in the game');
G.state = 'results'; context.nativeBack();
assert.equal(context.titles, 1, 'back on the results goes to the selector');
G.state = 'select'; context.nativeBack();
assert.equal(context.left, '/jocs/index.html', 'back on the selector leaves for the games menu');
console.log('pad pointer/keyboard/hold/GUAPA input stays separate from menu audio ok; Android back ok');
