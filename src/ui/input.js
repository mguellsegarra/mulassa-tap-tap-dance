// Keyboard and pointer input for the game and for the title camera.
import { PHOTO, photoKey, clearPhotoKeys, photoLook, photoZoom } from '../game/photo-control.js';
import { syncAvatars, stopControl } from './photo-avatars.js';
import { store } from '../platform/storage.js';
import { orbitMove, turnFor, orbitDown, orbitUp, orbitZoom, wheelFactor } from '../scene/orbit.js';
import { sheets } from './sheets.js';
import { G, chip, KEYS, down, clock, songTime } from '../game/state.js';
import { pageActive, offsetMs, setOffsetMs } from '../core/env.js';
import { privacyMenu, pauseMenu, howtoMenu, settingsMenu } from './handles.js';
import { togglePause } from './pause-actions.js';
import { sheetUp, viewMode, setView, steers, menuState } from './controls.js';
import { unlock, openSelect, toTitle } from '../game/flow.js';
import { press, settleHold, eventAt, releaseAll } from '../game/judge.js';
import { padButtons, haptic, padFeedback, syncPad } from './pad.js';
import { hud, buttonAt, W, K } from '../hud/canvas.js';
import { orbit, pnow } from '../scene/cameras.js';
import { lookDown, lookUp, lookSkip, lookEscape, lookLocked } from './mouse-look.js';

for (const ev of ['touchend', 'click', 'keydown']) addEventListener(ev, () => { if (!G.paused && pageActive()) chip?.wake(); }, { passive: true });
addEventListener('keydown', e => {
  if (e.code === 'Escape' && lookEscape()) { e.preventDefault(); return; } // it freed the mouse look, nothing more
  if (photoKey(e, viewMode && menuState() && !G.paused && pageActive() && !sheetUp() && (e.target === hud || e.target?.tagName === 'BODY'))) { syncAvatars(); return; } // only the world owns actor shortcuts; controls keep native keys
  if (e.repeat || sheets.sync.open || privacyMenu.open || sheets.board.open || sheets.share.open || sheets.feedback.open || sheets.watch?.open) return; // «Bústia de la plaça» is typed into; the sync sheet takes its own keys; Privadesa is read, not played; Classificacions types an alias; Comparteix has its own buttons
  if (G.state === 'play' && e.code === 'Escape') {
    if (!pauseMenu.open) { e.preventDefault(); togglePause(); }
    return;
  }
  if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) && !e.target?.isContentEditable && menuState() && !sheetUp() && !e.ctrlKey && !e.metaKey && !e.altKey && (e.code === 'KeyH' || viewMode && e.code === 'Escape')) { // «mode foto» (H is no game key)
    e.preventDefault(); if (e.code !== 'Escape' || !stopControl()) setView(!viewMode); return; // Escape steps back: driving → looking → buttons
  }
  if (viewMode || G.state === 'select') return; // the selector owns its keys; photo walking has already handled its keys
  if (['INPUT', 'SELECT', 'BUTTON'].includes(e.target.tagName) && !e.target.closest?.('#pad')) return; // a pad with keyboard focus still plays
  const dir = KEYS[e.code];
  if (dir || e.code === 'Space') down.keys.add(e.code); // held for MANTÉN notes
  if (dir || e.code === 'Space') e.preventDefault();
  if (G.state === 'splash') { if (e.code === 'Enter' || e.code === 'Space') unlock(); return; } // only its button (ENTRA) goes in
  if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
    setOffsetMs(offsetMs + (e.code === 'BracketLeft' ? -10 : 10));
    store.set('offset', offsetMs);
    G.offsetT = clock; // hidden sync knob (Bluetooth headphones): show a short toast only when used
  }
  if (G.state === 'title') {
    if (howtoMenu.open || settingsMenu.open || sheets.sync.open) return; // a sheet is up: its keys, not «QUI BALLA?»
    if (e.code === 'Space' || e.code === 'Enter') { chip.sfx('menu'); openSelect(); }
  } else if (G.state === 'play') {
    if (dir) press(dir, e);
    if (e.code === 'Space') { if (G.watch) togglePause(); else press('P', e); } // the dance demo: Space pauses, as a video
    if (e.code === 'KeyP') togglePause();
  } else if (G.state === 'results' && clock - G.resT > 1 && (e.code === 'Space' || e.code === 'Enter')) toTitle();
});
function padDown(b, e) {
  e.preventDefault();
  if (G.state !== 'play') return;
  down.ptr.set(e.pointerId, b.dataset.d); // held for MANTÉN notes
  const before = G.judge, praised = G.praise, ring = G.ring;
  press(b.dataset.d, e);
  const judged = G.judge !== before ? G.judge?.kind ?? 'miss' : null, gran = G.ring !== ring && G.ring?.kind === 'gran'; // a fatal miss collapses the mulassa: judge/praise/ring are then null
  haptic(gran || G.praise && G.praise !== praised && G.praise.pri !== 1 && G.praise.tier !== 'bonk' ? 'big' : judged === 'miss' ? 'miss' : judged ? 'hit' : 'tap');
  padFeedback(b, e); // after the game press: the look never delays the input
}
padButtons.forEach(b => b.addEventListener('pointerdown', e => padDown(b, e)));
// letting go: keys, pad fingers, or the window losing focus (which also pauses)
const letGo = e => { if (G.state === 'play' && !G.paused) settleHold(songTime(eventAt(e))); }; // let go when it happened, like press()
addEventListener('keyup', e => { PHOTO.keys.delete(e.code); if (e.code === 'KeyE') PHOTO.sparks = false; if (down.keys.delete(e.code)) letGo(e); });
for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, e => { if (down.ptr.delete(e.pointerId)) { syncPad(); letGo(e); } });
addEventListener('blur', releaseAll);
addEventListener('blur', clearPhotoKeys);
document.addEventListener('visibilitychange', clearPhotoKeys);
addEventListener('pagehide', clearPhotoKeys);
addEventListener('focusin', e => { if (e.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) clearPhotoKeys(); });
hud.addEventListener('pointermove', e => {
  if (PHOTO.on && e.pointerType === 'mouse' && PHOTO.mouse) {
    PHOTO.mouse = e.buttons & 3 || (lookLocked() ? PHOTO.mouse : 0); // (both held = run; locked, Firefox's own move on locking says 0: pointerup ends it)
    if (PHOTO.mouse && !lookSkip()) photoLook(e.movementX || 0, e.movementY || 0);
    return;
  }
  if (PHOTO.on && e.pointerType !== 'mouse' && orbit.ptrs.size === 1) {
    const p = orbit.ptrs.get(e.pointerId);
    if (p) photoLook(e.clientX - p.x, e.clientY - p.y);
  }
  const oldZoom=orbit.x[1];
  worldMove(e); orbitMove(orbit, e.pointerId, e.clientX, e.clientY, pnow());
  if(PHOTO.on && orbit.pinch && oldZoom>0)photoZoom(orbit.x[1]/oldZoom); }); // dragging the view
hud.addEventListener('pointerdown', e => {
  if (viewMode && e.pointerType === 'mouse') hud.focus({ preventScroll: true });
  if (PHOTO.on && e.pointerType === 'mouse' && (e.button === 0 || e.button === 2)) {
    e.preventDefault(); PHOTO.mouse = e.buttons & 3; // (holding the right button turns her after the view: movePhoto)
    lookDown(e);
    return;
  }
  worldDown(e);
  if (menuState()) {
    const b = G.state !== 'select' && !viewMode && buttonAt(e); // «mode foto»: the (unseen) button is no target, every press steers
    if (b && !orbit.ptrs.size && G.state === 'splash') unlock(); // ENTRA: the only way in (and the gesture that starts the audio)
    else if (b && !orbit.ptrs.size) { chip?.sfx('menu'); openSelect(); }
    else if (steers() && (e.pointerType !== 'mouse' || e.button === 0)) {
      orbit.turn = turnFor(W * K);
      orbitDown(orbit, e.pointerId, e.clientX, e.clientY, pnow());
      try { hud.setPointerCapture?.(e.pointerId); } catch { /* already gone */ }
    }
  } else if (G.state === 'results' && clock - G.resT > 1) toTitle();
});
hud.addEventListener('lostpointercapture', () => { PHOTO.mouse=0; });
hud.addEventListener('contextmenu', e => { if (PHOTO.on) e.preventDefault(); });
for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, e => { if (e.pointerType === 'mouse') { PHOTO.mouse &= ev === 'pointercancel' ? 0 : e.buttons & 3; lookUp(e); } });
for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, e => { orbitUp(orbit, e.pointerId, pnow()); });
hud.addEventListener('wheel', e => { // the wheel, and a trackpad pinch (ctrlKey: never the page zoom over the canvas)
  if (!steers()) return;
  e.preventDefault();
  const factor=wheelFactor(e.deltaMode ? e.deltaY * 16 : e.deltaY,e.ctrlKey);
  if(PHOTO.on) photoZoom(factor); else orbitZoom(orbit,factor,pnow());
}, { passive: false });
let gestureScale = 1; // Safari's trackpad pinch (gesture events); on iOS the fingers are pointers already
hud.addEventListener('gesturestart', e => { e.preventDefault(); gestureScale = e.scale || 1; });
hud.addEventListener('gesturechange', e => {
  e.preventDefault();
  if (steers() && !orbit.ptrs.size && e.scale > 0) { if(PHOTO.on)photoZoom(gestureScale/e.scale);else orbitZoom(orbit,gestureScale/e.scale,pnow()); }
  gestureScale = e.scale || 1;
});

// Two still taps on the exposed world toggle the chrome. Pointer events cover mouse and touch once;
// synthesized click/dblclick events are intentionally ignored. A drag or second finger cancels the pair.
let worldTap = null, worldPress = null;
function worldDown(e) {
  if (!steers() || e.button > 0 || e.isPrimary === false || worldPress) { worldPress = null; worldTap = null; return; }
  worldPress = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
}
function worldMove(e) {
  if (!worldPress || e.pointerId !== worldPress.id) return;
  if (Math.hypot(e.clientX - worldPress.x, e.clientY - worldPress.y) > 8) { worldPress.moved = true; worldTap = null; }
}
hud.addEventListener('pointerup', e => {
  const press = worldPress; worldPress = null;
  if (!press || press.id !== e.pointerId || press.moved || Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8 || !steers()) return;
  const now = performance.now();
  if (worldTap && now - worldTap.t <= 350 && Math.hypot(e.clientX - worldTap.x, e.clientY - worldTap.y) <= 24) {
    worldTap = null; setView(!viewMode);
  } else worldTap = { t: now, x: e.clientX, y: e.clientY };
});
hud.addEventListener('pointercancel', () => { worldPress = null; worldTap = null; });
