import * as THREE from 'three';

// One camera evaluator shared by rendering and projected-motion regression checks.
export function createCameraFrame(camera) {
  const panel = new THREE.Vector3(), target = new THREE.Vector3();
  return function frameCamera(t, pose, body, baseline = false) {
    // Opening camera stays independent of the reconstructed lateral motion.
    const follow = Math.max(0, Math.min(1, (t - 89) / 4)) * (1 - pose.referenceWeight);
    const second = Math.max(0, Math.min(1, (t - 34) / 2, (67 - t) / 2));
    const cameraX = -.95 + .5 * follow - .6 * second + pose.cameraX + pose.x * .65 * follow;
    camera.fov = 32;
    camera.position.set(cameraX, 1.5, 10 + pose.z * .6 * follow);
    target.set(cameraX, baseline ? 2.05 : 2.05 + .22 * follow + pose.cameraY, pose.z * .6 * follow);
    camera.updateProjectionMatrix();
    if (!baseline && pose.referenceWeight) {
      // Match the observed cloth landmark without cancelling the floor trajectory.
      panel.set(-.565 * Math.tanh(Math.sin(pose.yaw) * 5), .44, -.15);
      body.localToWorld(panel);
      const depth = 10 - panel.z, height = 2 * depth * Math.tan(16 * Math.PI / 180);
      const x = panel.x - (pose.referenceX - .5) * height * (16 / 9);
      const targetAtPanel = panel.y + (pose.referenceY - .5) * height;
      const targetY = 1.5 + (targetAtPanel - 1.5) * 10 / depth;
      const w = pose.referenceWeight;
      camera.position.x += (x - camera.position.x) * w;
      // Fade the complete target, including the normal follow height and depth.
      // Replacing those at any nonzero weight caused another pop on fit exit.
      target.x = camera.position.x;
      target.y += (targetY - target.y) * w;
      target.z *= 1 - w;
    }
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
  };
}
