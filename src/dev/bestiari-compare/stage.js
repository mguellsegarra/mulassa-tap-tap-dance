import * as THREE from 'three';
import { buildMulassa } from '../../scene/models/mulassa.js';
import { createCarriers } from './carriers.js';
import { CARRIER_SCALE } from './supports.js';
import { poseMulassa } from '../../scene/mula-pose-rig.js';

export function createStage(canvas, motion) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#a7bdca');
  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 60);
  camera.position.set(0, 1.5, 10); camera.lookAt(0, 2.05, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa68b65, 2.5));
  const light = new THREE.DirectionalLight(0xfff0d5, 3); light.position.set(-4, 9, 5); scene.add(light);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshLambertMaterial({ color: '#ddc39c' }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.005; scene.add(floor);
  scene.add(new THREE.GridHelper(30, 60, '#b9a07d', '#c8af8b'));
  const rig = buildMulassa(); scene.add(rig.root);
  rig.neck.rotation.x = 0.15; rig.head.rotation.x = 0.2;
  rig.peek.visible = false;
  const carriers = createCarriers(scene, motion);
  const resize = new ResizeObserver(() => {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  });
  resize.observe(canvas);
  function render(t, pose, baseline) {
    // Opening camera stays independent of the reconstructed lateral motion.
    const follow = Math.max(0, Math.min(1, (t - 67) / 4));
    const second = Math.max(0, Math.min(1, (t - 34) / 2, (67 - t) / 2));
    const cameraX = -.95 + .5 * follow - .6 * second + pose.cameraX + pose.x * .65 * follow;
    camera.fov = baseline ? 32 : 29;
    camera.position.set(cameraX, 1.5, (baseline ? 10 : 8.2) + pose.z * .6 * follow);
    camera.lookAt(cameraX, baseline ? 2.05 : 1.43 + .22 * follow + pose.cameraY, pose.z * .6 * follow);
    camera.updateProjectionMatrix();
    carriers.visible(!baseline);
    if (baseline) {
      rig.root.scale.set(1, 1, 1);
      rig.body.children[0].scale.y = 1; rig.body.children[0].position.y = 0;
      for (const leg of rig.legs) leg.visible = true;
      poseMulassa(rig, baseline.pose, baseline.beat, -65 * Math.PI / 180);
      renderer.render(scene, camera); return;
    }
    rig.root.scale.set(1, CARRIER_SCALE.y, CARRIER_SCALE.z);
    // Keep the cloth tall: a uniform height correction would flatten the skirt.
    rig.body.children[0].scale.y = 1.35; rig.body.children[0].position.y = .20;
    rig.neck.rotation.set(0.15, 0, 0); rig.head.rotation.x = 0.2; rig.jaw.rotation.x = 0;
    rig.tail.rotation.set(0, 0, 0);
    for (const ear of rig.ears) ear.rotation.x = 0;
    for (const leg of rig.legs) leg.visible = false;
    rig.root.position.set(pose.x, pose.lift, pose.z); rig.root.rotation.y = pose.yaw;
    rig.body.rotation.set(pose.pitch, 0, pose.roll);
    rig.root.updateMatrixWorld(true);
    carriers.pose(t, pose);
    renderer.render(scene, camera);
  }
  return { render, dispose() { resize.disconnect(); renderer.dispose(); } };
}
