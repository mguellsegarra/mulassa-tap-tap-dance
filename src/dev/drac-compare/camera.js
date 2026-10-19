// The comparison's cameras (dev only), separate from the root path: the model never steers them, so a pan can't hide
// where it walks. 'referencia' approximates the source: one operator standing at a fixed station, turning the camera by
// pan / tilt keys in video seconds. APPROXIMATE, not a calibration:
// - station and lens: the parent's local fit of the first frame (real rig at yaw -0.35, eye 1.55 m, 6.256 m in front of
//   the first root spot, aim 1.909 m up it, vertical fov 44) matches its head top (0.270) and root floor (0.883) only;
// - pan / tilt at 0-14 s: the background gazebo apex's shift (960x540 px: 594,144 / 686,145 / 622,140 / 616,133 /
//   620,130 / 625,112 / 630,86 / 450,144), as angles through the fit's focal length (668 px); later keys are anchor frames chosen so the inferred
//   root lands near the source's feet (camera-landmarks.json), never a per-frame fit.
// 'fixa' is a wide still camera behind the station and 'planta' looks straight down. Metres; +z towards the station.
import { track, at, SPOTS } from '../../game/drac-path.js';
import { DRAC_SCALE } from '../../scene/models/drac.js';

export const DEFAULT_TUNE = Object.freeze({
  az: 0, // deg round the first root spot, + = towards +x
  dist: 6.256, // m from the first root spot on the floor
  h: 1.55, // m, lens height
  ty: 1.909, // m, height of the aim point over the first spot (the base direction)
  fov: 44, // deg vertical (16:9)
  pan: 0, tilt: 0, // deg added to the keys (+ = right / up)
  roll: 0, // deg, the operator's tilt of the frame
  follow: 1, // 0 = a still camera, 1 = the pan / tilt keys
});
const FOCAL = 668; // px at 960x540 with a 44 deg vertical fov
const bg = (dx, dy) => [-Math.atan(dx / FOCAL) * 180 / Math.PI, Math.atan(dy / FOCAL) * 180 / Math.PI];
// [t, pan, tilt] deg. 0-14: the background gazebo apex (read directly; the parent's SIFT/RANSAC homographies,
// background-motion.json, agree within a few px). 16.3 is an anchor frame instead: its homography gives +1 deg of tilt
// but the figure, at its 20-29 s size, sits 65 px lower than that puts it - a near / far parallax, so the operator
// probably moved the camera, which this fixed station can't do.
// 16.3, 20, 24, 29, 40, 44, 60, 65, 74, 94, 100, 104: anchor frames solved so the
// inferred root lands on the source's feet (camera-landmarks*.json; 29, 40, 74, 75 then by the shoes' midpoint). 31-38 and 76-84 (feet out of frame): the source's
// framing of the close pass, by eye. 46-58.8 (no landmark): 70% of a centring pan, a partial follow. 86: feet cropped,
// framed by its head height only.
const ARC_PAN = [[0.3, -2.35], [-6.13, -1.45], [-17.69, -0.9], [-0.98, 0.64], [24.16, 2.22], [18.67, -4.33], [3.96, -1.4], [-0.76, -3.7]];
export const PAN_KEYS = [
  [0, 0, 0], [2, ...bg(92, 1)], [6, ...bg(28, -4)], [8, ...bg(22, -11)], [8.4, ...bg(26, -14)], [10, ...bg(31, -32)],
  [12, ...bg(36, -58)], [14, ...bg(-144, 0)], [16.3, -9.84, -4.69], [20, -1.63, -2.08], [24, 0.01, -1.86],
  ...[29, 31, 33, 35.2, 36.3, 38, 40, 44].map((t, k) => [t, ...ARC_PAN[k]]),
  [46, -6.2, -3.5], [49.9, 6.6, 1.1], [53, -5.5, 0.8], [54, -5.5, 0.8], [57.2, 5.6, 1.3], [58.8, -0.19, -4.25],
  [60, -2.16, -3.17], [65, 1.95, -3.09], [71.5, 2.0, -4.2], [72.8, 2.3, -4.26], [74, 0.76, -4.77], [75.04, -7.05, -5.6], [76.1, -18.05, 3.05],
  ...[78.7, 79.6, 81.9, 83.6].map((t, k) => [t, ...ARC_PAN[k + 3]]),
  [86, 0.69, -2.75], [94, 2.01, -2.07], [100, 0.4, -1.3], [104, 1.5, -2.05], [104.8, 1.5, -2.05],
];
// [t, zoom]: the fov is divided by this. No zoom is evident in the background's scale.
export const ZOOM_KEYS = [[0, 1]];
const S0 = SPOTS.S0;

const VIEWS = {
  fixa: { pos: [1.5, 4.6, 13], target: [0.2, 0.4, 0.6], fov: 44, up: [0, 1, 0] },
  planta: { pos: [0.2, 15, 0.9], target: [0.2, 0, 0.9], fov: 44, up: [0, 0, -1] },
};
export const VIEW_NAMES = ['referencia', 'fixa', 'planta'];
const DEG = Math.PI / 180;

export function createCameraTrack() {
  let keys = PAN_KEYS, zoomKeys = ZOOM_KEYS, P, Z;
  const rebuild = () => { P = [1, 2].map(c => track(keys, c)); Z = track(zoomKeys.length > 1 ? zoomKeys : [...zoomKeys, [zoomKeys[0][0] + 1, zoomKeys[0][1]]]); };
  rebuild();
  const tune = { ...DEFAULT_TUNE };
  // fills out {pos, target, up, fov, roll, pan, tilt} for `view` at video second t
  function cameraAt(out, t, view = 'referencia') {
    const v = VIEWS[view];
    if (v) {
      for (let k = 0; k < 3; k++) { out.pos[k] = v.pos[k]; out.target[k] = v.target[k]; out.up[k] = v.up[k]; }
      out.fov = v.fov; out.roll = 0; out.pan = 0; out.tilt = 0;
      return out;
    }
    const a = tune.az * DEG, sx = S0[0] * DRAC_SCALE, sz = S0[1] * DRAC_SCALE;
    out.pos[0] = sx + tune.dist * Math.sin(a); out.pos[1] = tune.h; out.pos[2] = sz + tune.dist * Math.cos(a);
    // the base direction: at the first spot, ty up; then pan (+ right) and tilt (+ up)
    const yaw0 = Math.atan2(sx - out.pos[0], out.pos[2] - sz), pitch0 = Math.atan2(tune.ty - tune.h, tune.dist);
    out.pan = at(P[0], t) * tune.follow + tune.pan; out.tilt = at(P[1], t) * tune.follow + tune.tilt;
    const y = yaw0 + out.pan * DEG, p = pitch0 + out.tilt * DEG;
    out.target[0] = out.pos[0] + Math.sin(y) * Math.cos(p) * tune.dist;
    out.target[1] = out.pos[1] + Math.sin(p) * tune.dist;
    out.target[2] = out.pos[2] - Math.cos(y) * Math.cos(p) * tune.dist;
    out.up[0] = 0; out.up[1] = 1; out.up[2] = 0;
    out.fov = tune.fov / at(Z, t); out.roll = tune.roll;
    return out;
  }
  return {
    cameraAt, tune,
    setTune(p) { for (const k of Object.keys(DEFAULT_TUNE)) if (Number.isFinite(p?.[k])) tune[k] = p[k]; return { ...tune }; },
    reset() { Object.assign(tune, DEFAULT_TUNE); return { ...tune }; },
    // replace the pan / tilt keys ([[t, pan, tilt]...]) and the zoom keys ([[t, zoom]...]) while calibrating
    setTrack(next, zoom = zoomKeys) { const k0 = keys, z0 = zoomKeys; keys = next; zoomKeys = zoom; try { rebuild(); } catch (e) { keys = k0; zoomKeys = z0; rebuild(); throw e; } },
    get keys() { return keys.map(k => [...k]); }, get zoomKeys() { return zoomKeys.map(k => [...k]); },
  };
}
export const newCamera = () => ({ pos: [0, 0, 0], target: [0, 0, 0], up: [0, 1, 0], fov: 44, roll: 0, pan: 0, tilt: 0 });
