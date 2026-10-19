// Provisional marks for the four clapping helpers who orient the Drac's carrier (dev only): fixed references round the
// dance space, never following or turning with the dragon. PLACEHOLDERS: each anchor's `placeholder` group (floor disc,
// ring, an inward pointer and its letter) is meant to be swapped for a real character model later.
// APPROXIMATE: the centre and radius are chosen to frame the inferred path and fit the Planta view, not measured in the
// source. Marc's dance convention: S follows the opening advance, W the next outward leg; these are not geographic
// bearings or camera axes. All four anchors share this fixed frame, in both the 3D and overhead views.
import * as THREE from 'three';
import { SPOTS } from './path.js';
import { DRAC_SCALE } from '../../scene/models/drac.js';

export const HELPER_CENTRE = Object.freeze(SPOTS.S0.map(v => v * DRAC_SCALE)), HELPER_RADIUS = 4.5;
const southYaw = Math.atan2(SPOTS.A[0] - SPOTS.S0[0], SPOTS.A[1] - SPOTS.S0[1]);
const southX = Math.sin(southYaw), southZ = Math.cos(southYaw);
// each anchor: its spot and the heading that faces the centre (rotation.y; local +z points inwards)
export const HELPERS = Object.freeze([['W', -southZ, southX], ['N', -southX, -southZ], ['S', southX, southZ], ['E', southZ, -southX]].map(([id, dx, dz]) => Object.freeze({
  id, x: HELPER_CENTRE[0] + dx * HELPER_RADIUS, z: HELPER_CENTRE[1] + dz * HELPER_RADIUS, yaw: Math.atan2(-dx, -dz),
})));

// a letter on a transparent canvas, as a sprite that always faces the camera (readable from the wide and top views)
function label(text) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1d25'; g.beginPath(); g.arc(64, 64, 58, 0, 2 * Math.PI); g.fill();
  g.fillStyle = '#fff3d6'; g.font = 'bold 80px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.setScalar(0.55); s.position.y = 1.1; s.renderOrder = 1;
  return s;
}

// one group with a named group per anchor (helper-W ...), placed and turned once; nothing to do per frame
export function buildHelpers() {
  const group = new THREE.Group();
  group.name = 'helpers';
  const flat = geo => geo.rotateX(-Math.PI / 2); // lie on the floor
  const disc = flat(new THREE.CircleGeometry(0.34, 40)), ring = flat(new THREE.RingGeometry(0.34, 0.42, 40));
  const arrow = flat(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.14, -0.4), new THREE.Vector2(0.14, -0.4), new THREE.Vector2(0, -0.66)])));
  const discMat = new THREE.MeshBasicMaterial({ color: '#fff3d6', transparent: true, opacity: 0.55 });
  const ringMat = new THREE.MeshBasicMaterial({ color: '#f5c518' }), arrowMat = new THREE.MeshBasicMaterial({ color: '#1b1d25' });
  for (const h of HELPERS) {
    const anchor = new THREE.Group(), placeholder = new THREE.Group();
    anchor.name = `helper-${h.id}`; placeholder.name = 'placeholder';
    anchor.position.set(h.x, 0.02, h.z); anchor.rotation.y = h.yaw;
    const pointer = new THREE.Mesh(arrow, arrowMat); // from the ring's edge, tip towards local +z: inwards
    pointer.position.y = 0.002;
    placeholder.add(new THREE.Mesh(disc, discMat), new THREE.Mesh(ring, ringMat), pointer, label(h.id));
    anchor.add(placeholder);
    anchor.userData.helper = h;
    group.add(anchor);
  }
  return group;
}
