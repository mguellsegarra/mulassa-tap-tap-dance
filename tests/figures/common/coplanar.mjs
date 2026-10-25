// Coplanar faces between two voxel boxes ({ x, y (bottom), z, w, h, d }): the same plane, facing the same way, overlapping
// across it, which z-fights. Shared by the figures' parts tests; what a figure then forgives (a buried face) stays in its test.
export const lo = b => [b.x - b.w / 2, b.y, b.z - b.d / 2], hi = b => [b.x + b.w / 2, b.y + b.h, b.z + b.d / 2];
export const ov = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);

// Every shared face of a and b: { axis (0 x, 1 y, 2 z), sign, at (the plane), u / v (the overlap's range on the other
// two axes), area }; planes within `plane`, overlaps over `overlap` on both axes.
export function coplanar(a, b, { plane = 1e-3, overlap = 1e-6 } = {}) {
  const A0 = lo(a), A1 = hi(a), B0 = lo(b), B1 = hi(b), out = [];
  for (const axis of [0, 1, 2]) for (const sign of [1, -1]) {
    const pa = sign > 0 ? A1[axis] : A0[axis], pb = sign > 0 ? B1[axis] : B0[axis];
    if (Math.abs(pa - pb) > plane) continue;
    const [k1, k2] = [0, 1, 2].filter(k => k !== axis), ou = ov(A0[k1], A1[k1], B0[k1], B1[k1]), ow = ov(A0[k2], A1[k2], B0[k2], B1[k2]);
    if (ou > overlap && ow > overlap) out.push({ axis, sign, at: pa, u: [Math.max(A0[k1], B0[k1]), Math.min(A1[k1], B1[k1])],
      v: [Math.max(A0[k2], B0[k2]), Math.min(A1[k2], B1[k2])], area: ou * ow });
  }
  return out;
}
