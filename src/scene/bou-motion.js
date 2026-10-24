import { newBouPose, createBouDance } from '../game/bou-dance.js';
// One deterministic sampler for playback, pause, restart and arbitrary seeks.
export function createBouMotion(rig) {
  const dance=createBouDance(),pose=newBouPose(),feet=Array.from({length:4},()=>({}));
  // dt: real seconds since the last frame, for the tail's pendulum only (0 = a seek: it hangs still)
  return (t,dt=0)=>{
    dance.pose(t,pose);
    rig.root.position.set(pose.x,pose.lift,pose.z);rig.root.rotation.y=pose.yaw;
    rig.body.rotation.set(pose.pitch,0,pose.roll);
    for(let i=0;i<4;i++) {
      const f=dance.foot(t,i,feet[i]);
      rig.feet[i].position.set(f.x,f.y,f.z);rig.feet[i].rotation.set(f.tilt??0,f.yaw,0,'YXZ');
    }
    rig.cap?.play(t,pose.beat); // the head's gags on the song's beat (bou-heads.js)
    rig.poseLegs();rig.root.updateMatrixWorld(true);
    if(dt>0){rig.swingTail?.beat?.(pose.beat);rig.swingTail?.(dt);}else rig.swingTail?.reset();
    return pose;
  };
}
