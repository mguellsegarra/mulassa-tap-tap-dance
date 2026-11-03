import * as THREE from 'three';
import { mulaRig, dracRig, rigParts, poseMula, poseDrac, MULA_POSES, DRAC_POSES, MULA_SCALE, DRAC_K, MULA_YAW, DRAC_YAW, bake } from '/src/jocs/games/pica/board-figures.js';
import { buildSimpleCalcot, buildSimpleCampanar, buildSimpleCarretilla, buildSimplePetard } from '/src/jocs/games/pica/simple-figures.js';
import { buildCalcot, buildCampanar, buildCarretilla, buildPetard } from '/src/jocs/games/pica/goodies.js';

// Proposal-only board. Reuses the game's rigs, poses, scales and baking contract;
// createBoard owns a full-window camera and a fixed floor, so it cannot frame this panel.
export function createProposalBoard(canvas, concept) {
 const configs={
 A:{floor:'#414650',tile:'#555b66',alt:'#4b515c',frame:'#282c36',target:'#a87920',good:'#627e8e',tilt:58,pitch:3.9},
 B:{floor:'#62717a',tile:'#82919a',alt:'#788892',frame:'#394b57',target:'#b9933d',good:'#527b8c',tilt:66,pitch:3.9},
 C:{floor:'#333653',tile:'#4c4d71',alt:'#424363',frame:'#9571a6',target:'#a47a3c',good:'#6a7094',tilt:57,pitch:4},
 D:{floor:'#365b7d',tile:'#527c9c',alt:'#47718f',frame:'#183b60',target:'#b7852f',good:'#598c9b',tilt:70,pitch:4.1}
 };
 const cfg=configs[concept], renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(cfg.floor);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#76849a',2.2));const sun=new THREE.DirectionalLight('#fff7e8',2.7);sun.position.set(-8,18,12);scene.add(sun);
 const camera=new THREE.OrthographicCamera(-20,20,20,-20,.1,300), root=new THREE.Group();scene.add(root);
 const material=new THREE.MeshLambertMaterial({vertexColors:true});
 const live=rig=>({rig,parts:rigParts(rig.root).map(p=>{const mesh=new THREE.InstancedMesh(p.geo,material,24);mesh.frustumCulled=false;root.add(mesh);return {...p,mesh}})});
 const mula=live(mulaRig()),drac=live(dracRig());
 // The fallback preserves these source builders' contract when opened without ?simple.
 const simple=new URLSearchParams(location.search).has('simple');
 const builds=simple?[buildSimpleCalcot,buildSimpleCampanar,buildSimpleCarretilla,buildSimplePetard]:[buildCalcot,buildCampanar,buildCarretilla,buildPetard];
 const extras=builds.map((fn,i)=>{const mesh=new THREE.Mesh(bake(fn(),{scale:[.82,.62,.72,.7][i]}),material);root.add(mesh);return mesh});
 const tiles=new THREE.InstancedMesh(new THREE.BoxGeometry(cfg.pitch-.12,.18,4.5-.12),new THREE.MeshLambertMaterial(),24);root.add(tiles);
 const slab=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({color:cfg.frame}));root.add(slab);
 const contact=new THREE.InstancedMesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:'#0b1621',transparent:true,opacity:.22,depthWrite:false}));root.add(contact);
 const d=new THREE.Object3D();let cols=6,rows=4,centres=[],showcase=false;
 function resize(){const rect=canvas.parentElement.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);renderer.setSize(w,h,false);showcase=innerWidth<650&&!['play','pause'].includes(document.body.dataset.screen);cols=showcase?2:innerWidth<650?4:6;rows=showcase?1:24/cols;tiles.count=contact.count=showcase?2:24;extras.forEach(m=>m.visible=!showcase);centres=Array.from({length:showcase?2:24},(_,i)=>({x:(i%cols-(cols-1)/2)*cfg.pitch,z:(Math.floor(i/cols)-(rows-1)/2)*4.5}));
 centres.forEach((p,i)=>{d.position.set(p.x,0,p.z);d.rotation.set(0,0,0);d.scale.set(1,1,1);d.updateMatrix();tiles.setMatrixAt(i,d.matrix);tiles.setColorAt(i,new THREE.Color([3,14,20].includes(i)?cfg.target:[7,17,22,11].includes(i)?cfg.good:i%2?cfg.tile:cfg.alt));d.rotation.x=-Math.PI/2;d.position.y=.11;d.scale.set(1.1,1.4,1);d.updateMatrix();contact.setMatrixAt(i,d.matrix)});tiles.instanceMatrix.needsUpdate=true;tiles.instanceColor.needsUpdate=true;contact.instanceMatrix.needsUpdate=true;
 slab.position.set(0,-.3,0);slab.scale.set(cols*cfg.pitch+.5,.4,rows*4.5+.5);
 const tilt=THREE.MathUtils.degToRad(cfg.tilt);camera.position.set(0,Math.sin(tilt)*70,Math.cos(tilt)*70);camera.lookAt(0,1,0);camera.updateMatrixWorld();
 // Project the full board's figure envelope, then fit equally on both axes.
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const x of [-cols*cfg.pitch/2-.5,cols*cfg.pitch/2+.5])for(const z of [-rows*4.5/2-.5,rows*4.5/2+.5])for(const y of [-.5,3.5]){const v=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y)}
 const available=Math.max(.45,(h-72)/h),half=Math.max((maxY-minY)/2/available,(maxX-minX)/2/(w/h)) * 1.04, mid=(minY+maxY)/2;
 camera.left=-half*w/h;camera.right=half*w/h;camera.top=mid+half;camera.bottom=mid-half;camera.updateProjectionMatrix();canvas.dataset.grid=`${cols}x${rows}`;
 }
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let raf,last=0;
 function frame(ms){raf=requestAnimationFrame(frame);if(ms-last<45)return;last=ms;const t=reduced.matches?0:ms/1000;const paused=document.body.dataset.screen==='pause';
 for(const fig of [mula,drac])for(const p of fig.parts)p.mesh.count=0;
 centres.forEach((p,i)=>{const extraIndex=showcase?-1:[7,17,22,11].indexOf(i);if(extraIndex>=0){const mesh=extras[extraIndex];mesh.position.set(p.x,.12,p.z);mesh.rotation.y=Math.sin(t*.5)*.1;return}
 const isMula=showcase?i===1:[3,14,20].includes(i),f=isMula?mula:drac,pose=isMula?MULA_POSES[0]:DRAC_POSES[i%DRAC_POSES.length];
 if(isMula)poseMula(f.rig,pose,paused?0:t,i,0);else poseDrac(f.rig,pose,paused?0:t,i,0);
 const scale=isMula?MULA_SCALE:DRAC_K;f.rig.root.position.set(p.x,.12,p.z);f.rig.root.scale.setScalar(scale);f.rig.root.rotation.set(0,isMula?MULA_YAW:DRAC_YAW,0);f.rig.root.updateMatrixWorld(true);
 for(const part of f.parts){part.mesh.setMatrixAt(part.mesh.count++,part.node.matrixWorld)}
 });for(const fig of [mula,drac])for(const p of fig.parts)p.mesh.instanceMatrix.needsUpdate=true;renderer.render(scene,camera);canvas.dataset.ready='true';
 }
 const observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);resize();raf=requestAnimationFrame(frame);
 addEventListener('pagehide',()=>{cancelAnimationFrame(raf);observer.disconnect();scene.traverse(o=>{o.geometry?.dispose();if(o.material&&!Array.isArray(o.material))o.material.dispose()});renderer.dispose()},{once:true});
 return {resize};
}
