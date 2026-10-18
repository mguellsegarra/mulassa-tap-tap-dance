// A ground selection ring follows the controlled figure without covering the model.
import * as THREE from 'three';
import { PHOTO, photoBody } from '../game/photo-control.js';
import { scene } from './stage.js';
const photoMarker = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), new THREE.MeshBasicMaterial({
  color: 0x68e890, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide,
}));
photoMarker.rotation.x = -Math.PI / 2;
photoMarker.visible = false; scene.add(photoMarker);
export function updatePhotoMarker() {
  photoMarker.visible = PHOTO.on && PHOTO.ready;
  if (!photoMarker.visible) return;
  const p = photoBody(), dragon = PHOTO.id === 'drac-valls';
  photoMarker.position.set(p.x, 0.045, p.z);
  photoMarker.rotation.set(-Math.PI / 2, 0, p.yaw);
  photoMarker.scale.set(dragon ? 1.85 : 1.35, dragon ? 2.05 : 2.65, 1);
}
