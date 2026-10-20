// Photo mode's mouse look (desktop, driving a figure): while a button is held on the world the pointer is locked
// (Pointer Lock API), so the cursor hides and movementX/Y keep coming past the screen's edge, where pointer capture
// stopped. Only for the press: letting go, the browser's own unlock (Escape), blur or anything that drops control
// (PHOTO.mouse = 0) gives the cursor back. Where the lock is missing or refused, the old pointer capture stands in.
// No unadjustedMovement: the look keeps the OS acceleration it always had, and no browser refuses a plain request for it.
import { PHOTO, clearPhotoKeys } from '../game/photo-control.js';
import { hud } from '../hud/canvas.js';

let held = null, skip = false, freedAt = -1e9; // held: the pressed pointer's id; skip: a lock change's first move (it can jump)
export const lookLocked = () => document.pointerLockElement === hud;
function capture() { if (held !== null && PHOTO.mouse) try { hud.setPointerCapture(held); } catch { /* already released */ } }

export function lookDown(e) {
  held = e.pointerId;
  if (lookLocked()) return;
  if (!hud.requestPointerLock) { capture(); return; }
  try { hud.requestPointerLock()?.catch?.(capture); } catch { capture(); } // Chrome/Edge 92+, Safari 18.4+: a promise; Firefox: the event below
}
export function lookUp(e) {
  if (e.buttons & 3) return; // the other button is still down
  held = null;
  if (lookLocked()) document.exitPointerLock();
}
// true: drop this move (the first after a lock change can carry a jump).
export function lookSkip() { const s = skip; skip = false; return s; }
// Every frame: nothing to look with any more (sheet, Escape back, Tab, blur…) = unlock.
export function lookSync() { if (lookLocked() && !(PHOTO.on && PHOTO.mouse)) document.exitPointerLock(); }
// The Escape that unlocked must not also drop the figure (browsers differ on delivering it). true = swallowed.
export function lookEscape() {
  if (lookLocked()) { document.exitPointerLock(); return true; }
  const just = performance.now() - freedAt < 300; freedAt = -1e9; // one Escape at most
  return just;
}
document.addEventListener('pointerlockerror', capture);
document.addEventListener('pointerlockchange', () => {
  skip = true;
  if (lookLocked()) { if (!PHOTO.on || !PHOTO.mouse) document.exitPointerLock(); return; } // let go before it came
  if (PHOTO.mouse) { freedAt = performance.now(); clearPhotoKeys(); } // browser Escape can unlock without delivering keydown
  PHOTO.mouse = 0; held = null;
});
