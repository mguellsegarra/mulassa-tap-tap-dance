import assert from 'node:assert/strict';
import { PHOTO, photoBody, setPhotoControl, photoKey, clearPhotoKeys, movePhoto, photoLook } from '../src/game/photo-control.js';
const press = (code, more = {}, allowed = true) => {
  let prevented = false;
  const taken = photoKey({ code, target: { tagName: 'BODY' }, preventDefault() { prevented = true; }, ...more }, allowed);
  return { taken, prevented };
};
assert.equal(press('Tab').taken, false);
setPhotoControl(true);
assert.equal(press('KeyW', { target: { tagName: 'TEXTAREA' } }).taken, false);
assert.equal(press('Tab', {}, false).taken, false);
assert.equal(press('KeyW', { ctrlKey: true }).taken, false);
const travel = (fps, diagonal = false) => {
  clearPhotoKeys(); PHOTO.id = 'mulassa-valls';
  Object.assign(photoBody(), { x: 0, z: 0, yaw: 0, vx: 0, vz: 0 });
  press('KeyW'); if (diagonal) press('KeyD');
  for (let i = 0; i < fps * 3; i++) movePhoto(1 / fps, () => 99);
  return Math.hypot(photoBody().x, photoBody().z);
};
for (const fps of [30, 60, 120]) {
  assert(Math.abs(travel(fps) - travel(120)) < 1e-8, `same speed at ${fps} FPS`);
  assert(Math.abs(travel(fps, true) - travel(fps)) < 1e-8, 'normalized diagonal');
}
clearPhotoKeys(); assert.equal(PHOTO.keys.size, 0); assert.equal(photoBody().vz, 0);
PHOTO.pair = false; const before = { ...photoBody() };
assert(press('Tab').prevented); assert.equal(PHOTO.id, 'drac-valls'); assert.equal(photoBody().x, before.x);
press('Tab', { repeat: true }); assert.equal(PHOTO.id, 'drac-valls');
Object.assign(photoBody(), { x: 0, z: 0 });
press('KeyW'); for (let i = 0; i < 600; i++) movePhoto(1 / 60, (x, z) => 4 - z);
assert(photoBody().z <= 4, 'cannot cross a solid boundary');
setPhotoControl(false); assert.equal(PHOTO.keys.size, 0); assert.equal(press('Tab').prevented, false);
console.log('photo input, normalized movement, frame-rate independence and collision limits ok');

for (const [code,x,z] of [['KeyW',0,1],['KeyS',0,-1],['KeyA',1,0],['KeyD',-1,0]]) {
  setPhotoControl(true); Object.assign(photoBody(),{x:0,z:0,yaw:0,vx:0,vz:0}); press(code);
  for(let i=0;i<60;i++) movePhoto(1/60,()=>99);
  assert.equal(photoBody().yaw,0, 'strafing/backwards never turns the figure');
  assert(photoBody().x*x+photoBody().z*z>0.8,code+' follows figure orientation');
}
photoLook(100,20); movePhoto(1/60,()=>99);assert(photoBody().yaw<0,'mouse right turns clockwise from behind');
setPhotoControl(false);const facing=photoBody().yaw;photoLook(50,0);assert.equal(PHOTO.turn,0);
console.log('figure-relative WASD and mouse look ok');

setPhotoControl(true, 'mulassa-valls', false);
Object.assign(photoBody(), { x: 0, z: 0, yaw: 0 }); press('KeyW');
let previousSpeed = 0;
for (let i=0;i<240;i++) {
  movePhoto(1/60,()=>99);
  const speed=Math.hypot(photoBody().vx,photoBody().vz);
  assert(speed>=previousSpeed && speed<=2.6, 'holding W accelerates up to its cap'); previousSpeed=speed;
}
assert(previousSpeed>2.5);
clearPhotoKeys(); press('KeyD');
movePhoto(1/60,()=>99,Math.PI/2);
assert(photoBody().vz>0 && Math.abs(photoBody().vx)<1e-8, 'D follows screen right even while camera aligns');
press('Space'); assert(PHOTO.action); PHOTO.action=false;
press('Space',{repeat:true}); assert(!PHOTO.action, 'held Space never repeats jumps');
setPhotoControl(true,'drac-valls',false);press('Space');assert(PHOTO.drac.fire>1);
setPhotoControl(false); assert(!press('Space').taken, 'game Space remains untouched');
console.log('progressive acceleration, camera lateral axis and isolated Space actions ok');

setPhotoControl(true,'mulassa-valls',false);
Object.assign(photoBody(),{x:0,z:0,yaw:0});
photoLook(120,0,false);movePhoto(1/60,()=>99);
assert.equal(photoBody().yaw,0,'left drag only orbits the camera');
const orbitYaw=PHOTO.cameraYaw;
photoLook(0,0,true);movePhoto(1/60,()=>99);
assert(Math.abs(photoBody().yaw-(orbitYaw-Math.PI))<1e-8,'right drag aligns figure with view');
PHOTO.mouse=3;
for(let i=0;i<60;i++)movePhoto(1/60,()=>99);
assert(Math.hypot(photoBody().x,photoBody().z)>.8,'both mouse buttons walk forwards');
clearPhotoKeys();assert.equal(PHOTO.mouse,0,'blur clears mouse walking as well as keys');
setPhotoControl(false);
console.log('free orbit, right-drag steering and two-button walking ok');

setPhotoControl(true,'mulassa-valls',false);
Object.assign(photoBody(),{x:0,z:0,yaw:0});press('KeyW');press('KeyD');
for(let i=0;i<240;i++) movePhoto(1/60,(x,z)=>x+0.2);
assert(photoBody().x>=-0.2 && photoBody().z>2,'diagonal motion slides along a wall instead of sticking');
PHOTO.keys.delete('KeyD'); PHOTO.keys.delete('KeyW');press('KeyS');
for(let i=0;i<120;i++)movePhoto(1/60,(x,z)=>x+0.2);
assert(photoBody().vz<0,'can back away from a boundary');setPhotoControl(false);
console.log('collision sliding and retreat from a boundary ok');

setPhotoControl(true,'mulassa-valls',false);Object.assign(photoBody(),{x:0,z:0,yaw:0});PHOTO.turn=1;
movePhoto(1/60,(x,z,yaw)=>yaw>.4&&yaw<.6?-1:1);
assert(photoBody().yaw<=.4,'turning tests the swept angles rather than only the end pose');setPhotoControl(false);
console.log('rotational collision sweep ok');

for(const fps of [30,60,120]) {
  setPhotoControl(true,'mulassa-valls',false);Object.assign(photoBody(),{x:0,z:0,yaw:0});press('KeyW');
  for(let i=0;i<fps/2;i++)movePhoto(1/fps,()=>99);
  assert(photoBody().vz>2.47,'quick progressive start');
  PHOTO.keys.delete('KeyW');press('KeyS');
  for(let i=0;i<fps/10;i++)movePhoto(1/fps,()=>99);
  assert(photoBody().vz<0,'reversal brakes before accelerating backwards');
}
setPhotoControl(false);
console.log('responsive acceleration and reversal at 30/60/120 FPS ok');

for (const fps of [30,60,120]) {
  setPhotoControl(true,'mulassa-valls',false);
  Object.assign(photoBody(),{x:0,z:0,yaw:0});
  PHOTO.mouse=1; photoLook(150,0,false);
  movePhoto(1/fps,()=>99);
  assert.equal(photoBody().yaw,0,'left orbit at rest preserves heading');
  press('KeyW');
  for(let i=0;i<fps;i++)movePhoto(1/fps,()=>99);
  assert(Math.abs(photoBody().yaw+.45)<.001,'W plus left drag aligns smoothly at every frame rate');
  assert(photoBody().x<-.5 && photoBody().z>1,'walking follows the new heading');
  PHOTO.keys.delete('KeyW');const heading=photoBody().yaw;
  photoLook(100,0,false);movePhoto(1/fps,()=>99);
  assert.equal(photoBody().yaw,heading,'releasing W restores free orbit');
  press('KeyW');clearPhotoKeys();movePhoto(1/fps,()=>99);
  assert.equal(photoBody().yaw,heading,'blur cancels left-drag steering');
}
setPhotoControl(false);
console.log('left drag steers while advancing and freely orbits at rest ok');
