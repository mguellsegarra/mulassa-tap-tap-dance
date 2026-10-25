// The Drac's scene objects, built and owned here (figures/objects.js calls the builders in order): the rig life-size in the
// plaça and its colla, its four clapping helpers and a few members sitting round the plaça (drac-colla.js).
import * as THREE from 'three';
import { scene, renderProfile, CAM_AZ } from '../../scene/stage.js';
import { newDracFeet } from './drac-feet.js';
import { buildDrac, DRAC_SCALE } from './drac.js';
import { createDracColla } from './drac-colla.js';
import { danceYaw } from './drac-layout.js';

export let drac = null;
export let colla = null;
// Keep the Drac's material separate for share captures; its body stays opaque.
// Copied from its own meshes in initDracModel (no voxel.js import here: the tests' one-script bundle keeps its module order).
export let dracMat = null;
export const DRAC_YAW = danceYaw(CAM_AZ); // the Drac's dance frame heading (drac-layout.js)
export function initDracModel() {
  drac = buildDrac();
  drac.feet = newDracFeet();
  drac.root.traverse(o => { // the voxel parts (vertex colours); the flames keep their own opaque materials
    if (!o.material?.isMeshLambertMaterial || !o.material.vertexColors) return;
    dracMat ??= o.material.clone();
    o.material = dracMat;
  });
  drac.root.visible = false;
  const life = new THREE.Group(); // the rig dances in model units; this shows it life-size
  life.scale.setScalar(DRAC_SCALE);
  life.add(drac.root);
  scene.add(life);
}
export function initDracColla() {
  colla = createDracColla(renderProfile); // hidden until the Drac is the figure; built now so the warmup compiles it
  colla.helpers.visible = colla.seated.visible = false;
  scene.add(colla.helpers, colla.seated);
  return colla;
}
