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

// Critically damped smoothing (no overshoot, the same path at 30, 60 or 120 fps): moves s.x[i] towards `target`,
// reaching it in about `time` seconds, carrying its velocity s.v[i] so a moving target is followed without jerks.
export function smoothDamp(s, i, target, time, dt) {
  if (dt <= 0) return s.x[i];
  const w = 2 / Math.max(1e-4, time), x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = s.x[i] - target, temp = (s.v[i] + w * change) * dt;
  s.v[i] = (s.v[i] - w * temp) * e;
  return (s.x[i] = target + (change + temp) * e);
}
