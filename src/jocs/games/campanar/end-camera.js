// The end's camera: first a close look at the campanar's top while its last floors turn to stone and the crown grows,
// then, once grown, an ease out to the whole tower. Both shots through the same low view and long lens (sky.js's tilt
// and lens), so the ease out is a plain dolly back and crane down; a tower that already fits close goes straight whole.
import { SIZE } from './rules.js';

const CLOSE = { below: 2 * SIZE, margin: 0.5 * SIZE, worth: 2 }; // what the close shot shows under the top; only when the whole is this much farther
const IN = 0.8, OUT = 1.5, HOLD = 0.5, LATEST = 2.4; // s: to the first shot, to the whole, the look at the grown crown, the ease out's start at the latest
const inOut = t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

// fromY: the camera's aim now; aimY: the top floor's top; fit(half): the distance factor framing half that height
// above and below the aim. Out: y, k, tilt and zoom, stepped each frame (stepEndShot), no allocation
export function endShot(fromY, aimY, fit, { tilt, lens }) {
  const top = aimY + SIZE * 1.8; // the crown's cross
  const half = (top - aimY + CLOSE.below) / 2; // the close shot's, its middle raised by the 0.3 sides scene.js looks under its aim
  const whole = [top / 2, fit(top / 2 + 1.5 * SIZE)], close = [top - half + 0.3 * SIZE, fit(half + CLOSE.margin)];
  const near = whole[1] > close[1] * CLOSE.worth ? close : whole;
  return { age: 0, wideAt: LATEST, fromY, near, whole, endTilt: tilt, lens, y: fromY, k: 1, tilt: 1, zoom: 1 };
}

// the crown has grown: a moment on it, then out
export const widenEndShot = o => { o.wideAt = Math.min(o.wideAt, o.age + HOLD); };

export function stepEndShot(o, dt) {
  o.age += dt;
  const s = inOut(Math.min(1, o.age / IN)), u = inOut(Math.min(1, Math.max(0, o.age - Math.max(IN, o.wideAt)) / OUT));
  const [ny, nk] = o.near, [wy, wk] = o.whole;
  // in: from the play camera, lower and farther, through a longer lens: it stands straight, not thin below and wide above
  o.zoom = 1 + (o.lens - 1) * s;
  o.tilt = 1 - (1 - o.endTilt) * s;
  const k = 1 + (nk - 1) * s;
  // out: the distance in equal ratios (an even pull back, not a lurch first), the aim down to the tower's middle
  o.k = k * (wk / nk) ** u * o.zoom;
  o.y = o.fromY + (ny - o.fromY) * s + (wy - ny) * u;
}
