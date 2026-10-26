// Android: free play is always fullscreen (back in on the next tap if the player leaves it) and leaving free play
// puts the page back as it was; elsewhere the game's own taps ask once and stop asking once the player left it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../../src/ui/fullscreen.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
const handlers = {}, on = (k, f) => (handlers[k] ||= []).push(f), classes = new Set();
let asked = 0, exited = 0;
const doc = { addEventListener: on, fullscreenElement: null, body: { classList: { contains: c => classes.has(c), toggle() {} } },
  documentElement: { requestFullscreen() { asked++; return Promise.resolve(); } }, exitFullscreen() { exited++; return Promise.resolve(); } };
const ctx = { document: doc, G: { state: 'select', paused: false }, COARSE: { matches: true }, isTablet: () => false, deviceOrient: () => 'portrait', pauseGame() {}, resize() {},
  navigator: { userAgent: 'Linux; Android 14', maxTouchPoints: 5, userActivation: { isActive: true } }, screen: {}, innerWidth: 393, innerHeight: 852,
  addEventListener() {}, setTimeout() {}, Promise };
vm.runInNewContext(src + '\nthis.api = { photoOrient, goFullscreen };', ctx);
const { photoOrient, goFullscreen } = ctx.api;
const fire = (kind, target = { closest: () => null }, pointerType = 'touch') => { for (const f of handlers[kind] || []) f({ target, pointerType }); };
const fsIn = () => { doc.fullscreenElement = {}; fire('fullscreenchange'); }, fsOut = () => { doc.fullscreenElement = null; fire('fullscreenchange'); };
const free = v => { if (v) classes.add('view-mode'); else classes.delete('view-mode'); photoOrient(); };
const stick = { closest: s => s === '#photo-touch' ? {} : null };

// The menus: a tap is just a tap, nothing asks for fullscreen.
fire('click'); fire('pointerup', stick); assert.equal(asked, 0, 'outside free play, taps never ask');

// Free play from a page out of fullscreen: in on entering, out again on the way back, and that exit is not the player's.
free(true); assert.equal(asked, 1, 'entering free play asks'); fsIn();
free(false); assert.equal(exited, 1, 'leaving free play takes it out of fullscreen'); fsOut();
fire('click'); assert.equal(asked, 1, 'and the menus stay as they were');
goFullscreen(); assert.equal(asked, 2, 'that exit was ours: starting a game still asks as before'); fsIn(); fsOut();
goFullscreen(); assert.equal(asked, 2, 'the player left it: the game no longer asks (as before)');

// Left inside free play (back gesture, swipe): the next tap there goes back in, from the stick too (it sends no click).
free(true); assert.equal(asked, 3, 'free play always asks'); fsIn();
fsOut(); fire('click'); assert.equal(asked, 4, 'a tap goes back in'); fsIn();
fsOut(); fire('pointerup', stick); assert.equal(asked, 5, 'and so does the stick'); fsIn();
fire('pointerup', stick, 'mouse'); fire('pointerup'); assert.equal(asked, 5, 'already in: nothing more');
free(false); assert.equal(exited, 2); fsOut();
goFullscreen(); assert.equal(asked, 5, 'still out after it');

// Free play from a page already fullscreen (a game asked before the player ever left): it stays so on the way back.
doc.fullscreenElement = {}; free(true); free(false); assert.equal(exited, 2, 'fullscreen from before free play is kept');
doc.fullscreenElement = null;

// In and out of free play before the browser has gone fullscreen: when it arrives, it is taken off again.
free(true); assert.equal(asked, 6); free(false); assert.equal(exited, 2, 'nothing to take off yet');
fsIn(); assert.equal(exited, 3, 'the late fullscreen goes off at once'); fsOut();
goFullscreen(); assert.equal(asked, 6, 'and it is not counted for the game (the player had left it before)');

// Not iPhone/iPad, not desktop.
ctx.COARSE.matches = false; free(true); free(false); assert.equal(asked, 6, 'no touch screen: nothing');
console.log('fullscreen ok');
