import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { bouPose,createBouDance,BOU_TIMING,BOU_CARRY,LAP } from '../../../src/figures/bou/bou-dance.js';
import { buildBou } from '../../../src/figures/bou/bou.js';
import { createBouMotion } from '../../../src/figures/bou/bou-motion.js';
import { shoeSeparation } from '../../../src/figures/mulassa/mula-supports.js';
const approval=JSON.parse(readFileSync(new URL('../../../music/bou-tradicional/approval.json',import.meta.url)));
assert.equal(createHash('sha256').update(readFileSync(new URL('../../../music/bou-tradicional/'+approval.audio,import.meta.url))).digest('hex'),approval.audioSha256);
const dance=createBouDance(),rig=buildBou(),motion=createBouMotion(rig),p=new THREE.Vector3();
let maxSpeed=0,maxCarried=0,maxStep=0,minFloor=Infinity;
for(const fps of [30,60,120]) {
 let prev=null,feet=null;
 for(let i=0;i<=Math.ceil(BOU_TIMING.duration*fps);i++) {
  const t=i/fps,pose=bouPose(t);assert(Object.values(pose).every(Number.isFinite));
  assert(Math.hypot(pose.x,pose.z)<(pose.beat>BOU_CARRY.grip&&pose.beat<BOU_CARRY.down?LAP.r+.1:4.4),'out past its colla');assert(pose.lift>-.24&&(pose.lift<=.45||pose.beat>BOU_CARRY.grip&&pose.beat<BOU_CARRY.down&&pose.lift<=BOU_CARRY.lift),'lift'); // (.45: the see-saw's rise)
  motion(t);rig.body.localToWorld(p.set(0,1,1.7));
  for(let k=1;k<8;k+=2)assert(rig.legs[k].scale.y<=.4251,'a shin stretched past its length');
  if(prev){const v=p.distanceTo(prev)*fps;if(pose.beat>BOU_CARRY.grip&&pose.beat<BOU_CARRY.down)maxCarried=Math.max(maxCarried,v);else maxSpeed=Math.max(maxSpeed,v);}prev=p.clone();
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
// the see-saw heaves the muzzle ~0.5 m up and down every beat: ~7.3 m/s at its peak;
// the final disco's pulsed spins («tombs més ràpids»), ~7.8
assert(maxSpeed<8.2,'shell movement too fast');
// carried in the festa it is heaved up in under a beat, runs ~3 m/s round the
// ring and is bucked nose up on every beat («més fortes»)
assert(maxCarried<7,`carried shell too fast: ${maxCarried.toFixed(2)} m/s`);assert(maxStep<.45,'foot teleport'); // (a running stride's swing peaks ~13 m/s at 30 fps: the rushes and the carried laps)
assert(minFloor>-.003,`shoe through ground (${minFloor.toFixed(3)} m)`); // (was swallowed by the comment above: a toe 2.4 cm under the floor went unseen)
for(const t of [0,4,20,38,53.238,96.74,114.9,141.49,150.34,152.33]){
 const first=JSON.stringify(bouPose(t));bouPose(145);bouPose(0);assert.equal(JSON.stringify(bouPose(t)),first,'seek differs');
 const a=Array.from({length:4},(_,i)=>({...dance.foot(t,i)}));dance.foot(140,0);
 assert.deepEqual(Array.from({length:4},(_,i)=>({...dance.foot(t,i)})),a);
}
assert(Math.abs(bouPose(BOU_TIMING.duration).yaw-(2+2*LAP.turns+12)*Math.PI)<1e-4,'ends facing W'); // (+5.5 turns in the final disco, from the carry's 7 pi)
assert(Math.abs(bouPose(BOU_TIMING.duration).lift)<1e-9,"settled at the end");
assert(Math.abs(bouPose(12).yaw-Math.PI)<1e-9,'first phrase ends facing E');
// the opening's long notes (and his reference video): the front carrier's leg forward on the long note,
// swung back on the second; left (bar 1), right (2), left (5), right (6), the calderó too; the rear carrier stands
{ const P=bouPose, B=BOU_TIMING.bars, at=(n,b)=>{const k=B.findIndex(x=>x.sourceBar===n);return B[k].time+(B[k+1].time-B[k].time)*b/4;};
  const ahead=(t,i)=>{const p=P(t),f=dance.foot(t,i);return (f.x-p.x)*Math.sin(p.yaw)+(f.z-p.z)*Math.cos(p.yaw);};
  for(const [n,i] of [[1,3],[2,2],[5,3],[6,2],[61,3],[62,2]]) for(const [b,way] of [[1,1],[2.75,-1]]){
    const t=at(n,b),f=dance.foot(t,i),w=`bar ${n} beat ${b}, foot ${i}`;
    assert(way>0?f.tilt<-.3:f.tilt>.3,`${w}: no ${way>0?'forward':'back'} swing`);
    assert(way*(ahead(t,i)-ahead(t,i^1))>.2,`${w}: not ${way>0?'ahead':'behind'}`);
    for(const k of [i^1,0,1]) assert(Math.abs(dance.foot(t,k).tilt??0)<.01,`${w}: foot ${k} stretches too`);
    assert(Math.abs(P(t).roll)<.03,`${w}: sways on the long note`);
  }
  // its slow half turns (3-4, 7-8) go round its rump: the rear carrier steps round a small circle while the front one
  // walks the whole arc, and no moment has all four feet up (walked, not run)
  for(const n of [3,7]){ const end=(t,z)=>{const p=P(t);return [p.x+z*Math.sin(p.yaw),p.z+z*Math.cos(p.yaw)];};
    let rear=0,front=0,r0=end(at(n,0),-.66),f0=end(at(n,0),.66);
    for(let t=at(n,0);t<=at(n+2,0);t+=.02){const r=end(t,-.66),f=end(t,.66);rear+=Math.hypot(r[0]-r0[0],r[1]-r0[1]);front+=Math.hypot(f[0]-f0[0],f[1]-f0[1]);r0=r;f0=f;
      assert([0,1,2,3].some(i=>dance.foot(t,i).contact),`bar ${n}: all four feet up at ${t.toFixed(2)}s`);}
    assert(rear<.3*front,`bar ${n}: the rump travels ${rear.toFixed(2)} m, the head ${front.toFixed(2)} m`);
    assert(Math.abs(Math.abs(P(at(n+2,0)).yaw-P(at(n,0)).yaw)-Math.PI)<1e-6,`bar ${n}: not half a turn`);
  }
}
// Natural steps: ordinary steps start on the music's half-beat grid and take a proper swing, not a
// 0.14 s shuffle. Leg-stretch gestures (tilted) and off-grid catch-ups are the exceptions.
{ let prev=[],on=0,all=0,dur=0;const open=[];
  // (every 4 ms, by index: a lift-off read up to 10 ms late fell off the grid at the fast bars)
  for(let k=0,t=0;t<BOU_TIMING.duration;t=++k/250){const f=[0,1,2,3].map(i=>({...dance.foot(t,i)}));
   f.forEach((x,i)=>{if(prev[i]?.contact&&!x.contact&&x.swing){all++;const b=bouPose(t).beat*2;if(Math.abs(b-Math.round(b))<.06)on++;open[i]=t;}
    if(prev[i]&&!prev[i].contact&&x.contact&&open[i]!=null){dur+=t-open[i];open[i]=null;}});prev=f;}
  assert(on/all>.8,`steps off the music: ${on}/${all}`);assert(dur/all>.17,`steps too quick: ${(dur/all).toFixed(3)} s`);
  // a stepping shoe passes over the other, never through it
  const sep={};for(let t=0;t<BOU_TIMING.duration;t+=1/120){const f=[0,1,2,3].map(i=>({...dance.foot(t,i)}));
   for(const [a,b] of [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]])if(Math.abs(f[a].y-f[b].y)<.085)assert(shoeSeparation(f[a],f[b],sep).gap>=0,`shoes ${a} and ${b} through each other at ${t.toFixed(2)} s`);}
  console.log('Bou steps:',all,'on the half beats',(on/all).toFixed(2),'mean swing',(dur/all).toFixed(2),'s');
}
// a carrier's two legs never through each other: its trouser legs (thigh .16,
// shin .14 wide) as segments on the actual rig; a foot landing across its partner when the body turned put them 16 cm
// into each other
{ const ends=m=>[m.position.clone(),new THREE.Vector3(0,m.scale.y,0).applyQuaternion(m.quaternion).add(m.position)],R=[.08,.07];
  const seg=([p1,q1],[p2,q2])=>{const d1=q1.clone().sub(p1),d2=q2.clone().sub(p2),r=p1.clone().sub(p2),a=d1.dot(d1),e=d2.dot(d2),f=d2.dot(r),c=d1.dot(r),b=d1.dot(d2),den=a*e-b*b;
    let u=den>1e-9?Math.min(1,Math.max(0,(b*f-c*e)/den)):0,w=(b*u+f)/e;if(w<0){w=0;u=Math.min(1,Math.max(0,-c/a));}else if(w>1){w=1;u=Math.min(1,Math.max(0,(b-c)/a));}
    return p1.clone().addScaledVector(d1,u).distanceTo(p2.clone().addScaledVector(d2,w));};
  // shortcut: the walked parts only (the opening to bar 19, the calderó 60-64); its running rushes (the techno, the festa)
  // still cross at 4-5 m/s sideways until they get a chassé (bou-feet.js run)
  const B=BOU_TIMING.bars,T=n=>B.find(x=>x.sourceBar===n).time;
  for(const [a,z] of [[0,T(19)],[T(60),T(64)]])for(let t=a;t<z;t+=1/60){motion(t);const L=rig.legs.map(ends);
    for(const c of [0,4])for(const a of [0,1])for(const b of [0,1])assert(seg(L[c+a],L[c+2+b])-R[a]-R[b]>-.005,`legs ${c/2} and ${c/2+1} through each other at ${t.toFixed(2)} s`);}
}
// the festa: lifted by its colla, carried once round N -> W -> S -> E
{ const seen=[];for(let b=BOU_CARRY.lap[0];b<=BOU_CARRY.lap[1];b+=.25){const t=BOU_TIMING.subdivisionTimes[Math.round(b*BOU_TIMING.subdivision)],p=bouPose(t);
  assert(p.lift>.25,'carried high');assert(Math.abs(Math.hypot(p.x,p.z)-LAP.r)<.15,'on the lap');
  const d=['S','W','N','E'][[p.x,p.z,-p.x,-p.z].indexOf(Math.max(p.x,p.z,-p.x,-p.z))];if(seen.at(-1)!==d)seen.push(d);}
  assert.equal(seen.join(''),'S'+'ENWS'.repeat(LAP.turns),'lap order (the N W S E round, from S)'); }
// the carriers' trunks and arms (figures/bou/bou-rig.js) show under a raised end (the see-saw, the festa), their hands never
// out through the shell's back
{ const v=new THREE.Vector3(),parts=[];motion(0);const toBody=new THREE.Matrix4().copy(rig.body.matrixWorld).invert();
  rig.body.traverse(o=>{if(!o.isMesh)return;const m=new THREE.Matrix4().multiplyMatrices(toBody,o.matrixWorld),b=new THREE.Box3(),a=o.geometry.attributes.position;for(let i=0;i<a.count;i++)b.expandByPoint(v.fromBufferAttribute(a,i).applyMatrix4(m));parts.push(b);});
  let out=0,shown=0;const inv=new THREE.Matrix4();
  for(let t=0;t<BOU_TIMING.duration;t+=1/30){motion(t);inv.copy(rig.body.matrixWorld).invert();
    for(const a of rig.arms)if(a.visible){shown++;a.updateMatrixWorld(true);v.set(0,1,0).applyMatrix4(a.matrixWorld).applyMatrix4(inv);out=Math.max(out,Math.min(...parts.map(b=>b.distanceToPoint(v))));}}
  assert(shown>0,'the carriers never show');assert(out<.005,`a carrier's hand out through its back (${out.toFixed(3)} m)`); }
console.log('Bou: full v13, deterministic seeks, planted soles, ending, 30/60/120 fps', {maxSpeed,maxCarried,maxStep,minFloor});
