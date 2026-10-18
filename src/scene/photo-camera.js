// One camera rig owns both position and aim during manual control. No menu framing or independent target lag.
import { PHOTO, photoBody } from '../game/photo-control.js';
import { camera, camFocus, plaza } from './stage.js';
import { orbit, pnow, titleC } from './cameras.js';
const photoRig = { on:false, id:null, dx:0, dy:0, dz:0, distance:11 };
export function photoCameraRoom(x,y,z,dx,dy,dz,wanted) {
  const limit=plaza.inner-0.55;
  let room=wanted;
  if(dx)room=Math.min(room,(Math.sign(dx)*limit-x)/dx);
  if(dz)room=Math.min(room,(Math.sign(dz)*limit-z)/dz);
  for(const p of plaza.props) {
    const ox=x-p.x,oz=z-p.z,r=p.r+0.45,a=dx*dx+dz*dz,b=ox*dx+oz*dz,c=ox*ox+oz*oz-r*r;
    const disc=b*b-a*c;
    if(a<1e-8||disc<0)continue;
    const t=(-b-Math.sqrt(disc))/a;
    if(t>0&&t<room&&y+dy*t<p.h+0.5)room=Math.min(room,t);
  }
  return Math.max(0.3,room);
}
export function framePhotoCamera(dt) {
  const b=photoBody(), height=PHOTO.id==='drac-valls'?1.9:2.2;
  if(!photoRig.on) {
    PHOTO.cameraYaw ??= Math.atan2(camera.position.x-camFocus.x,camera.position.z-camFocus.z);
    const distance=camera.position.distanceTo(camFocus);
    PHOTO.pitch=Math.max(0.12,Math.min(1.15,Math.asin((camera.position.y-camFocus.y)/Math.max(0.1,distance))));
    PHOTO.zoom=Math.max(4.5,Math.min(20,distance));photoRig.distance=PHOTO.zoom;
  }
  if(!photoRig.on||photoRig.id!==PHOTO.id) {
    photoRig.dx=camFocus.x-b.x;photoRig.dy=camFocus.y-height;photoRig.dz=camFocus.z-b.z;
    photoRig.id=PHOTO.id;photoRig.on=true;
  }
  const decay=Math.exp(-dt/0.16);
  photoRig.dx*=decay;photoRig.dy*=decay;photoRig.dz*=decay;
  camFocus.set(b.x+photoRig.dx,height+photoRig.dy,b.z+photoRig.dz);
  const cp=Math.cos(PHOTO.pitch),dx=Math.sin(PHOTO.cameraYaw)*cp,dy=Math.sin(PHOTO.pitch),dz=Math.cos(PHOTO.cameraYaw)*cp;
  const room=photoCameraRoom(camFocus.x,camFocus.y,camFocus.z,dx,dy,dz,PHOTO.zoom);
  photoRig.distance+=(room-photoRig.distance)*(1-Math.exp(-dt/0.12));
  const distance=Math.min(room,photoRig.distance); // compress against an obstacle; restore zoom smoothly when it clears
  camera.position.set(camFocus.x+dx*distance,camFocus.y+dy*distance,camFocus.z+dz*distance);
  camera.lookAt(camFocus);
}
export function releasePhotoCamera() {
  if(!photoRig.on)return;
  orbit.yaw=PHOTO.cameraYaw;orbit.x[0]=PHOTO.pitch;orbit.x[1]=photoRig.distance;
  orbit.v.fill(0);orbit.spin=0;orbit.zoomRaw=orbit.zoomTo=photoRig.distance;orbit.raw=PHOTO.pitch;orbit.last=pnow();
  photoRig.on=false;titleC.on=false;
}
