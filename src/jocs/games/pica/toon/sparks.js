// Keep the shared particle physics and pool; only the toon particle skin changes.
import * as THREE from 'three';
import { createSparks } from '../board-sparks.js';

export function toonSparks(scene) {
  const group = new THREE.Group(), pool = createSparks(group);
  for (const sparks of group.children) {
    sparks.geometry.dispose();
    sparks.geometry = new THREE.IcosahedronGeometry(.13, 0);
  }
  scene.add(group);
  return pool;
}
