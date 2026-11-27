// The Tombairot's scene objects, built and owned here (figures/objects.js): the approved model (tombairot.js) in its
// dance frame, and its colla (tomba-colla.js).
import * as THREE from 'three';
import { scene, renderProfile, CAM_AZ } from '../../scene/stage.js';
import { buildTombairot } from './tombairot.js';
import { createTombaColla, TOMBA_CAM_IN } from './tomba-colla.js';

// The dance frame's front, 40 deg off the play camera: its long body and its face both read (three-quarter).
export const TOMBA_YAW = CAM_AZ - TOMBA_CAM_IN;
// `tomba`: its rig, and `frame`, its dance frame; the carriers' feet move from the root to the frame, so they stay
// planted on the paving while the body walks and turns over them (tomba-dance.js foot).
export let tomba = null;
export let tombaColla = null;
export function initTombaModel() {
  tomba = buildTombairot();
  tomba.frame = new THREE.Group(); tomba.frame.rotation.y = TOMBA_YAW; tomba.frame.visible = false;
  tomba.frame.add(tomba.root, ...tomba.feet);
  scene.add(tomba.frame);
}
export function initTombaColla() {
  tombaColla = createTombaColla(renderProfile);
  tombaColla.helpers.rotation.y = TOMBA_YAW;
  tombaColla.helpers.visible = tombaColla.seated.visible = false;
  scene.add(tombaColla.helpers, tombaColla.seated);
  return tombaColla;
}
