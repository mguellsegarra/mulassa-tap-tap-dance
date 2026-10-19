// The Mulassa's reconstructed dance in REFERENCE seconds (the 2017 source video, D53pgXOeIL0, 0-166.2 s): root travel,
// unwrapped heading, sway envelope and tilt cues from mula-reconstruction.json (research/bestiari/mulassa/README.md).
// OBSERVED: the order of headings, the half turns, the two late reversals, about four final turns (frames checked).
// INFERRED: floor distances, sway phase and amplitude, tilt degrees (fitted to silhouettes, not measured).
// Pure, no three.js, no allocations per call. The comparator (dev/bestiari-compare) and the game (game/mula-dance.js,
// through the one time map) both pose from here.
import MULA_RECONSTRUCTION from './mula-reconstruction.json' with { type: 'json' };
// Monotone cubic Hermite through [t, value...] rows (harmonic-mean tangents: no overshoot at a reversal).
function mulaSlope(rows, k, col) { return (rows[k + 1][col] - rows[k][col]) / (rows[k + 1][0] - rows[k][0]); }
function mulaTangent(rows, k, col) {
  if (k === 0) return mulaSlope(rows, 0, col);
  if (k === rows.length - 1) return mulaSlope(rows, k - 1, col);
  const a = mulaSlope(rows, k - 1, col), b = mulaSlope(rows, k, col);
  return a * b <= 0 ? 0 : 2 * a * b / (a + b);
}
export function mulaTrack(rows, t, col = 1) {
  if (t <= rows[0][0]) return rows[0][col];
  const n = rows.length;
  if (t >= rows[n - 1][0]) return rows[n - 1][col];
  let lo = 0, hi = n - 1; // the last row at or before t
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (rows[m][0] < t) lo = m; else hi = m; }
  const a = rows[lo], b = rows[lo + 1], h = b[0] - a[0], u = (t - a[0]) / h;
  return (2 * u ** 3 - 3 * u ** 2 + 1) * a[col] + (u ** 3 - 2 * u ** 2 + u) * h * mulaTangent(rows, lo, col)
    + (-2 * u ** 3 + 3 * u ** 2) * b[col] + (u ** 3 - u ** 2) * h * mulaTangent(rows, lo + 1, col);
}
export const MULA_REF_END = 166.2;

// pose(t, out, phase): t in reference seconds. Without `phase` the sway follows the reference's own inferred cycles and
// the fitted silhouettes (the comparator's reconstruction). With `phase` (rad, the game's music) the sway takes that
// phase, and the per-second hem-pitch fits, which belong to the source's own sway, give way to it; travel and heading
// are the same. Channels: x, z (m, camera frame of the opening: x right, z towards the camera), yaw (rad, unwrapped,
// + anticlockwise from above), roll / pitch (body rad), headRoll, lift (m), rollAmp / pitchAmp (the sway envelope, rad)
// and the comparator's camera fit (cameraX/Y, referenceX/Y/Weight).
export function makeMulaMotion(data) {
  const rad = Math.PI / 180;
  const cycles = data.bodyCycles, tilts = data.tiltCorrections || [];
  // One continuous screen track bridges the last approach sample (89 s) and
  // first late sample (90 s), preserving tangents instead of freezing each end.
  const screenRows = data.approachCamera && data.lateFit
    ? [...data.approachCamera.screenRows, ...data.lateFit.rows.map(row => [row[0], row[3], row[4]])]
    : null;
  function pose(t, out = {}, phase) {
    const game = phase !== undefined;
    if (!game) phase = mulaTrack(cycles, t) * Math.PI * 2;
    out.yaw = mulaTrack(data.yawDegrees, t) * rad;
    out.x = mulaTrack(data.rootMetres, t); out.z = mulaTrack(data.rootMetres, t, 2);
    out.rollAmp = mulaTrack(data.sway, t) * rad; out.pitchAmp = mulaTrack(data.sway, t, 2) * rad;
    out.roll = Math.sin(phase) * out.rollAmp;
    out.pitch = -Math.max(0, Math.sin(phase * 2)) * out.pitchAmp;
    if (!game) for (const cue of tilts) {
      const distance = Math.min(1, Math.abs(t - cue.time) / cue.radius);
      const weight = 1 - distance * distance * (3 - 2 * distance);
      out.roll += (cue.roll * rad - out.roll) * weight;
      out.pitch += (cue.pitch * rad - out.pitch) * weight;
    }
    out.cameraX = 0; out.cameraY = 0;
    out.referenceX = 0; out.referenceY = 0; out.referenceWeight = 0;
    if (data.openingFit && t < 31.7) {
      const rows = data.openingFit.rows, u = Math.max(0, Math.min(1, (31.7 - t) / .7));
      const weight = u * u * (3 - 2 * u);
      out.x += (mulaTrack(rows, t, 1) - out.x) * weight;
      out.yaw += (mulaTrack(rows, t, 2) * rad - out.yaw) * weight;
      if (!game) out.pitch += (mulaTrack(rows, t, 3) * rad - out.pitch) * weight;
      out.cameraX = mulaTrack(rows, t, 4) * weight; out.cameraY = mulaTrack(rows, t, 5) * weight;
    }
    if (data.secondFit && t > 34 && t < 67) {
      const rows = data.secondFit.rows;
      const u = Math.max(0, Math.min(1, (t - 34) / 2, (67 - t) / 2)), weight = u * u * (3 - 2 * u);
      out.x += (mulaTrack(rows, t) - out.x) * weight;
      if (!game) out.pitch += (mulaTrack(rows, t, 2) * rad - out.pitch) * weight;
      out.cameraX = mulaTrack(rows, t, 3) * weight; out.cameraY = mulaTrack(rows, t, 4) * weight;
    }
    if (data.approachCamera && t > 65 && t < 90) {
      const u = Math.max(0, Math.min(1, t - 65, 90 - t)), w = u * u * (3 - 2 * u);
      out.cameraX += (mulaTrack(data.approachCamera.rows, t) - out.cameraX) * w;
      out.cameraY += (mulaTrack(data.approachCamera.rows, t, 2) - out.cameraY) * w;
      out.referenceX = mulaTrack(screenRows || data.approachCamera.screenRows, t);
      out.referenceY = mulaTrack(screenRows || data.approachCamera.screenRows, t, 2); out.referenceWeight = w;
    }
    if (data.lateFit && t > 89 && t < 121) {
      const rows = data.lateFit.rows;
      const u = Math.max(0, Math.min(1, t - 89, 121 - t)), w = u * u * (3 - 2 * u);
      out.x += (mulaTrack(rows, t) - out.x) * w;
      if (!game) out.pitch += (mulaTrack(rows, t, 2) * rad - out.pitch) * w;
      // The outgoing approach and incoming fit overlap at 89–90 s. Blend their
      // screen landmarks without dropping the active camera fit to zero at 89 s.
      out.referenceX = screenRows ? mulaTrack(screenRows, t) : mulaTrack(rows, t, 3);
      out.referenceY = screenRows ? mulaTrack(screenRows, t, 2) : mulaTrack(rows, t, 4);
      out.referenceWeight = Math.min(1, out.referenceWeight + w);
    }
    // Approved stylization: a small, phase-locked emphasis, never extra random motion.
    out.roll *= 1.15;
    out.headRoll = out.roll * .12;
    out.lift = mulaLift(out.pitch, phase, t);
    return out;
  }
  return { pose, tilts };
}
// The carriers lift the shell as its front rises (pitch about the rear row), with a small step bounce that settles at the end.
export const mulaLift = (pitch, phase, t) => Math.max(0, 1.25 * Math.sin(Math.abs(pitch)) - .06)
  + 0.025 * Math.abs(Math.sin(phase)) * Math.max(0, Math.min(1, (165 - t) / 3));
export const mulaMotion = makeMulaMotion(MULA_RECONSTRUCTION); // stateless: the game, the layout and the comparator share it
