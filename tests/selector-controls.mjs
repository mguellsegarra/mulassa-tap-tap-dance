// Menu chrome and exposed-world photo gestures, without a renderer or any online service.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
// The selector sheet must load after the older corner CSS; otherwise it darkens/obscures the actual controls.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/select.css', import.meta.url), 'utf8');
assert(html.indexOf('/src/styles/select.css') > html.indexOf('/src/styles/feedback.css'), 'selector chrome overrides load last');
const layer = Number(css.match(/#select \{[^}]*z-index:\s*(\d+)/)[1]);
const chrome = Number(css.match(/#settings, #music, #feedback, #leaders, #viewmode \{[^}]*z-index:\s*(\d+)/)[1]);
assert(chrome > layer, 'original toolbar buttons sit above the selector and both gradient layers');
assert(!/id="select-(board|back)"/.test(html), 'there is one original podium and no title-loop back button');
assert(!html.includes('id="aviat-menu"') && !html.includes('id="aviat-close"'), 'pending information is part of the selector, with no dialog');
assert.match(html, /<section id="select-pending"/);
assert.match(css, /body\.view-mode #select/);
// The selector's logo: the title's lettering top-left, inside #select (photo mode hides it with the selector), never a control.
const logoTag = html.match(/<svg class="sel-logo"[^>]*>/)?.[0] ?? '';
assert(html.indexOf('class="sel-logo"') > html.indexOf('<section id="select"') && html.indexOf('class="sel-logo"') < html.indexOf('id="select-towns"'), 'the logo is the selector\'s first child');
assert(/aria-hidden="true"/.test(logoTag) && /focusable="false"/.test(logoTag), 'the logo is decorative (the page H1 names the game)');
assert.match(css, /#select > \.sel-logo \{[^}]*pointer-events: none/);
// Portrait phones: five 44 px buttons right-aligned with --cb-g between them; the logo gets the rest (12 px edges, 10 px to
// the row). >= 82 px keeps TAP TAP DANCE's capitals >= 7 px; under 360 px it cannot fit and is hidden.
const gap = w => Number((w < 375 ? css.match(/max-width: 374px\) and \(min-height: 501px\) \{[^}]*--cb-g: (\d+)px/) : css.match(/max-width: 519px\) and \(min-height: 501px\) \{\s*body:has\(#select:not\(\[hidden\]\)\) \{ --cb-g: (\d+)px/))[1]);
const logoW = w => w - 24 - 10 - 5 * (44 + gap(w)) + gap(w);
for (const w of [360, 375, 393]) assert(logoW(w) >= 82, `logo ${logoW(w)} px at ${w}`);
assert(logoW(359) < 82 && /max-width: 359px\) and \(min-height: 501px\) \{\s*#select > \.sel-logo \{ display: none/.test(css), 'no logo where it cannot fit');
assert(!/#viewmode\s*\{[^}]*display:\s*none/.test(css + readFileSync(new URL('../src/styles/feedback.css', import.meta.url), 'utf8')), 'viewport rules never hide the photo-mode control');
const nodes = new Map(), handlers = {}, classes = new Set();
const doc = { addEventListener(k, f) { (handlers[k] ||= []).push(f); }, body: { classList: { toggle(c, on) { if (on) classes.add(c); else classes.delete(c); } } },
  getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, { id, hidden: false, inert: false, style: {}, attrs: {}, listeners: {},
      classList: { add() {}, remove() {} }, addEventListener(k, f) { (this.listeners[k] ||= []).push(f); },
      setAttribute(k, v) { this.attrs[k] = v; }, focus() { doc.activeElement = this; }, blur() { doc.activeElement = doc.body; },
      contains(el) { return this === el; }, fire(k, e) { for (const f of this.listeners[k] || []) f(e); } });
    return nodes.get(id);
  } };
const $ = id => doc.getElementById(id), sheets = { sync: {}, board: { configured: true, results() {} }, share: { results() {} }, feedback: { configured: false }, select: { visible(on) { this.shown = on; } } };
const state = { state: 'splash', paused: false }, ctx = { document: doc, performance: { now: () => time },
  G: state, selectedFigure: { id: 'mulassa-valls' }, sheets, clock: 10, CHALLENGE: null, keyboardNav: true, hintOff: true, hide: (el, hidden) => { el.hidden = hidden; },
  howtoMenu: {}, settingsMenu: {}, privacyMenu: {}, pauseMenu: {},
  howtoEl: $('howto'), settingsEl: $('settings'), leadersEl: $('leaders'), feedbackEl: $('feedback'), musicEl: $('music'), iosHint: $('ios-hint'), pauseEl: $('pause'), skipEl: $('skip'), retryEl: $('retry'),
  addEventListener(k, f) { (handlers[k] ||= []).push(f); }, clearTimeout() {}, setTimeout() { return 1; },
  padButtons: [$('pad-left'), $('pad-right')], hud: $('hud'), orbit: { ptrs: new Map(), x: [0.4,11] }, pnow: () => time, W: 375, K: 1,
  orbitMove() {}, orbitZoom() {}, turnFor: () => 1, orbitDown(o, id) { o.ptrs.set(id, true); }, orbitUp(o, id) { o.ptrs.delete(id); },
  chip: null, down: { keys: new Set(), ptr: new Map() }, KEYS: {}, pageActive: () => true, releaseAll() {}, buttonAt: () => { throw new Error('selector world must never hit a title button'); },
  store: { set() {} }, unlock() { state.state = 'select'; }, toTitle() { state.state = 'select'; },
  showAvatars: () => run('setPhotoControl(false)'), syncAvatars() {}, stopControl: () => run('PHOTO.on ? (setPhotoControl(false), true) : false') }; // src/ui/photo-avatars.js (its DOM: tests/render-quality.mjs)
let time = 1000;
const photoSource = readFileSync(new URL('../src/game/photo-control.js', import.meta.url), 'utf8').replace(/^export /gm, '');
const code = photoSource + '\n' + ['controls', 'input'].map(name => readFileSync(new URL(`../src/ui/${name}.js`, import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, '')).join('\n');
vm.createContext(ctx); vm.runInContext(code, ctx);
const run = code => vm.runInContext(code, ctx);
const key = code => { for (const f of handlers.keydown || []) f({ code, target: { tagName: 'BODY' }, preventDefault() {} }); };
const event = (id, x = 180, y = 350, more = {}) => ({ pointerId: id, clientX: x, clientY: y, button: 0, isPrimary: true, pointerType: 'touch', preventDefault() {}, ...more });
const tap = (id, { drag = false, type = 'touch' } = {}) => {
  time += 80; $('hud').fire('pointerdown', event(id, 180, 350, { pointerType: type }));
  if (drag) $('hud').fire('pointermove', event(id, 220));
  $('hud').fire('pointerup', event(id, drag ? 220 : 180));
  for (const f of handlers.pointerup || []) f(event(id));
};
run('updateControls()'); assert($('howto').hidden, 'splash has no instructions pill');
assert(!$('viewmode').hidden, 'splash offers photo mode');
key('KeyH'); assert(run('viewMode') && classes.has('view-mode'), 'H hides the splash chrome'); key('Escape'); assert(!run('viewMode'));
state.state = 'select'; run('updateControls()');
for (const id of ['settings', 'leaders', 'music', 'feedback', 'viewmode']) assert(!$(id).hidden, `${id} is available from the selector, including offline feedback`);
state.figureId = 'drac-valls'; state.sel = 2;
key('KeyH'); run('updateControls()'); assert(run('viewMode') && $('select').inert && classes.has('view-mode') && sheets.select.shown, 'photo mode hides without closing/reinitializing the selector');
key('Escape'); assert(!run('viewMode') && !$('select').inert && state.state === 'select' && state.figureId === 'drac-valls' && state.sel === 2, 'photo exit keeps the figure and level');
$('viewmode').fire('click'); assert(run('viewMode')); $('viewmode').fire('click'); assert(!run('viewMode'));
tap(1); tap(2); assert(run('viewMode'), 'touch double tap hides the selector');
$('hud').fire('dblclick', {}); assert(run('viewMode'), 'synthesized dblclick does not toggle twice');
tap(3); tap(4); assert(!run('viewMode'), 'world double tap restores it');
tap(5, { type: 'mouse' }); tap(6, { type: 'mouse' }); assert(run('viewMode'), 'desktop double click uses the same pointer pair');
key('KeyH'); tap(7); tap(8, { drag: true }); tap(9); assert(!run('viewMode'), 'camera drag cancels a tap pair');
run('worldTap = null'); sheets.sync.open = true; tap(10); tap(11); assert(!run('viewMode'), 'sheets own input'); sheets.sync.open = false;
run('worldTap = null'); $('settings').fire('pointerdown', event(12)); $('settings').fire('pointerup', event(12)); tap(13); assert(!run('viewMode'), 'DOM controls are not world taps');
run('worldTap = null'); $('hud').fire('pointerdown', event(14)); $('hud').fire('pointerdown', event(15, 180, 350, { isPrimary: false })); $('hud').fire('pointerup', event(14)); tap(16); assert(!run('viewMode'), 'a second finger cancels the pair');
run('worldTap = null; setView(true)'); state.state = 'play'; run('updateControls()'); assert(!run('viewMode') && $('viewmode').hidden && !$('select').inert, 'starting play restores UI and removes photo mode');
// Cursor follows actionable canvas targets, including changes under a stationary mouse.
ctx.buttonAt = e => e.clientX === 180 ? { x: 160, y: 330, w: 40, h: 40 } : null;
state.state = 'splash';
$('hud').fire('pointermove', event(20, 180, 350, { pointerType: 'mouse' }));
assert.equal($('hud').style.cursor, 'pointer');
run('setView(true); updateControls()'); assert.equal($('hud').style.cursor, '');
run('setView(false); updateControls()'); assert.equal($('hud').style.cursor, 'pointer');
sheets.sync.open = true; run('updateControls()'); assert.equal($('hud').style.cursor, '');
sheets.sync.open = false;
$('hud').fire('pointermove', event(20, 40, 350, { pointerType: 'mouse' }));
assert.equal($('hud').style.cursor, '');
$('hud').fire('pointermove', event(20, 180, 350, { pointerType: 'mouse' }));
state.state = 'select'; run('updateControls()'); assert.equal($('hud').style.cursor, '');
state.state = 'splash'; run('updateControls()');
$('hud').fire('pointerleave', {}); assert.equal($('hud').style.cursor, '');
console.log('selector controls, offline feedback visibility, photo keys and world-only pointer gestures ok');

// Run the real input listeners and the sheet's capture listener together. A gameplay
// key must reach press exactly once; menu navigation must sound without reaching press.
const sounds = [], presses = [];
ctx.chip = { wake() {}, sfx: kind => sounds.push(kind) };
ctx.press = (dir, e) => presses.push({ dir, stamp: e.timeStamp });
ctx.haptic = ctx.padFeedback = ctx.syncPad = ctx.settleHold = () => {};
ctx.songTime = () => 0;
ctx.eventAt = e => e.timeStamp;
ctx.KEYS = { ArrowLeft: 'L', ArrowRight: 'R', KeyD: 'L', KeyK: 'R' };
let activeDialog = null;
doc.querySelectorAll = () => activeDialog ? [activeDialog] : [];
const setup = readFileSync(new URL('../src/ui/sheets-setup.js', import.meta.url), 'utf8');
const sheetKeys = setup.slice(setup.indexOf("addEventListener('keydown'"), setup.indexOf("pauseMenu.addEventListener('cancel'"));
let capture;
vm.runInNewContext(sheetKeys, { document: doc, chip: ctx.chip, addEventListener(type, callback, options) {
  assert.equal(type, 'keydown'); assert.equal(options, true); capture = callback;
} });
const dispatchKey = (code, key = code, target = { tagName: 'BODY' }) => {
  let stopped = false;
  const e = { code, key, target, timeStamp: 1234, preventDefault() {}, stopImmediatePropagation() { stopped = true; } };
  capture(e);
  if (!stopped) for (const f of handlers.keydown) f(e);
};
state.state = 'play'; state.paused = false;
for (const practice of [null, { step: 0 }]) {
  state.practice = practice;
  for (const [code, key, dir] of [['ArrowLeft', 'ArrowLeft', 'L'], ['ArrowRight', 'ArrowRight', 'R'], ['KeyD', 'd', 'L'], ['KeyK', 'k', 'R'], ['Space', ' ', 'P']]) {
    presses.length = sounds.length = 0;
    dispatchKey(code, key);
    assert.deepEqual(presses, [{ dir, stamp: 1234 }]);
    assert.deepEqual(sounds, [], `${code}: gameplay never emits menu selection`);
  }
  for (const pointerType of ['mouse', 'touch']) for (const [i, dir] of ['L', 'R'].entries()) {
    const b = ctx.padButtons[i]; b.dataset = { d: dir };
    presses.length = sounds.length = 0;
    const e = event(40 + i, 180, 350, { pointerType, target: b, timeStamp: 1234 });
    b.fire('pointerdown', e);
    // Bubble to the window, release, then include a compatibility click/touchend.
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'click']) for (const f of handlers[type] || []) f(e);
    assert.deepEqual(presses, [{ dir, stamp: 1234 }], `${pointerType} pad dispatches once`);
    assert.deepEqual(sounds, [], `${pointerType} pad and bubbled click never emit menu selection`);
  }
}
const menuItems = [$('resume'), $('exit')];
for (const b of menuItems) { b.tagName = 'BUTTON'; b.offsetParent = doc.body; b.closest = () => null; }
activeDialog = { querySelectorAll: () => menuItems };
doc.activeElement = menuItems[0]; presses.length = sounds.length = 0;
dispatchKey('ArrowDown', 'ArrowDown', menuItems[0]);
assert.equal(doc.activeElement, menuItems[1]);
assert.deepEqual(sounds, ['menu'], 'sheet focus navigation emits exactly one menu sound');
assert.deepEqual(presses, [], 'capture prevents sheet arrows from also playing a note');
activeDialog = { querySelectorAll: () => [menuItems[1]] }; sounds.length = 0;
dispatchKey('ArrowDown', 'ArrowDown', menuItems[1]);
assert.deepEqual(sounds, [], 'unchanged focus does not emit a second selection sound');
console.log('practice/game input routing: keyboard, mouse/touch pad and bubbling stay separate from menu sounds');

// «Mode foto» on the selector: the figure bar (feedback.css #photo-figs) never covers the eye. The corner row is right-aligned
// (select.css), so the bar takes the left; portrait phones put it under their row. Bar widths as Chromium lays them out:
// 196 px portraits only (< 900 px), 598 px with names.
{
  const fb = readFileSync(new URL('../src/styles/feedback.css', import.meta.url), 'utf8');
  const barLeft = Number(fb.match(/body:has\(#select:not\(\[hidden\]\)\) #photo-figs \{ left: max\((\d+)px/)?.[1]);
  assert(barLeft, 'the bar is left-aligned on the selector');
  const narrow = Number(fb.match(/max-width: (\d+)px\) \{ #photo-figs \.pf-nb \{ position: absolute/)?.[1]);
  const phoneTop = Number(fb.match(/@media \(max-width: 519px\) \{ #photo-figs \{ top: calc\((\d+)px/)?.[1]);
  const row = (re, what) => { const m = css.match(re); assert(m, what); return m.slice(1).map(Number); };
  const [bigEdge, bigStep] = row(/min-width: 520px\) and \(min-height: 520px\) \{[^}]*right: calc\(max\((\d+)px[^)]*\)\) \+ var\(--cb-r\) \* (\d+)px\)/, 'big corner row');
  const [shortEdge, shortStep] = row(/max-height: 519px\), \(max-height: 500px\) \{[^}]*right: calc\(max\((\d+)px[^)]*\)\) \+ var\(--cb-r\) \* (\d+)px\)/, 'short corner row');
  const eyeR = 3; // five buttons, the eye second from the left (or first, without the podium): three to its right
  for (const [w, h] of [[520, 800], [600, 800], [899, 700], [900, 700], [1024, 768], [1280, 800], [667, 375], [852, 393], [932, 430], [1180, 820]]) {
    const short = h <= 519, size = short ? 44 : 56, eyeLeft = w - (short ? shortEdge + eyeR * shortStep : bigEdge + eyeR * bigStep) - size;
    const barRight = barLeft + (w <= narrow ? 196 : 598);
    assert(barRight + 8 <= eyeLeft, `${w}x${h}: the bar (to ${barRight}) clears the eye (from ${eyeLeft})`);
  }
  assert(phoneTop >= 10 + 44 + 8, 'portrait phones: the bar sits under the corner row');
  console.log('photo bar clears the eye on the selector ok');
}
