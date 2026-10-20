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
      classList: { toggle() {}, add() {}, remove() {} }, addEventListener(k, f) { (this.listeners[k] ||= []).push(f); },
      setAttribute(k, v) { this.attrs[k] = v; }, focus() { doc.activeElement = this; }, blur() { doc.activeElement = doc.body; },
      contains(el) { return this === el; }, fire(k, e) { for (const f of this.listeners[k] || []) f(e); } });
    return nodes.get(id);
  } };
const $ = id => doc.getElementById(id), sheets = { sync: {}, board: { configured: true, results() {} }, share: { results() {} }, feedback: { configured: false }, select: { visible(on) { this.shown = on; } } };
const state = { state: 'splash', paused: false }, ctx = { document: doc, performance: { now: () => time },
  G: state, selectedFigure: { id: 'mulassa-valls' }, COARSE: { matches: false }, sheets, clock: 10, CHALLENGE: null, keyboardNav: true, hintOff: true, hide: (el, hidden) => { el.hidden = hidden; },
  howtoMenu: {}, settingsMenu: {}, privacyMenu: {}, pauseMenu: {},
  howtoEl: $('howto'), settingsEl: $('settings'), leadersEl: $('leaders'), feedbackEl: $('feedback'), musicEl: $('music'), iosHint: $('ios-hint'), pauseEl: $('pause'), skipEl: $('skip'), retryEl: $('retry'),
  addEventListener(k, f) { (handlers[k] ||= []).push(f); }, clearTimeout() {}, setTimeout() { return 1; },
  padButtons: [$('pad-left'), $('pad-right')], hud: $('hud'), orbit: { ptrs: new Map(), x: [0.4,11] }, pnow: () => time, W: 375, K: 1,
  orbitMove() {}, orbitZoom() {}, turnFor: () => 1, orbitDown(o, id) { o.ptrs.set(id, true); }, orbitUp(o, id) { o.ptrs.delete(id); },
  chip: null, down: { keys: new Set(), ptr: new Map() }, KEYS: {}, pageActive: () => true, releaseAll() {}, buttonAt: () => { throw new Error('selector world must never hit a title button'); },
  store: { set() {} }, unlock() { state.state = 'select'; }, toTitle() { state.state = 'select'; },
  startMenuAudio() {}, photoHelpAvailable: () => false, showAvatars: () => run('setPhotoControl(false)'), syncAvatars() {}, stopControl: () => run('PHOTO.on ? (setPhotoControl(false), true) : false') }; // src/ui/photo-avatars.js (its DOM: tests/render-quality.mjs)
let time = 1000;
const photoSource = readFileSync(new URL('../src/game/photo-control.js', import.meta.url), 'utf8').replace(/^export /gm, '');
const code = photoSource + '\n' + ['mouse-look', 'controls', 'input'].map(name => readFileSync(new URL(`../src/ui/${name}.js`, import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, '')).join('\n');
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
// The same practice control describes its destination, including FÀCIL (level 0).
state.state = 'play';
let exitIcon;
for (const then of [null, 0, null, 2]) {
  state.practice = { then }; run('updateControls()');
  const exit = then == null;
  assert.equal($('skip-label').textContent, exit ? 'SURT' : 'SALTA');
  assert.equal($('skip').attrs['aria-label'], exit ? 'Surt de la pràctica' : 'Salta la pràctica');
  if (exit) exitIcon = $('skip-icon').attrs.d;
  else assert.notEqual($('skip-icon').attrs.d, exitIcon, 'leaving and skipping use distinct icons');
  assert.equal($('skip').hidden, false);
}
state.paused = true; run('updateControls()'); assert($('skip').hidden, 'the contextual control stays hidden while paused');
state.paused = false; state.practice = null; run('updateControls()'); assert($('skip').hidden, 'no control during the actual song');
state.state = 'splash'; run('updateControls()');
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
// Held E uses the same input lifecycle as walking; repeats cannot restart its onset.
{
  const emit = (type, extra = {}) => { for (const f of handlers[type] || []) f({ code: 'KeyE', target: { tagName: 'BODY' }, preventDefault() {}, ...extra }); };
  const drive = () => { state.state = 'select'; state.paused = false; run("setView(true); setPhotoControl(true, 'drac-valls', false)"); emit('keydown'); };
  drive();
  assert(run("PHOTO.keys.has('KeyE') && PHOTO.sparks"));
  run('PHOTO.sparks = false'); emit('keydown', { repeat: true }); emit('keydown');
  assert(run("PHOTO.keys.has('KeyE') && !PHOTO.sparks"), 'repeat and duplicate keydown never restart fire');
  emit('keyup'); assert(run("!PHOTO.keys.has('KeyE') && !PHOTO.sparks"), 'keyup clears held input and a queued onset');
  emit('keydown'); emit('keyup'); assert(run('!PHOTO.sparks'), 'a tap released before the next frame cannot leave a delayed burst');
  for (const type of ['blur', 'visibilitychange', 'pagehide']) {
    drive(); emit(type); assert(run('PHOTO.keys.size === 0 && !PHOTO.sparks'), `${type} cancels held fire without keyup`);
  }
  for (const target of [{ tagName: 'INPUT' }, { tagName: 'TEXTAREA' }, { tagName: 'SELECT' }, { isContentEditable: true }]) {
    drive(); emit('focusin', { target }); emit('keydown', { target });
    assert(run('PHOTO.keys.size === 0 && !PHOTO.sparks'), 'editing a field cancels fire and ignores E');
  }
  drive(); emit('keydown', { code: 'Tab' });
  assert(run("PHOTO.id === 'mulassa-valls' && PHOTO.keys.size === 0"), 'switching figures cancels held fire');
  emit('keydown'); assert(run("PHOTO.keys.has('KeyE') && !PHOTO.sparks"), 'Mulassa E remains a held kick');
  drive(); run('stopControl()'); assert(run('!PHOTO.on && PHOTO.keys.size === 0'), 'Vista lliure clears held fire');
  drive(); run('setView(false)'); assert(run('!PHOTO.on && PHOTO.keys.size === 0'), 'HUD return clears held fire');
  drive(); state.paused = true; emit('keydown'); assert(run('PHOTO.keys.size === 0'), 'paused input cannot sustain or restart fire'); state.paused = false;
  drive(); sheets.feedback.open = true; emit('keydown'); run('updateControls()');
  assert(run('!PHOTO.on && PHOTO.keys.size === 0'), 'a modal cancels control and ignores E'); sheets.feedback.open = false;
  drive(); state.state = 'play'; run('updateControls()'); assert(run('!PHOTO.on && PHOTO.keys.size === 0'), 'starting play cancels free-mode fire');
  state.state = 'select'; run('setView(false)');
}
// Firefox may recenter the locked pointer more than once: zero buttons AND zero motion are not a release.
// Model the native event sequence here; browser evidence separately checks the real Pointer Lock API.
{
  const emit = (type, extra = {}) => { for (const f of handlers[type] || []) f({ code: 'KeyE', target: $('hud'), preventDefault() {}, ...extra }); };
  const change = () => emit('pointerlockchange');
  $('hud').requestPointerLock = () => { doc.pointerLockElement = $('hud'); change(); };
  doc.exitPointerLock = () => { doc.pointerLockElement = null; change(); };
  const mouse = (type, extra = {}) => $('hud').fire(type, event(77, 640, 400, { pointerType: 'mouse', button: 2, buttons: 2, movementX: 0, movementY: 0, ...extra }));
  const release = () => emit('pointerup', { pointerType: 'mouse', pointerId: 77, buttons: 0 });
  for (const first of ['fire', 'look']) {
    state.state = 'select'; run("setView(true); setPhotoControl(true, 'drac-valls', false); PHOTO.cameraYaw = Math.PI; PHOTO.drac.yaw = 0;");
    if (first === 'fire') emit('keydown');
    mouse('pointerdown'); mouse('pointermove', { buttons: 0, movementX: 190 }); // discard the lock-change jump
    if (first === 'look') { mouse('pointermove', { movementX: 20 }); emit('keydown'); }
    run('PHOTO.sparks = false'); // the frame consumed the onset; looking must never restart it
    const before = run('PHOTO.cameraYaw');
    mouse('pointermove', { buttons: 0 }); // a SECOND native recenter, after lookSkip was consumed
    run('updateControls()');
    assert(doc.pointerLockElement === $('hud') && run('PHOTO.mouse === 2'), `${first} first: native recenter keeps RMB and lock`);
    mouse('pointermove', { movementX: 80, movementY: 10 });
    assert(Math.abs(run('PHOTO.cameraYaw') - before + 0.24) < 1e-9, `${first} first: movement is consumed exactly once`);
    assert(run("PHOTO.keys.has('KeyE') && !PHOTO.sparks"), `${first} first: looking sustains E without another onset`);
    run('for(let i=0;i<30;i++) movePhoto(1/60, () => Infinity);');
    assert(run('Math.abs(PHOTO.drac.yaw) > 0.15'), `${first} first: RMB turns the Drac, not just the camera`);
    release();
    assert(!doc.pointerLockElement && run("PHOTO.mouse === 0 && PHOTO.keys.has('KeyE')"), 'RMB release leaves fire held');
    mouse('pointerdown'); mouse('pointermove'); mouse('pointermove', { buttons: 0 }); mouse('pointermove', { movementX: 40 });
    assert(doc.pointerLockElement && run("PHOTO.mouse === 2 && PHOTO.keys.has('KeyE') && !PHOTO.sparks"), 'recapture works without releasing/restarting E');
    emit('keyup');
    assert(run("!PHOTO.keys.has('KeyE') && PHOTO.mouse === 2"), 'E release keeps RMB control');
    release();
  }
  for (const exit of ['blur', 'visibilitychange', 'pagehide', 'figure', 'mode', 'Escape']) {
    run("setView(true); setPhotoControl(true, 'drac-valls', false);"); emit('keydown'); mouse('pointerdown');
    if (exit === 'figure') emit('keydown', { code: 'Tab' });
    else if (exit === 'mode') run('setView(false)');
    else if (exit === 'Escape') { emit('keydown', { code: 'Escape' }); emit('keyup'); }
    else emit(exit);
    run('updateControls()');
    assert(!doc.pointerLockElement && run("PHOTO.mouse === 0 && !PHOTO.keys.has('KeyE')"), `${exit} clears the combined controls`);
  }
  run("setView(true); setPhotoControl(true, 'drac-valls', false);");
  // Without a lock, even a stationary no-button move ends capture if pointerup went missing.
  delete $('hud').requestPointerLock;
  mouse('pointerdown'); mouse('pointermove'); mouse('pointermove', { buttons: 0 });
  assert(run('PHOTO.mouse === 0'), 'capture fallback still recovers a lost pointerup');
  run('setView(false)'); delete doc.exitPointerLock;
}
console.log('selector controls, offline feedback visibility, photo keys and world-only pointer gestures ok');

// Browsers blur a focused card as soon as its selector becomes inert. Preserve the pre-transition focus.
{
  run('setView(false); G.state = "select";');
  const selector = $('select'), descriptor = Object.getOwnPropertyDescriptor(selector, 'inert');
  const card = $('entry-card'); card.isConnected = true;
  let inert = false;
  Object.defineProperty(selector, 'inert', { configurable: true, get: () => inert, set(on) { inert = on; if (on) doc.activeElement = doc.body; } });
  doc.activeElement = card;
  run('setView(true);');
  assert.equal(run('viewBack'), card, 'entry saves focus before making the selector inert');
  run('setView(false);');
  assert.equal(doc.activeElement, card, 'exit restores the original card');
  Object.defineProperty(selector, 'inert', descriptor);
}

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

// Photo navigation reserves the corner-control area, then places its centre at 40% of the safe height.
{
  const fb = readFileSync(new URL('../src/styles/feedback.css', import.meta.url), 'utf8');
  const rail = fb.match(/#photo-figs \{([^}]+)\}/)?.[1];
  assert.match(rail, /flex-direction: column/);
  assert.match(rail, /justify-content: center/);
  assert.match(rail, /left: max\(16px, env\(safe-area-inset-left\)\)/);
  assert.match(rail, /top: calc\(env\(safe-area-inset-top\) \+ \(var\(--app-h, 100dvh\) - env\(safe-area-inset-top\) - env\(safe-area-inset-bottom\)\) \* \.4\)/);
  assert.match(rail, /translate: 0 -50%/);
  assert.match(fb, /#photo-tip \{[^}]*pointer-events: none/);
  console.log('photo column reserves safe corner controls and notice leaves input unobstructed');
}

{ // level buttons: a backdrop per level, the chosen one drifts and wears the ring; only DIFÍCIL shakes, once; reduced motion stills it all
  for (const l of [0, 1, 2]) assert.match(css, new RegExp(`\\.sel-seg \\.btn\\[data-level="${l}"\\] \\{ --lv-bg: #[0-9a-f]{8}; --lv-on: #[0-9a-f]{8};`), `level ${l} has its own warmth on both faces`);
  assert(!/\.sel-seg[^{]*\{[^}]*--lv-bg: url\(/.test(css), 'no drawn pattern behind the names (Marc chose the warm glow)');
  const quakes = [...css.matchAll(/^([^{\n]+)\{[^}\n]*animation:[^;}\n]*sel-quake [^;}\n]*/gm)];
  assert(quakes.length && quakes.every(([rule, sel]) => /data-level="2"/.test(sel) && !/sel-quake(?:[^,;()]|\([^)]*\))*infinite/.test(rule)), 'only DIFÍCIL shakes, and never on a loop');
  assert.match(css, /\.sel-seg \.btn::before \{[^}]*inset: -2px;[^}]*mask:[^}]*exclude/, 'the ring is a band over the button\'s own edge, not outside it');
  assert(!/\.sel-seg \.btn[^{]*\{[^}]*box-shadow: 0 0 /.test(css), 'no outer glow reaches the neighbouring levels');
  for (const [l, c] of [[0, '#4cc35a'], [0, '#a3e635'], [2, '#e8473f'], [2, '#b061ff']]) assert.match(css, new RegExp(`\\.sel-seg \\.btn\\[data-level="${l}"\\]::before \\{ background: conic-gradient\\([^;]*${c}`), `level ${l}'s ring has its own colour`);
  assert.match(css, /\.sel-seg \.btn\[aria-pressed="true"\]:hover \{ filter: none; \}/, 'hovering the chosen level changes nothing (the global hover turned its cream white)');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.sel-seg \.btn, \.sel-seg \.btn::before \{ animation: none !important; \} \}/, 'reduced motion keeps the level buttons still');
  const trembles = name => [...css.matchAll(new RegExp(`^([^{\\n]+)\\{[^}\\n]*animation:[^;}\\n]*${name} `, 'gm'))].map(m => m[1]);
  assert(trembles('sel-shiver').length && trembles('sel-shiver').every(sel => /data-level="2"\]\[aria-pressed="true"\]/.test(sel)), 'only a chosen DIFÍCIL keeps the full tremble');
  assert(trembles('sel-shiver-soft').length && trembles('sel-shiver-soft').every(sel => /data-level="1"\]\[aria-pressed="true"\]/.test(sel)), 'a chosen NORMAL trembles a touch');
  assert(trembles('sel-quake-soft').length && trembles('sel-quake-soft').every(sel => /data-level="1"\]\[aria-pressed="true"\]/.test(sel)), 'a chosen NORMAL gets the softer shake');
  assert(!/data-level="0"[^{]*\{[^}]*sel-(?:shiver|quake)/.test(css), 'FÀCIL never trembles');
  const quiet = [...css.matchAll(/^\.sel-seg\[data-quiet\][^{]*\{([^}]*)\}/gm)].map(m => m[1]);
  assert(quiet.length === 3 && quiet.every(r => !/sel-(?:pop|quake)/.test(r)), 'the level marked on entry never pops or shakes: only a tap does (Marc)');
  const amp = name => Math.max(...[...css.match(new RegExp(`@keyframes ${name} \\{([^\\n]*)\\} \\}`))[1].matchAll(/(-?[\d.]+)px/g)].map(([, v]) => Math.abs(v)));
  assert(amp('sel-shiver') < 1 && amp('sel-shiver-soft') < amp('sel-shiver'), 'the trembles stay under a pixel, NORMAL\'s smaller than DIFÍCIL\'s');
  const rings = [...css.matchAll(/\.sel-seg \.btn(?:\[data-level="\d"\])?::before \{[^}]*conic-gradient\(([^;]*)\);/g)].map(m => m[1]);
  assert(rings.length === 3 && rings.every(g => !/#fff3d6|#ffe1/i.test(g)), 'every level\'s ring is two colours, no white');
  console.log('level buttons: per-level warmth, coloured rings, NORMAL and DIFÍCIL trembles, still under reduced motion');
}
