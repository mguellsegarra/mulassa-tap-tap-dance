// The campanar's stone in relief, shared by every piece built in 3D on a settled floor (openings.js, portal.js,
// clock.js, mouldings.js): triangles with their colours, a convex shape raised off a wall and cut to a floor's heights,
// a moulding run along a wall and mitred at its corners, and the pooled mesh all of it is added to.
import { BufferGeometry, BufferAttribute, Float32BufferAttribute, Mesh, Color } from 'three';

export const tone = t => new Color('#e2b77c').lerp(new Color('#fbe7b5'), t); // stone.js's sandstone to butter
// the dressed stone's tones: an arch's or a band's face, a step or an edge, a sill (the lightest), a jamb deep in shade
export const ARCH = tone(0.72), STEP = tone(0.36), SILL = tone(0.88), JAMB = new Color('#8c613c');

// triangles with their colours, flat normals at the end
export function tris() {
  const pos = [], col = [];
  const tri = (p, k) => p.forEach((v, i) => { pos.push(v.x, v.y, v.z); col.push(k[i].r, k[i].g, k[i].b); });
  return {
    tri,
    quad(a, b, c, d, ka, kb = ka, kc = kb, kd = ka) { tri([a, b, c], [ka, kb, kc]); tri([a, c, d], [ka, kc, kd]); },
    geo() {
      const g = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(pos, 3)).setAttribute('color', new Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    },
  };
}

// a convex polygon [u, y, side] on a wall cut to heights a..c (Sutherland-Hodgman); side: the edge to the next point gets
// a side face; a new edge along a cut gets none (the floor over or under it carries on the solid)
export function clipY(poly, a, c) {
  let q = poly;
  for (const [lim, keep] of [[a, y => y >= a - 1e-6], [c, y => y <= c + 1e-6]]) {
    const out = [];
    q.forEach((p, j) => {
      const n = q[(j + 1) % q.length], pin = keep(p[1]), nin = keep(n[1]);
      if (pin) out.push(p);
      if (pin !== nin) out.push([p[0] + (n[0] - p[0]) * (lim - p[1]) / (n[1] - p[1]), lim, pin ? false : p[2]]);
    });
    q = out;
  }
  return q;
}
// that polygon cut to a..c and raised from z0 to z1 off the wall (P: the wall's frame, openings.js's at): its face in k,
// its sides in kSide
export function prism(t, P, poly, z0, z1, a, c, k, kSide = k) {
  const q = clipY(poly, a, c);
  if (q.length < 3) return;
  for (let j = 1; j < q.length - 1; j++) t.tri([P(q[0][0], q[0][1], z1), P(q[j][0], q[j][1], z1), P(q[j + 1][0], q[j + 1][1], z1)], [k, k, k]);
  q.forEach((p, j) => {
    const n = q[(j + 1) % q.length];
    if (p[2]) t.quad(P(p[0], p[1], z0), P(n[0], n[1], z0), P(n[0], n[1], z1), P(p[0], p[1], z1), kSide);
  });
}
// a ring's sector from angle t0 to t1 (radians, 0 up, clockwise as seen from outside) between radii r0 and r1, centred
// on (u, y), as a prism's polygon: only its arcs get sides (the next sector carries on), unless `ends`
export const sector = (u, y, r0, r1, t0, t1, ends = false) => [[r0, t0, ends], [r1, t0, true], [r1, t1, ends], [r0, t1, true]]
  .map(([r, t, s]) => [u + r * Math.sin(t), y + r * Math.cos(t), s]);
// a moulding run along wall b at floor height y0: its profile [[y, n], ...] from the wall up and out and back, each
// point's line running past the wall's ends by its own n, so the four walls' meet in a mitre at every corner
export function moulding(t, P, b, profile, k) {
  for (let j = 0; j < profile.length - 1; j++) {
    const [ya, na] = profile[j], [yb, nb] = profile[j + 1], kk = Array.isArray(k) ? k[j] : k;
    t.quad(P(b.u0 - na, ya, na), P(b.u1 + na, ya, na), P(b.u1 + nb, yb, nb), P(b.u0 - nb, yb, nb), kk);
  }
}

const ATTRS = ['position', 'normal', 'color'];
// one mesh the slices are added to at the end, never touching what is there; drawn from the first frame, empty, so its
// program compiles at boot and not on the tap that settles the chamber's first floor
export function pool(scene, mat) {
  const mesh = new Mesh(undefined, mat);
  let n = 0;
  const make = size => {
    const g = new BufferGeometry();
    for (const k of ATTRS) g.setAttribute(k, new BufferAttribute(new Float32Array(size * 3), 3));
    g.setDrawRange(0, n);
    return g;
  };
  mesh.geometry = make(4096);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return {
    add(src) {
      const k = src.attributes.position.count, old = mesh.geometry, size = old.attributes.position.count;
      if (n + k > size) { // a bigger buffer, what is there copied over
        mesh.geometry = make(Math.max(2 * size, n + k));
        for (const a of ATTRS) mesh.geometry.attributes[a].array.set(old.attributes[a].array.subarray(0, n * 3));
        old.dispose();
      }
      for (const a of ATTRS) {
        const t = mesh.geometry.attributes[a];
        t.array.set(src.attributes[a].array, n * 3);
        t.addUpdateRange(n * 3, k * 3);
        t.needsUpdate = true;
      }
      n += k;
      mesh.geometry.setDrawRange(0, n);
      src.dispose();
    },
    reset() { n = 0; mesh.geometry.setDrawRange(0, 0); },
    get count() { return n; },
  };
}
