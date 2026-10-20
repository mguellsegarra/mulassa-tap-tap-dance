// Photo-mode input and figure-relative locomotion. No selection, audio or persistence writes.
export const PHOTO = { on: false, ready: false, id: 'mulassa-valls', keys: new Set(), pair: false, turn: 0, pitch: 0.34, action: false, mouse: 0, cameraYaw: null, zoom:11,
  speed: 0, air: false, lookAge: 9, culada: 0, spinDir: 1, sparks: false, mula: { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, fire: 0, sprint: 0, spinLeft: 0, spinV: 0 }, drac: { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, fire: 0, sprint: 0, spinLeft: 0, spinV: 0 } };
// Both figures keep the existing 3.2 m/s walk and 9 m/s gallop cap. Shift builds the gallop in any direction;
// the same velocity drives planted feet, crowd yielding and the camera. Music/showcase speeds are independent.
export const PHOTO_RUN = { trot: 3.2, run: 9, build: 0.9, accel: 0.12, brake: 0.08 };
// R: the culada, half a turn about her centre like the dance's, always the same way: two R = a full turn.
// It speeds up and settles (rad/s, rad/s²: ~0.5 s a half turn); her rear swings through whoever is near.
// Whoever it hits slides off and falls flat for `down` s (photo mode only: the game never knocks anyone over).
export const PHOTO_SPIN = { rate: 9, accel: 60, reach: 6, kick: 7, /* reach: the first ring stands ~4.8 m from her centre */ slide: 0.3, down: 2.2 };
// Third person like WoW: aim just over her head from behind and a little above, so she sits low and the plaça shows ahead.
// Turns and recentering are capped (rad/s: 360°/s standing, 540°/s moving, like Unreal's character turn rate) so a big
// difference swings round instead of snapping; the camera recenters behind her only after `followWait` s without mouse look.
export const PHOTO_CAM = { follow:0.8, followWait:1.2, followRate:1.57, alignTau:0.12, alignRate:6.28, alignRateMoving:9.4, pitch:0.35, zoom:10, minZoom:6, maxZoom:20, minPitch:0.08, maxPitch:1.0, aimY:{ 'mulassa-valls':3.3, 'drac-valls':3.2 } };
export const photoBody = () => PHOTO.id === 'drac-valls' ? PHOTO.drac : PHOTO.mula;
export function clearPhotoKeys() {
  PHOTO.inputEpoch = (PHOTO.inputEpoch || 0) + 1;
  PHOTO.keys.clear(); PHOTO.turn = 0; PHOTO.action = false; PHOTO.mouse = 0; PHOTO.intentX = PHOTO.intentZ = 0;
  for (const p of [PHOTO.mula, PHOTO.drac]) { p.vx = p.vz = 0; p.fire = 0; p.sprint = 0; p.spinLeft = 0; p.spinV = 0; }
  PHOTO.speed = 0; PHOTO.air = false; PHOTO.culada = 0; PHOTO.sparks = false;
}
export function setPhotoControl(on, id, pair) {
  PHOTO.epoch = (PHOTO.epoch || 0) + 1;
  const prev = PHOTO.on && on && id && id !== PHOTO.id && photoBody(); // switching figures while driving: keep the view
  PHOTO.on = on; if (on && !prev) PHOTO.cameraYaw = null;
  if (on && id) {
    PHOTO.id = id; PHOTO.pair = pair;
    if (prev && !pair) Object.assign(photoBody(), { x: prev.x, z: prev.z, yaw: prev.yaw }); // one figure on show: the other takes its spot, as Tab does
  }
  clearPhotoKeys();
}
export function photoKey(e, allowed) {
  const interactive = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'SUMMARY'].includes(e.target?.tagName)
    || e.target?.isContentEditable || e.target?.closest?.('button, a, input, textarea, select, summary, dialog, [role="dialog"], [role="button"], [contenteditable="true"]');
  if (!PHOTO.on || !allowed || interactive || e.ctrlKey || e.altKey || e.metaKey) { clearPhotoKeys(); return false; }
  if (e.code === 'Tab' && e.shiftKey) { clearPhotoKeys(); return false; } // native backwards focus navigation, even from the world
  if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'Tab', 'Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) return false;
  e.preventDefault();
  if (e.code === 'Space') {
    if (!e.repeat) PHOTO.action = true; // a jump, for either figure (mula-motion.js)
  } else if (e.code === 'KeyR') { // R: half a turn (the Mulassa's culada), always the same way; pressed again mid-turn it carries on round
    if (!e.repeat) photoBody().spinLeft += Math.PI * PHOTO.spinDir;
  } else if (e.code === 'KeyE' && PHOTO.id === 'drac-valls') {
    if (!e.repeat && !PHOTO.keys.has('KeyE')) { PHOTO.sparks = true; PHOTO.keys.add('KeyE'); } // one onset; the held key sustains the effect (drac-show.js)
  } else if (e.code === 'Tab') {
    if (!e.repeat) {
      PHOTO.epoch = (PHOTO.epoch || 0) + 1;
      clearPhotoKeys();
      const prev = photoBody();
      PHOTO.id = PHOTO.id === 'drac-valls' ? 'mulassa-valls' : 'drac-valls';
      // Only one figure on the selector: replacement stays at the same spot, facing the same way.
      if (!PHOTO.pair) Object.assign(photoBody(), { x: prev.x, z: prev.z, yaw: prev.yaw });
    }
  } else if (!e.repeat) PHOTO.keys.add(e.code);
  return true;
}
// Exact exponential velocity integration. Diagonals have the same speed; collision substeps never exceed 8 ms.
// safe(x,z,yaw) returns signed clearance. A pre-existing overlap may only improve, never pull the body elsewhere.
export function movePhoto(dt, safe, sideYaw = photoBody().yaw) {
  const p = photoBody(), keys = PHOTO.keys;
  p.fire = Math.max(0, p.fire - Math.min(dt, 0.05));
  let side = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  let forward = Number(keys.has('KeyW') || PHOTO.mouse === 3) - Number(keys.has('KeyS'));
  const length = Math.hypot(side, forward) || 1;
  side /= length; forward /= length;
  // Only RMB turns her towards the view, eased and capped at PHOTO_CAM.alignRate.
  // LMB never changes her heading, including while walking or running.
  // During a culada the turn is hers alone: with mouse look the camera turns with her (the view is still "where she
  // faces" afterwards, nothing pulls her back); without it the camera holds still and recenters only later.
  const aligning = PHOTO.cameraYaw !== null && (PHOTO.mouse & 2);
  if (aligning && !p.spinLeft) {
    const delta = Math.atan2(Math.sin(PHOTO.cameraYaw - Math.PI - p.yaw), Math.cos(PHOTO.cameraYaw - Math.PI - p.yaw)), h = Math.min(dt, 0.05);
    const rate = forward || side ? PHOTO_CAM.alignRateMoving : PHOTO_CAM.alignRate;
    PHOTO.turn = Math.sign(delta) * Math.min(Math.abs(delta) * (1 - Math.exp(-h / PHOTO_CAM.alignTau)), rate * h);
  }
  for(let left=PHOTO.turn;Math.abs(left)>1e-8;) {
    const step=Math.sign(left)*Math.min(0.04,Math.abs(left)), nextYaw=p.yaw+step;
    if(safe(p.x,p.z,nextYaw)<Math.min(0,safe(p.x,p.z,p.yaw))-1e-7)break;
    p.yaw=nextYaw;left-=step;
  }
  PHOTO.turn = 0;
  // Like WoW: walking forward with no mouse look swings the camera round behind her, slowly (A/D strafes stay readable).
  PHOTO.lookAge += dt;
  if (forward > 0 && !PHOTO.mouse && !p.spinLeft && PHOTO.cameraYaw !== null && PHOTO.lookAge > PHOTO_CAM.followWait) { // the player's view, kept a moment
    const behind = Math.atan2(Math.sin(p.yaw + Math.PI - PHOTO.cameraYaw), Math.cos(p.yaw + Math.PI - PHOTO.cameraYaw)), h = Math.min(dt, 0.05);
    PHOTO.cameraYaw += Math.sign(behind) * Math.min(Math.abs(behind) * (1 - Math.exp(-h / PHOTO_CAM.follow)), PHOTO_CAM.followRate * h);
  }
  for (let left = Math.min(dt, 0.05); left > 1e-8;) {
    const h = Math.min(left, 1 / 120); // (the gallop builds per substep too: the same run at any frame rate)
    if (p.spinLeft) { // the culada ignores the crowd: it is what moves them (crowd.js). Speeds up, then brakes to land exactly.
      p.spinV = Math.min(p.spinV + PHOTO_SPIN.accel * h, PHOTO_SPIN.rate, Math.sqrt(2 * PHOTO_SPIN.accel * Math.abs(p.spinLeft)));
      const step = Math.sign(p.spinLeft) * Math.min(Math.abs(p.spinLeft), p.spinV * h);
      p.yaw += step; p.spinLeft -= step;
      if (aligning) PHOTO.cameraYaw += step;
      if (Math.abs(p.spinLeft) < 1e-9) { p.spinLeft = p.spinV = 0; PHOTO.lookAge = 0; } // (a moment before any recentering)
    }
    // The model faces +Z (read per substep: a culada mid-run carries her round). Its right hand is -X seen from behind.
    const tx = (-Math.cos(sideYaw) * side + Math.sin(p.yaw) * forward), tz = (Math.sin(sideYaw) * side + Math.cos(p.yaw) * forward);
    const norm = Math.hypot(tx, tz) || 1;
    const running = (side || forward) && (keys.has('ShiftLeft') || keys.has('ShiftRight'));
    if (!PHOTO.air) p.sprint = running ? Math.min(1, p.sprint + h / PHOTO_RUN.build) : Math.max(0, p.sprint - h * 4);
    const burst = p.sprint * p.sprint * (3 - 2 * p.sprint), top = PHOTO_RUN.trot + (PHOTO_RUN.run - PHOTO_RUN.trot) * burst;
    const targetX = tx / norm * top, targetZ = tz / norm * top, tau = (side || forward) && p.vx*targetX+p.vz*targetZ>=0 ? PHOTO_RUN.accel : PHOTO_RUN.brake;
    const decay = PHOTO.air ? 1 : Math.exp(-h / tau); left -= h; // airborne: the momentum she jumped with, untouched until she lands (dx below)
    const dx = PHOTO.air ? p.vx * h : targetX * h + (p.vx - targetX) * tau * (1 - decay), dz = PHOTO.air ? p.vz * h : targetZ * h + (p.vz - targetZ) * tau * (1 - decay);
    p.vx = targetX + (p.vx - targetX) * decay; p.vz = targetZ + (p.vz - targetZ) * decay;
    if (safe(p.x + dx, p.z + dz, p.yaw) >= Math.min(0, safe(p.x, p.z, p.yaw)) - 1e-7) { p.x += dx; p.z += dz; }
    else {
      const base = Math.min(0, safe(p.x,p.z,p.yaw));
      if (safe(p.x+dx,p.z,p.yaw)>=base-1e-7) { p.x+=dx; p.vz=0; }
      else if (safe(p.x,p.z+dz,p.yaw)>=base-1e-7) { p.z+=dz; p.vx=0; }
      else { p.vx=p.vz=0; }
    }
    PHOTO.intentX = targetX; PHOTO.intentZ = targetZ;
  }
  PHOTO.speed = Math.hypot(p.vx, p.vz); // the crowd and the gallop read it
  PHOTO.culada = p === PHOTO.mula ? Math.sign(p.spinLeft) : 0;
}

export function photoLook(dx, dy) { // the camera only; movePhoto turns her after it while the right button is held
  if (!PHOTO.on) return;
  const turn = -Math.max(-200, Math.min(200, dx)) * 0.003;
  PHOTO.cameraYaw = (PHOTO.cameraYaw ?? photoBody().yaw + Math.PI) + turn;
  if (dx || dy) PHOTO.lookAge = 0;
  PHOTO.pitch = Math.max(PHOTO_CAM.minPitch, Math.min(PHOTO_CAM.maxPitch, PHOTO.pitch + dy * 0.003));
}

export function photoZoom(factor) {
  if(PHOTO.on) PHOTO.zoom=Math.max(PHOTO_CAM.minZoom,Math.min(PHOTO_CAM.maxZoom,PHOTO.zoom*factor));
}
