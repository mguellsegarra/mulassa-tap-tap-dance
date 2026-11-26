// The campanar's rules, no DOM and no 3D: what a drop leaves standing. It never ends: the tower rises until a slab
// misses. Each new slab is exactly the size of the one below it; only the cut makes it smaller.
export const SIZE = 2.4; // the first slab's side, in world units
export const FLOOR = SIZE * 0.2; // a slab's height: a fifth of its side, a thin clear course
export const PERFECT = SIZE * 0.035; // a drop this close snaps onto the floor below, nothing cut
export const RANGE = SIZE * 1.4; // how far the slab travels each side of the floor below

// top: the floor below {x, z, w, d}; at: the moving slab's centre along `axis` ('x' or 'z').
// → { miss } or { placed, cut, perfect }: placed is the new floor, cut the part that falls ({x, z, w, d}, or null)
export function drop(top, at, axis) {
  const size = axis === 'x' ? 'w' : 'd';
  const delta = at - top[axis];
  if (Math.abs(delta) < PERFECT) return { placed: { ...top }, cut: null, perfect: true };
  const keep = top[size] - Math.abs(delta);
  if (keep <= 0) return { miss: true };
  const placed = { ...top, [size]: keep, [axis]: top[axis] + delta / 2 };
  const side = Math.sign(delta);
  const cut = { ...top, [size]: Math.abs(delta), [axis]: placed[axis] + side * (keep + Math.abs(delta)) / 2 };
  return { placed, cut, perfect: false };
}

// metres the tower stands: the real campanar is 8.85 m a side, so a slab (a fifth of its side) is 1.77 m, and 42 floors
// reach its 74 m
export const REAL = 74;
export const metresOf = floors => Math.round(floors * 8.85 * 0.2);

// the moving slab's speed (units/s) after n floors: one and a half sides a second, a little faster each floor
export const speedAt = n => SIZE * (1.5 + n * 0.012);
