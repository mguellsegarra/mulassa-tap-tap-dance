import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CATALOGUE, buildFigure, disposeFigure } from '../src/dev/representation/models.js';
import { pose, timeAtDistance, palmLocal } from '../src/dev/representation/pose.js';
import { crowdMotion, animatePerson } from '../src/dev/representation/live-pose.js';
import { buildHelper, poseHelper, MULA_HELPER_LOOKS, ARM } from '../src/scene/models/colla.js';
import { reviewAttendant, linkRolePose, followRolePose } from '../src/dev/representation/role-models.js';
import { settleDrawnCrowd } from '../src/scene/crowd-contact.js';
import { buildPublicSpecs } from '../src/dev/representation/population.js';

const hand = (p, i) => palmLocal(p, i).applyMatrix4(p.g.matrixWorld);
let baselineJump = 0, fixedJump = 0, caneError = 0;
for (const hz of [30, 60, 120]) for (const spec of CATALOGUE) {
  const p = buildFigure(spec), source = { g: new THREE.Group(), vel: new THREE.Vector2(), ph: 0, spd: 0 };
  const state = crowdMotion(p, source), previous = [new THREE.Vector3(), new THREE.Vector3()];
  let havePrevious = false;
  for (let frame = 0; frame <= hz * 4; frame++) {
    const t = frame / hz, dt = 1 / hz;
    const speed = t < 1 ? (frame % 2 ? .041 : .035) : t < 2 ? .7 : t < 3 ? -.7 : 0;
    source.vel.set(0, speed); source.spd = Math.abs(speed); source.g.position.z += speed * dt;
    animatePerson(p, source, state, { dt, time: t, clap: t < 3 ? 1 : 0, festa: t >= 3 ? 1 : 0 });
    p.g.updateMatrixWorld(true);
    for (const i of [0, 1]) { const h = hand(p, i); if (havePrevious) fixedJump = Math.max(fixedJump, h.distanceTo(previous[i])); previous[i].copy(h); }
    havePrevious = true;
    if (p.cane) caneError = Math.max(caneError, Math.abs(p.caneTip.clone().applyMatrix4(p.cane.matrixWorld).y));
    for (const b of p.bones) assert(b.matrixWorld.elements.every(Number.isFinite), `${spec.id} finite transform`);
  }
  const before = p.bones.map(b => b.matrixWorld.toArray());
  animatePerson(p, source, state, { dt: 0, time: 4, clap: 0, festa: 1 });p.g.updateMatrixWorld(true);
  assert.deepEqual(p.bones.map(b => b.matrixWorld.toArray()), before, 'a second render at the same time cannot advance the rig');
  disposeFigure(p);
}
// Demonstrate that the old instantaneous gallery-mode switch violates the independent continuity bound.
{
 const p = buildFigure(CATALOGUE.find(x => x.id === 'p05'));
 pose(p, 'moure', timeAtDistance(p, .2));p.g.updateMatrixWorld(true);const a=hand(p,1);
 pose(p, 'picar', .3);p.g.updateMatrixWorld(true);baselineJump=a.distanceTo(hand(p,1));disposeFigure(p);
}
assert(baselineJump>.5,'baseline must reproduce the visible arm teleport');
assert(fixedJump<.18,`live transitions must not teleport a hand: ${fixedJump} m at >=30 Hz`);
assert(caneError<.005,`final held cane stays on ground: ${caneError}`);
{
 const p=buildFigure(CATALOGUE.find(x=>x.id==='p04'));
 const source={g:new THREE.Group(),vel:new THREE.Vector2(0,-.5),spd:.5,ph:0};const state=crowdMotion(p,source);
 source.g.position.z=-.2;animatePerson(p,source,state,{dt:.1,time:1});assert(p.wheels.every(w=>w.rotation.x<0),'rolling backwards reverses both wheels');
 const first=p.wheels.map(w=>w.rotation.x);source.g.rotation.y=.2;animatePerson(p,source,state,{dt:.1,time:1.1});
 assert((p.wheels[0].rotation.x-first[0])*(p.wheels[1].rotation.x-first[1])<0,'turning in place drives wheels in opposite directions');
 disposeFigure(p);
}
{
 const make = x => ({g:new THREE.Group(),rad:.52,yaw:0,fall:0,pos:new THREE.Vector2(x,0)});
 const a=make(0),b=make(1.1);a.g.position.x=.1;b.g.position.x=.9;
 assert(a.g.position.distanceTo(b.g.position)<a.rad+b.rad,'baseline eased positions must reproduce the overlap');
 settleDrawnCrowd([a,b],[]);
 assert(a.g.position.distanceTo(b.g.position)>=a.rad+b.rad-1e-9,'final drawn footprints must separate');
 const wall={pos:new THREE.Vector2(0,0),rad:.33,fixed:true};settleDrawnCrowd([a],[wall]);
 assert(Math.hypot(a.g.position.x,a.g.position.z)>=a.rad+wall.rad-1e-9,'static backdrop must stop the drawn person');
 const c=make(0),d=make(.2);c.g.position.x=0;d.g.position.x=.05;c.fall=d.fall=1;
 for(let f=0;f<120;f++){const x0=[c.g.position.clone(),d.g.position.clone()];settleDrawnCrowd([c,d],[wall],2.5/60);
  assert(c.g.position.distanceTo(x0[0])<=2.5/60+1e-9&&d.g.position.distanceTo(x0[1])<=2.5/60+1e-9,'a deep overlap never jumps a drawn person');}
 assert(c.g.position.distanceTo(d.g.position)>=c.rad+d.rad+.8-1e-6,'the capped correction still separates them within two seconds');
}
{
 const source=buildHelper(MULA_HELPER_LOOKS[0],1),p=reviewAttendant(CATALOGUE.find(x=>x.id==='p11'),0),links=linkRolePose(p,source);
 for(let frame=0;frame<240;frame++){
  const t=frame/60,cheer=(1-Math.cos(t*Math.PI))/2;poseHelper(source,t*2,.8,cheer);followRolePose(links);p.g.position.copy(source.g.position);
  source.g.updateMatrixWorld(true);p.g.updateMatrixWorld(true);
  for(let i=0;i<2;i++){
   const a=new THREE.Vector3(0,-ARM.fore,0).applyMatrix4(source.arms[i].el.matrixWorld),b=new THREE.Vector3(0,-ARM.fore,0).applyMatrix4(p.arms[i].el.matrixWorld);
   assert(a.distanceTo(b)<1e-10,'appearance variants must retain the owning crew pose through cheering and recovery');
  }
 }
 disposeFigure(p);
}
{
 const source=buildHelper(MULA_HELPER_LOOKS[0],1),p=reviewAttendant(CATALOGUE.find(x=>x.id==='p11'),0),links=linkRolePose(p,source);
 for(const hz of [30,60,120])for(let frame=0;frame<hz;frame++){
  const before=p.bones.map(b=>b.quaternion.clone());poseHelper(source,frame/hz*2,1,frame%2);followRolePose(links,1/hz);
  p.bones.forEach((b,i)=>assert(b.quaternion.angleTo(before[i])<=6/hz+1e-7,'crew gestures have the same bounded angular speed through cheer changes'));
 }
 disposeFigure(p);
}
{ // an attendant's grafted head keeps its skull: front face and both sides, not only the eyes and hair
 const spec=CATALOGUE.find(x=>x.id==='p11'),p=reviewAttendant(spec,0),g=p.head.children.at(-1).geometry,pos=g.attributes.position,col=g.attributes.color,ix=g.index,skin=new THREE.Color(spec.skin),n=new Set();
 for(let i=0;i<ix.count;i+=3){const v=[0,1,2].map(k=>ix.getX(i+k));if(v.every(j=>Math.abs(col.getX(j)-skin.r)+Math.abs(col.getY(j)-skin.g)+Math.abs(col.getZ(j)-skin.b)<0.08)&&v.some(j=>pos.getY(j)<0.01)){const z=v.map(j=>pos.getZ(j)),x=v.map(j=>pos.getX(j));n.add(z.every(q=>q>0.15)?'front':x.every(q=>q>0.16)?'right':x.every(q=>q<-0.16)?'left':'other');}}
 for(const side of ['front','left','right']) assert.ok(n.has(side),`attendant head lost its skull ${side} (${[...n]})`);
}
{ // the review examples (wheelchairs, canes) stand spread through the crowd, not side by side at its centre
 const sources=Array.from({length:60},(_,i)=>({row:0,slot:i,pos:new THREE.Vector2(i*.9,0),appearance:{skin:'#000'}}));
 const mob=buildPublicSpecs(sources,CATALOGUE,7).map((s,i)=>s.mobility?sources[i].pos:null).filter(Boolean);
 assert.equal(mob.length,4,'all four mobility examples are placed');
 for(let i=0;i<mob.length;i++)for(let j=i+1;j<mob.length;j++)assert(mob[i].distanceTo(mob[j])>=3,'mobility examples at least 3 m apart');
}
console.log('representation live motion ok', {baselineJump,fixedJump,caneError});
