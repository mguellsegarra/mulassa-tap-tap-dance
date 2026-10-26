// Scene adapter for manual walking. Existing crowd steering reads the same M/PAIR footprints afterwards.
import { PHOTO, photoBody, movePhoto, clearPhotoKeys } from '../game/photo-control.js';
import { camera, camFocus } from './stage.js';
import { activeCrowd } from './quality.js';
import { photoClearance } from './photo-collision.js';
import { photoExtras, updatePhotoExtras, photoFixedClearance } from './photo-obstacles.js';
import { traitsOf } from '../figures/index.js';
const photoNearby = [];
function cachePhotoList(list) {
  const b=photoBody();
  for(const p of list) {
    if(Math.abs(p.pos.x-b.x)<5&&Math.abs(p.pos.y-b.z)<5 || Math.abs(p.gx-b.x)<5&&Math.abs(p.gz-b.z)<5)photoNearby.push(p);
  }
}
function cachePhotoObstacles() { photoNearby.length=0;cachePhotoList(activeCrowd);cachePhotoList(photoExtras); }
function photoSafe(x, z, yaw, dragon = traitsOf(PHOTO.id).wideClearance) {
  let clear = photoFixedClearance(x, z, yaw, dragon);
  for (const p of photoNearby) {
    clear = Math.min(clear, photoClearance(x, z, yaw, p.pos.x, p.pos.y, p.rad, dragon));
    if (Number.isFinite(p.gx)) clear = Math.min(clear, photoClearance(x, z, yaw, p.gx, p.gz, p.rad, dragon));
  }
  return clear;
}
function beginPhoto(m) { // every body starts where the figure on show stands: Tab swaps them in place
  PHOTO.ready = true;
  for (const p of [PHOTO.mula, PHOTO.drac, PHOTO.bou]) Object.assign(p, { x: m.pos.x, z: m.pos.y, yaw: m.yaw });
}
export function tickPhoto(dt, m, pivot) {
  if (!PHOTO.ready) beginPhoto(m);
  updatePhotoExtras(dt);
  cachePhotoObstacles();
  movePhoto(dt, photoSafe, (PHOTO.cameraYaw ?? Math.atan2(camera.position.x - camFocus.x, camera.position.z - camFocus.z)) - Math.PI);
  const p = photoBody(), oldYaw = m.yaw;
  m.pos.set(p.x, p.z); m.yaw = p.yaw; m.yawVel = dt ? Math.atan2(Math.sin(p.yaw - oldYaw), Math.cos(p.yaw - oldYaw)) / dt : 0;
  m.pivot.set(p.x + Math.sin(p.yaw) * pivot, p.z + Math.cos(p.yaw) * pivot);
}
export function endPhoto() { PHOTO.ready = false; clearPhotoKeys(); }
