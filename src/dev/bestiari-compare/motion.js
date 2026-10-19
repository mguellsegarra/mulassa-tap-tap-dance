import { planSupports } from './supports.js';
// Reconstruction coordinates are evidence annotations, not the game's choreography.
function slope(rows, k, col) { return (rows[k + 1][col] - rows[k][col]) / (rows[k + 1][0] - rows[k][0]); }
function tangent(rows, k, col) {
  if (k === 0) return slope(rows, 0, col);
  if (k === rows.length - 1) return slope(rows, k - 1, col);
  const a = slope(rows, k - 1, col), b = slope(rows, k, col);
  return a * b <= 0 ? 0 : 2 * a * b / (a + b);
}
export function track(rows, t, col = 1) {
  if (t <= rows[0][0]) return rows[0][col];
  const n = rows.length;
  if (t >= rows[n - 1][0]) return rows[n - 1][col];
  let i = 0;
  while (rows[i + 1][0] < t) i++;
  const a = rows[i], b = rows[i + 1], h = b[0] - a[0], u = (t - a[0]) / h;
  return (2 * u ** 3 - 3 * u ** 2 + 1) * a[col] + (u ** 3 - 2 * u ** 2 + u) * h * tangent(rows, i, col)
    + (-2 * u ** 3 + 3 * u ** 2) * b[col] + (u ** 3 - u ** 2) * h * tangent(rows, i + 1, col);
}

export function makeMotion(data) {
  const rad = Math.PI / 180;
  // Sway is an explicitly inferred performance layer; yaw anchors retain observed inversions.
  const cycles = data.bodyCycles, tilts = data.tiltCorrections || [];
  function pose(t, out = {}) {
    const phase = track(cycles, t) * Math.PI * 2;
    out.yaw = track(data.yawDegrees, t) * rad;
    out.x = track(data.rootMetres, t); out.z = track(data.rootMetres, t, 2);
    out.roll = Math.sin(phase) * track(data.sway, t) * rad;
    out.pitch = -Math.max(0, Math.sin(phase * 2)) * track(data.sway, t, 2) * rad;
    for (const cue of tilts) {
      const distance = Math.min(1, Math.abs(t - cue.time) / cue.radius);
      const weight = 1 - distance * distance * (3 - 2 * distance);
      out.roll += (cue.roll * rad - out.roll) * weight;
      out.pitch += (cue.pitch * rad - out.pitch) * weight;
    }
    out.cameraX = 0; out.cameraY = 0;
    if (data.openingFit && t < 31.7) {
      const rows = data.openingFit.rows, u = Math.max(0, Math.min(1, (31.7 - t) / .7));
      const weight = u * u * (3 - 2 * u);
      out.x += (track(rows, t, 1) - out.x) * weight;
      out.yaw += (track(rows, t, 2) * rad - out.yaw) * weight;
      out.pitch += (track(rows, t, 3) * rad - out.pitch) * weight;
      out.cameraX = track(rows, t, 4) * weight; out.cameraY = track(rows, t, 5) * weight;
      out.roll *= 1 - weight * .9;
    }
    if (data.secondFit && t > 34 && t < 67) {
      const rows = data.secondFit.rows;
      const u = Math.max(0, Math.min(1, (t - 34) / 2, (67 - t) / 2)), weight = u * u * (3 - 2 * u);
      out.x += (track(rows, t) - out.x) * weight;
      out.pitch += (track(rows, t, 2) * rad - out.pitch) * weight;
      out.cameraX = track(rows, t, 3) * weight; out.cameraY = track(rows, t, 4) * weight;
      out.roll *= 1 - weight * .9;
    }
    const settle = Math.max(0, Math.min(1, (165 - t) / 3));
    out.lift = Math.max(0, 1.25 * Math.sin(Math.abs(out.pitch)) - .06) + 0.025 * Math.abs(Math.sin(phase)) * settle;
    return out;
  }
  const supports = planSupports(pose);
  return { pose, ...supports };
}
