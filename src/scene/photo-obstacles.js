// Floor spectators share collision footprints even when drawn as instances. Only nearby ones move.
import * as THREE from 'three';
import { PHOTO, photoBody } from '../game/photo-control.js';
import { plaza } from './stage.js';
import { activeCrowd, bandSpots, midCrowd } from './quality.js';
import { photoClearance } from './photo-collision.js';
import { sootFrozen } from './drac-soot.js';
export const photoExtras = [];
let photoBandSource = null;
const photoMatrix = new THREE.Matrix4(), photoAway = new THREE.Vector2();
export function photoFixedClearance(x, z, yaw, dragon) {
  const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
  const w = dragon ? 1.25 : 0.8, l = dragon ? 1.55 : 2.35;
  let clear = Math.min(plaza.inner - 0.3 - w*c-l*s-Math.abs(x), plaza.inner - 0.3-w*s-l*c-Math.abs(z));
  for (const p of plaza.props) clear = Math.min(clear, photoClearance(x,z,yaw,p.x,p.z,p.r,dragon));
  return clear;
}
// Step sideways out of the intended corridor, including when the mover has braked for a person.
export function photoEscape(x, z, out) {
  const p = photoBody(), vx = PHOTO.intentX || 0, vz = PHOTO.intentZ || 0, speed = Math.hypot(vx,vz);
  const dx = x-p.x, dz = z-p.z, along = speed ? Math.max(0,Math.min(Math.max(3, speed*0.5), (dx*vx+dz*vz)/speed)) : 0; // half a second ahead at a gallop
  let ax=dx-(speed ? vx/speed*along : 0), az=dz-(speed ? vz/speed*along : 0), d=Math.hypot(ax,az);
  const clear = Math.min(photoClearance(p.x,p.z,p.yaw,x,z,0,PHOTO.id==='drac-valls'),
    photoClearance(p.x+(speed?vx/speed*along:0),p.z+(speed?vz/speed*along:0),p.yaw,x,z,0,PHOTO.id==='drac-valls'));
  if(d<0.01) { ax=Math.cos(p.yaw); az=-Math.sin(p.yaw); d=1; }
  out.set(ax/d,az/d); out.fear=Math.max(0,2.1-clear);
  return out;
}
function preparePhotoExtras() {
  if (photoBandSource === bandSpots) return;
  photoBandSource = bandSpots; photoExtras.length=0;
  for (const group of [plaza.backdrop,midCrowd]) {
    if(!group) continue;
    for(let i=0;i<group.mesh.count;i++) {
      group.mesh.getMatrixAt(i,photoMatrix);
      const matrix=photoMatrix.clone(), x=matrix.elements[12], z=matrix.elements[14];
      photoExtras.push({pos:new THREE.Vector2(x,z), homeX:x,homeZ:z,rad:0.21,fixed:true,mesh:group.mesh,index:i,matrix,vx:0,vz:0});
    }
  }
  let i=0;
  for(const b of plaza.band) if(b.g.scale.x) {
    const p=bandSpots[i++];
    photoExtras.push({pos:p.pos,homeX:p.pos.x,homeZ:p.pos.y,rad:p.rad,fixed:true,band:b,
      offsetX:b.g.position.x-p.pos.x,offsetZ:b.g.position.z-p.pos.y,vx:0,vz:0});
  }
}
function extraClear(p,x,z) {
  // Some façade spectators start beyond inner; allow retreat from there, never teleport them inward.
  let clear=Math.min(plaza.inner-0.2-Math.abs(x),plaza.inner-0.2-Math.abs(z));
  for(const q of plaza.props) clear=Math.min(clear,Math.hypot(x-q.x,z-q.z)-p.rad-q.r);
  for(const q of photoExtras) if(q!==p) clear=Math.min(clear,Math.hypot(x-q.pos.x,z-q.pos.y)-p.rad-q.rad);
  for(const q of activeCrowd) clear=Math.min(clear,Math.hypot(x-q.pos.x,z-q.pos.y)-p.rad-q.rad);
  if(PHOTO.on) {
    const b=photoBody();clear=Math.min(clear,photoClearance(b.x,b.z,b.yaw,x,z,p.rad,PHOTO.id==='drac-valls'));
    if(PHOTO.pair){const q=PHOTO.id==='drac-valls'?PHOTO.mula:PHOTO.drac;clear=Math.min(clear,photoClearance(q.x,q.z,q.yaw,x,z,p.rad,PHOTO.id!=='drac-valls'));}
  }
  return clear;
}
export function updatePhotoExtras(dt) {
  if(PHOTO.on) preparePhotoExtras();
  if(!photoExtras.length) return;
  const h=Math.min(dt,0.05), ease=1-Math.exp(-h/0.18);
  for(const p of photoExtras) {
    if(sootFrozen(p.band??p)){p.vx=p.vz=0;continue;} // charred stiff (drac-soot.js): rooted to the spot
    let tx=0,tz=0;
    if(PHOTO.on) {
      photoEscape(p.pos.x,p.pos.y,photoAway);
      const run=Math.max(1,PHOTO.speed/3.4), speed=Math.min(3.4*run,photoAway.fear*2.5*run); // faster as she gallops
      tx=photoAway.x*speed;tz=photoAway.y*speed;
    } else {
      const dx=p.homeX-p.pos.x,dz=p.homeZ-p.pos.y,d=Math.hypot(dx,dz);
      if(d>0.005){tx=dx/d*Math.min(0.65,d*2);tz=dz/d*Math.min(0.65,d*2);}
    }
    p.vx+=(tx-p.vx)*ease;p.vz+=(tz-p.vz)*ease;
    if(Math.abs(p.vx)+Math.abs(p.vz)<0.001)continue;
    const base=Math.min(0,extraClear(p,p.pos.x,p.pos.y)), nx=p.pos.x+p.vx*h,nz=p.pos.y+p.vz*h;
    if(extraClear(p,nx,nz)>=base-1e-7)p.pos.set(nx,nz);
    else if(extraClear(p,nx,p.pos.y)>=base-1e-7)p.pos.x=nx;
    else if(extraClear(p,p.pos.x,nz)>=base-1e-7)p.pos.y=nz;
    else {p.vx=p.vz=0;continue;}
    if(p.band){p.band.g.position.x=p.pos.x+p.offsetX;p.band.g.position.z=p.pos.y+p.offsetZ;}
    else {
      p.matrix.elements[12]=p.pos.x;p.matrix.elements[14]=p.pos.y;
      p.mesh.setMatrixAt(p.index,p.matrix);p.mesh.instanceMatrix.needsUpdate=true;
    }
  }
}
