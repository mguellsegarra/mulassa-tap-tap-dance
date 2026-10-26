// The Mulassa's scene objects, built and owned here (figures/objects.js): her model and carriers, built as soon as the
// plaça is (the first figure on show, before the crowd draws on Math.random), and her colla, four attendants on her
// compass marks and a seated ring (mula-colla.js).
import { scene, renderProfile, CAM_AZ } from '../../scene/stage.js';
// (through models.js, which gathers the voxel builders the tests' one-script bundle provides)
import { buildMulassa } from '../../scene/models.js';
import { createCarriers } from './mula-carriers.js';
import { createMulaColla, mulaSeatAt } from './mula-colla.js';
import { mulaDanceYaw } from './mula-layout.js';

export const mula = buildMulassa();
scene.add(mula.root);
export const mulaCarriers = createCarriers(); // her four carriers' shoes and trouser cuffs, under the cloth (mula-carriers.js)
mula.root.add(mulaCarriers.group);
// Her standing pose at load (what the camera-fit silhouettes used to leave behind): animPlayableMula (mula-play.js) overwrites it every frame.
mula.neck.rotation.x = 0.15;
mula.head.rotation.x = 0.2;
mula.jaw.rotation.x = 0.12;
for (const ear of mula.ears) ear.rotation.x = -0.25;
mula.body.rotation.z = 0;
mula.root.position.y = 0;
mula.root.updateMatrixWorld(true);

export let mulaColla = null;
export const MULA_YAW = mulaDanceYaw(CAM_AZ); // her dance frame (mula-layout.js): the camera looks in between W and S
export function initMulaColla() {
  mulaColla = createMulaColla(renderProfile, seat => mulaSeatAt(seat, MULA_YAW)); // her seated ring, from its dance frame into the plaça
  mulaColla.helpers.visible = mulaColla.seated.visible = false;
  scene.add(mulaColla.helpers, mulaColla.seated);
  return mulaColla;
}
