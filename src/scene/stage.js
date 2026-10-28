// The 3D world: the renderer (with the no-WebGL card), scene, lights, the plaza and the play camera's fixed direction
// (the figures are their own folders': figures/objects.js).
import { initialQuality, probeRenderer, isSoftwareRenderer, sessionProfile } from '../platform/render-quality.js';
import * as THREE from 'three';
import { tr } from '../i18n/messages.js';
import { errors, errorName } from '../services/errors.js';
import { buildPlaza } from './models.js';
import { COARSE } from '../core/env.js';
import { buildSky } from './sky.js';

// ------------------------------------------------------------------ 3D
window.__mulassaBootPhase = 'graphics';
// every page load starts from the hardware guess (adaptive drops last for the session only); -1 = minimal
// software WebGL (no GPU): minimal from the start
export const GPU = probeRenderer(), softwareGl = isSoftwareRenderer(GPU);
const qualityGuess = initialQuality({ mobile: COARSE.matches, cores: navigator.hardwareConcurrency,
  memory: navigator.deviceMemory, saveData: navigator.connection?.saveData, renderer: GPU.renderer });
export let qualityLevel = softwareGl ? -1 : qualityGuess;
export const setQualityLevel = v => (qualityLevel = v);
// the session's people: the boot level's; on the splash they follow adaptive quality (the title screen is where a device that
// boots too high finds its level), after it they only step down, one level behind it: sharpness, shadows and effects go first,
// people only when those were not enough (a CPU-bound 2016 MacBook stayed at ~35 fps at minimal with high's 109 dancers)
export let peopleLevel = qualityLevel;
export const stepPeople = (level, splash) => (peopleLevel = splash ? level : Math.min(peopleLevel, level + 1));
export let renderProfile = sessionProfile(qualityLevel, peopleLevel);
export const setRenderProfile = v => (renderProfile = v);
export const glc = document.getElementById('gl');
export const renderer = (() => { // no WebGL 2 (disabled, blocklisted GPU, very old browser): say so instead of a calçot forever
  try { return new THREE.WebGLRenderer({ canvas: glc, antialias: qualityLevel > 0, powerPreference: 'high-performance' }); } catch (err) {
    // after a GPU crash Chrome blocks WebGL for the site until it restarts: the card says to close it first
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
// warm light (a cool sky fill greyed the paving); fx.js puts these back after the finale's colours
export const LIGHT = { sky: '#fff0dc', ground: '#b88a5a', sun: '#ffe6bd' };
export const hemi = new THREE.HemisphereLight(LIGHT.sky, LIGHT.ground, 1.6);
scene.add(hemi);
export const sun = new THREE.DirectionalLight(LIGHT.sun, 2.4);
const SUN_AT = [-10, 18, 8]; // also where the fronts' painted balcony shadows fall from (buildPlaza's `sun`)
sun.position.set(...SUN_AT);
sun.castShadow = true;
sun.shadow.mapSize.set(renderProfile.shadow || 512, renderProfile.shadow || 512);
// The shadow frustum covers the played ground (the dancer, the colla, the ring and the band: within ~12 m) plus a margin,
// not the façades: the same map then has ~1.7x the texels on what the camera frames.
const SHADOW_REACH = 15;
Object.assign(sun.shadow.camera, { left: -SHADOW_REACH, right: SHADOW_REACH, top: SHADOW_REACH, bottom: -SHADOW_REACH, near: 1, far: 60 });
sun.shadow.bias = -0.0005;
scene.add(sun);
export const plaza = buildPlaza({ backdrop: renderProfile.backdrop, balconies: renderProfile.balconies, waving: qualityLevel === 2, sun: SUN_AT });
scene.add(plaza.group);
export const cameraTarget = new THREE.Vector3(), camFocus = new THREE.Vector3(0, 1.2, 0), camFocusTarget = new THREE.Vector3();
export const camXYZ = [0, 0, 0], focusXYZ = [0, 0, 0]; // reused by the prop check in frame()
// Play camera: low (20 deg), in the crowd's gap (main.js ring), across the plaça from the band (BAND_AZ):
// no spectator between it and her, the band behind her, and on this line the square leaves
// room behind it (only big tablets need a wider lens) with no tree or lamp near the lens. Her "front" faces it (artistic
// choice).
// CAM_AZ / CAM_EL: the play camera's mean direction from her (framePlayCamera sways around it); also where the crowd leaves its gap
// and which way she faces. The owner\'s pick on a desktop: 81 deg round (nearly side on), 26 deg above.
export const CAM_EL = 26 * Math.PI / 180, CAM_AZ = -81 * Math.PI / 180;
export const CAM_DIR = [Math.cos(CAM_EL) * Math.sin(CAM_AZ), Math.sin(CAM_EL), Math.cos(CAM_EL) * Math.cos(CAM_AZ)]; // from her to the camera (unit)
export const FRONT = CAM_AZ + 0.35; // her dance's front: 20 deg off the play camera, so every pose reads three-quarter (her side, the blanket, the head)
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
