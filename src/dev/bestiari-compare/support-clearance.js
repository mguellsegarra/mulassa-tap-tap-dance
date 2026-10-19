// Oriented shoe footprints. Positive gap means separation; negative means overlap.
export const SHOE = { width: .105, length: .20, height: .075 };
export function shoeSeparation(a, b, out) {
  let gap = -Infinity, nx = 0, nz = 0;
  for (let i = 0; i < 4; i++) {
    const angle = (i < 2 ? a.yaw : b.yaw) + (i % 2) * Math.PI / 2;
    const x = Math.cos(angle), z = -Math.sin(angle);
    const ra = SHOE.width / 2 * Math.abs(x * Math.cos(a.yaw) - z * Math.sin(a.yaw))
      + SHOE.length / 2 * Math.abs(x * Math.sin(a.yaw) + z * Math.cos(a.yaw));
    const rb = SHOE.width / 2 * Math.abs(x * Math.cos(b.yaw) - z * Math.sin(b.yaw))
      + SHOE.length / 2 * Math.abs(x * Math.sin(b.yaw) + z * Math.cos(b.yaw));
    const d = (a.x - b.x) * x + (a.z - b.z) * z, g = Math.abs(d) - ra - rb;
    if (g > gap) { gap = g; nx = x * (d >= 0 ? 1 : -1); nz = z * (d >= 0 ? 1 : -1); }
  }
  out.gap = gap; out.x = nx; out.z = nz; return out;
}

