// Photo mode's touch stick and look (src/game/photo-touch.js + movePhoto): dead zone, curve, reach, follow, two thumbs
// at once, cancelling, and the action-game walk: the stick walks from the camera and she turns to where she walks.
import assert from 'node:assert/strict';
import { PHOTO, PHOTO_RUN, photoBody, setPhotoControl, clearPhotoKeys, movePhoto } from '../src/game/photo-control.js';
import { STICK, TOUCH, touchDown, touchMove, touchUp, touchReset } from '../src/game/photo-touch.js';

const r = STICK.radius, near = x => Math.abs(x) < 1e-9;
const shaped = m => ((m - STICK.dead) / (1 - STICK.dead)) ** STICK.curve; // what a push of m (0..1 of the ring) gives
assert.equal(touchDown(1, 100, 300, true), false, 'no driving, no stick');

setPhotoControl(true, 'mulassa-valls'); Object.assign(photoBody(), { x: 0, z: 0, yaw: 0 });
assert(touchDown(1, 100, 300, true) && PHOTO.mouse === 0, 'a thumb on the left takes the stick; the camera stays free to follow her');
touchMove(1, 100, 300 - r * STICK.dead * 0.9);
assert.equal(PHOTO.stickY, 0, 'inside the dead zone: nothing');
touchMove(1, 100, 300 - r * 0.5);
assert(near(PHOTO.stickY - shaped(0.5)) && PHOTO.stickX === 0, 'past it the reach is rescaled from 0 and curved (screen up = forward)');
assert(shaped(0.5) < 0.5, 'the curve keeps a half push slower than half: a fine walk near the centre');
touchMove(1, 100 + r * 3, 300);
assert(near(PHOTO.stickX - 1) && near(TOUCH.stick.dx - r), 'beyond the ring: full reach, the knob stays on it');
assert(near(TOUCH.stick.ox - (100 + r * 2)), 'and the base follows the thumb, so turning back is instant');
touchMove(1, 100 + r * 1.5, 300);
assert(near(PHOTO.stickX + shaped(0.5)), 'half a ring back the other way: it points back at once (no dead travel to undo)');
touchMove(1, 100 + r * 3, 300);
assert(!touchDown(2, 150, 280, true), 'a second thumb on the stick half does nothing');

// The look thumb works at the same time, by its own pointer, eased in over the frames (not in 60 Hz steps).
const yaw = PHOTO.cameraYaw;
assert(touchDown(3, 600, 200, false) && PHOTO.mouse === 1, 'the look thumb holds the camera (no recentering under it)');
touchMove(3, 640, 200);
assert(PHOTO.lookDX === 40 && PHOTO.cameraYaw === yaw, 'a drag is queued, not jumped to');
PHOTO.stickX = PHOTO.stickY = 0; // (look only for this part)
movePhoto(1 / 120, () => 99);
const first = yaw - PHOTO.cameraYaw;
assert(first > 0 && PHOTO.lookDX > 0, 'dragging right turns the view, part of it this frame');
for (let i = 0; i < 60; i++) movePhoto(1 / 120, () => 99);
assert(PHOTO.lookDX === 0 && near((yaw - PHOTO.cameraYaw) - 40 * 0.003), 'and all of it within half a second, exactly the drag');
touchMove(2, 999, 999); // the ignored thumb moves nothing
assert(touchUp(1) && PHOTO.stickX === 0 && PHOTO.stickY === 0 && PHOTO.mouse === 1, 'lifting the stick stops her; the look keeps the camera');
assert(touchUp(3) && PHOTO.mouse === 0, 'both up: free');
assert(!touchUp(3), 'an unknown or lifted pointer is ignored');

// The walk: the stick points from the camera and she turns to face where she goes.
{
  touchReset(); Object.assign(photoBody(), { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, sprint: 0 });
  const camYaw = -Math.PI / 2; // the camera on her -X side, looking along +X
  touchDown(4, 100, 300, true); touchMove(4, 100, 300 - r * 0.8);
  for (let i = 0; i < 120; i++) movePhoto(1 / 60, () => 99, camYaw - Math.PI);
  const b = photoBody();
  assert(b.x > 1 && Math.abs(b.z) < 0.2, `stick up walks away from the camera, whatever her heading was: ${b.x.toFixed(2)}, ${b.z.toFixed(2)}`);
  assert(Math.abs(Math.atan2(Math.sin(b.yaw - Math.PI / 2), Math.cos(b.yaw - Math.PI / 2))) < 0.01, 'and she has turned to face it');
  touchUp(4);
}

// iOS hands out large negative pointerIds: a thumb with one is still a thumb (it once read as "no thumb").
{
  touchReset();
  assert(touchDown(-152773408, 100, 300, true) && TOUCH.stick.id === -152773408, 'a negative id takes the stick');
  assert(!touchDown(-152773409, 120, 300, true), 'and holds it against a second thumb');
  touchMove(-152773408, 100, 300 - r);
  assert(PHOTO.stickY > 0.99 && TOUCH.stick.ox === 100, 'it steers');
  assert(touchUp(-152773408) && TOUCH.stick.id === null && PHOTO.stickY === 0, 'and lets go');
}

// Analog: a part push walks slower than the trot; the rim builds the gallop as Shift does.
const speed = (y, s = 2) => {
  touchReset(); Object.assign(photoBody(), { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, sprint: 0 });
  touchDown(5, 100, 300, true); touchMove(5, 100, 300 - y);
  for (let i = 0; i < s * 60; i++) movePhoto(1 / 60, () => 99);
  const v = Math.hypot(photoBody().vx, photoBody().vz); touchUp(5); return v;
};
assert(Math.abs(speed(r * 0.5) - PHOTO_RUN.trot * shaped(0.5)) < 1e-3, 'half reach: the curved share of the walk');
assert(Math.abs(speed(r) - PHOTO_RUN.run) < 1e-3, 'the rim gallops');

// Anything that drops control (blur, Tab, leaving) drops the thumbs and the queued look until put down again.
touchDown(6, 100, 300, true); touchMove(6, 100, 300 - r); touchDown(8, 600, 200, false); touchMove(8, 650, 200);
clearPhotoKeys();
assert(PHOTO.stickY === 0 && PHOTO.lookDX === 0);
assert(!touchMove(6, 100, 300 - r) && PHOTO.stickY === 0 && TOUCH.stick.id === null && TOUCH.look.id === null, 'a dropped thumb steers nothing');
assert(touchDown(7, 100, 300, true), 'a fresh thumb takes it again');
setPhotoControl(false);
assert(!touchMove(7, 100, 300 - r) && PHOTO.stickY === 0 && PHOTO.mouse === 0, 'leaving photo mode cancels it');
console.log('photo touch: dead zone, curve, follow, eased look, camera-relative walk, two thumbs, cancelling ok');
