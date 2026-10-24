// Menu chrome and exposed-world photo gestures, without a renderer or any online service.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { tr } from '../src/i18n/messages.js';
// The selector sheet must load after the older corner CSS; otherwise it darkens/obscures the actual controls.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/select.css', import.meta.url), 'utf8');
assert(html.indexOf('/src/styles/select.css') > html.indexOf('/src/styles/feedback.css'), 'selector chrome overrides load last');
const layer = Number(css.match(/#select \{[^}]*z-index:\s*(\d+)/)[1]);
const chrome = Number(css.match(/#settings, #music, #free, #viewmode \{[^}]*z-index:\s*(\d+)/)[1]);
assert(chrome > layer, 'original toolbar buttons sit above the selector and both gradient layers');
assert(!/id="select-(board|back)"/.test(html), 'no title-loop back button');
// No corner podium (Marc: «Una línia a tot arreu»): the ranking line under the song opens Classificacions, ⚙ keeps its row
assert(!/id="leaders"/.test(html) && !/#leaders/.test(css + readFileSync(new URL('../src/styles/base.css', import.meta.url), 'utf8') + readFileSync(new URL('../src/styles/feedback.css', import.meta.url), 'utf8')), 'no #leaders anywhere');
assert(!html.includes('id="aviat-menu"') && !html.includes('id="aviat-close"'), 'pending information is part of the selector, with no dialog');
assert.match(html, /<section id="select-pending"/);
assert.match(css, /body\.view-mode #select/);
// The selector's logo: the title's lettering top-left, inside #select (photo mode hides it with the selector), never a control.
const logoTag = html.match(/<svg class="sel-logo"[^>]*>/)?.[0] ?? '';
assert(html.indexOf('class="sel-logo"') > html.indexOf('<section id="select"') && html.indexOf('class="sel-logo"') < html.indexOf('id="select-towns"'), 'the logo is the selector\'s first child');
assert(/aria-hidden="true"/.test(logoTag) && /focusable="false"/.test(logoTag), 'the logo is decorative (the page H1 names the game)');
assert.match(css, /#select > \.sel-logo \{[^}]*pointer-events: none/);
// Portrait phones: three 44 px buttons right-aligned with --cb-g between them; the logo gets the rest (12 px edges, 10 px to
// the row). >= 82 px keeps TAP TAP DANCE's capitals >= 7 px; under 320 px it cannot fit and is hidden.
const gap = w => Number((w < 375 ? css.match(/max-width: 374px\) and \(min-height: 501px\) \{[^}]*--cb-g: (\d+)px/) : css.match(/max-width: 519px\) and \(min-height: 501px\) \{\s*body:has\(#select:not\(\[hidden\]\)\) \{ --cb-g: (\d+)px/))[1]);
const logoW = w => w - 24 - 10 - 3 * (44 + gap(w)) + gap(w);
for (const w of [320, 340, 360, 375, 393]) assert(logoW(w) >= 82, `logo ${logoW(w)} px at ${w}`);
assert(/max-width: 319px\) and \(min-height: 501px\) \{\s*#select > \.sel-logo \{ display: none/.test(css), 'no logo on the narrowest phones');
// ...where the row spans the gutters instead of centring: its first button on the pills' and info's left edge, the last on the right one
assert.match(css, /max-width: 319px\) and \(min-height: 501px\) \{[^}]*\}\s*(\/\*[^*]*\*\/\s*)?body:has\(#select:not\(\[hidden\]\)\) :is\([^)]*\) \{ left: calc\(max\(12px, env\(safe-area-inset-left\)\) \+ var\(--cb-i\) \* \(100% - max\(12px, env\(safe-area-inset-left\)\) - max\(12px, env\(safe-area-inset-right\)\) - 44px\) \/ max\(1, var\(--cb-n\) - 1\)\); \}/);
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
const state = { state: 'splash', paused: false }, ctx = { tr, document: doc, navigator: { userActivation: { isActive: true } }, performance: { now: () => time },
  G: state, selectedFigure: { id: 'mulassa-valls' }, COARSE: { matches: false }, sheets, clock: 10, CHALLENGE: null, keyboardNav: true, hide: (el, hidden) => { el.hidden = hidden; },
  howtoMenu: {}, settingsMenu: {}, privacyMenu: {}, pauseMenu: {},
  howtoEl: $('howto'), settingsEl: $('settings'), feedbackEl: $('feedback'), freeEl: $('free'), musicEl: $('music'), pauseEl: $('pause'), skipEl: $('skip'), retryEl: $('retry'),
  addEventListener(k, f) { (handlers[k] ||= []).push(f); }, clearTimeout() {}, setTimeout() { return 1; },
  padButtons: [$('pad-left'), $('pad-right')], hud: $('hud'), orbit: { ptrs: new Map(), x: [0.4,11] }, look: { ptrs: new Map(), x: [0,1] }, pnow: () => time, W: 375, K: 1,
  orbitMove() {}, orbitZoom() {}, turnFor: () => 1, orbitDown(o, id) { o.ptrs.set(id, true); }, orbitUp(o, id) { o.ptrs.delete(id); },
  chip: null, down: { keys: new Set(), ptr: new Map() }, KEYS: {}, pageActive: () => true, releaseAll() {}, buttonAt: () => { throw new Error('selector world must never hit a title button'); },
  store: { set() {} }, unlock() { state.state = 'select'; }, toTitle() { state.state = 'select'; },
  startMenuAudio() {}, setFreeSound() {}, photoOrient() {}, photoHelpAvailable: () => false, showAvatars: () => run('setPhotoControl(false)'), syncAvatars() {} }; // src/ui/photo-avatars.js (its DOM: tests/render-quality.mjs)
let time = 1000;
const photoSource = readFileSync(new URL('../src/game/photo-control.js', import.meta.url), 'utf8').replace(/^export /gm, '');
const code = photoSource + '\n' + ['mouse-look', 'controls', 'input'].map(name => readFileSync(new URL(`../src/ui/${name}.js`, import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, '')).join('\n');
vm.createContext(ctx); vm.runInContext(code, ctx);
const run = code => vm.runInContext(code, ctx);
const key = code => { for (const f of handlers.keydown || []) f({ code, target: { tagName: 'BODY' }, preventDefault() {} }); };
const event = (id, x = 180, y = 350, more = {}) => ({ pointerId: id, clientX: x, clientY: y, button: 0, isPrimary: true, pointerType: 'touch', target: $('hud'), timeStamp: time, preventDefault() {}, ...more });
const tap = (id, { drag = false, type = 'touch', target = $('hud') } = {}) => {
  time += 80; for (const f of handlers.pointerdown || []) f(event(id, 180, 350, { pointerType: type, target })); $('hud').fire('pointerdown', event(id, 180, 350, { pointerType: type }));
  if (drag) $('hud').fire('pointermove', event(id, 220));
  $('hud').fire('pointerup', event(id, drag ? 220 : 180));
  for (const f of handlers.pointerup || []) f(event(id, drag ? 220 : 180));
};
run('updateControls()'); assert($('howto').hidden, 'splash has no instructions pill');
assert($('viewmode').hidden, 'splash has no photo mode');
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
key('KeyH'); assert(!run('viewMode') && !classes.has('view-mode'), 'H does nothing on the splash');
state.state = 'select'; run('updateControls()');
assert(!nodes.has('leaders'), 'the controls never look for a corner podium');
assert(!/id="profile"/.test(html), 'no corner Perfil: it lives in ⚙ Configuració (Marc 2026-10-22)');
assert(/<form id="settings-form"[^>]*>\s*<button id="settings-profile"[^>]*hidden/.test(html), 'Perfil is Configuració\'s first button, hidden until a board is configured');
for (const id of ['settings', 'music', 'free']) assert(!$(id).hidden, `${id} is available from the selector`);
assert($('feedback').hidden, 'the selector\'s Bústia lives in ⚙ Configuració: its corner slot is the gamepad\'s');
assert($('viewmode').hidden, 'the eye shows only inside free play');
// free play opens the corner row (Marc, 2026-10-22): free play, music, ⚙
assert.match(css, /body:has\(#select:not\(\[hidden\]\)\) #free \{ --cb-i: 0; \}/, 'free play comes first');
state.figureId = 'drac-valls'; state.sel = 2;
key('KeyH'); assert(!run('viewMode'), 'H no longer enters free play'); $('free').fire('click'); run('updateControls()'); assert(run('viewMode') && $('select').inert && classes.has('view-mode') && sheets.select.shown, 'photo mode hides without closing/reinitializing the selector');
assert(!$('viewmode').hidden, 'inside free play the button is the way back');
key('Escape'); assert(!run('viewMode') && !$('select').inert && state.state === 'select' && state.figureId === 'drac-valls' && state.sel === 2, 'photo exit keeps the figure and level');
run('setView(true)'); key('KeyH'); assert(run('viewMode'), 'nor leaves it'); $('viewmode').fire('click'); assert(!run('viewMode'), 'the button leaves free play'); run('updateControls()'); assert($('viewmode').hidden);
tap(1); tap(2); assert(!run('viewMode'), 'a double tap on the bare plaça no longer enters free play (Marc, 2026-10-23)');
tap(3, { type: 'mouse' }); tap(4, { type: 'mouse' }); assert(!run('viewMode'), 'nor a double click');
{ // a mouse's way back fades after 3 idle seconds (clean photos); touch has no Esc, so its never does
  const timers = [], wasTimeout = ctx.setTimeout; ctx.setTimeout = () => timers.push(1);
  run('setView(true)'); assert.equal(timers.length, 1, 'desktop: the exit dims when idle'); run('setView(false)');
  ctx.COARSE.matches = true; timers.length = 0;
  run('setView(true)'); assert.equal(timers.length, 0, 'touch: the exit, radio and ? never fade'); run('setView(false)');
  ctx.COARSE.matches = false; ctx.setTimeout = wasTimeout;
}
run('setView(true)'); state.state = 'play'; run('updateControls()'); assert(!run('viewMode') && $('viewmode').hidden && !$('select').inert, 'starting play restores UI and removes photo mode');
// Cursor follows actionable canvas targets, including changes under a stationary mouse.
ctx.buttonAt = e => e.clientX === 180 ? { x: 160, y: 330, w: 40, h: 40 } : null;
state.state = 'title'; // (the splash takes a tap anywhere: its cursor is always a pointer)
$('hud').fire('pointermove', event(20, 180, 350, { pointerType: 'mouse' }));
assert.equal($('hud').style.cursor, 'pointer');
sheets.sync.open = true; run('updateControls()'); assert.equal($('hud').style.cursor, '');
sheets.sync.open = false;
$('hud').fire('pointermove', event(20, 40, 350, { pointerType: 'mouse' }));
assert.equal($('hud').style.cursor, '');
$('hud').fire('pointermove', event(20, 180, 350, { pointerType: 'mouse' }));
state.state = 'select'; run('updateControls()'); assert.equal($('hud').style.cursor, '');
state.state = 'splash'; run('updateControls()'); assert.equal($('hud').style.cursor, 'pointer');
$('hud').fire('pointerleave', {}); assert.equal($('hud').style.cursor, '');
// Held E uses the same input lifecycle as walking; repeats cannot restart its onset.
{
  const emit = (type, extra = {}) => { for (const f of handlers[type] || []) f({ code: 'KeyE', target: { tagName: 'BODY' }, preventDefault() {}, ...extra }); };
  const drive = () => { state.state = 'select'; state.paused = false; run("setView(true); setPhotoControl(true, 'drac-valls')"); emit('keydown'); };
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
  assert(run("PHOTO.id === 'bou-tradicional-valls' && PHOTO.keys.size === 0"), 'switching figures cancels held fire');
  emit('keydown', { code: 'Tab' }); assert(run("PHOTO.id === 'mulassa-valls'"), 'Tab goes round the three beasts');
  emit('keydown'); assert(run("PHOTO.keys.has('KeyE') && !PHOTO.sparks"), 'Mulassa E remains a held kick');
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
  const mouse = (type, extra = {}) => {
    const e = event(77, 640, 400, { pointerType: 'mouse', button: 2, buttons: 2, movementX: 0, movementY: 0, ...extra });
    $('hud').fire(type, e); if (type === 'pointerdown') $('hud').fire('mousedown', e);
  };
  const release = () => emit('mouseup', { pointerType: 'mouse', pointerId: 77, buttons: 0 });
  for (const first of ['fire', 'look']) {
    state.state = 'select'; run("setView(true); setPhotoControl(true, 'drac-valls'); PHOTO.cameraYaw = Math.PI; PHOTO.drac.yaw = 0;");
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
    run("setView(true); setPhotoControl(true, 'drac-valls');"); emit('keydown'); mouse('pointerdown');
    if (exit === 'figure') emit('keydown', { code: 'Tab' });
    else if (exit === 'mode') run('setView(false)');
    else if (exit === 'Escape') { emit('keydown', { code: 'Escape' }); emit('keyup'); }
    else emit(exit);
    run('updateControls()');
    assert(!doc.pointerLockElement && run("PHOTO.mouse === 0 && !PHOTO.keys.has('KeyE')"), `${exit} clears the combined controls`);
  }
  run("setView(true); setPhotoControl(true, 'drac-valls');");
  // Without a lock, even a stationary no-button move ends capture if pointerup went missing.
  delete $('hud').requestPointerLock;
  mouse('pointerdown'); mouse('pointermove'); mouse('pointermove', { buttons: 0 });
  assert(run('PHOTO.mouse === 0'), 'capture fallback still recovers a lost pointerup');
  run('setView(false)'); delete doc.exitPointerLock;
}
// Either button hides the cursor while driving; only RMB steers. Mouse chords have one pointerdown/up for the whole chord,
// but one mousedown/up per button; movement.button is -1, buttons is the held bitmask.
{
  let locks = 0, captures = 0;
  const emit = (type, e = {}) => { for (const f of handlers[type] || []) f({ target: $('hud'), preventDefault() {}, ...e }); };
  const change = () => emit('pointerlockchange');
  $('hud').requestPointerLock = () => { locks++; doc.pointerLockElement = $('hud'); change(); };
  $('hud').setPointerCapture = () => captures++;
  doc.exitPointerLock = () => { doc.pointerLockElement = null; change(); };
  const mouse = (type, button, buttons, dx = 0) => $('hud').fire(type, event(91, 600, 300, { pointerType: 'mouse', button, buttons, movementX: dx, movementY: 0 }));
  const up = (button, buttons) => emit('mouseup', { button, buttons });
  const begin = (id, keys = []) => {
    run(`setView(true); setPhotoControl(true, '${id}'); PHOTO.cameraYaw = Math.PI; photoBody().yaw = 0;`);
    keys.forEach(code => emit('keydown', { code }));
  };
  for (const id of ['mulassa-valls', 'drac-valls']) for (const keys of [[], ['KeyW'], ['KeyW', 'ShiftLeft']]) {
    begin(id, keys);
    for (const [button, buttons] of [[0, 1], [1, 4]]) {
      const count = locks, yaw = run('photoBody().yaw'), camera = run('PHOTO.cameraYaw');
      mouse('pointerdown', button, buttons); mouse('mousedown', button, buttons);
      mouse('pointermove', -1, buttons); mouse('pointermove', -1, buttons, 100); run('movePhoto(1/60, () => Infinity)'); // (the lock's first move)
      // Marc, 2026-10-21 (as in WoW): LMB orbit hides the cursor too, so the drag never stops at the window's edge.
      // Do not take the lock away from LMB again (it went once: 2026-10-20); LMB just must not steer (below).
      assert.equal(locks, count + (button === 0 ? 1 : 0), `${id}/${keys}: LMB locks, middle does not`);
      assert.equal(doc.pointerLockElement === $('hud'), button === 0, `${id}/${keys}: the cursor hides while LMB orbits`);
      assert.equal(run('PHOTO.mouse'), button === 0 ? 1 : 0);
      assert.equal(run('PHOTO.cameraYaw'), camera - (button === 0 ? 0.3 : 0), 'LMB orbits; middle leaves the camera still');
      assert.equal(run('photoBody().yaw'), yaw, 'LMB/middle cannot steer heading');
      up(button, 0);
    }
    // LMB first, then RMB: there is deliberately no second pointerdown.
    mouse('pointerdown', 0, 1); mouse('mousedown', 0, 1);
    const count = locks; mouse('mousedown', 2, 3); mouse('pointermove', -1, 3); mouse('pointermove', -1, 3, 100);
    assert.equal(locks, count, 'RMB joins the LMB lock, no second request');
    assert.equal(run('PHOTO.mouse'), 3, 'both held keep the existing forward gesture');
    run('movePhoto(1/60, () => Infinity)'); assert(run('photoBody().yaw < 0'), 'RMB moves heading');
    up(2, 1); assert(doc.pointerLockElement && run('PHOTO.mouse === 1'), 'RMB up keeps the lock while LMB orbits');
    mouse('pointermove', -1, 1, 80); assert.equal(run('PHOTO.mouse'), 1, 'held LMB remains an orbit');
    const orbitYaw = run('PHOTO.cameraYaw'), heading = run('photoBody().yaw'), lockedCount = locks;
    mouse('pointermove', -1, 1, 80); run('movePhoto(1/60, () => Infinity)');
    assert.equal(run('PHOTO.cameraYaw'), orbitYaw - 0.24, 'LMB keeps orbiting after RMB lets go');
    assert.equal(run('photoBody().yaw'), heading, 'LMB after RMB release no longer steers the actor');
    assert.equal(locks, lockedCount, 'continuing LMB orbit does not request another lock');
    up(0, 0); assert(!doc.pointerLockElement, 'LMB up unlocks');
    for (const code of keys) assert(run(`PHOTO.keys.has('${code}')`), 'normal unlock preserves held movement keys');
    // RMB first, then LMB; release LMB first keeps RMB, release RMB ends it.
    mouse('pointerdown', 2, 2); mouse('mousedown', 2, 2);
    const one = locks; mouse('mousedown', 0, 3); assert.equal(locks, one, 'LMB never requests another lock');
    assert.equal(run('PHOTO.mouse'), 3); up(0, 2);
    assert(doc.pointerLockElement && run('PHOTO.mouse === 2'), 'LMB up leaves RMB control'); up(2, 0);
    assert(!doc.pointerLockElement && run('PHOTO.mouse === 0'));
  }
  begin('mulassa-valls');
  for (const blocked of ['modal', 'paused', 'game', 'uncontrolled']) {
    const count = locks;
    if (blocked === 'modal') sheets.sync.open = true;
    if (blocked === 'paused') state.paused = true;
    if (blocked === 'game') state.state = 'play';
    if (blocked === 'uncontrolled') run('setPhotoControl(false)');
    mouse('pointerdown', 2, 2); mouse('mousedown', 2, 2);
    assert.equal(locks, count, `${blocked} cannot request actor lock`);
    sheets.sync.open = false; state.paused = false; state.state = 'select'; begin('mulassa-valls');
  }
  // UI targets do not bubble through the world canvas. Focus clears held input.
  const count = locks;
  $('settings').fire('mousedown', event(91, 600, 300, { button: 2, buttons: 2 }));
  assert.equal(locks, count, 'UI RMB does not lock');
  mouse('pointerdown', 2, 2); mouse('mousedown', 2, 2);
  emit('focusin', { target: { tagName: 'INPUT' } }); run('updateControls()');
  assert(!doc.pointerLockElement && run('PHOTO.mouse === 0'), 'field focus frees lock');
  // A refused lock falls back to capture only while RMB is still held.
  $('hud').requestPointerLock = () => { locks++; emit('pointerlockerror'); };
  mouse('pointerdown', 2, 2); mouse('mousedown', 2, 2);
  assert(captures > 0 && run('PHOTO.mouse === 2'), 'error preserves RMB through capture fallback');
  up(2, 0); const before = captures; emit('pointerlockerror');
  assert.equal(captures, before, 'late error cannot capture after release');
  mouse('pointerdown', 0, 1); mouse('mousedown', 0, 1); assert.equal(run('PHOTO.mouse'), 1, 'a refused lock leaves LMB orbiting through capture'); up(0, 0);
  delete $('hud').requestPointerLock; delete $('hud').setPointerCapture; delete doc.exitPointerLock;
  run('setPhotoControl(false)');
  for (const [button, buttons] of [[0, 1], [1, 4], [2, 2]]) {
    mouse('pointerdown', button, buttons); mouse('mousedown', button, buttons);
    assert.equal(run('orbit.ptrs.has(91)'), button === 0, 'uncontrolled world reserves orbit drag for LMB');
    emit('pointerup', { pointerId: 91, pointerType: 'mouse', buttons: 0 });
  }
  begin('drac-valls');
  $('hud').fire('pointerdown', event(92));
  assert(run('orbit.ptrs.has(92)'), 'touch retains its orbit gesture while controlling');
  const yaw = run('PHOTO.cameraYaw');
  run('orbit.ptrs.set(92, { x: 180, y: 350 })');
  $('hud').fire('pointermove', event(92, 200, 350));
  assert(run('PHOTO.cameraYaw') < yaw, 'touch still moves the actor camera');
  emit('pointerup', { pointerId: 92, pointerType: 'touch', buttons: 0 });
  run('setView(false)');
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

// Photo mode: Tab never lands on the full-viewport canvas (it showed a ring round the whole screen).
{ const { readFileSync } = await import('node:fs'); const src = readFileSync(new URL('../src/ui/photo-avatars.js', import.meta.url), 'utf8') + readFileSync(new URL('../src/styles/feedback.css', import.meta.url), 'utf8');
  assert(/hud\.tabIndex = -1/.test(src) && !/hud\.tabIndex = on/.test(src) && !/world-focus/.test(src), 'the photo-mode canvas is not a Tab stop and has no focus ring'); }
// iPhone double-tap zoom: the quick second tap loses its default (the zoom) but still clicks; text fields keep theirs.
{
  const tap = (target, timeStamp) => { let prevented = false; for (const f of handlers.touchend || []) f({ target, timeStamp, touches: [], cancelable: true, preventDefault() { prevented = true; } }); return prevented; };
  let clicks = 0; const button = { closest: sel => (sel.includes('button') ? { click() { clicks++; } } : null) };
  const field = { closest: sel => (sel.includes('input') ? {} : null) };
  assert(!tap(button, 10000) && tap(button, 10200) && clicks === 1, 'a quick second tap is no zoom and still clicks once');
  assert(!tap(button, 11000), 'a slow tap is untouched');
  assert(!tap(field, 11100), 'a text field keeps its own taps');
  console.log('double-tap zoom guard ok');
}

// The strip's arrow capsule: the screen's middle, unless a town pill shares its band there (667×375: the pills' own row).
{
  const { navX } = await import('../src/ui/select-strip.js');
  const box = (left, top, right, bottom) => ({ getBoundingClientRect: () => ({ left, top, right, bottom, width: right - left }) });
  const carousel = box(0, 120, 667, 300), win = { innerWidth: 667 };
  assert.equal(navX(win, { children: [box(12, 72, 100, 116)] }, carousel, 1), 333.5, 'no pill under it: the middle');
  assert.equal(navX(win, { children: [box(12, 72, 100, 116), box(110, 72, 390, 116)] }, carousel, 1), 458, 'a pill under the middle: just right of it');
  assert.equal(navX(win, { children: [box(110, 4, 390, 48)] }, carousel, 1), 333.5, 'pills in the header, far above: the middle');
  assert.equal(navX(win, { children: [box(300, 72, 660, 116)] }, carousel, 1), 603, 'never past the screen edge');
}
{ // the FLIP (pending → playable): the primary slides; Ball lliure, hidden before, waits for the slide and fades in instead of popping over it
  const { setupFlip } = await import('../src/ui/select-flip.js');
  const btn = (x, w) => ({ x, w, anims: [], getBoundingClientRect() { return { left: this.x, top: 0, width: this.w, height: this.w && 48 }; }, getAnimations() { return []; }, animate(k, o) { this.anims.push(k); return { finished: Promise.resolve(), cancel() {} }; } });
  const next = btn(155, 315), free = btn(0, 0), win = { performance: { now: () => 0 }, getComputedStyle: () => ({ zoom: '1' }) };
  const flip = setupFlip({ win, root: {}, els: () => [next, free], reduced: () => false });
  flip.snap(true); next.x = 78; free.x = 383; free.w = 185; flip.play();
  assert.ok(next.anims[0]?.transform, 'the primary slides from its old place');
  assert.deepEqual(free.anims[0]?.opacity, [0, 0, 1], 'the newly shown button fades in after the slide, never pops in at once');
}
