import * as THREE from 'three';
import { buildPlaza } from '../../../src/scene/models/plaza.js';
import { buildBou } from '../../../src/figures/bou/bou.js';
import { createBouMotion } from '../../../src/figures/bou/bou-motion.js';
export function createBouStage(canvas) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  const scene=new THREE.Scene();scene.background=new THREE.Color('#d8e2dd');
  const camera=new THREE.PerspectiveCamera(43,1,.1,100);
  scene.add(new THREE.HemisphereLight('#fff4e0','#776c55',2.2));
  const sun=new THREE.DirectionalLight('#fff0d6',2.0);sun.position.set(-4,8,5);scene.add(sun);
  const plaza=buildPlaza();scene.add(plaza.group);plaza.band.forEach(p=>p.g.visible=false);
  const rig=buildBou();scene.add(rig.root,...rig.feet,...rig.legs,...rig.trunks,...rig.arms);
  const motion=createBouMotion(rig);let view='front',time=0;
  function frame() {
    const ratio=Math.max(1,1/camera.aspect),d=7.3*Math.sqrt(ratio);
    if(view==='side')camera.position.set(d,2.4,.3);
    else if(view==='rear')camera.position.set(-d*.5,2.7,-d*.85);
    else if(view==='top')camera.position.set(.01,d,1);
    else camera.position.set(d*.56,3.2,d*.83);
    camera.lookAt(0,1,.1);camera.updateProjectionMatrix();
  }
  let last=0;
  function render(t) {const now=performance.now(),dt=last&&Math.abs(t-time)<.5?(now-last)/1000:0;last=now;time=t;motion(t,dt);renderer.render(scene,camera);} // (a seek: the tail hangs still)
  const resize=new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
    renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;frame();render(time);});resize.observe(canvas);
  frame();render(0);
  return {rig,render,setView(v){view=v;frame();render(time);},dispose(){resize.disconnect();
    const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();}};
}
