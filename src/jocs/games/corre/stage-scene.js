import * as THREE from 'three';
import { applyGroundTexture } from './ground-texture.js';
import { ROTATION } from './realworld.js';

const WIDE = 46 * Math.PI / 180; // how much street a phone in portrait must see, across
// the lens for a screen's aspect: a narrow phone widens it so the whole street still fits
export const fitFov = aspect => Math.max(58, 2 * Math.atan(Math.tan(WIDE / 2) / aspect) * 180 / Math.PI);

// The renderer, the sky, the real square's light and the street's materials and camera.
export function createStageScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  const scene = new THREE.Scene();
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // as in the viewer: the bytes are sRGB already, light them as they are
  scene.background = new THREE.Color(0x4fa8ee);
  scene.fog = new THREE.Fog(0x4fa8ee, 110, 210);
  scene.add(new THREE.HemisphereLight(0xb8b6b2, 0xf5e8d2, 1.05 * Math.PI));
  const sun = new THREE.DirectionalLight(0xffeccc, .45 * Math.PI);
  sun.position.set(.28 * Math.cos(ROTATION) + .5 * Math.sin(ROTATION), .82, -.28 * Math.sin(ROTATION) + .5 * Math.cos(ROTATION)); // the world's sun, turned with the world
  scene.add(sun);
  const worldMat = new THREE.MeshLambertMaterial({ vertexColors: true }), farMat = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
  const groundTex = applyGroundTexture(renderer.capabilities.getMaxAnisotropy() > 2 ? 4 : 1, worldMat, farMat);
  const camera = new THREE.PerspectiveCamera(70, 1, 1, 800); // a near plane of 1 m keeps far façades from flickering
  return { renderer, scene, worldMat, farMat, groundTex, camera };
}
