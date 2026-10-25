// Rounded body footprint, conservative enough for heads/tails throughout a slow turn.
export function photoClearance(x, z, yaw, ox, oz, radius, dragon = false) {
  const dx = ox - x, dz = oz - z, c = Math.cos(yaw), s = Math.sin(yaw);
  return Math.hypot(Math.max(0, Math.abs(dx * c - dz * s) - (dragon ? 1.25 : 0.8)),
    Math.max(0, Math.abs(dx * s + dz * c) - (dragon ? 1.55 : 2.35))) - radius - 0.18;
}
