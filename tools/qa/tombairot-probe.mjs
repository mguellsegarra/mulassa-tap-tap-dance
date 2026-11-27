// Geometry audit of the three development models. Dimensions and tolerances are in metres.
import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { Vox } from '../../src/scene/models/voxel.js';
import { ClothGridAstra } from '../../src/figures/tombairot-astra/cloth-grid.js';

const version = process.argv[2];
if (!['astra','fable','neon'].includes(version)) throw Error('Use fable | astra | neon, optionally --mutate');
const axes = ['x','y','z'], solids = new WeakMap();
const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const box = (a,b) => new THREE.Box3(V(...a),V(...b));
const round = x => +x.toFixed(5);
const origVox = Vox.prototype.mesh;
Vox.prototype.mesh = function () {
  const m = origVox.call(this);
  solids.set(m,this.g.map(g => {
    if (g.type !== 'BoxGeometry') throw Error('Unsupported primitive '+g.type);
    g.computeBoundingBox();
    // This adapter expects axis-aligned boxes in the actual merged geometry.
    const b = g.boundingBox, pos = g.attributes.position;
    for (let i=0;i<pos.count;i++) for (const d of axes) {
      const n = V().fromBufferAttribute(pos,i)[d];
      if (Math.min(Math.abs(n-b.min[d]),Math.abs(n-b.max[d]))>1e-5) throw Error('Rotated local box');
    }
    return b.clone();
  }));
  return m;
};
const origGrid = ClothGridAstra.prototype.mesh;
ClothGridAstra.prototype.mesh = function (name) {
  const m = origGrid.call(this,name), runs=[];
  const [nx,ny,nz] = this.size;
  for (let k=0;k<nz;k++) for(let j=0;j<ny;j++) {
    const row=nx*(j+ny*k);
    for (let i=0;i<nx;) {
      if (!this.cells[row+i]) {i++;continue;}
      const first=i++;
      while (i<nx && this.cells[row+i]) i++;
      const world = a => a.map((v,d)=>this.origin[d]+v*this.step[d]);
      runs.push(box(world([first,j,k]),world([i,j+1,k+1])));
    }
  }
  solids.set(m,runs);
  return m;
};

const directory = version === 'fable' ? 'tombairot' : 'tombairot-'+version;
const mod = await import('../../src/figures/'+directory+'/'+directory+'.js');
const build = {astra:'buildTombairotAstra',fable:'buildTombairot',neon:'buildTombairotNeon'}[version];
// Vox tint jitter changes the colour comparison. Replay one fixed build in this isolated process.
let seed=123456, r;
const random=Math.random;
try {
  Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  r=mod[build]();
} finally {Math.random=random;}
const meshes=[];
r.root.traverse(o=>{if(o.isMesh)meshes.push(o);});
const part = o => o?.isMesh ? o : o?.children.find(c=>c.isMesh);
const names = new Map();
for (const [k,v] of Object.entries(r)) for(const [i,o] of (Array.isArray(v)?v:[v]).entries()) {
  const m=part(o?.isObject3D?o:null);
  if (m) names.set(m,k+(Array.isArray(v)?i:''));
}
const label=m=>m.name || names.get(m) || m.parent?.name || 'mesh'+meshes.indexOf(m);
for (const m of meshes) if (!solids.has(m)) throw Error('Unsupported geometry '+label(m));
const contacts = [];
function link(a,b) {
  if (!part(a) || !part(b)) throw Error('Unmapped joint');
  contacts.push({a:part(a),b:part(b),misses:0,maxGap:0,worstTime:0});
}
let pose, cycle;
if (version==='astra') {
  cycle=4;pose=t=>mod.poseTombairotAstra(r,t);link(r.mantle,r.head);link(r.mantle,r.carrier);
} else if (version==='fable') {
  cycle=2*mod.TOMBA_SWAY_S;pose=t=>r.pose(t);
  for (const [a,b] of [[r.rings,r.neck],[r.rings,r.shell],[r.rings,r.skirt],[r.neck,r.head],
    [r.head,r.jaw],[r.jaw,r.tongue],...r.ears.map(e=>[r.head,e]),...r.pupils.map(p=>[r.head,p]),...r.feet.map(f=>[r.skirt,f]),
    [r.shell,r.tail[0]],[r.tail[0],r.tail[1]],[r.tail[1],r.tail[2]]]) link(a,b);
} else {
  cycle=4;pose=t=>mod.poseTombairotNeon(r,t);
  for (const [a,b] of [[r.body,r.neck],[r.neck,r.head],[r.head,r.jaw],[r.jaw,r.tongue],
    ...r.ears.map(e=>[r.head,e]),...r.pupils.map(p=>[r.head,p]),
    ...r.legs.flatMap(l=>[[l.shoe,l.pants],[l.pants,r.body]])]) link(a,b);
}

// A face patch joins solids; a single corner or edge does not.
function components(items) {
  const sorted=[...items].sort((a,b)=>a.min.y-b.min.y), parent=sorted.map((_,i)=>i);
  function root(i) { while(i!==parent[i]) {parent[i]=parent[parent[i]];i=parent[i];} return i; }
  for(let i=0;i<sorted.length;i++) for(let j=i+1;j<sorted.length && sorted[j].min.y<=sorted[i].max.y+1e-6;j++) {
    const a=sorted[i],b=sorted[j],ov=axes.map(d=>Math.min(a.max[d],b.max[d])-Math.max(a.min[d],b.min[d]));
    if (Math.min(...ov)>=-1e-6 && ov.filter(v=>v>1e-6).length>=2) parent[root(j)]=root(i);
  }
  const groups=new Map();
  sorted.forEach((b,i)=>{const k=root(i);if(!groups.has(k)) groups.set(k,new THREE.Box3());groups.get(k).union(b);});
  if(groups.size>1) console.log('component bounds',JSON.stringify([...groups.values()].map(b=>[b.min.toArray().map(round),b.max.toArray().map(round)])));
  return groups.size;
}

// Subtract the intersecting volume as at most six disjoint rectangular pieces.
function subtract(a,b) {
  const cut=a.clone().intersect(b);
  if(axes.some(d=>cut.max[d]<=cut.min[d])) return [a];
  const core=a.clone(),out=[];
  for(const d of axes) {
    if(core.min[d]<cut.min[d]) {const t=core.clone();t.max[d]=cut.min[d];out.push(t);core.min[d]=cut.min[d];}
    if(core.max[d]>cut.max[d]) {const t=core.clone();t.min[d]=cut.max[d];out.push(t);core.max[d]=cut.max[d];}
  }
  return out;
}
function buried(items) {
  return items.flatMap((b,i)=>{
    let remainder=[b.clone().expandByScalar(.00001)];
    for (const c of items) {
      if(c===b || !b.intersectsBox(c)) continue;
      remainder=remainder.flatMap(a=>subtract(a,c));
      if (!remainder.length) return [i];
    }
    return [];
  });
}

const triangles=meshes.reduce((s,m)=>s+m.geometry.index.count/3,0);
const statistics=meshes.map(m=>{
  const items=solids.get(m);
  return {mesh:label(m),components:components(items),buried:version==='astra'?[]:buried(items)};
});
const gapVector=V(), diff=V();
function boundsGap(a,b) {
  gapVector.subVectors(a.min,b.max).max(diff.subVectors(b.min,a.max)).max(zero);
  return gapVector.length();
}
const zero=V();
function tree(items) {
  const bounds=new THREE.Box3();
  for (const b of items) bounds.union(b);
  const node={bounds};
  if (items.length===1) return node;
  const size=bounds.getSize(V()),d=axes.reduce((best,d)=>size[d]>size[best]?d:best,'x');
  items.sort((a,b)=>a.min[d]+a.max[d]-b.min[d]-b.max[d]);
  const n=items.length>>1;
  node.children=[tree(items.slice(0,n)),tree(items.slice(n))];
  return node;
}
const trees=new Map(meshes.map(m=>[m,tree([...solids.get(m)])]));
let frame=0;
function update(node,m) {
  if(node.frame!==frame) {
    node.frame=frame;
    node.world=(node.world||new THREE.Box3()).copy(node.bounds).applyMatrix4(m.matrixWorld);
  }
  return node.world;
}
function orient(node,m) {
  const b=new OBB().fromBox3(node.bounds).applyMatrix4(m.matrixWorld);
  node.bounds.getCenter(b.center).applyMatrix4(m.matrixWorld);
  return b;
}
// Largest separating-axis projection is a positive lower bound on exact surface distance.
function separation(a,b) {
  const basis=o=>[0,1,2].map(i=>V().fromArray(o.rotation.elements,3*i));
  const u=basis(a),v=basis(b),delta=V().subVectors(a.center,b.center);
  const radius=(o,basis,d)=>basis.reduce((sum,t,i)=>sum+o.halfSize.getComponent(i)*Math.abs(t.dot(d)),0);
  let distance=0;
  for(const d of [...u,...v,...u.flatMap(p=>v.map(q=>V().crossVectors(p,q)))]) {
    if(d.lengthSq()<1e-12) continue;
    d.normalize();
    distance=Math.max(distance,Math.abs(delta.dot(d))-radius(a,u,d)-radius(b,v,d));
  }
  return distance;
}
function joint(j,time) {
  let lower=Infinity,hit=false;
  function search(a,b) {
    const ga=update(a,j.a),gb=update(b,j.b),g=boundsGap(ga,gb);
    if(hit || (g>0 && g>=lower)) return;
    if(!a.children && !b.children) {
      const oa=orient(a,j.a),ob=orient(b,j.b);
      if(oa.intersectsOBB(ob,1e-8)) { hit=true;j.last=[a,b]; }
      else lower=Math.min(lower,Math.max(g,separation(oa,ob)));
      return;
    }
    if(!b.children || (a.children && ga.getSize(V()).lengthSq()>gb.getSize(V()).lengthSq())) {
      for(const c of a.children) search(c,b);
    } else for(const c of b.children) search(a,c);
  }
  if(j.last && orient(j.last[0],j.a).intersectsOBB(orient(j.last[1],j.b),1e-8)) return;
  // Even mutually overlapping AABBs can have disjoint oriented boxes. Only intersection passes.
  search(trees.get(j.a),trees.get(j.b));
  if(!hit) {j.misses++;if(lower>j.maxGap){j.maxGap=lower;j.worstTime=time;}}
}

// Clip the projected face polygon by a convex rectangle in its plane.
function overlapPolygon(poly,rect) {
  for(let i=0;i<4;i++) {
    const [x,y]=rect[i], [u,v]=rect[(i+1)%4],out=[];
    const side=p=>(u-x)*(p[1]-y)-(v-y)*(p[0]-x);
    for(let j=0;j<poly.length;j++) {
      const a=poly[j],b=poly[(j+1)%poly.length],da=side(a),db=side(b);
      if(da>=0)out.push(a);
      if((da>0 && db<0)||(da<0 && db>0)) {
        const t=da/(da-db);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
      }
    }
    poly=out;
  }
  return poly;
}

// Can an orbit camera see the sampled patch centre without another front face in the way?
const cameras=Array.from({length:8},(_,i)=>i*Math.PI/4).flatMap(a=>[.15,1.7,3.6].map(y=>V(5*Math.sin(a),y,5*Math.cos(a))));
function visibleFromOrbit(p,n) {
  return cameras.some(camera=>{
    const d=V().subVectors(camera,p),dist=d.length();d.normalize();
    if(n.dot(d)<.15)return false;
    const ray=new THREE.Raycaster(camera,d.negate(),0,dist-.00002);
    return !ray.intersectObjects(meshes,false).length;
  });
}
function facePairs() {
  const planes=new Map(), counts={same:0,different:0,exposedDifferent:0,exposedExact:0,orbitVisible:0,orbitExact:0},examples=[];
  for(const m of meshes) {
    const g=m.geometry,attr=g.attributes.position,col=g.attributes.color,index=g.index;
    if(!index || index.count%6) throw Error('Quad index stream expected in '+label(m));
    for(let i=0;i<index.count;i+=6) {
      const ids=[...new Set(Array.from(index.array.slice(i,i+6)))];
      if(ids.length!==4) throw Error('Expected two indexed triangles per rectangle');
      const ps=ids.map(id=>V().fromBufferAttribute(attr,id).applyMatrix4(m.matrixWorld));
      const n=V().crossVectors(V().subVectors(ps[1],ps[0]),V().subVectors(ps[2],ps[0])).normalize();
      const h=n.dot(ps[0]),group=n.toArray().map(v=>Math.round(v*1e5)).join(',');
      const u=V().crossVectors(n,Math.abs(n.y)<.8?V(0,1,0):V(1,0,0)).normalize(),v=V().crossVectors(n,u);
      const poly=ps.map(p=>[u.dot(p),v.dot(p)]);
      const cx=poly.reduce((s,p)=>s+p[0],0)/4,cy=poly.reduce((s,p)=>s+p[1],0)/4;
      poly.sort((a,b)=>Math.atan2(a[1]-cy,a[0]-cx)-Math.atan2(b[1]-cy,b[0]-cx));
      const bin=Math.floor(h/.003),color=col?V().fromBufferAttribute(col,ids[0]).toArray().map(round).join(','):m.material.color.getHexString();
      const key=k=>group+'/'+k;
      const bounds=new THREE.Box2().setFromPoints(poly.map(p=>new THREE.Vector2(...p)));
      for(let k=bin-1;k<=bin+1;k++) for(const f of planes.get(key(k))||[]) {
        if(Math.abs(f.h-h)>.003 || !bounds.intersectsBox(f.bounds)) continue;
        const p=overlapPolygon(poly,f.poly);
        const area=Math.abs(p.reduce((s,a,j)=>{const b=p[(j+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;
        if(area<.000004)continue;
        if(color===f.color) {counts.same++;continue;}
        counts.different++;
        const avg=p.reduce((s,q)=>[s[0]+q[0]/p.length,s[1]+q[1]/p.length],[0,0]);
        const pt=u.clone().multiplyScalar(avg[0]).addScaledVector(v,avg[1]).addScaledVector(n,Math.max(h,f.h)+.00002);
        const covered=meshes.some(mesh=>{
          const local=mesh.worldToLocal(pt.clone());
          return solids.get(mesh).some(b=>b.containsPoint(local));
        });
        if(!covered) {
          counts.exposedDifferent++;
          if(Math.abs(h-f.h)<.00001)counts.exposedExact++;
          const visible=visibleFromOrbit(pt,n);
          if(visible){counts.orbitVisible++;if(Math.abs(h-f.h)<.00001)counts.orbitExact++;}
          examples.push([label(m),label(f.m),pt.toArray().map(round),round(area*1e4),round(Math.abs(h-f.h)*1000),Math.floor(i/36),Math.floor(f.i/36),visible]);
        }
      }
      const bucket=key(bin);
      if(!planes.has(bucket))planes.set(bucket,[]);
      planes.get(bucket).push({m,i,h,color,poly,bounds});
    }
  }
  examples.sort((a,b)=>Number(b[7])-Number(a[7]) || b[3]-a[3]);
  return {counts,examples:process.argv.includes('--faces')?examples:examples.slice(0,4)};
}

pose(0);
if(process.argv.includes('--mutate')) {
  // Move only this process's instance, never a source file.
  const mesh=contacts[0].b;
  mesh.position.y+=.17;
}
r.root.updateMatrixWorld(true);
const bounds=new THREE.Box3().setFromObject(r.root,true), dimensions=bounds.getSize(V());
console.log(version,'triangles',triangles,'W/H/D',dimensions.toArray().map(round),'W/H',round(dimensions.x/dimensions.y));
// Extents of the yellow foam and dark front panel, before another surface may hide their edges.
const targetColours={
  astra:[[0xffdf45,0xffda40,0xd3a323],[0x272c28]],
  neon:[[0xf6dc32,0xdcb722],[0x161312]],
  fable:[[0xf6d31c,0xd79f0e],[0x141712]]
}[version].map(palette=>palette.map(hex=>new THREE.Color(hex)));
const features=[new THREE.Box3(),new THREE.Box3()];
for(const m of meshes) {
  const {position,color}=m.geometry.attributes;
  for(let i=0;i<position.count;i++) {
    const p=V().fromBufferAttribute(position,i).applyMatrix4(m.matrixWorld);
    const c=new THREE.Color().fromBufferAttribute(color,i);
    for(let k=0;k<2;k++) {
      if(p.y<.55 || p.y>(k?1.4:1.05) || (k && p.z<.22))continue;
      if(targetColours[k].some(t=>Math.abs(t.r-c.r)+Math.abs(t.g-c.g)+Math.abs(t.b-c.b)<.0001))features[k].expandByPoint(p);
    }
  }
}
console.log('foam width/H; panel width/H, height/H, centre/H',
  [features[0].getSize(V()).x,features[1].getSize(V()).x,features[1].getSize(V()).y,features[1].getCenter(V()).y].map(x=>round(x/dimensions.y)));
console.log('mesh components; wholly buried source box indices',JSON.stringify(statistics));
console.log('same-normal face pairs <=3mm (rest pose)',JSON.stringify(facePairs()));
let minY=Infinity,below=new Set();
const samples=Math.ceil(cycle*120), posePairs=[];
for(let i=0;i<=samples;i++) {
  pose(i*cycle/samples);r.root.updateMatrixWorld(true);frame++;
  for(const m of meshes) {
    const a=m.geometry.attributes.position.array,e=m.matrixWorld.elements;
    for(let j=0;j<a.length;j+=3) {
      const y=e[1]*a[j]+e[5]*a[j+1]+e[9]*a[j+2]+e[13];
      minY=Math.min(minY,y);
      if(y<-.00001)below.add(label(m));
    }
  }
  for(const j of contacts)joint(j,i*cycle/samples);
  if(i>0 && i<samples && i%(samples/4)===0) posePairs.push([round(i*cycle/samples),facePairs().counts.exposedDifferent]);
}
console.log('other poses [s, exposed different-colour pairs]',JSON.stringify(posePairs));
console.log('pose samples',samples+1,'seconds',cycle,'minimum Y',round(minY),'below floor',[...below]);
console.log('joints [parts, disconnected poses, worst gap lower bound in m, time in s]',JSON.stringify(contacts.map(j=>[label(j.a)+'/'+label(j.b),j.misses,round(j.maxGap),round(j.worstTime)])));
