// One camera rig owns both position and aim during manual control. No menu framing or independent target lag.
import { PHOTO, PHOTO_CAM, photoBody } from '../game/photo-control.js';
import { camera, camFocus, plaza } from './stage.js';
import { orbit, pnow, titleC, titleS } from './cameras.js';
const photoRig = { on:false, id:null, dx:0, dy:0, dz:0, dp:0, dzoom:0, distance:11 };
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
  if(camera.view?.enabled) camera.clearViewOffset();
  const b=photoBody(), height=PHOTO_CAM.aimY[PHOTO.id]??3.3;
  if(!photoRig.on) {
    PHOTO.cameraYaw ??= Math.atan2(camera.position.x-camFocus.x,camera.position.z-camFocus.z);
    const distance=camera.position.distanceTo(camFocus);
    // start from the menu's view and ease into the WoW framing (offsets decay with the aim's, no jump)
    photoRig.dp=Math.asin((camera.position.y-camFocus.y)/Math.max(0.1,distance))-PHOTO_CAM.pitch;
    photoRig.dzoom=distance-PHOTO_CAM.zoom;
    PHOTO.pitch=PHOTO_CAM.pitch;PHOTO.zoom=PHOTO_CAM.zoom;photoRig.distance=distance;
  }
  if(!photoRig.on||photoRig.id!==PHOTO.id) {
    photoRig.dx=camFocus.x-b.x;photoRig.dy=camFocus.y-height;photoRig.dz=camFocus.z-b.z;
    photoRig.id=PHOTO.id;photoRig.on=true;
  }
  const decay=Math.exp(-dt/0.16);
  photoRig.dx*=decay;photoRig.dy*=decay;photoRig.dz*=decay;
  const ease=Math.exp(-dt/0.4);photoRig.dp*=ease;photoRig.dzoom*=ease; // a gentle swing from the menu view, not a swoop
  camFocus.set(b.x+photoRig.dx,height+photoRig.dy,b.z+photoRig.dz);
  const pitch=Math.max(PHOTO_CAM.minPitch,Math.min(1.2,PHOTO.pitch+photoRig.dp));
  const cp=Math.cos(pitch),dx=Math.sin(PHOTO.cameraYaw)*cp,dy=Math.sin(pitch),dz=Math.cos(PHOTO.cameraYaw)*cp;
  const room=photoCameraRoom(camFocus.x,camFocus.y,camFocus.z,dx,dy,dz,Math.max(1,PHOTO.zoom+photoRig.dzoom));
  photoRig.distance+=(room-photoRig.distance)*(1-Math.exp(-dt/(room>photoRig.distance?0.4:0.12))); // in at once (the min below), back out slowly
  const distance=Math.min(room,photoRig.distance); // compress against an obstacle; restore zoom smoothly when it clears
  camera.position.set(camFocus.x+dx*distance,camFocus.y+dy*distance,camFocus.z+dz*distance);
  camera.lookAt(camFocus);
}
export function releasePhotoCamera() {
  if(!photoRig.on)return;
  const horizontal=Math.hypot(camera.position.x-camFocus.x,camera.position.z-camFocus.z);
  orbit.yaw=PHOTO.cameraYaw;orbit.x[0]=Math.atan2(camera.position.y-1.2,horizontal);orbit.x[1]=Math.hypot(horizontal,camera.position.y-1.2);
  orbit.v.fill(0);orbit.spin=0;orbit.zoomRaw=orbit.zoomTo=orbit.x[1];orbit.raw=orbit.x[0];orbit.last=pnow();
  titleS.x[0]=titleC.x=camFocus.x;titleS.x[1]=titleC.z=camFocus.z;titleS.v.fill(0);
  photoRig.on=false;titleC.on=true;
}
