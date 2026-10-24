// The 3D world: the renderer (with the no-WebGL card), scene, lights, the plaza, the mulassa, and the play camera's fixed direction.
import { initialQuality, probeRenderer, isSoftwareRenderer, profileAt } from '../platform/render-quality.js';
import * as THREE from 'three';
import { tr } from '../i18n/messages.js';
import { errors, errorName } from '../services/errors.js';
import { buildPlaza, buildMulassa } from './models.js';
import { newDracFeet } from '../game/drac-feet.js';
import { buildDrac, DRAC_SCALE } from './models/drac.js';
import { buildBou } from './models/bou.js';
import { createColla } from './drac-colla.js';
import { createMulaColla, mulaSeatAt } from './mula-colla.js';
import { createBouColla } from './bou-colla.js';
import { danceYaw } from '../game/drac-layout.js';
import { mulaDanceYaw } from '../game/mula-layout.js';
import { createCarriers } from './mula-carriers.js';
import { COARSE } from '../core/env.js';
import { buildSky } from './sky.js';

// ------------------------------------------------------------------ 3D
window.__mulassaBootPhase = 'graphics';
// every page load starts from the hardware guess (adaptive drops last for the session only); -1 = minimal
const qualityGuess = initialQuality({ mobile: COARSE.matches, cores: navigator.hardwareConcurrency,
  memory: navigator.deviceMemory, saveData: navigator.connection?.saveData });
// software WebGL (no GPU): minimal from the start
export const GPU = probeRenderer(), softwareGl = isSoftwareRenderer(GPU);
export let qualityLevel = softwareGl ? -1 : qualityGuess;
export const setQualityLevel = v => (qualityLevel = v);
export let renderProfile = profileAt(qualityLevel);
export const setRenderProfile = v => (renderProfile = v);
export const glc = document.getElementById('gl');
export const renderer = (() => { // no WebGL 2 (disabled, blocklisted GPU, very old browser): say so instead of a calçot forever
  try { return new THREE.WebGLRenderer({ canvas: glc, antialias: qualityLevel > 0, powerPreference: 'high-performance' }); } catch (err) {
    const msg = tr('ui.webgl.unavailable');
    window.__mulassaBooted = 'no-webgl'; // index.html's boot watchdog: this card, not its generic one
    if (window.__mulassaFail) window.__mulassaFail(tr('ui.webgl.title'), msg); // no retry: it wouldn't help
    else { const t = document.getElementById('loader-text'); if (t) t.textContent = msg; }
    errors.report('webgl-unavailable', { phase: 'renderer-create', webgl2: String(typeof WebGL2RenderingContext !== 'undefined'), name: errorName(err), probe: GPU.probe });
    errors.start();
    err.mulassaReported = true; // already reported as the webgl-unavailable warning: errors.js drops the uncaught copy
    throw err; // nothing below can run without a renderer
  }
})();
let restorePending = false; // a restore fired and no screen render has been submitted since
glc.addEventListener('webglcontextlost', () => { restorePending = false; errors.report('webgl-context-lost'); }); // three.js handles the restore itself
glc.addEventListener('webglcontextrestored', () => { restorePending = true; errors.breadcrumb('webgl-context-restored'); }); // it fired; nothing says the scene is whole again
renderer.shadowMap.enabled = renderProfile.shadow > 0;
renderer.shadowMap.type = THREE.PCFShadowMap;
export const scene = new THREE.Scene();
buildSky(scene, qualityLevel >= 0); // gradient dome + voxel clouds (sky.js); its horizon is the fog's colour
export const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 200); // near 0.5: nothing gets closer (props by the lens are hidden)
// warm light (a cool sky fill greyed the paving; Marc 2026-10-24); fx.js puts these back after the finale's colours
export const LIGHT = { sky: '#fff0dc', ground: '#b88a5a', sun: '#ffe6bd' };
export const hemi = new THREE.HemisphereLight(LIGHT.sky, LIGHT.ground, 1.6);
scene.add(hemi);
export const sun = new THREE.DirectionalLight(LIGHT.sun, 2.4);
sun.position.set(-10, 18, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(renderProfile.shadow || 512, renderProfile.shadow || 512);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 60 });
sun.shadow.bias = -0.0005;
scene.add(sun);
export const plaza = buildPlaza({ backdrop: renderProfile.backdrop, balconies: renderProfile.balconies, waving: qualityLevel === 2 });
scene.add(plaza.group);
export const mula = buildMulassa();
scene.add(mula.root);
export const mulaCarriers = createCarriers(); // her four carriers' shoes and trouser cuffs, under the cloth (mula-carriers.js)
mula.root.add(mulaCarriers.group);
export let drac = null;
export let colla = null; // the Drac's colla: its four clapping helpers and a few members sitting round the plaça (drac-colla.js)
export let mulaColla = null; // the Mulassa's: four attendants on her compass marks and a seated ring (drac-colla.js createMulaColla)
export let bouColla = null; // the Bou's: four garnet attendants on the plaça's compass and its capatàs (bou-colla.js)
// Keep the Drac's material separate for share captures; its body stays opaque.
// Copied from its own meshes in initDrac (no voxel.js import here: the tests' one-script bundle keeps its module order).
export let dracMat = null;
// The Bou Tradicional (models/bou.js, Marc's p13): its rig in metres, and `frame`, its dance frame (the feet and legs
// are the frame's children beside the root: they stay planted in it), turned to its colla's compass (BOU_COLLA_YAW): its opening heading, W, 45 deg off the play camera.
export let bou = null;
// The Bou lit on its own in its disco night (scene/bou-show.js sets value 0-1): its own colours added after the lights,
// as if a spot were on it, without lighting the floor or casting anything (Marc: a real spot read badly on the tiles).
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
export const figureRoot = id => id === 'drac-valls' ? drac?.root : id === 'bou-tradicional-valls' ? bou?.root : mula.root; // the selector frames its outline
// Build after the existing plaza/crowd setup so its material jitter does not change their random layout.
export function initDrac() {
  if (drac) return;
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
  bou = buildBou();
  bou.frame = new THREE.Group(); bou.frame.rotation.y = BOU_COLLA_YAW; // its colla's compass: the dance's W is the W attendant's (Marc 24/10/2026)
  bou.frame.visible = false;
  bou.frame.add(bou.root, ...bou.feet, ...bou.legs, ...bou.trunks, ...bou.arms);
  scene.add(bou.frame);
  bou.frame.traverse(o => { // its voxel parts get their own copy, which can light itself (bouGlow)
    if (!o.isMesh || o.isSkinnedMesh || !o.material?.isMeshLambertMaterial || !o.material.vertexColors) return;
    bouMat ??= bouGlowMaterial(o.material);
    o.material = bouMat;
  });
  colla = createColla({ profile: renderProfile }); // hidden until the Drac is the figure; built now so the warmup compiles it
  colla.helpers.visible = colla.seated.visible = false;
  scene.add(colla.helpers, colla.seated);
  mulaColla = createMulaColla(renderProfile, seat => mulaSeatAt(seat, MULA_YAW)); // her seated ring, from its dance frame into the plaça
  mulaColla.helpers.visible = mulaColla.seated.visible = false;
  scene.add(mulaColla.helpers, mulaColla.seated);
  bouColla = createBouColla(renderProfile);
  bouColla.helpers.rotation.y = BOU_COLLA_YAW;
  bouColla.helpers.visible = bouColla.seated.visible = false;
  scene.add(bouColla.helpers, bouColla.seated);
}
// Her standing pose at load (what the camera-fit silhouettes used to leave behind): animMula overwrites it every frame.
mula.neck.rotation.x = 0.15;
mula.head.rotation.x = 0.2;
mula.jaw.rotation.x = 0.12;
for (const ear of mula.ears) ear.rotation.x = -0.25;
mula.body.rotation.z = 0;
mula.root.position.y = 0;
mula.root.updateMatrixWorld(true);
export const cameraTarget = new THREE.Vector3(), camFocus = new THREE.Vector3(0, 1.2, 0), camFocusTarget = new THREE.Vector3();
export const camXYZ = [0, 0, 0], focusXYZ = [0, 0, 0]; // reused by the prop check in frame()
// Play camera: low (20 deg), in the crowd's gap (main.js ring), across the plaça from the band (BAND_AZ):
// no spectator between it and her, the band behind her, and on this line the square leaves
// room behind it (only big tablets need a wider lens) with no tree or lamp near the lens. Her "front" faces it (artistic
// choice).
// CAM_AZ / CAM_EL: the play camera's mean direction from her (framePlayCamera sways around it); also where the crowd leaves its gap
// and which way she faces. Marc's pick on a desktop: 81 deg round (nearly side on), 26 deg above.
export const CAM_EL = 26 * Math.PI / 180, CAM_AZ = -81 * Math.PI / 180;
export const CAM_DIR = [Math.cos(CAM_EL) * Math.sin(CAM_AZ), Math.sin(CAM_EL), Math.cos(CAM_EL) * Math.cos(CAM_AZ)]; // from her to the camera (unit)
export const FRONT = CAM_AZ + 0.35; // her dance's front: 20 deg off the play camera, so every pose reads three-quarter (her side, the blanket, the head)
export const DRAC_YAW = danceYaw(CAM_AZ); // the Drac's dance frame heading (game/drac-layout.js)
export const BOU_COLLA_YAW = CAM_AZ - Math.PI / 4; // the Bou's colla compass (bou-colla.js): the camera looks in between W and S
export const MULA_YAW = mulaDanceYaw(CAM_AZ); // the Mulassa's (game/mula-layout.js): the camera looks in between W and S
export let camShift = 0, camShiftX = 0; // lens shift, css px: her centre below / right of the screen's middle (see frame())
export const setCamShift = (v, x = 0) => { camShiftX = x; return (camShift = v); };

// The frame's screen render. After a restore, the first one that submitted draw calls to a live context leaves a breadcrumb
// (draws were submitted: not proof of visible pixels). Reads renderer.info fresh: three replaces it on restore.
// A hidden top-level branch (the other figures' collas and models, props off stage: ~15% of the scene's objects) skips
// the per-render matrix walk; it catches up the render it shows again, and a forced update or getWorldPosition still
// reaches it. Only the plain Object3D walk is swapped: a subclass's own updateMatrixWorld is left alone.
const walkMatrices = THREE.Object3D.prototype.updateMatrixWorld;
function walkIfShown(force) { if (this.visible || force) walkMatrices.call(this, force); }
export function renderScreen() {
  for (const o of scene.children) if (o.updateMatrixWorld === walkMatrices) o.updateMatrixWorld = walkIfShown;
  renderer.render(scene, camera);
  if (restorePending && renderer.getRenderTarget() === null && !renderer.getContext().isContextLost() && renderer.info.render.calls > 0) {
    restorePending = false;
    errors.breadcrumb('webgl-screen-submitted-after-restore');
  }
}
