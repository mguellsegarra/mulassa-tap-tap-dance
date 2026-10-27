import assert from 'node:assert/strict';
import { PHOTO, PHOTO_CAM, PHOTO_RUN, PHOTO_SPIN, photoBody, setPhotoControl, photoKey, clearPhotoKeys, movePhoto, photoLook } from '../../src/game/photo-control.js';
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
for (const tagName of ['BUTTON', 'A', 'SUMMARY', 'INPUT', 'TEXTAREA', 'SELECT']) {
  const actor = PHOTO.id;
  assert.equal(press('Tab', { target: { tagName } }).prevented, false, `${tagName}: native focus navigation`);
  assert.equal(press('Space', { target: { tagName } }).taken, false, `${tagName}: native activation`);
  assert.equal(PHOTO.id, actor, 'focus navigation never changes actor');
}
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
const before = { ...photoBody() };
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
PHOTO.mouse=2; photoLook(100,20); movePhoto(1/60,()=>99);assert(photoBody().yaw<0,'right drag to the right turns her clockwise from behind'); PHOTO.mouse=0;
setPhotoControl(false);const facing=photoBody().yaw;photoLook(50,0);assert.equal(PHOTO.turn,0);
console.log('figure-relative WASD and mouse look ok');

setPhotoControl(true, 'mulassa-valls');
Object.assign(photoBody(), { x: 0, z: 0, yaw: 0 }); press('KeyW'); press('ShiftLeft');
let previousSpeed = 0;
for (let i=0;i<240;i++) {
  movePhoto(1/60,()=>99);
  const speed=Math.hypot(photoBody().vx,photoBody().vz);
  assert(speed>=previousSpeed-1e-9 && speed<=PHOTO_RUN.run+1e-9, 'holding W + Shift accelerates up to its cap'); previousSpeed=speed;
}
assert(previousSpeed>PHOTO_RUN.run-0.1, 'held W + Shift reaches the full gallop');
clearPhotoKeys(); press('KeyD');
movePhoto(1/60,()=>99,Math.PI/2);
assert(photoBody().vz>0 && Math.abs(photoBody().vx)<1e-8, 'D follows screen right even while camera aligns');
press('Space'); assert(PHOTO.action); PHOTO.action=false;
press('Space',{repeat:true}); assert(!PHOTO.action, 'held Space never repeats jumps');
setPhotoControl(true,'drac-valls');press('Space');assert(PHOTO.action,'the Drac jumps on Space too');
setPhotoControl(false); assert(!press('Space').taken, 'game Space remains untouched');
console.log('progressive acceleration, camera lateral axis and isolated Space actions ok');

setPhotoControl(true,'mulassa-valls');
Object.assign(photoBody(),{x:0,z:0,yaw:0});
PHOTO.mouse=1;photoLook(120,0);movePhoto(1/60,()=>99);
assert.equal(photoBody().yaw,0,'left drag only orbits the camera');
// right button with the camera at her side: she swings round to the view, eased and capped (no snap), at any frame rate
for (const fps of [30,60,120]) {
  Object.assign(photoBody(),{yaw:0}); PHOTO.cameraYaw=Math.PI+Math.PI/2; PHOTO.mouse=2; let worst=0, t=0;
  for(;t<1;t+=1/fps){const y=photoBody().yaw;movePhoto(1/fps,()=>99);worst=Math.max(worst,Math.abs(photoBody().yaw-y));}
  assert(worst<=PHOTO_CAM.alignRate/fps+1e-9, `a quarter turn never jumps (${worst.toFixed(3)} rad in a frame at ${fps} FPS)`);
  assert(Math.abs(photoBody().yaw-Math.PI/2)<0.01, 'right drag ends facing the view');
}
PHOTO.mouse=0;
PHOTO.mouse=3;
for(let i=0;i<60;i++)movePhoto(1/60,()=>99);
assert(Math.hypot(photoBody().x,photoBody().z)>.8,'both mouse buttons walk forwards');
clearPhotoKeys();assert.equal(PHOTO.mouse,0,'blur clears mouse walking as well as keys');
setPhotoControl(false);
console.log('free orbit, right-drag steering and two-button walking ok');

setPhotoControl(true,'mulassa-valls');
Object.assign(photoBody(),{x:0,z:0,yaw:0});press('KeyW');press('KeyD');
for(let i=0;i<240;i++) movePhoto(1/60,(x,z)=>x+0.2);
assert(photoBody().x>=-0.2 && photoBody().z>2,'diagonal motion slides along a wall instead of sticking');
PHOTO.keys.delete('KeyD'); PHOTO.keys.delete('KeyW');press('KeyS');
for(let i=0;i<120;i++)movePhoto(1/60,(x,z)=>x+0.2);
assert(photoBody().vz<0,'can back away from a boundary');setPhotoControl(false);
console.log('collision sliding and retreat from a boundary ok');

setPhotoControl(true,'mulassa-valls');Object.assign(photoBody(),{x:0,z:0,yaw:0});PHOTO.turn=1;
movePhoto(1/60,(x,z,yaw)=>yaw>.4&&yaw<.6?-1:1);
assert(photoBody().yaw<=.4,'turning tests the swept angles rather than only the end pose');setPhotoControl(false);
console.log('rotational collision sweep ok');

for(const fps of [30,60,120]) {
  setPhotoControl(true,'mulassa-valls');Object.assign(photoBody(),{x:0,z:0,yaw:0});press('KeyW');
  for(let i=0;i<fps/2;i++)movePhoto(1/fps,()=>99);
  assert(photoBody().vz>2.47,'quick progressive start');
  PHOTO.keys.delete('KeyW');press('KeyS');
  for(let i=0;i<fps/10;i++)movePhoto(1/fps,()=>99);
  assert(photoBody().vz<0,'reversal brakes before accelerating backwards');
}
setPhotoControl(false);
console.log('responsive acceleration and reversal at 30/60/120 FPS ok');

for (const fps of [30,60,120]) {
  setPhotoControl(true,'mulassa-valls');
  Object.assign(photoBody(),{x:0,z:0,yaw:0});
  PHOTO.mouse=1; photoLook(150,0);
  movePhoto(1/fps,()=>99);
  assert.equal(photoBody().yaw,0,'left orbit at rest preserves heading');
  press('KeyW');
  for(let i=0;i<fps;i++)movePhoto(1/fps,()=>99);
  assert.equal(photoBody().yaw,0,'W plus LMB preserves heading at every frame rate');
  assert.equal(photoBody().x,0,'LMB cannot redirect walking');
  assert(photoBody().z>1,'W still advances');
  PHOTO.keys.delete('KeyW');const heading=photoBody().yaw;
  photoLook(100,0);movePhoto(1/fps,()=>99);
  assert.equal(photoBody().yaw,heading,'releasing W restores free orbit');
  press('KeyW');clearPhotoKeys();movePhoto(1/fps,()=>99);
  assert.equal(photoBody().yaw,heading,'blur cancels left-drag steering');
}
setPhotoControl(false);
console.log('LMB preserves heading while advancing and at rest ok');

// Like WoW: walking forward swings the camera round behind her; mouse look keeps it where the player put it.
{
  setPhotoControl(true,'mulassa-valls'); Object.assign(photoBody(),{x:0,z:0,yaw:0});
  PHOTO.cameraYaw = Math.PI + 1; photoLook(1, 0); press('KeyW');
  for (let i = 0; i < 60; i++) movePhoto(1/60, () => 99);
  assert.equal(PHOTO.cameraYaw, Math.PI + 1 - 0.003, 'just after mouse look the view is the player\'s');
  for (let i = 0; i < 60; i++) movePhoto(1/60, () => 99);
  const off = Math.abs(Math.atan2(Math.sin(PHOTO.cameraYaw - Math.PI - photoBody().yaw), Math.cos(PHOTO.cameraYaw - Math.PI - photoBody().yaw)));
  assert(off < 0.5 && off > 0.05, `W eases the camera behind her, gently: ${off}`);
  PHOTO.mouse = 1; const held = PHOTO.cameraYaw; movePhoto(1/60, () => 99);
  assert.equal(PHOTO.cameraYaw, held, 'left-drag look is never overridden');
  clearPhotoKeys(); PHOTO.cameraYaw = Math.PI + 1; movePhoto(1/60, () => 99);
  assert.equal(PHOTO.cameraYaw, Math.PI + 1, 'standing still never moves the camera');
  // switching figures from a frame keeps the spot and the view; re-taking the same one starts fresh
  Object.assign(photoBody(),{x:2,z:-1,yaw:0.5}); setPhotoControl(true,'drac-valls');
  assert(PHOTO.drac.x === 2 && PHOTO.drac.z === -1 && PHOTO.drac.yaw === 0.5 && PHOTO.cameraYaw === Math.PI + 1);
  setPhotoControl(true,'drac-valls'); assert.equal(PHOTO.cameraYaw, null);
  setPhotoControl(false);
}
console.log('camera follows forward walking, figure switch keeps the spot ok');

// Shift is a held speed modifier for either figure, in every WASD direction.
{
  const speedAfter = (codes, s) => {
    setPhotoControl(true,'mulassa-valls'); Object.assign(photoBody(),{x:0,z:0,yaw:0}); codes.forEach(c => press(c));
    for (let i = 0; i < s * 60; i++) movePhoto(1/60, () => 99);
    return Math.hypot(photoBody().vx, photoBody().vz);
  };
  assert(Math.abs(speedAfter(['KeyW'], 2) - PHOTO_RUN.trot) < 0.001, 'W alone keeps walking');
  const early = speedAfter(['KeyW', 'ShiftLeft'], 0.3), full = speedAfter(['KeyW', 'ShiftLeft'], 1.5);
  assert(early > 2 && early < 5 && full > 8.5, `trot first, then a gallop: ${early} → ${full}`);
  assert(speedAfter(['KeyD'], 2) <= PHOTO_RUN.trot + 1e-9 && speedAfter(['KeyS'], 2) <= PHOTO_RUN.trot + 1e-9, 'strafe/back never gallop');
  PHOTO.keys.clear(); for (let i = 0; i < 30; i++) movePhoto(1/60, () => 99);
  assert(photoBody().sprint === 0 && Math.hypot(photoBody().vx, photoBody().vz) < 0.2, 'letting go stops the run quickly');
  setPhotoControl(false);
}
console.log('Shift builds walking into a gallop ok');

for (const id of ['mulassa-valls', 'drac-valls']) for (const fps of [30, 60, 120]) {
  const step = seconds => { for (let i = 0; i < seconds * fps; i++) movePhoto(1 / fps, () => 99); };
  setPhotoControl(true, id, false); Object.assign(photoBody(), { x: 0, z: 0, yaw: 0 });
  press('ShiftLeft'); step(2);
  assert.equal(PHOTO.speed, 0, 'Shift alone never moves');
  assert(!PHOTO.action && !PHOTO.sparks && !photoBody().spinLeft, 'Shift alone starts no action');
  press('KeyW'); step(2);
  assert(Math.abs(PHOTO.speed - 9) < 0.001, `${id}/${fps}: Shift before W runs`);
  press('ShiftRight'); PHOTO.keys.delete('ShiftLeft'); step(0.5);
  assert(Math.abs(PHOTO.speed - 9) < 0.001, 'releasing one Shift keeps the other held');
  PHOTO.keys.delete('ShiftRight');
  let before = PHOTO.speed;
  for (let i = 0; i < fps; i++) {
    movePhoto(1 / fps, () => 99);
    assert(PHOTO.speed <= before + 1e-9 && before - PHOTO.speed < 1.2, 'run to walk eases down without a speed jump');
    before = PHOTO.speed;
  }
  assert(Math.abs(PHOTO.speed - 3.2) < 0.01, 'releasing the last Shift returns to walking with W still held');
  press('ShiftRight'); step(2);
  assert(PHOTO.speed > 8.99, 'W before Shift runs too');
  PHOTO.keys.delete('KeyW'); step(0.5);
  assert(PHOTO.speed < 0.02 && !photoBody().sprint, 'Shift stays held while releasing movement brakes to rest');
  for (const codes of [['KeyD'], ['KeyS'], ['KeyA'], ['KeyW', 'KeyD'], ['KeyS', 'KeyA']]) {
    clearPhotoKeys(); press('ShiftLeft'); codes.forEach(c => press(c)); step(2);
    assert(Math.abs(PHOTO.speed - 9) < 0.001, `${codes}: normalized run in every direction`);
  }
  clearPhotoKeys(); press('KeyW'); press('ShiftLeft'); step(2); PHOTO.air = true;
  const flight = { vx: photoBody().vx, vz: photoBody().vz, sprint: photoBody().sprint };
  PHOTO.keys.delete('ShiftLeft'); press('KeyD'); step(0.2);
  assert.deepEqual({ vx: photoBody().vx, vz: photoBody().vz, sprint: photoBody().sprint }, flight, 'Shift release in flight preserves takeoff momentum');
  PHOTO.air = false; step(1);
  assert(Math.abs(PHOTO.speed - 3.2) < 0.01, 'landing picks up walking intent');
  for (const codes of [['KeyE', 'ShiftLeft', 'KeyW'], ['KeyW', 'ShiftRight', 'KeyE']]) {
    clearPhotoKeys(); codes.forEach(c => press(c)); PHOTO.mouse = 2; PHOTO.cameraYaw = photoBody().yaw + Math.PI + 0.5; step(1.5);
    assert(PHOTO.speed > 8.9 && PHOTO.keys.has('KeyE'), 'RMB steering, held E and running coexist in either key order');
    assert.equal(PHOTO.sparks, id === 'drac-valls', 'Drac fire remains held through Shift and RMB');
  }
  const actor = PHOTO.id;
  assert.equal(press('Tab', { shiftKey: true }).prevented, false, 'ShiftTab keeps native backwards navigation');
  assert(PHOTO.id === actor && !PHOTO.keys.size && !PHOTO.speed, 'ShiftTab releases motion without changing figure');
  for (const target of [{ tagName: 'BUTTON' }, { tagName: 'TEXTAREA' }, { tagName: 'DIV', closest: () => ({ role: 'dialog' }) }]) {
    press('ShiftLeft'); press('KeyW');
    assert(!press('ShiftRight', { target }).taken && !PHOTO.keys.size, 'controls and modals reject and clear held Shift');
  }
  press('ShiftLeft'); press('KeyW'); press('Tab');
  assert(!PHOTO.keys.size && !photoBody().sprint, 'switching figure clears Shift');
  press('ShiftRight'); setPhotoControl(false);
  assert(!PHOTO.keys.size && !press('ShiftLeft').taken, 'outside free control Shift is inactive');
}
console.log('both Shift keys, walk/run transitions, navigation, E/RMB, flight and resets at 30/60/120 FPS ok');

// R: the Mulassa's culada turns her half round, always the same way: R R = a full turn; the Drac's E is a spark burst, held.
{
  setPhotoControl(true,'mulassa-valls'); Object.assign(photoBody(),{x:0,z:0,yaw:0});
  assert(press('KeyR').prevented);
  let culada = false, t = 0;
  for (; photoBody().spinLeft && t < 2; t += 1/60) { movePhoto(1/60, () => -1); culada ||= PHOTO.culada !== 0; } // (blocked everywhere: it still goes round)
  assert(culada && PHOTO.culada === 0 && t > 0.35 && t < 0.7, `the culada flags the crowd while it turns, then ends (${t.toFixed(2)} s)`);
  assert(Math.abs(photoBody().yaw - Math.PI) < 1e-9, `half a turn: ${photoBody().yaw}`);
  press('KeyR', { repeat: true }); assert.equal(photoBody().spinLeft, 0, 'held R never repeats');
  press('KeyR'); for (let i = 0; i < 6; i++) movePhoto(1/60, () => 99); press('KeyR'); // the second R mid-turn: it carries on round
  let worst = 0; for (let i = 0; i < 120; i++) { const y = photoBody().yaw; movePhoto(1/60, () => 99); worst = Math.max(worst, photoBody().yaw - y); }
  assert(Math.abs(photoBody().yaw - 3 * Math.PI) < 1e-9 && worst <= PHOTO_SPIN.rate / 60 + 1e-9, 'R R is a full turn, the same way, without a stop or a jump');
  setPhotoControl(true,'drac-valls'); press('KeyE');
  assert(PHOTO.sparks && PHOTO.keys.has('KeyE') && PHOTO.drac.spinLeft === 0, 'Drac E sparks (held), no turn');
  press('KeyR'); assert.equal(PHOTO.drac.spinLeft, Math.PI, 'Drac R: half a turn too');
  setPhotoControl(true,'mulassa-valls'); press('KeyQ'); press('KeyE');
  assert(PHOTO.keys.has('KeyQ') && PHOTO.keys.has('KeyE') && !PHOTO.sparks && PHOTO.mula.spinLeft === 0, 'Mulassa Q/E are held poses, not a turn');
  clearPhotoKeys(); assert(!PHOTO.sparks && !PHOTO.keys.size, 'blur ends the sparks');
  setPhotoControl(false);
}
console.log('culada and Drac sparks input ok');

// The culada while moving with the camera: nothing undoes or fights it.
{
  const turnWith = (setup) => {
    setPhotoControl(true,'mulassa-valls'); Object.assign(photoBody(),{x:0,z:0,yaw:0}); PHOTO.cameraYaw = Math.PI; PHOTO.lookAge = 9;
    setup(); press('KeyR'); const cam0 = PHOTO.cameraYaw;
    const step = () => movePhoto(1/60, () => 99, PHOTO.cameraYaw - Math.PI); // the view's yaw, as photo-motion.js passes it
    for (let i = 0; i < 60; i++) step(); // the turn (~0.5 s)
    const camAtEnd = PHOTO.cameraYaw;
    for (let i = 0; i < 36; i++) step(); // a moment more (< followWait), keys/buttons still held
    const cam = PHOTO.cameraYaw;
    for (let i = 0; i < 240; i++) step();
    return { yaw: photoBody().yaw, cam0, camAtEnd, cam, later: PHOTO.cameraYaw };
  };
  const rmb = turnWith(() => { PHOTO.mouse = 2; press('KeyW'); });
  assert(Math.abs(rmb.yaw - Math.PI) < 1e-6, `right button held: she stays turned round (${rmb.yaw.toFixed(3)})`);
  assert(Math.abs(rmb.camAtEnd - rmb.cam0 - Math.PI) < 1e-6, 'and the mouse-look camera turned with her');
  const stick = turnWith(() => { PHOTO.stickY = 1; });
  assert(Math.abs(stick.yaw - Math.PI) < 1e-6, `touch stick held: the culada is not half undone (${stick.yaw.toFixed(3)})`);
  assert(stick.camAtEnd === stick.cam0 && stick.cam === stick.cam0, `nor does the camera turn with her ${JSON.stringify(stick)}`);
  assert(photoBody().vz < 0, 'the same push walks where she now faces');
  PHOTO.stickY = 0;
  const keysOnly = turnWith(() => { press('KeyW'); });
  assert(Math.abs(keysOnly.yaw - Math.PI) < 1e-6, 'W held: a clean half turn');
  assert(keysOnly.camAtEnd === keysOnly.cam0 && keysOnly.cam === keysOnly.cam0, `the camera holds still through it and a moment after ${JSON.stringify(keysOnly)}`);
  assert(Math.abs(Math.atan2(Math.sin(keysOnly.later - keysOnly.yaw - Math.PI), Math.cos(keysOnly.later - keysOnly.yaw - Math.PI))) < 0.3, 'then it recenters behind her, unhurried');
  setPhotoControl(false);
}
console.log('culada while moving with mouse look or keys ok');

// Airborne: the velocity she jumped with stays as it is (no steering, no gallop build-up) until she lands.
{
  setPhotoControl(true,'mulassa-valls'); Object.assign(photoBody(),{x:0,z:0,yaw:0}); press('KeyW');
  for (let i = 0; i < 30; i++) movePhoto(1/60, () => 99);
  const v0 = photoBody().vz, s0 = photoBody().sprint, z0 = photoBody().z; PHOTO.air = true; PHOTO.keys.delete('KeyW'); press('KeyS');
  for (let i = 0; i < 12; i++) movePhoto(1/60, () => 99);
  assert(photoBody().vz === v0 && photoBody().sprint === s0, 'in the air S neither brakes nor turns the run');
  assert(Math.abs(photoBody().z - z0 - v0 * 12 / 60) < 1e-9, 'she flies on at that speed');
  PHOTO.air = false; for (let i = 0; i < 30; i++) movePhoto(1/60, () => 99);
  assert(photoBody().vz < 0, 'landed, the keys work again');
  setPhotoControl(false);
}
console.log('airborne momentum ok');
