// Where the camera stands: it backs off until the board's box, figures' tops included, fits the space between the HUD
// and the bottom edge, then the view shifts so the board sits in the middle of that space.
import * as THREE from 'three';

export const PITCH = 3.2, PITCH_Z = 4.2; // a cell's size on the board
export const FIG_H = 3.6; // the fit keeps the figures' tops on screen
const TILT = 50 * Math.PI / 180;

export function frameBoard(camera, cols, rows, W, H, insets) {
  camera.aspect = W / H;
  camera.clearViewOffset();
  const hw = cols / 2 * PITCH, hd = rows / 2 * PITCH_Z;
  const corners = [];
  for (const x of [-hw, hw]) for (const z of [-hd, hd]) for (const y of [0, FIG_H]) corners.push(new THREE.Vector3(x, y, z));
  const dir = new THREE.Vector3(0, Math.sin(TILT), Math.cos(TILT));
  const box = () => {
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
    for (const p of corners) {
      const n = p.clone().project(camera);
      a = Math.min(a, n.x); b = Math.max(b, n.x); c = Math.min(c, n.y); d = Math.max(d, n.y);
    }
    return { a, b, c, d };
  };
  const margin = 16, safeH = (H - insets.top - insets.bottom - 2 * margin) / H * 2, safeW = (W - 2 * margin) / W * 2;
  let lo = 10, hi = 600;
  for (let i = 0; i < 24; i++) {
    const dist = (lo + hi) / 2;
    camera.position.copy(dir).multiplyScalar(dist);
    camera.lookAt(0, 0, 0);
    const { a, b, c, d } = box();
    if (b - a > safeW || d - c > safeH) lo = dist; else hi = dist;
  }
  camera.position.copy(dir).multiplyScalar(hi);
  camera.lookAt(0, 0, 0);
  const { a, b, c, d } = box();
  const midY = (d + c) / 2, wantY = 1 - (insets.top + (H - insets.top - insets.bottom) / 2) / H * 2;
  camera.setViewOffset(W, H, (a + b) / 4 * W, (wantY - midY) / 2 * H, W, H);
  camera.updateProjectionMatrix();
}
