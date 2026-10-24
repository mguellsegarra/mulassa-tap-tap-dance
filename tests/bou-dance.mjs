import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { bouPose,createBouDance,BOU_TIMING,BOU_CARRY,LAP } from '../src/game/bou-dance.js';
import { buildBou } from '../src/scene/models/bou.js';
import { createBouMotion } from '../src/scene/bou-motion.js';
import { shoeSeparation } from '../src/game/mula-supports.js';
const approval=JSON.parse(readFileSync(new URL('../music/bou-tradicional/approval.json',import.meta.url)));
assert.equal(createHash('sha256').update(readFileSync(new URL('../music/bou-tradicional/'+approval.audio,import.meta.url))).digest('hex'),approval.audioSha256);
const dance=createBouDance(),rig=buildBou(),motion=createBouMotion(rig),p=new THREE.Vector3();
let maxSpeed=0,maxStep=0,minFloor=Infinity;
for(const fps of [30,60,120]) {
 let prev=null,feet=null;
 for(let i=0;i<=Math.ceil(BOU_TIMING.duration*fps);i++) {
  const t=i/fps,pose=bouPose(t);assert(Object.values(pose).every(Number.isFinite));
  assert(Math.hypot(pose.x,pose.z)<(pose.beat>BOU_CARRY.grip&&pose.beat<BOU_CARRY.down?LAP.r+.05:1.4));assert(pose.lift>-.24&&(pose.lift<=0||pose.beat>BOU_CARRY.grip&&pose.beat<BOU_CARRY.down&&pose.lift<=BOU_CARRY.lift));
  motion(t);rig.body.localToWorld(p.set(0,1,1.7));
  for(let k=1;k<8;k+=2)assert(rig.legs[k].scale.y<=.4251,'a shin stretched past its length');
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
// maxSpeed: up to ~4.4 m/s at the head in the festive spins with BOU_COMIC 3 (smooth, every other beat)
assert(maxSpeed<4.6,'shell movement too fast');assert(maxStep<.4,'foot teleport');assert(minFloor>-.012,'shoe through ground');
for(const t of [0,6,22,40,55.238,98.74,116.9,143.49,152.34,154.33]){
 const first=JSON.stringify(bouPose(t));bouPose(145);bouPose(0);assert.equal(JSON.stringify(bouPose(t)),first,'seek differs');
 const a=Array.from({length:4},(_,i)=>({...dance.foot(t,i)}));dance.foot(140,0);
 assert.deepEqual(Array.from({length:4},(_,i)=>({...dance.foot(t,i)})),a);
}
assert(Math.abs(bouPose(BOU_TIMING.duration).yaw-4*Math.PI)<1e-9,'ends facing W');
assert(Math.abs(bouPose(BOU_TIMING.duration).lift)<1e-9,"settled at the end");
assert(Math.abs(bouPose(14).yaw-Math.PI)<1e-9,'first phrase ends facing E');
assert(dance.foot(7,0).tilt<-.1,'opening leg extension missing');
// Natural steps (Marc, 24/10/2026): ordinary steps start on the music's half-beat grid and take a proper swing, not a
// 0.14 s shuffle. Leg-stretch gestures (tilted) and off-grid catch-ups are the exceptions.
{ let prev=[],on=0,all=0,dur=0;const open=[];
  for(let t=0;t<BOU_TIMING.duration;t+=.01){const f=[0,1,2,3].map(i=>({...dance.foot(t,i)}));
   f.forEach((x,i)=>{if(prev[i]?.contact&&!x.contact&&x.swing){all++;const b=bouPose(t).beat*2;if(Math.abs(b-Math.round(b))<.06)on++;open[i]=t;}
    if(prev[i]&&!prev[i].contact&&x.contact&&open[i]!=null){dur+=t-open[i];open[i]=null;}});prev=f;}
  assert(on/all>.8,`steps off the music: ${on}/${all}`);assert(dur/all>.17,`steps too quick: ${(dur/all).toFixed(3)} s`);
  // a stepping shoe passes over the other, never through it
  const sep={};for(let t=0;t<BOU_TIMING.duration;t+=1/120){const f=[0,1,2,3].map(i=>({...dance.foot(t,i)}));
   for(const [a,b] of [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]])if(Math.abs(f[a].y-f[b].y)<.085)assert(shoeSeparation(f[a],f[b],sep).gap>=0,`shoes ${a} and ${b} through each other at ${t.toFixed(2)} s`);}
  console.log('Bou steps:',all,'on the half beats',(on/all).toFixed(2),'mean swing',(dur/all).toFixed(2),'s');
}
// the festa: lifted by its colla, carried once round N -> W -> S -> E (Marc 24/10/2026)
{ const seen=[];for(let b=BOU_CARRY.lap[0];b<=BOU_CARRY.lap[1];b+=.25){const t=BOU_TIMING.subdivisionTimes[Math.round(b*BOU_TIMING.subdivision)],p=bouPose(t);
  assert(p.lift>.25,'carried high');assert(Math.abs(Math.hypot(p.x,p.z)-LAP.r)<.15,'on the lap');
  const d=['S','W','N','E'][[p.x,p.z,-p.x,-p.z].indexOf(Math.max(p.x,p.z,-p.x,-p.z))];if(seen.at(-1)!==d)seen.push(d);}
  assert.equal(seen.join(''),'SENWS','lap order (the N W S E round, from S)'); }
console.log('Bou: full v13, deterministic seeks, planted soles, ending, 30/60/120 fps', {maxSpeed,maxStep,minFloor});
