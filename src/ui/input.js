// Keyboard and pointer input for the game and for the title camera.
import { store } from '../platform/storage.js';
import { orbitMove, turnFor, orbitDown, orbitUp, orbitZoom, wheelFactor } from '../scene/orbit.js';
import { sheets } from './sheets.js';
import { G, chip, KEYS, down, clock, songTime } from '../game/state.js';
import { pageActive, offsetMs, setOffsetMs } from '../core/env.js';
import { privacyMenu, pauseMenu, howtoMenu, settingsMenu } from './handles.js';
import { togglePause } from './pause-actions.js';
import { sheetUp, viewMode, setView, steers } from './controls.js';
import { unlock, choose, toTitle } from '../game/flow.js';
import { press, settleHold, eventAt, releaseAll } from '../game/judge.js';
import { padButtons, haptic, padFeedback, syncPad } from './pad.js';
import { hud, buttonAt, W, K } from '../hud/canvas.js';
import { orbit, pnow } from '../scene/cameras.js';

for (const ev of ['touchend', 'click', 'keydown']) addEventListener(ev, () => { if (!G.paused && pageActive()) chip?.wake(); }, { passive: true });
addEventListener('keydown', e => {
  if (e.repeat || sheets.sync.open || privacyMenu.open || sheets.board.open || sheets.share.open || sheets.feedback.open) return; // «Bústia de la plaça» is typed into; the sync sheet takes its own keys; Privadesa is read, not played; Classificacions types an alias; Comparteix has its own buttons
  if (G.state === 'play' && e.code === 'Escape') {
    if (!pauseMenu.open) { e.preventDefault(); togglePause(); }
    return;
  }
  if (G.state === 'title' && !sheetUp() && !e.ctrlKey && !e.metaKey && !e.altKey && (e.code === 'KeyH' || viewMode && e.code === 'Escape')) { // «mode foto» (H is no game key)
    e.preventDefault(); setView(!viewMode); return;
  }
  if (viewMode) return; // only the camera: no choice, no sync knob
  if (['INPUT', 'SELECT', 'BUTTON'].includes(e.target.tagName)) return;
  const dir = KEYS[e.code];
  if (dir || e.code === 'Space') down.keys.add(e.code); // held for MANTÉN notes
  if (dir || e.code === 'Space') e.preventDefault();
  if (G.state === 'splash') return unlock();
  if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
    setOffsetMs(offsetMs + (e.code === 'BracketLeft' ? -10 : 10));
    store.set('offset', offsetMs);
    G.offsetT = clock; // hidden sync knob (Bluetooth headphones): show a short toast only when used
  }
  if (G.state === 'title') {
    if (howtoMenu.open || settingsMenu.open || sheets.sync.open) return; // a sheet is up: its keys, not a new game
    if (dir === 'L' || dir === 'U') { G.sel = (G.sel + 2) % 3; chip.sfx('menu'); }
    if (dir === 'R' || dir === 'D') { G.sel = (G.sel + 1) % 3; chip.sfx('menu'); }
    if (e.code === 'Space' || e.code === 'Enter') choose(G.sel);
  } else if (G.state === 'play') {
    if (dir) press(dir, e);
    if (e.code === 'Space') press('P', e);
    if (e.code === 'KeyP') togglePause();
  } else if (G.state === 'results' && clock - G.resT > 1 && (e.code === 'Space' || e.code === 'Enter')) toTitle();
});
padButtons.forEach(b => b.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (G.state !== 'play') return;
  down.ptr.set(e.pointerId, b.dataset.d); // held for MANTÉN notes
  const before = G.judge, praised = G.praise, ring = G.ring;
  press(b.dataset.d, e);
  const judged = G.judge !== before ? G.judge.kind : null, gran = G.ring !== ring && G.ring?.kind === 'gran';
  haptic(gran || G.praise !== praised && G.praise.pri !== 1 && G.praise.tier !== 'bonk' ? 'big' : judged === 'miss' ? 'miss' : judged ? 'hit' : 'tap');
  padFeedback(b, e); // after the game press: the look never delays the input
}));
// letting go: keys, pad fingers, or the window losing focus (which also pauses)
const letGo = e => { if (G.state === 'play' && !G.paused) settleHold(songTime(eventAt(e))); }; // let go when it happened, like press()
addEventListener('keyup', e => { if (down.keys.delete(e.code)) letGo(e); });
for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, e => { if (down.ptr.delete(e.pointerId)) { syncPad(); letGo(e); } });
addEventListener('blur', releaseAll);
hud.addEventListener('pointermove', e => { // the mouse moves the same focus ring as the arrows
  if (orbitMove(orbit, e.pointerId, e.clientX, e.clientY, pnow())) return; // dragging the view, not choosing
  const b = G.state === 'title' && !viewMode && e.pointerType === 'mouse' && !orbit.ptrs.size && buttonAt(e);
  if (b && b.i !== G.sel) { G.sel = b.i; chip?.sfx('menu'); }
});
hud.addEventListener('pointerdown', e => {
  if (G.state === 'splash') return unlock();
  if (G.state === 'title') {
    const b = !viewMode && buttonAt(e); // «mode foto»: the (unseen) choice is no target, every press steers
    if (b && !orbit.ptrs.size) choose(b.i);
    else if (steers() && (e.pointerType !== 'mouse' || e.button === 0)) {
      orbit.turn = turnFor(W * K);
      orbitDown(orbit, e.pointerId, e.clientX, e.clientY, pnow());
      try { hud.setPointerCapture?.(e.pointerId); } catch { /* already gone */ }
    }
  } else if (G.state === 'results' && clock - G.resT > 1) toTitle();
});
for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, e => { orbitUp(orbit, e.pointerId, pnow()); });
hud.addEventListener('wheel', e => { // the wheel, and a trackpad pinch (ctrlKey: never the page zoom over the canvas)
  if (!steers()) return;
  e.preventDefault();
  orbitZoom(orbit, wheelFactor(e.deltaMode ? e.deltaY * 16 : e.deltaY, e.ctrlKey), pnow());
}, { passive: false });
let gestureScale = 1; // Safari's trackpad pinch (gesture events); on iOS the fingers are pointers already
hud.addEventListener('gesturestart', e => { e.preventDefault(); gestureScale = e.scale || 1; });
hud.addEventListener('gesturechange', e => {
  e.preventDefault();
  if (steers() && !orbit.ptrs.size && e.scale > 0) orbitZoom(orbit, gestureScale / e.scale, pnow());
  gestureScale = e.scale || 1;
});
