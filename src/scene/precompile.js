import * as THREE from 'three';
import { renderer, scene, camera } from './stage.js';
import { balloonFx } from '../hud/balloon.js';
import { dracWarm } from '../figures/drac/drac-show.js';
import { heroQuadMake } from './share-capture.js';

// Every program up front, and (quad) the sRGB pass the GLOBUS stills are read back through (balloon.js; the share photo
// is a file now, public/share/, never rendered on the device). Run again after a quality step (screen only): the shadow
// map on/off changes every program, and the hidden ones (confetti, fireworks) would otherwise compile on their first
// appearance mid-song (a GLOBUS pop, the finale). Never throws; resolves when ready.
// A linked program is not a drawn one: on its first draw the GPU still builds its pipeline (Metal: 121-365 ms frames on an
// iPhone 8 where the Bou's rave and banknotes first showed, mid-song). At boot, under the page's cover, everything in
// the scene is drawn once (hidden objects shown, empty instanced meshes given one instance, nothing culled), then put
// back as it was. Not after a quality step: that one is on screen.
function warmDraw() {
  const hidden = [], empty = [], culled = [];
  scene.traverse(o => {
    if (!o.visible) { hidden.push(o); o.visible = true; }
    if (o.isInstancedMesh && o.count === 0) { empty.push(o); o.count = 1; }
    if (o.frustumCulled) { culled.push(o); o.frustumCulled = false; }
  });
  try { renderer.render(scene, camera); } catch { /* drawn by the first frame that needs it instead */ } finally {
    for (const o of hidden) o.visible = false;
    for (const o of empty) o.count = 0;
    for (const o of culled) o.frustumCulled = true;
  }
}
export function precompile(quad = false) {
  const jobs = [], prev = renderer.getRenderTarget?.() ?? null;
  let rt = null;
  try {
    // Cache the driver's limit under the loader: the Bou's first image otherwise queries it during entry.
    renderer.capabilities.getMaxAnisotropy();
    jobs.push(renderer.compileAsync(scene, camera)); // three.js traverses hidden meshes too, including the Drac and its flames
    if (balloonFx) jobs.push(balloonFx.warm(renderer));
    dracWarm(renderer); // its glow texture (the Drac's meshes are in the scene, compiled above)
    if (quad) {
      renderer.setRenderTarget(rt = new THREE.WebGLRenderTarget(1, 1));
      jobs.push(renderer.compileAsync(heroQuadMake().scene, heroQuadMake().cam));
    }
  } catch { /* compiled by the first render that needs them instead */ } finally {
    if (rt) renderer.setRenderTarget(prev);
  }
  return Promise.all(jobs.map(j => Promise.resolve(j).catch(() => {}))).then(() => { rt?.dispose(); if (quad) warmDraw(); });
}
