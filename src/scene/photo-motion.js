// Scene adapter for manual walking. Existing crowd steering reads the same M/PAIR footprints afterwards.
import { PHOTO, photoBody, movePhoto, clearPhotoKeys } from '../game/photo-control.js';
import { camera, camFocus } from './stage.js';
import { activeCrowd } from './quality.js';
import { photoClearance, photoPairClearance } from './photo-collision.js';
import { photoExtras, updatePhotoExtras, photoFixedClearance, photoEscape } from './photo-obstacles.js';
const photoNearby = [];
function cachePhotoList(list) {
  const b=photoBody(),q=PHOTO.id==='drac-valls'?PHOTO.mula:PHOTO.drac;
  for(const p of list) {
    if(Math.abs(p.pos.x-b.x)<5&&Math.abs(p.pos.y-b.z)<5 || Math.abs(p.gx-b.x)<5&&Math.abs(p.gz-b.z)<5 || PHOTO.pair&&(Math.abs(p.pos.x-q.x)<5&&Math.abs(p.pos.y-q.z)<5 || Math.abs(p.gx-q.x)<5&&Math.abs(p.gz-q.z)<5))photoNearby.push(p);
  }
}
function cachePhotoObstacles() { photoNearby.length=0;cachePhotoList(activeCrowd);cachePhotoList(photoExtras); }
function photoSafe(x, z, yaw, dragon = PHOTO.id === 'drac-valls') {
  let clear = photoFixedClearance(x, z, yaw, dragon);
  for (const p of photoNearby) {
    clear = Math.min(clear, photoClearance(x, z, yaw, p.pos.x, p.pos.y, p.rad, dragon));
    if (Number.isFinite(p.gx)) clear = Math.min(clear, photoClearance(x, z, yaw, p.gx, p.gz, p.rad, dragon));
  }
  if (PHOTO.pair) {
    const other = dragon ? PHOTO.mula : PHOTO.drac;
    clear = Math.min(clear, photoPairClearance(x, z, yaw, other, dragon));
  }
  return clear;
}
export function beginPhoto(m, pair) {
  PHOTO.ready = true;
  Object.assign(PHOTO.mula, { x: m.pos.x, z: m.pos.y, yaw: m.yaw });
  Object.assign(PHOTO.drac, { x: PHOTO.pair ? pair.x : m.pos.x, z: PHOTO.pair ? pair.z : m.pos.y, yaw: PHOTO.pair ? pair.w.face : m.yaw });
}
export function tickPhoto(dt, m, pair, pivot) {
  if (!PHOTO.ready) beginPhoto(m, pair);
  if (PHOTO.pair) {
    if (PHOTO.id === 'drac-valls') { PHOTO.mula.x = m.pos.x; PHOTO.mula.z = m.pos.y; PHOTO.mula.yaw = m.yaw; }
    else { PHOTO.drac.x = pair.x; PHOTO.drac.z = pair.z; PHOTO.drac.yaw = pair.w.face; }
  }
  updatePhotoExtras(dt);
  cachePhotoObstacles();
  if (PHOTO.pair) { yieldPhotoCompanion(dt); if (PHOTO.yielding) { pair.x=PHOTO.drac.x; pair.z=PHOTO.drac.z; } }
  movePhoto(dt, photoSafe, (PHOTO.cameraYaw ?? Math.atan2(camera.position.x - camFocus.x, camera.position.z - camFocus.z)) - Math.PI);
  if (PHOTO.pair && PHOTO.id === 'drac-valls') { pair.x = PHOTO.drac.x; pair.z = PHOTO.drac.z; pair.k = 1; if (!PHOTO.yielding) return; }
  const p = PHOTO.pair ? PHOTO.mula : photoBody(), oldYaw = m.yaw;
  m.pos.set(p.x, p.z); m.yaw = p.yaw; m.yawVel = dt ? Math.atan2(Math.sin(p.yaw - oldYaw), Math.cos(p.yaw - oldYaw)) / dt : 0;
  m.pivot.set(p.x + Math.sin(p.yaw) * pivot, p.z + Math.cos(p.yaw) * pivot);

}
export function endPhoto() { PHOTO.ready = false; PHOTO.yielding = false; clearPhotoKeys(); }

const companionAway = { x:0,y:0,fear:0,set(x,y){this.x=x;this.y=y;} };
function yieldPhotoCompanion(dt) {
  const dragon = PHOTO.id !== 'drac-valls', other = dragon ? PHOTO.drac : PHOTO.mula, p=photoBody();
  photoEscape(other.x,other.z,companionAway);
  const gap=photoPairClearance(p.x,p.z,p.yaw,other,!dragon), speed=Math.min(3.2,Math.max(0,2.4-gap)*2);
  const h=Math.min(dt,0.05), k=1-Math.exp(-h/0.25);
  other.vx+=(companionAway.x*speed-other.vx)*k;other.vz+=(companionAway.y*speed-other.vz)*k;
  PHOTO.yielding=Math.hypot(other.vx,other.vz)>0.015;
  if(!PHOTO.yielding)return;
  const base=Math.min(0,photoSafe(other.x,other.z,other.yaw,dragon)), x=other.x+other.vx*h,z=other.z+other.vz*h;
  if(photoSafe(x,z,other.yaw,dragon)>=base-1e-7){other.x=x;other.z=z;}
  else if(photoSafe(x,other.z,other.yaw,dragon)>=base-1e-7)other.x=x;
  else if(photoSafe(other.x,z,other.yaw,dragon)>=base-1e-7)other.z=z;
}
