// The sky: a gradient dome (the avatar's cyan up high, a pale haze at the horizon = the fog's colour, so the façades melt
// into it) and a ring of blocky voxel clouds beyond the roofs (one instanced box), drifting very slowly round the plaça. Two draw calls.
import * as THREE from 'three';
import { CALM } from '../core/env.js';

// horizon = the plaça's fog (stage.js) and drac-show's clear sky; near: the fog's rest distance (drac-show closes it in)
export const SKY = { top: '#19c9f5', horizon: '#9fe2ff', near: 40, far: 90, drift: 0.004, night: 0 }; // night: 0-1, the Bou's disco (bou-show.js)
// the dome's top colour, live (figures/bou/bou-show.js darkens it for the Bou's night)
export const skyTop = new THREE.Color();

const DOME = `varying vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }`;
// zenith follows scene.background's shift off the clear sky (drac-show's red smoke tints both ends)
const SHADE = `uniform vec3 uTop, uHorizon, uBg, uBase; varying vec3 vDir;
void main() { float h = max(normalize(vDir).y, 0.0); gl_FragColor = vec4(mix(uHorizon, uTop + uBg - uBase, pow(h, 0.55)), 1.0);
#include <colorspace_fragment>
}`; // (the uniforms are linear: back to the screen's sRGB like every other material)

// own random (not voxel.js rnd): building the clouds must not shift the plaça's and crowd's random layout
let seed = 7;
const rand = (a, b) => a + ((seed = (seed * 16807) % 2147483647) / 2147483647) * (b - a);
const FACE = { top: new THREE.Color('#ffffff'), lit: new THREE.Color('#f1fbff'), side: new THREE.Color('#dff3fc'), under: new THREE.Color('#c4e4f4') };

function cloudBoxes(out, cx, cy, cz, yaw, n) { // a flat base slab, then smaller stacked layers: a cartoon cumulus in 4 m voxels
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (let layer = 0, w = n, d = Math.max(2, n >> 1); layer < 3 && w > 0; layer++, w -= 2, d = Math.max(1, d - 1)) {
    const off = rand(-1, 1) | 0;
    for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
      if ((i === 0 || i === w - 1) && (j === 0 || j === d - 1) && rand(0, 1) < 0.5) continue; // round the corners off
      const lx = (i - (w - 1) / 2 + off) * VOX, lz = (j - (d - 1) / 2) * VOX;
      out.push(cx + lx * c + lz * s, cy + layer * VOX, cz - lx * s + lz * c);
    }
  }
}
const VOX = 4;
function voxel() { // one box, flat toon shading per face, no lights (the avatar's flat look)
  const g = new THREE.BoxGeometry(VOX, VOX, VOX), nrm = g.attributes.normal, col = new Float32Array(nrm.count * 3);
  for (let k = 0; k < nrm.count; k++) {
    const ny = nrm.getY(k), f = ny > 0.5 ? FACE.top : ny < -0.5 ? FACE.under : nrm.getX(k) < -0.5 || nrm.getZ(k) > 0.5 ? FACE.lit : FACE.side;
    col[k * 3] = f.r; col[k * 3 + 1] = f.g; col[k * 3 + 2] = f.b;
  }
  return g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

export function buildSky(scene, clouds = true) {
  scene.background = new THREE.Color(SKY.horizon);
  scene.fog = new THREE.Fog(SKY.horizon, SKY.near, SKY.far);
  const base = new THREE.Color(SKY.horizon);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 12), new THREE.ShaderMaterial({
    vertexShader: DOME, fragmentShader: SHADE, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: skyTop.set(SKY.top) }, uHorizon: { value: scene.fog.color }, uBg: { value: scene.background }, uBase: { value: base } },
  }));
  dome.frustumCulled = false; dome.renderOrder = -1;
  dome.onBeforeRender = (r, s, cam) => { dome.position.copy(cam.position); dome.updateMatrixWorld(); }; // always round the lens, inside its far plane
  scene.add(dome);
  if (!clouds) return;
  const at = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rand(-0.2, 0.2), r = rand(60, 90); // just over the skyline seen from the plaça (~20 deg up)
    cloudBoxes(at, Math.sin(a) * r, rand(22, 36), Math.cos(a) * r, rand(0, Math.PI), 4 + (rand(0, 4) | 0));
  }
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  const ring = new THREE.InstancedMesh(voxel(), mat, at.length / 3), m = new THREE.Matrix4();
  for (let i = 0; i < at.length; i += 3) ring.setMatrixAt(i / 3, m.makeTranslation(at[i], at[i + 1] + VOX / 2, at[i + 2]));
  ring.frustumCulled = false; // one mesh all round the plaça: always partly in view
  const white = new THREE.Color('#ffffff');
  ring.onBeforeRender = () => {
    if (!CALM.matches) { ring.rotation.y = (performance.now() / 1000) * SKY.drift; ring.updateMatrixWorld(); }
    mat.color.copy(white).lerp(scene.fog.color, Math.max(SKY.night, Math.min(1, Math.max(0, (SKY.near - scene.fog.near) / 38)))); // they sink into the Drac's red smoke, and the Bou's night
  };
  scene.add(ring);
}
