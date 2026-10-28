// Play camera framing helpers: prop blocking, the attention stage and critically damped smoothing. Pure (no three.js) for tests.

// Does a prop (tree, lamp: { x, z, r, h }, a vertical cylinder) stand between the camera and her, or against the lens?
// c: camera [x, y, z]; t: what it looks at. The sight line counts with a margin for her body.
export function blocks(p, c, t, margin = 1.2) {
  const dx = t[0] - c[0], dz = t[2] - c[2], L2 = dx * dx + dz * dz || 1e-9;
  const nx = p.x - c[0], nz = p.z - c[2];
  if (nx * nx + nz * nz < (p.r + 1.5) ** 2 && c[1] < p.h + 2) return true; // right by the lens
  const k = (nx * dx + nz * dz) / L2;
  if (k <= 0 || k >= 1) return false; // behind the camera or beyond her
  const ox = dx * k - nx, oz = dz * k - nz;
  return ox * ox + oz * oz < (p.r + margin) ** 2 && c[1] + (t[1] - c[1]) * k < p.h + margin; // the sight line runs through it
}

// A stable stage: optional feedback and balloons never move its centre.
export function stageFrame(out, top, bottom) {
  out.top = Math.min(top, bottom - 24);
  out.bottom = bottom;
  out.center = out.top + (bottom - out.top) * 0.4;
  return out;
}

// On the selector a figure right by a low lens shrinks away (its showreel and the idle full screen stand the camera
// among the people), as the backdrop's figures do (uLens): the share of its size at (x, z) for lens = the camera's position
// (null: always 1). Gone within `near` m of the lens on the ground, back over `soft`; none above `high`.
export const LENS_CLEAR = { near: 3.4, soft: 1.6, high: 7.5 };
export function lensShrink(lens, x, z) {
  if (!lens || lens.y >= LENS_CLEAR.high) return 1;
  const t = (Math.hypot(x - lens.x, z - lens.z) - LENS_CLEAR.near) / LENS_CLEAR.soft;
  return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
}

// Critically damped smoothing (no overshoot, the same path at 30, 60 or 120 fps): moves s.x[i] towards `target`,
// reaching it in about `time` seconds, carrying its velocity s.v[i] so a moving target is followed without jerks.
// max (optional, units/s): a far target is approached at about that speed at most (Unity's maxSpeed: the distance it pulls on is capped).
export function smoothDamp(s, i, target, time, dt, max = Infinity) {
  if (dt <= 0) return s.x[i];
  const w = 2 / Math.max(1e-4, time), x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x), cap = max * time;
  const change = Math.max(-cap, Math.min(cap, s.x[i] - target)), temp = (s.v[i] + w * change) * dt;
  target = s.x[i] - change;
  s.v[i] = (s.v[i] - w * temp) * e;
  return (s.x[i] = target + (change + temp) * e);
}

// The selector camera's fit (cameras.js frameMenuLens): how far the lens must stand for a figure `w` x `h` metres across / up
// (measured at its own depth) to fill `fill` of the free rect `r` (css px: top, bottom, left, right, hardTop), and where its
// centre should sit (out.cx, out.cy, css px) and her lowest point (out.floor). A short band (a portrait phone under a long info block) still gets a readable
// figure: at least `least` of the room under the hard top (the pills), standing on the band's floor (the dock) and rising
// over the info block's lower rows, never into the header. vh: the viewport's css px tall; tan: tan(vertical fov / 2).
export function menuFit(out, r, vh, tan, w, h, fill = 0.86, least = 0.55, across = 0.7) { // across: less of the width (her travel and the dolly's lag as she turns side on show sideways: at 0.8 the Mulassa's side on outran a 393 px phone)
  const ppm = vh / (2 * tan), rw = Math.max(1, r.right - r.left), rh = Math.max(1, r.bottom - r.top), room = Math.max(rh, r.bottom - (r.hardTop ?? r.top));
  const ph = Math.min(Math.max(rh * fill, room * least), room * fill);
  out.dist = Math.max(h * ppm / ph, w * ppm / (rw * across));
  out.cx = (r.left + r.right) / 2;
  const low = r.bottom - rh * (1 - fill) / 2 - h * ppm / out.dist / 2; // standing on the band's floor
  out.cy = r.ground ? low : Math.min((r.top + r.bottom) / 2, low); // continuous: centred while it fits (r.ground: always on the floor, the splash's pair over its prompt)
  out.floor = out.cy + h * ppm / out.dist / 2; // where her lowest point goes (her feet: the ground never bobs as she rears up)
  return out;
}
// The shot's hard edge: how far to slide a figure spanning a..b (px) so it stays inside lo..hi; 0 while it is inside. A travelling
// figure pushes the frame along instead of leaving it while the slow follow catches up. Wider than the room (a long figure side
// on, on a narrow phone, until the dolly backs off): centred, cropped evenly on both sides rather than all on one.
export const edgePush = (a, b, lo, hi) => b - a > hi - lo ? (lo + hi - a - b) / 2 : a < lo ? lo - a : b > hi ? hi - b : 0;
// Follows a size that jumps about (a figure turning side on and back) without chasing it: rises in about `up` s (the UI
// must stay clear), falls in about `down` s (no pumping on every turn). Exact at any frame rate.
export const envelope = (env, x, dt, up, down) => env + (x - env) * (1 - Math.exp(-dt / (x > env ? up : down)));
