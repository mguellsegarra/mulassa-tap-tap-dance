// Rounded body footprint, conservative enough for heads/tails throughout a slow turn.
export function photoClearance(x, z, yaw, ox, oz, radius, dragon = false) {
  const dx = ox - x, dz = oz - z, c = Math.cos(yaw), s = Math.sin(yaw);
  return Math.hypot(Math.max(0, Math.abs(dx * c - dz * s) - (dragon ? 1.25 : 0.8)),
    Math.max(0, Math.abs(dx * s + dz * c) - (dragon ? 1.55 : 2.35))) - radius - 0.18;
}
// Separating axes of the two oriented footprints: rotation is checked as well as translation.
export function photoPairClearance(x, z, yaw, other, dragon) {
  const ax = dragon ? 1.25 : 0.8, az = dragon ? 1.55 : 2.35;
  const bx = dragon ? 0.8 : 1.25, bz = dragon ? 2.35 : 1.55;
  const dx = other.x - x, dz = other.z - z, c = Math.cos(yaw), s = Math.sin(yaw);
  const oc = Math.cos(other.yaw), os = Math.sin(other.yaw);
  const co = Math.abs(Math.cos(yaw - other.yaw)), si = Math.abs(Math.sin(yaw - other.yaw));
  return Math.max(Math.abs(dx * c - dz * s) - ax - bx * co - bz * si,
    Math.abs(dx * s + dz * c) - az - bx * si - bz * co,
    Math.abs(dx * oc - dz * os) - bx - ax * co - az * si,
    Math.abs(dx * os + dz * oc) - bz - ax * si - az * co) - 0.25;
}
