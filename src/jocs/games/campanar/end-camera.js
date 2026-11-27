// The end's camera: first a close look at the campanar's top while its last floors turn to stone and the crown grows,
// then, once grown, an ease out to the whole tower. Both shots through the same low view and long lens (sky.js's tilt
// and lens), so the ease out is a plain dolly back and crane down; a tower that already fits close goes straight whole.
import { SIZE, FLOOR } from './rules.js';

const CLOSE = { below: 2 * SIZE, margin: 0.5 * SIZE, worth: 2 }; // what the close shot shows under the top; only when the whole is this much farther
const IN = 0.8, OUT = 1.5, HOLD = 0.5, LATEST = 2.4; // s: to the first shot, to the whole, the look at the grown crown, the ease out's start at the latest
const TIGHT = 1.5 * FLOOR, EASE = 12; // the closest zoom: this much above and below the aim (a floor or two); /s
const FOCUS = 1.4; // s to go to a piece
const inOut = t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
// a camera `across` off the tower's axis at height cy, its clip planes (scene.js): near a quarter of the way in, not 0.1
// (the clocks' and windows' millimetres off the wall stop blinking from afar); far past the tower's farthest point from
// it, its foot or its cross at height top, a side round, and never under least (a tall tower's end, lifted clear of the
// menu, goes far off: a fixed far lost the whole tower behind the pieces sheet)
export function clipPlanes(camera, across, cy, top, least) {
  const near = across / 4, far = Math.max(least, Math.hypot(across + SIZE, Math.max(cy, top - cy)) * 1.05);
  if (Math.abs(camera.near - near) <= camera.near * 0.01 && Math.abs(camera.far - far) <= camera.far * 0.01) return;
  camera.near = near;
  camera.far = far;
  camera.updateProjectionMatrix();
}

// fromY: the camera's aim now; aimY: the top floor's top; fit(half): the distance factor framing half that height
// above and below the aim. Out: y, k, tilt and zoom, stepped each frame (stepEndShot), no allocation.
// Once whole, the player's zoom: z from 0 (whole) to 1 (TIGHT), py the aim's height; ez, ey eased to them
export function endShot(fromY, aimY, fit, { tilt, lens }, still = false) {
  const top = aimY + SIZE * 1.8; // the crown's cross
  const half = (top - aimY + CLOSE.below) / 2; // the close shot's, its middle raised by the 0.3 sides scene.js looks under its aim
  const whole = [top / 2, fit(top / 2 + 1.5 * SIZE)], close = [top - half + 0.3 * SIZE, fit(half + CLOSE.margin)];
  const near = whole[1] > close[1] * CLOSE.worth ? close : whole;
  const span = top / 2 + 1.5 * SIZE, r = Math.min(1, fit(TIGHT) / whole[1]); // the whole's half height; the tightest k / whole's
  return { age: 0, wideAt: LATEST, fromY, near, whole, endTilt: tilt, lens, y: fromY, k: 1, tilt: 1, zoom: 1,
    out: 0, span, r, still, z: 0, py: whole[0], ez: 0, ey: whole[0], cross: top, f: 1 };
}

// zoomed to z, the foot and the real cross (it may stand off the guess the whole was framed with) go no farther in
// than the whole view had them. The view scales round where it looks, 0.3 sides under the aim at the whole (scene.js)
const UNDER = 0.3 * SIZE;
const clampAim = o => {
  const f = o.r ** o.z, wy = o.whole[0];
  o.py = Math.min(o.cross - f * (o.cross - wy), Math.max(f * wy, o.py));
};
// by: how many times closer; v: the point kept still, in the free view's half heights above its middle (+1: its top)
export function zoomEndShot(o, by, v) {
  if (o.out < 1 || o.r > 0.9) return; // still easing out, or a tower that already shows its floors whole
  o.focus = null; // the player's fingers rule
  const off = v * o.span - UNDER, at = o.py + off * o.r ** o.z;
  o.z = Math.min(1, Math.max(0, o.z + Math.log(by) / -Math.log(o.r)));
  o.py = at - off * o.r ** o.z;
  clampAim(o);
}
// share: a drag down, in the free view's half heights: the tower follows the finger
export function panEndShot(o, share) {
  if (o.out < 1) return;
  o.focus = null;
  o.py += share * o.span * o.r ** o.z;
  clampAim(o);
}

// a piece at height y (the collection sheet's tap, pieces.js): in to it and over to it as one move, the piece gliding
// to the middle of the view while the view closes in, so it never leaves the frame on the way (a zoom and a pan eased
// apart would swing it out). The view's middle is UNDER·f under the aim; s0, the piece's offset from it at the start
export function focusEndShot(o, y) {
  if (o.out < 1) return;
  const f0 = o.r ** o.ez; // to the closest zoom: as near as the play camera was when the piece was found
  o.focus = { t: 0, y, z0: o.ez, z1: o.r > 0.9 ? o.ez : 1, s0: (y - (o.ey - UNDER * f0)) / f0 };
}

// the crown has grown, its cross at that height: a moment on it, then out
export const widenEndShot = (o, cross) => { o.wideAt = Math.min(o.wideAt, o.age + HOLD); o.cross = cross ?? o.cross; };

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
  o.out = u;
  if (o.focus) { // going to a piece: z and the aim from one eased share, the piece's offset shrinking as the view does
    const q = o.focus, p = inOut(q.t = o.still ? 1 : Math.min(1, q.t + dt / FOCUS));
    o.z = q.z0 + (q.z1 - q.z0) * p;
    const f = o.r ** o.z;
    o.py = q.y - q.s0 * (1 - p) * f + UNDER * f;
    clampAim(o);
    o.ez = o.z; o.ey = o.py;
    if (q.t === 1) o.focus = null;
  }
  const e = o.still ? 1 : 1 - Math.exp(-EASE * dt); // the player's zoom, eased (at once with reduced motion)
  o.ez += (o.z - o.ez) * e;
  o.ey += (o.py - o.ey) * e;
  o.f = o.r ** o.ez; // scene.js's look under the aim scales with it too
  o.k *= o.f;
  o.y += o.ey - wy;
}
