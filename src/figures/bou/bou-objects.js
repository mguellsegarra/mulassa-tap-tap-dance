// The Bou's scene objects, built and owned here (figures/objects.js): the Bou Tradicional (bou.js) and its colla, four garnet
// attendants on the plaça's compass and its capatàs (bou-colla.js).
import * as THREE from 'three';
import { scene, renderProfile, CAM_AZ } from '../../scene/stage.js';
import { buildBou } from './bou.js';
import { createBouColla } from './bou-colla.js';

// Its rig in metres, and `frame`, its dance frame (the feet and legs are the frame's children beside the root: they stay
// planted in it), turned to its colla's compass (BOU_COLLA_YAW): its opening heading, W, 45 deg off the play camera.
export let bou = null;
export let bouColla = null;
export const BOU_COLLA_YAW = CAM_AZ - Math.PI / 4; // the Bou's colla compass (bou-colla.js): the camera looks in between W and S
// The Bou lit on its own in its disco night (bou-show.js sets value 0-1): its own colours added after the lights,
// as if a spot were on it, without lighting the floor or casting anything (a real spot read badly on the tiles).
export const bouGlow = { value: 0 };
let bouMat = null;
function bouGlowMaterial(base) {
  const m = base.clone();
  m.onBeforeCompile = sh => {
    sh.uniforms.uBouGlow = bouGlow;
    sh.fragmentShader = 'uniform float uBouGlow;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight += diffuseColor.rgb * uBouGlow;\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'bou-glow';
  return m;
}
export function initBouModel() {
  bou = buildBou();
  bou.frame = new THREE.Group(); bou.frame.rotation.y = BOU_COLLA_YAW; // its colla's compass: the dance's W is the W attendant's
  bou.frame.visible = false;
  bou.frame.add(bou.root, ...bou.feet, ...bou.legs, ...bou.trunks, ...bou.arms);
  scene.add(bou.frame);
  bou.frame.traverse(o => { // its voxel parts get their own copy, which can light itself (bouGlow)
    if (!o.isMesh || o.isSkinnedMesh || !o.material?.isMeshLambertMaterial || !o.material.vertexColors) return;
    bouMat ??= bouGlowMaterial(o.material);
    o.material = bouMat;
  });
}
export function initBouColla() {
  bouColla = createBouColla(renderProfile);
  bouColla.helpers.rotation.y = BOU_COLLA_YAW;
  bouColla.helpers.visible = bouColla.seated.visible = false;
  scene.add(bouColla.helpers, bouColla.seated);
  return bouColla;
}
