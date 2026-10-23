import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { bouPose,createBouDance,BOU_TIMING } from '../src/game/bou-dance.js';
import { buildBou } from '../src/scene/models/bou.js';
import { createBouMotion } from '../src/scene/bou-motion.js';
const approval=JSON.parse(readFileSync(new URL('../music/bou-tradicional/approval.json',import.meta.url)));
assert.equal(createHash('sha256').update(readFileSync(new URL('../music/bou-tradicional/'+approval.audio,import.meta.url))).digest('hex'),approval.audioSha256);
const dance=createBouDance(),rig=buildBou(),motion=createBouMotion(rig),p=new THREE.Vector3();
let maxSpeed=0,maxStep=0,minFloor=Infinity;
for(const fps of [30,60,120]) {
 let prev=null,feet=null;
 for(let i=0;i<=Math.ceil(BOU_TIMING.duration*fps);i++) {
  const t=i/fps,pose=bouPose(t);assert(Object.values(pose).every(Number.isFinite));
  assert(Math.hypot(pose.x,pose.z)<1.4);assert(pose.lift>=0&&pose.lift<.04);
  motion(t);rig.body.localToWorld(p.set(0,1,1.7));
  if(prev)maxSpeed=Math.max(maxSpeed,p.distanceTo(prev)*fps);prev=p.clone();
  const current=Array.from({length:4},(_,j)=>({...dance.foot(t,j)}));
  current.forEach((f,j)=>{assert(Object.values(f).filter(v=>typeof v==='number').every(Number.isFinite));
   if(feet&&f.contact&&feet[j].contact)assert(Math.hypot(f.x-feet[j].x,f.z-feet[j].z)<1e-7,'planted foot slides');
   if(feet)maxStep=Math.max(maxStep,Math.hypot(f.x-feet[j].x,f.z-feet[j].z));
   // Actual sole corners, not only the foot group's origin.
   rig.feet[j].updateMatrixWorld(true);
   for(const x of [-.0525,.0525])for(const z of [-.1,.17]){
    const q=new THREE.Vector3(x,0,z).applyMatrix4(rig.feet[j].matrixWorld);minFloor=Math.min(minFloor,q.y);
   }
  });feet=current;
 }
}
assert(maxSpeed<4,'shell movement too fast');assert(maxStep<.4,'foot teleport');assert(minFloor>-.012,'shoe through ground');
for(const t of [0,6,22,40,55.238,98.74,116.9,143.49,152.34,154.33]){
 const first=JSON.stringify(bouPose(t));bouPose(145);bouPose(0);assert.equal(JSON.stringify(bouPose(t)),first,'seek differs');
 const a=Array.from({length:4},(_,i)=>({...dance.foot(t,i)}));dance.foot(140,0);
 assert.deepEqual(Array.from({length:4},(_,i)=>({...dance.foot(t,i)})),a);
}
assert(Math.abs(bouPose(BOU_TIMING.duration).yaw-10*Math.PI)<1e-9);
assert.equal(bouPose(BOU_TIMING.duration).lift,0);
assert(bouPose(10).x!==bouPose(16).x,'opening does not travel');
assert(dance.foot(7,0).tilt<-.1,'opening leg extension missing');
console.log('Bou: full v13, deterministic seeks, planted soles, ending, 30/60/120 fps', {maxSpeed,maxStep,minFloor});
