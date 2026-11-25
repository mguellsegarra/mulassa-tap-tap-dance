// Isolated promotional view. The original model, foot planner and dance own the character.
import * as THREE from 'three';
import { buildPlaza } from '../../../src/scene/models/plaza.js';
import { buildDrac, DRAC_SCALE } from '../../../src/figures/drac/drac.js';
import { poseCarrier } from '../../../src/figures/drac/drac-rig.js';
import { poseAt } from '../../../src/figures/drac/drac-pose.js';
import { feetAt, newFeet } from '../../../src/figures/drac/drac-steps.js';
import { newDracPose } from '../../../src/figures/drac/dance-drac.js';
import { dracTime } from '../../../src/figures/drac/drac-time.js';

export const DURATION = 12;
export const PRESETS = {
  tail: { az: 174, height: 1.05, size: 2.25, shift: 0, z: -0.8 },
  wing: { az: -125, height: 1.25, size: 1.75, shift: 0.16, z: -0.35 },
  half: { az: 118, height: 1.03, size: 2.45, shift: -0.25, z: -0.4 },
};

export function createTeaserStage(canvas) {
  const night = new URLSearchParams(location.search).has('night');
  const surface = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: surface, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(1080, night ? 1920 : 1060, false); renderer.setClearColor(0x000000, 1);
  const output = canvas.getContext('2d', { alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xede1c4, 0.48));
  const key = new THREE.DirectionalLight(0xffdcb1, 2.1); key.position.set(-4, 6, -5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff8d42, 1.5); rim.position.set(4, 3, 1); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x8cb3a6, 0.4); fill.position.set(0, 1, -6); scene.add(fill);
  if (night) {
    scene.children.filter(o => o.isLight).forEach(o => { o.intensity *= 0.12; });
    scene.background = new THREE.Color(0x101010);
    scene.fog = new THREE.FogExp2(0x101010, 0.055);
    const plaza = buildPlaza({ backdrop: 0, balconies: 0 });
    plaza.band.forEach(p => { p.g.visible = false; });
    scene.add(plaza.group);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x403c36, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.22; scene.add(ground);
    const lantern = new THREE.SpotLight(0xffc58a, 75, 18, Math.PI / 3, 0.8, 2);
    lantern.position.set(-3, 5, -4); lantern.target.position.set(0, 0, -0.5);
    scene.add(lantern, lantern.target);
    const moon = new THREE.DirectionalLight(0xb0b0b0, 0.32);
    moon.position.set(4, 6, 3); scene.add(moon);
  }
  const units = new THREE.Group(); units.scale.setScalar(DRAC_SCALE); scene.add(units);
  const rig = buildDrac(); rig.feet = newFeet(); units.add(rig.root);
  const pose = newDracPose(), target = new THREE.Vector3();
  // Place the whole dance once. Changing its root each frame breaks planted feet.
  poseAt(pose, 42, dracTime.beatAtRef(42), 1);
  const startYaw = pose.yaw, c = Math.cos(startYaw), s = Math.sin(startYaw);
  units.rotation.y = -startYaw;
  units.position.set(-(c * pose.x - s * pose.z) * DRAC_SCALE, 0, -(s * pose.x + c * pose.z) * DRAC_SCALE);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 120);
  const nightHalf = { az: 145, height: 1.7, size: 2.6, shift: 0, z: -0.6 };
  const settings = { ...PRESETS.tail };
  const textShade = output.createLinearGradient(0, 0, 0, 1200);
  textShade.addColorStop(0, '#101010');
  textShade.addColorStop(0.48, '#101010');
  textShade.addColorStop(0.82, '#10101090');
  textShade.addColorStop(1, '#10101000');
  // The detail emerges from black instead of ending at a rectangular crop edge.
  const frame = { x: 0, y: night ? 0 : 480, width: 1080, height: night ? 1920 : 1060 };
  const shadow = output.createLinearGradient(0, frame.y, 0, frame.y + frame.height);
  shadow.addColorStop(0, '#000'); shadow.addColorStop(160 / frame.height, '#0000');
  shadow.addColorStop(1 - 160 / frame.height, '#0000'); shadow.addColorStop(1, '#000');
  let seconds = 0;
  function render(t = seconds) {
    seconds = ((Number(t) % DURATION) + DURATION) % DURATION;
    // Always play the original reference dance forward; black fades conceal the loop seam.
    const ref = 42 + seconds;
    poseAt(pose, ref, dracTime.beatAtRef(ref), 1);
    poseCarrier(rig, pose, feetAt);
    const az = settings.az * Math.PI / 180;
    target.set(settings.shift, settings.height, settings.z);
    camera.position.set(target.x + Math.sin(az) * 8, target.y + (night ? 0.45 : 1.6), target.z + Math.cos(az) * 8);
    camera.lookAt(target);
    const halfHeight = (night ? settings.size * 1.8 : settings.size) / 2, halfWidth = halfHeight * frame.width / frame.height;
    camera.left = -halfWidth; camera.right = halfWidth; camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    output.globalAlpha = 1; output.fillStyle = '#000'; output.fillRect(0, 0, 1080, 1920);
    output.drawImage(surface, frame.x, frame.y);
    if (night) { output.fillStyle = textShade; output.fillRect(0, 0, 1080, 1200); }
    if (!night) { output.fillStyle = shadow; output.fillRect(frame.x, frame.y, frame.width, frame.height); }
    const fade = Math.min(1, seconds / 0.5, (DURATION - seconds) / 0.5);
    output.globalAlpha = 1 - fade; output.fillStyle = '#000'; output.fillRect(0, 0, 1080, 1920);
    output.globalAlpha = 1;
    return { seconds, reference: ref, preset: { ...settings } };
  }
  function setPreset(id) { if (!(id in PRESETS)) throw new RangeError(`Unknown teaser preset: ${id}`); Object.assign(settings, night && id === 'half' ? nightHalf : PRESETS[id]); return render(); }
  function dispose() { scene.traverse(o => { o.geometry?.dispose(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material?.dispose(); }); renderer.dispose(); }
  render();
  return { render, setPreset, settings, dispose, renderer, rig, camera };
}
