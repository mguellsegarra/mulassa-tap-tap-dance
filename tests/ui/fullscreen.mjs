// Android and desktop: fullscreen is free play's alone. In on entering it (back in on the next tap if the player leaves it),
// out on leaving it; the menus and the game never ask.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../../src/ui/fullscreen.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
const handlers = {}, on = (k, f) => (handlers[k] ||= []).push(f), classes = new Set();
let asked = 0, exited = 0, firstCheck = null;
const doc = { addEventListener: on, fullscreenElement: null, body: { classList: { contains: c => classes.has(c), toggle: (c, on) => on ? classes.add(c) : classes.delete(c) } },
  documentElement: { requestFullscreen() { asked++; return Promise.resolve(); } }, exitFullscreen() { exited++; return Promise.resolve(); } };
const ctx = { document: doc, G: { state: 'select', paused: false }, COARSE: { matches: true }, isTablet: () => false, deviceOrient: () => 'portrait', pauseGame() {}, resizeIfChanged() {}, curtainCover() {},
  navigator: { userAgent: 'Linux; Android 14', maxTouchPoints: 5, userActivation: { isActive: true } }, screen: {}, innerWidth: 393, innerHeight: 852,
  addEventListener() {}, matchMedia: () => ({ addEventListener() {} }), setTimeout: f => (firstCheck = f), Promise };
vm.runInNewContext(src + '\nthis.api = { photoOrient };', ctx);
const { photoOrient } = ctx.api;
// The first-paint cover (base.css, by viewport size) is a phone's rule: a tablet is marked so a short landscape page passes
firstCheck(); assert(!classes.has('tablet'), 'a phone keeps the first-paint cover');
ctx.isTablet = () => true; ctx.innerWidth = 1024; ctx.innerHeight = 520; firstCheck(); assert(classes.has('tablet') && !classes.has('wrong-orient'), 'a small tablet on its side: marked, no cover');
classes.add('view-mode'); ctx.innerWidth = 768; ctx.innerHeight = 1024; firstCheck(); assert(classes.has('wrong-orient'), 'tablet free play upright: the cover asks to turn it');
ctx.innerWidth = 1024; ctx.innerHeight = 768; firstCheck(); assert(!classes.has('wrong-orient'), 'tablet free play on its side: no cover'); classes.delete('view-mode');
ctx.isTablet = () => false; ctx.innerWidth = 393; ctx.innerHeight = 852; firstCheck(); classes.delete('wrong-orient');
const css = readFileSync(new URL('../../src/styles/base.css', import.meta.url), 'utf8');
assert(/\(orientation: landscape\) and \(max-height: 599px\)[^{]*\{ body:not\(\.view-mode, \.tablet\) #rotate/.test(css), 'the first-paint rule skips a marked tablet');
const fire = (kind, target = { closest: () => null }, pointerType = 'touch') => { for (const f of handlers[kind] || []) f({ target, pointerType }); };
const fsIn = () => { doc.fullscreenElement = {}; fire('fullscreenchange'); }, fsOut = () => { doc.fullscreenElement = null; fire('fullscreenchange'); };
const free = v => { if (v) classes.add('view-mode'); else classes.delete('view-mode'); photoOrient(); };
const stick = { closest: s => s === '#photo-touch' ? {} : null };

// The menus and the game: a tap is just a tap, nothing asks for fullscreen.
fire('click'); fire('pointerup', stick); assert.equal(asked, 0, 'outside free play, taps never ask');

// Free play: in on entering, out again on the way back.
free(true); assert.equal(asked, 1, 'entering free play asks'); fsIn();
free(false); assert.equal(exited, 1, 'leaving free play takes it out of fullscreen'); fsOut();
fire('click'); assert.equal(asked, 1, 'and the menus stay out of it');

// Left inside free play (back gesture, swipe): the next tap there goes back in, from the stick too (it sends no click).
free(true); assert.equal(asked, 2, 'free play always asks'); fsIn();
fsOut(); fire('click'); assert.equal(asked, 3, 'a tap goes back in'); fsIn();
fsOut(); fire('pointerup', stick); assert.equal(asked, 4, 'and so does the stick'); fsIn();
fire('pointerup', stick, 'mouse'); fire('pointerup'); assert.equal(asked, 4, 'already in: nothing more');
free(false); assert.equal(exited, 2); fsOut();

// In and out of free play before the browser has gone fullscreen, or a request that failed and a fullscreen from
// anywhere else: outside free play any fullscreen that arrives is taken off at once.
free(true); assert.equal(asked, 5); free(false); assert.equal(exited, 2, 'nothing to take off yet');
fsIn(); assert.equal(exited, 3, 'the late fullscreen goes off at once'); fsOut();
fsIn(); assert.equal(exited, 4, 'so does one free play never asked for'); fsOut();

// Desktop: in and out with free play too, but a click after an Escape stays windowed (it orbits).
ctx.COARSE.matches = false; free(true); assert.equal(asked, 6, 'desktop free play asks'); fsIn();
fsOut(); fire('click'); assert.equal(asked, 6, 'a desktop click does not go back in');
free(false); assert.equal(exited, 4, 'already out: nothing to take off');
free(true); fsIn(); free(false); assert.equal(exited, 5, 'leaving desktop free play takes it out'); fsOut();
console.log('fullscreen ok');
