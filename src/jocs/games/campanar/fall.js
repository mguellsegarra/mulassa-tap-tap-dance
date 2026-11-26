// A cut piece's fall: a rigid block in the plane of its cut (u along the cut's axis, y up) that drops past the tower and
// meets its ledges as a block would: it lands, bounces a little, slides and tips over an edge. It never stays on a
// terrace: once it settles, it hops and flips outward, a little trick, and goes on falling. No physics engine (a few lines do for one box against flat ledges): impulses at each contact, with friction.
// Pure: no three, no DOM.
const BOUNCE = 0.18, FRICTION = 0.6, STEPS = 6, REST = 0.3; // REST: seconds nearly still before it hops off

// the piece {u, y (its centre), w (along u), h} with a push {vu, vy}; out: the side away from the tower (±1);
// g: gravity (units/s²)
export function createFall({ u, y, w, h, vu = 0, vy = 0 }, out, g) {
  const s = { u, y, a: 0, vu, vy, spin: 0 }, inertia = (w * w + h * h) / 12;
  let still = 0;
  // an impulse at r (from the centre) along n (pushing the piece out), pen: how deep it went
  function hit(r, n, pen) {
    s.u += n[0] * pen;
    s.y += n[1] * pen;
    const pu = s.vu - s.spin * r[1], py = s.vy + s.spin * r[0], vn = pu * n[0] + py * n[1];
    if (vn >= 0) return;
    const rn = r[0] * n[1] - r[1] * n[0], j = -(1 + BOUNCE) * vn / (1 + rn * rn / inertia);
    const t = [-n[1], n[0]], vt = pu * t[0] + py * t[1], rt = r[0] * t[1] - r[1] * t[0];
    const jt = Math.max(-FRICTION * j, Math.min(FRICTION * j, -vt / (1 + rt * rt / inertia)));
    const P = [n[0] * j + t[0] * jt, n[1] * j + t[1] * jt];
    s.vu += P[0];
    s.vy += P[1];
    s.spin += (r[0] * P[1] - r[1] * P[0]) / inertia;
  }
  // ledges: [lo, hi, top] along u, each a slab's top face (a slab is h thick under it)
  function contacts(ledges) {
    const c = Math.cos(s.a), sn = Math.sin(s.a);
    for (const [x, z] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) { // the piece's corners on a face
      const r = [x * c - z * sn, x * sn + z * c], pu = s.u + r[0], py = s.y + r[1];
      for (const [lo, hi, top] of ledges) if (pu > lo && pu < hi && py < top && py > top - h) hit(r, [0, 1], top - py);
    }
    for (const [lo, hi, top] of ledges) for (const q of [lo, hi]) { // a ledge's edge into the piece: it pivots on it
      const du = q - s.u, dy = top - s.y, lx = du * c + dy * sn, ly = -du * sn + dy * c;
      const px = w / 2 - Math.abs(lx), py = h / 2 - Math.abs(ly);
      if (px <= 0 || py <= 0) continue;
      const [nx, ny] = py < px ? [0, -Math.sign(ly)] : [-Math.sign(lx), 0]; // out of the nearest face, in the piece's frame
      hit([du, dy], [nx * c - ny * sn, nx * sn + ny * c], Math.min(px, py));
    }
  }
  // advance dt seconds against the ledges under it now → its state ({u, y, a})
  s.step = (dt, ledges) => {
    const k = dt / STEPS;
    for (let i = 0; i < STEPS; i++) {
      s.vy -= g * k;
      s.u += s.vu * k;
      s.y += s.vy * k;
      s.a += s.spin * k;
      contacts(ledges);
    }
    const slow = Math.hypot(s.vu, s.vy) < 0.6 * h && Math.abs(s.spin) < 1; // a block on two corners rocks a little: still enough
    still = slow ? still + dt : 0;
    if (still > REST) { // settled on a terrace: a hop, a push outward and a half turn over its outer edge
      s.vy = Math.sqrt(2 * g * h * 0.8);
      s.vu = out * Math.max(1.5 * h, w) * 2.5;
      s.spin = -out * 7;
      still = 0;
    }
    return s;
  };
  return s;
}
