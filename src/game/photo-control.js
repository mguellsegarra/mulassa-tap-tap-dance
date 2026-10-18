// Photo-mode input and figure-relative locomotion. No selection, audio or persistence writes.
export const PHOTO = { on: false, ready: false, id: 'mulassa-valls', keys: new Set(), pair: false, turn: 0, pitch: 0.34, action: false, mouse: 0, cameraYaw: null, zoom:11,
  mula: { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, fire: 0 }, drac: { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, fire: 0 } };
export const photoBody = () => PHOTO.id === 'drac-valls' ? PHOTO.drac : PHOTO.mula;
export function clearPhotoKeys() {
  PHOTO.keys.clear(); PHOTO.turn = 0; PHOTO.action = false; PHOTO.mouse = 0; PHOTO.intentX = PHOTO.intentZ = 0;
  for (const p of [PHOTO.mula, PHOTO.drac]) { p.vx = p.vz = 0; p.fire = 0; }
}
export function setPhotoControl(on, id, pair) {
  PHOTO.on = on; PHOTO.cameraYaw = null;
  if (on && id) { PHOTO.id = id; PHOTO.pair = pair; }
  clearPhotoKeys();
}
export function photoKey(e, allowed) {
  const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable;
  if (!PHOTO.on || !allowed || editing || e.ctrlKey || e.altKey || e.metaKey) { clearPhotoKeys(); return false; }
  if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Tab', 'Space'].includes(e.code)) return false;
  e.preventDefault();
  if (e.code === 'Space') {
    if (!e.repeat) { if (PHOTO.id === 'drac-valls') PHOTO.drac.fire = 1.4; else PHOTO.action = true; }
  } else if (e.code === 'Tab') {
    if (!e.repeat) {
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
  for(let left=PHOTO.turn;Math.abs(left)>1e-8;) {
    const step=Math.sign(left)*Math.min(0.04,Math.abs(left)), nextYaw=p.yaw+step;
    if(safe(p.x,p.z,nextYaw)<Math.min(0,safe(p.x,p.z,p.yaw))-1e-7)break;
    p.yaw=nextYaw;left-=step;
  }
  PHOTO.turn = 0;
  // The model faces +Z. Its right hand is -X when seen from behind.
  const tx = (-Math.cos(sideYaw) * side + Math.sin(p.yaw) * forward);
  const tz = (Math.sin(sideYaw) * side + Math.cos(p.yaw) * forward);
  const norm = Math.hypot(tx, tz) || 1, targetX = tx / norm * 2.6, targetZ = tz / norm * 2.6;
  PHOTO.intentX = targetX; PHOTO.intentZ = targetZ;
  const tau = length && (side || forward) ? 0.8 : 0.16;
  for (let left = Math.min(dt, 0.05); left > 1e-8;) {
    const h = Math.min(left, 1 / 120), decay = Math.exp(-h / tau); left -= h;
    const dx = targetX * h + (p.vx - targetX) * tau * (1 - decay), dz = targetZ * h + (p.vz - targetZ) * tau * (1 - decay);
    p.vx = targetX + (p.vx - targetX) * decay; p.vz = targetZ + (p.vz - targetZ) * decay;
    if (safe(p.x + dx, p.z + dz, p.yaw) >= Math.min(0, safe(p.x, p.z, p.yaw)) - 1e-7) { p.x += dx; p.z += dz; }
    else {
      const base = Math.min(0, safe(p.x,p.z,p.yaw));
      if (safe(p.x+dx,p.z,p.yaw)>=base-1e-7) { p.x+=dx; p.vz=0; }
      else if (safe(p.x,p.z+dz,p.yaw)>=base-1e-7) { p.z+=dz; p.vx=0; }
      else { p.vx=p.vz=0; }
    }
  }
}

export function photoLook(dx, dy, turnFigure = true) {
  if (!PHOTO.on) return;
  const turn = -Math.max(-200, Math.min(200, dx)) * 0.003;
  PHOTO.cameraYaw = (PHOTO.cameraYaw ?? photoBody().yaw + Math.PI) + turn;
  if (turnFigure) PHOTO.turn = Math.atan2(Math.sin(PHOTO.cameraYaw - Math.PI - photoBody().yaw), Math.cos(PHOTO.cameraYaw - Math.PI - photoBody().yaw));
  PHOTO.pitch = Math.max(0.12, Math.min(1.15, PHOTO.pitch + dy * 0.003));
}

export function photoZoom(factor) {
  if(PHOTO.on) PHOTO.zoom=Math.max(4.5,Math.min(20,PHOTO.zoom*factor));
}
