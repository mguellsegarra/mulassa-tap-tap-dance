// What a build gets in place of the Bou's modules while it is unreleased (tools/deploy/unreleased-figure.mjs): every name
// the shared code imports from figures/bou/, as "no Bou". A name missing here fails the build, never a silent stand-in.
import * as THREE from 'three';

export const BOU_FINALE = { on: false, t: 0, endT: -1, k: 0, go: false, hero: new THREE.Vector3(), cam: new THREE.Vector3(), look: new THREE.Vector3(), fov: 0 };
export const bouHolds = () => false;
export const bouWaiting = () => false;
export const bouTap = () => false;
export const bouFrame = () => {};
export const bou = null;
export const initBouModel = () => {};
export const initBouColla = () => null;
export const BOU_SCENE = null; // figure-scenes.js and crowd-effects.js leave a null out
export const BOU_CROWD = null;
