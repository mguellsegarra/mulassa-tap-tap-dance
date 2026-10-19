// The lab's 3D view: the real Drac rig (one build, so both programmes show the same geometry) on a floor with a 0.5 m
// grid and a mark on its spot, under the same camera whichever dance is shown. The caller owns the frame loop.
import * as THREE from 'three';
import { buildDrac, DRAC_SCALE } from '../../scene/models/drac.js';
import { poseDrac } from '../../scene/drac-motion.js';
import { newDracPose } from '../../game/dance-drac.js';
import { newDracFeet } from '../../game/drac-feet.js';
import { poseRigid } from './trial-rig.js';

// [camera position, where it looks] in metres; the beast faces +z (the plaça's front, the video's camera)
export const VIEWS = {
  frontal: [[1.2, 1.9, 8.6], [0, 1.25, 0.6]],
  planta: [[0, 11.5, 1.4], [0, 0, 0.6]],
  lateral: [[8.4, 1.8, 0.7], [0, 1.25, 0.7]],
}; // both dances' world bounding boxes stay inside a 16:9 frame over their whole songs (the canvas keeps 16:9)

export function createLabStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.setClearColor('#20232c');
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
  scene.add(new THREE.HemisphereLight(0xfff1d6, 0x4a4f63, 2.2));
  const sun = new THREE.DirectionalLight(0xffe8cb, 2.6); sun.position.set(3, 8, 6); scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ color: '#5a5650', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.004; scene.add(floor);
  const grid = new THREE.GridHelper(8, 16, 0x8d8576, 0x6d675e); grid.position.y = -0.002; scene.add(grid);
  const spot = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.33, 40), new THREE.MeshBasicMaterial({ color: '#f5c518' }));
  spot.rotation.x = -Math.PI / 2; spot.position.y = 0.001; scene.add(spot);
  const rig = buildDrac(), life = new THREE.Group();
  rig.feet = newDracFeet(); life.scale.setScalar(DRAC_SCALE); life.add(rig.root); scene.add(life);
  const pose = newDracPose();
  let view = 'frontal';

  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const [[px, py, pz], [lx, ly, lz]] = VIEWS[view], k = Math.max(1, 1.25 / camera.aspect); // narrow: step back
    camera.position.set(lx + (px - lx) * k, ly + (py - ly) * k, lz + (pz - lz) * k);
    camera.up.set(0, view === 'planta' ? 0 : 1, view === 'planta' ? -1 : 0);
    camera.lookAt(lx, ly, lz); camera.updateProjectionMatrix();
  }
  // poses `p`'s dance at `beat`: the proposal as one rigid shell, the current dance exactly as the game poses it
  function render(p, beat) {
    p.dance.pose(pose, beat);
    if (p.id === 'proposal') poseRigid(rig, pose, 0, p.feet); else poseDrac(rig, pose, 0, p.feet);
    renderer.render(scene, camera);
  }
  function setView(v) { if (VIEWS[v]) { view = v; resize(); } return view; }
  resize();
  return { render, resize, setView, pose, rig, get view() { return view; } };
}
