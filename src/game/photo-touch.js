// Photo mode on a touch screen, like a phone action game: a floating stick under the left thumb (analog WASD,
// PHOTO.stickX/Y: movePhoto walks it from the camera and turns her to it) and a drag to look under the right one
// (PHOTO.lookDX/Y, eased in by movePhoto). One finger each, tracked by pointerId. While the look thumb is down the
// camera is the player's (PHOTO.mouse bit 1: no recentering behind her). Anything that drops control
// (clearPhotoKeys: blur, Tab, leaving the mode) bumps PHOTO.inputEpoch, which drops both fingers too.
import { PHOTO, photoBody } from './photo-control.js';

// radius: css px of reach; dead: the first 12% does nothing (a resting thumb); curve > 1: finer near the centre (a slow
// walk), full at the rim; look: the y drag counts less (pitch has little range). TOUCH.lookScale: set per screen (photo-stick.js).
export const STICK = { radius: 60, dead: 0.12, curve: 1.25, lookY: 0.7, turn: 3.3 }; // turn: radians for a drag across the whole screen
// Thumb ids are pointerIds: iOS gives large negative ones, so "no thumb" is null, never -1.
export const TOUCH = { stick: { id: null, ox: 0, oy: 0, dx: 0, dy: 0 }, look: { id: null, x: 0, y: 0 }, epoch: -1, lookScale: 1 };

function touchSteer() { PHOTO.mouse = TOUCH.look.id !== null ? 1 : 0; }
function touchStale() { // control was dropped under the fingers: they steer nothing until lifted and put down again
  if (TOUCH.epoch === PHOTO.inputEpoch) return false;
  touchReset(); return true;
}
export function touchReset() {
  const steering = TOUCH.look.id !== null;
  TOUCH.stick.id = TOUCH.look.id = null; TOUCH.stick.dx = TOUCH.stick.dy = 0;
  PHOTO.stickX = PHOTO.stickY = 0;
  if (steering) PHOTO.mouse = 0;
  TOUCH.epoch = PHOTO.inputEpoch;
}
// left: the finger landed on the stick's half. true = this finger is now tracked.
export function touchDown(id, x, y, left) {
  if (!PHOTO.on) return false;
  touchStale();
  const f = left ? TOUCH.stick : TOUCH.look;
  if (f.id !== null) return false; // a second thumb on the same half does nothing
  f.id = id;
  if (left) { f.ox = x; f.oy = y; f.dx = f.dy = 0; } else { f.x = x; f.y = y; }
  PHOTO.cameraYaw ??= photoBody().yaw + Math.PI; // the view the stick walks from: where it already is
  touchSteer(); return true;
}
export function touchMove(id, x, y) {
  if (touchStale()) return false;
  const s = TOUCH.stick, l = TOUCH.look;
  if (id === s.id) {
    let dx = x - s.ox, dy = y - s.oy;
    const d = Math.hypot(dx, dy), r = STICK.radius;
    if (d > r) { const k = 1 - r / d; s.ox += dx * k; s.oy += dy * k; dx -= dx * k; dy -= dy * k; } // past the ring the base follows the thumb (nipplejs' follow): turning back is instant
    s.dx = dx; s.dy = dy;
    const m = Math.min(1, d / r), amount = m <= STICK.dead ? 0 : ((m - STICK.dead) / (1 - STICK.dead)) ** STICK.curve; // radial dead zone, rescaled
    PHOTO.stickX = d ? dx / Math.min(d, r) * amount : 0; PHOTO.stickY = d ? -dy / Math.min(d, r) * amount : 0; // screen up = forward
    return true;
  }
  if (id === l.id) { PHOTO.lookDX += (x - l.x) * TOUCH.lookScale; PHOTO.lookDY += (y - l.y) * TOUCH.lookScale * STICK.lookY; l.x = x; l.y = y; return true; }
  return false;
}
export function touchUp(id) {
  if (touchStale()) return false;
  if (id === TOUCH.stick.id) { TOUCH.stick.id = null; TOUCH.stick.dx = TOUCH.stick.dy = 0; PHOTO.stickX = PHOTO.stickY = 0; }
  else if (id === TOUCH.look.id) TOUCH.look.id = null;
  else return false;
  touchSteer(); return true;
}
