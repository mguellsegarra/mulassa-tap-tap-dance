import * as THREE from 'three';
import { buildMulassa } from '../../scene/models/mulassa.js';
import { createCarriers } from '../../scene/mula-carriers.js';
import { createCameraFrame } from './camera.js';
import { addDirectionMarkers } from './directions.js';

// The comparison's 3D: the game's own model and carriers (scene/mula-carriers.js), posed in the reference frame.
export function createStage(canvas, directions) {
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
  rig.peek.visible = false;
  const carriers = createCarriers(); rig.root.add(carriers.group);
  const markers = addDirectionMarkers(THREE, scene, directions);
  const frameCamera = createCameraFrame(camera);
  const resize = new ResizeObserver(() => {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  });
  resize.observe(canvas);
  // t: the reference second the camera fit follows; pose: a mula-path / mula-dance pose; feet: eight world shoes
  function render(t, pose, feet, fitted = true) {
    rig.neck.rotation.set(0.15, 0, 0); rig.head.rotation.set(0.2, 0, pose.headRoll); rig.jaw.rotation.x = 0;
    rig.tail.rotation.set(0, 0, 0);
    for (const ear of rig.ears) ear.rotation.x = 0;
    rig.root.position.set(pose.x, pose.lift, pose.z); rig.root.rotation.y = pose.yaw;
    rig.body.rotation.set(pose.pitch, 0, pose.roll);
    carriers.pose(rig, feet);
    if (!fitted) pose.referenceWeight = 0; // the game's travel is its own (80%): the 2017 screen fit no longer applies
    frameCamera(t, pose, rig.body);
    renderer.render(scene, camera);
  }
  return { render, dispose() { resize.disconnect(); carriers.dispose(); markers.dispose(); renderer.dispose(); } };
}
