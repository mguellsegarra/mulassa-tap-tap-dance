// The prototype's studio fill and cheap soft contact shadows; no extra shadow-map passes.
import * as THREE from 'three';

export function toonStage(scene, sun) {
  sun.castShadow = false;
  const fill = new THREE.DirectionalLight('#d8e9ff', .8);
  fill.position.set(8, 9, -6);
  scene.add(fill);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(32, 32, 3, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(48,32,25,.28)');
  gradient.addColorStop(.5, 'rgba(48,32,25,.12)');
  gradient.addColorStop(1, 'rgba(48,32,25,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const geo = new THREE.PlaneGeometry(2.2, 1.3).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const shadows = new THREE.InstancedMesh(geo, material, 24), dummy = new THREE.Object3D();
  shadows.count = 0;
  scene.add(shadows);
  return centres => {
    shadows.count = centres.length;
    centres.forEach(({ x, z }, i) => {
      dummy.position.set(x * .95, .045, z + 1);
      dummy.updateMatrix();
      shadows.setMatrixAt(i, dummy.matrix);
    });
    shadows.instanceMatrix.needsUpdate = true;
  };
}
