import * as THREE from 'three';
import { renderer, scene, camera } from './stage.js';
import { balloonFx } from '../hud/balloon.js';
import { dracWarm } from '../figures/drac/drac-show.js';
import { heroCam, heroQuadMake } from './share-capture.js';

// Every program up front, for the screen and (hero) for the share photo's render target: that renders with linear
// output, i.e. other programs, which cost ~0.45 s on the first Comparteix (desktop at 4x CPU; more on a phone). Run again
// after a quality step (screen only: the step's own frame is long enough): the shadow map on/off changes every program,
// and the hidden ones (confetti, fireworks) would otherwise compile on their first appearance mid-song (a GLOBUS pop,
// the finale). Never throws; resolves when ready.
export function precompile(hero = false) {
  const jobs = [], prev = renderer.getRenderTarget?.() ?? null;
  let rt = null;
  try {
    jobs.push(renderer.compileAsync(scene, camera)); // three.js traverses hidden meshes too, including the Drac and its flames
    if (balloonFx) jobs.push(balloonFx.warm(renderer));
    dracWarm(renderer); // its glow texture (the Drac's meshes are in the scene, compiled above)
    if (hero) {
      renderer.setRenderTarget(rt = new THREE.WebGLRenderTarget(1, 1));
      jobs.push(renderer.compileAsync(scene, heroCam), renderer.compileAsync(heroQuadMake().scene, heroQuadMake().cam));
    }
  } catch { /* compiled by the first render that needs them instead */ } finally {
    if (rt) renderer.setRenderTarget(prev);
  }
  return Promise.all(jobs.map(j => Promise.resolve(j).catch(() => {}))).then(() => { rt?.dispose(); });
}
