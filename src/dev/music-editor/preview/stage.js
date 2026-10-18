import * as THREE from 'three';
import { buildMulassa } from '../../../scene/models/mulassa.js';
import { buildDrac, DRAC_SCALE } from '../../../scene/models/drac.js';
import { poseDrac } from '../../../scene/drac-motion.js';
import { poseMulassa } from '../../../scene/mula-pose-rig.js';
import { makeDance, newPose } from '../../../game/dance.js';
import { makeDracDance, newDracPose } from '../../../game/dance-drac.js';
import { makeDracFeet, newDracFeet } from '../../../game/drac-feet.js';

// Dev-only stage: the caller owns render cadence and the AudioContext transport owns its beat.
export function createStage(canvas, song) {
  const id = typeof song === 'string' ? song : song.id ?? song.song;
  if (id !== 'mulassa' && id !== 'drac') throw new RangeError('Unknown preview song');
  const isDrac = id === 'drac', rig = isDrac ? buildDrac() : buildMulassa();
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.setClearColor('#191b24');
  const life = new THREE.Group();
  if (isDrac) { life.scale.setScalar(DRAC_SCALE); rig.feet = newDracFeet(); }
  life.add(rig.root); scene.add(life);
  scene.add(new THREE.HemisphereLight(0xffefcf, 0x454c66, 2.3));
  const light = new THREE.DirectionalLight(0xffe8cb, 2.8); light.position.set(4, 8, 6); scene.add(light);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: '#42434a', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.005; scene.add(floor);
  const pose = isDrac ? newDracPose() : newPose();
  let dance = null, feet = null, disposed = false, lastBeat = 0;
  function resize() {
    if (disposed) return;
    const width = Math.max(1, canvas.clientWidth || canvas.width || 1), height = Math.max(1, canvas.clientHeight || canvas.height || 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const distance = Math.max(10, 7 / camera.aspect);
    camera.position.set(distance * 0.52, distance * 0.32 + 1, distance * 0.8);
    camera.lookAt(0, isDrac ? 1.4 : 1.8, 0); camera.updateProjectionMatrix();
  }
  function render(beat) {
    if (disposed) return;
    if (!dance) { renderer.render(scene, camera); return; } // an empty sequence: she stands still
    lastBeat = beat; dance.pose(pose, beat);
    if (isDrac) poseDrac(rig, pose, 0, feet); else poseMulassa(rig, pose, beat);
    renderer.render(scene, camera);
  }
  function setTimeline(timeline) {
    if (disposed) return;
    if (!(timeline.end > 0)) { dance = feet = null; render(lastBeat); return; } // nothing in the sequence yet
    dance = (isDrac ? makeDracDance : makeDance)(timeline);
    feet = isDrac ? makeDracFeet(dance, timeline.end) : null;
    render(lastBeat);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    const geometries = new Set(), materials = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    renderer.dispose();
  }
  resize();
  return { setTimeline, render, resize, dispose };
}
