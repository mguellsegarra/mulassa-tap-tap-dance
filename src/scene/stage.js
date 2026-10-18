// The 3D world: the renderer (with the no-WebGL card), scene, lights, the plaza, the mulassa, and the play camera's fixed direction.
import { initialQuality, probeRenderer, isSoftwareRenderer, profileAt } from '../platform/render-quality.js';
import * as THREE from 'three';
import { errors, errorName } from '../services/errors.js';
import { buildPlaza, buildMulassa } from './models.js';
import { newDracFeet } from '../game/drac-feet.js';
import { buildDrac, DRAC_SCALE } from './models/drac.js';
import { COARSE } from '../core/env.js';

// ------------------------------------------------------------------ 3D
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
    const msg = 'El teu navegador no pot mostrar el joc en 3D. Actualitza’l o obre’l amb Chrome o Safari.';
    window.__mulassaBooted = 'no-webgl'; // index.html's boot watchdog: this card, not its generic one
    if (window.__mulassaFail) window.__mulassaFail('Ups! No es pot mostrar el joc', msg); // no retry: it wouldn't help
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
scene.background = new THREE.Color('#8fd3ff');
scene.fog = new THREE.Fog('#8fd3ff', 40, 90);
export const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 200); // near 0.5: nothing gets closer (props by the lens are hidden)
export const hemi = new THREE.HemisphereLight('#dff3ff', '#a88b63', 1.6);
scene.add(hemi);
export const sun = new THREE.DirectionalLight('#fff1d6', 2.4);
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
export let drac = null;
// Keep the Drac's material separate for share captures; its body stays opaque.
// Copied from its own meshes in initDrac (no voxel.js import here: the tests' one-script bundle keeps its module order).
export let dracMat = null;
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
export let camShift = 0; // lens shift of the play camera, css px (see frame())
export const setCamShift = v => (camShift = v);

// The frame's screen render. After a restore, the first one that submitted draw calls to a live context leaves a breadcrumb
// (draws were submitted: not proof of visible pixels). Reads renderer.info fresh: three replaces it on restore.
export function renderScreen() {
  renderer.render(scene, camera);
  if (restorePending && renderer.getRenderTarget() === null && !renderer.getContext().isContextLost() && renderer.info.render.calls > 0) {
    restorePending = false;
    errors.breadcrumb('webgl-screen-submitted-after-restore');
  }
}
