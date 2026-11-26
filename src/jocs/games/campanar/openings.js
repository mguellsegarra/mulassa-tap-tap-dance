// What a floor wears when it settles (scene.js turn): its course on the plain box (stone.js, coping.js), or, on the bell
// chamber's floors, the wall in clean ashlar pierced by a real opening (Carbon's study, P2): a sill proud of the wall, a
// moulded band round the arch, jambs and soffit a wall's thickness deep, A's mullion and trefoil, a dark niche behind,
// and in it Fable's bell (bells.js). The chamber's floors settle on different taps, so each floor builds only its own
// slice of all that and touches nothing settled; the bells go in whole with the first floor, inside the body, where the
// floors still in colour over it hide what is not open yet. A window's two floors are pierced the same way, with no bell:
// A's and C's two round-headed lights under a round arch, XS's slit. Every slice is added to one of two meshes for the
// whole tower, the lit pieces and the dark niches: +2 draw calls. The portal (portal.js), the clock (clock.js) and the
// courses in relief (mouldings.js) go in the lit one too, on plain ashlar; the clock's hands are one mesh more.
import { BufferGeometry, Float32BufferAttribute, MeshLambertMaterial, MeshBasicMaterial, Color, Vector2, Vector3, Matrix4,
  DoubleSide } from 'three';
import { SIZE, FLOOR } from './rules.js';
import { chamberOf, halfWidth, holes, cuts, walls, at, inset } from './arches.js';
import { stoneGeo, courseMats } from './stone.js';
import { copeSlab } from './coping.js';
import { chamberBell, BELL_H, BELL_YOKE } from './bells.js';
import { tris, pool, tone, ARCH, STEP, SILL, JAMB } from './relief.js';
import { portalSlice } from './portal.js';
import { clockOf, clockSlice, clockFaces, createClockHands } from './clock.js';
import { COURSES } from './mouldings.js';

const DEEP = new Color('#110a06'), BACK = new Color('#160d08'), LIT_CHEEK = new Color('#2b1a10'), SHADE_CHEEK = new Color('#1c110b');
const DARK_SILL = new Color('#3e2718'), TYMPANUM = new Color('#c08d55'); // the tympanum a shade under the stone: it reads from above
const clamp01 = v => Math.max(0, Math.min(1, v));

// the wall's thickness, the niche's depth and half width, how deep the bell hangs (A's behind the mullion), the height
// of its crown and the half span of its beam (short of the next wall's bell in a thin body). The game looks down on the
// wall, and the deeper a thing is the higher up the opening it shows: the yoke's top goes that much under the arch's
// springing (Fable's rule), the lip never under the sill
function sizes(s, r) {
  const side = Math.min(r.w, r.d), tWall = Math.min(s.tWall, side * 0.19), roomD = Math.min(s.roomD, side * 0.43);
  const bellZ = s.mullion ? tWall * 0.62 + s.D / 2 + 0.01 : Math.min(s.bellZ ?? 0, Math.max(tWall * 0.95, roomD * 0.45));
  const yHang = Math.max(s.ySpring - bellZ - BELL_YOKE * s.D, s.ySill + 0.01 + BELL_H * s.D);
  // the niche as wide as the beam, so the beam always reaches its cheeks: narrower in a thin body, where the next wall's
  // bell is near
  const cW = Math.max(s.hw * 1.05, Math.min(s.hw * 1.22, side / 2 - bellZ - 0.012));
  return { tWall, roomD, cW, bellZ, yHang, beam: cW };
}

// floor i's box as a wall pierced by the opening, in the slab's own unit box (scene.js's swell still applies), UVs on the
// world as stone.js's so the courses and quoins agree with the shaft: each side in strips round the opening; the top and
// bottom only on the corner piers where the opening crosses them, so no stone ever crosses the niche between two floors
function piercedGeo(r, y0, o) {
  const pos = [], nor = [], uv = [], groups = [], edges = Array.from({ length: 6 }, () => new Vector2(0, 1));
  const { s } = o, a = y0 - o.y0, c = a + FLOOR, ys = cuts(s, a, c), bs = walls(r, o.cx, o.cz, o.y0);
  const put = (p, n, u, v) => { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); uv.push(u, v); };
  const strip = (b, ua0, ua1, ya, ub0, ub1, yb) => {
    if (ua1 - ua0 < 1e-5 && ub1 - ub0 < 1e-5) return;
    const P = [[ua0, ya], [ua1, ya], [ub1, yb], [ua0, ya], [ub1, yb], [ub0, yb]];
    for (const [u, y] of P) put(at(b, u, y, 0), b.N, (u - b.axis) / SIZE + 0.5, (y - a) / FLOOR);
  };
  const side = b => {
    const start = pos.length / 3;
    for (let k = 0; k < ys.length - 1; k++) {
      const ya = ys[k], yb = ys[k + 1], ym = (ya + yb) / 2;
      if (ym <= s.ySill || ym >= s.yApex) { strip(b, b.u0, b.u1, ya, b.u0, b.u1, yb); continue; }
      const wa = halfWidth(Math.max(ya, s.ySill + 1e-5), s), wb = halfWidth(Math.min(yb, s.yApex - 1e-5), s);
      strip(b, b.u0, Math.max(b.u0, -wa), ya, b.u0, Math.max(b.u0, -wb), yb);
      strip(b, Math.min(b.u1, wa), b.u1, ya, Math.min(b.u1, wb), b.u1, yb);
    }
    groups.push({ start, count: pos.length / 3 - start, materialIndex: b.mat });
    const ua = (b.u0 - b.axis) / SIZE + 0.5, ub = (b.u1 - b.axis) / SIZE + 0.5;
    edges[b.mat] = new Vector2(Math.min(ua, ub), Math.max(ua, ub));
  };
  const x0 = r.x - r.w / 2, x1 = r.x + r.w / 2, z0 = r.z - r.d / 2, z1 = r.z + r.d / 2;
  const cap = (y, ny, mat) => { // a top or a bottom: whole, or the four corner piers outside the opening's cross
    const start = pos.length / 3, h = ny > 0 ? c : a, n = new Vector3(0, ny, 0);
    const rect = (xa, za, xb, zb) => {
      if (xb - xa < 1e-4 || zb - za < 1e-4) return;
      const P = ny > 0 ? [[xa, zb], [xb, zb], [xb, za], [xa, zb], [xb, za], [xa, za]] : [[xa, za], [xb, za], [xb, zb], [xa, za], [xb, zb], [xa, zb]];
      for (const [x, z] of P) put(new Vector3(x, y, z), n, x / SIZE + 0.5, z / SIZE + 0.5);
    };
    if (h <= s.ySill + 1e-3 || h >= s.yApex - 1e-3) rect(x0, z0, x1, z1);
    else {
      const w = Math.max(halfWidth(h, s), s.hw * 1.26), lx = Math.min(x1, o.cx - w), rx = Math.max(x0, o.cx + w);
      const lz = Math.min(z1, o.cz - w), rz = Math.max(z0, o.cz + w);
      rect(x0, z0, lx, lz); rect(rx, z0, x1, lz); rect(x0, rz, lx, z1); rect(rx, rz, x1, z1);
    }
    groups.push({ start, count: pos.length / 3 - start, materialIndex: mat });
  };
  side(bs[0]); side(bs[1]); cap(y0 + FLOOR, 1, 2); cap(y0, -1, 3); side(bs[2]); side(bs[3]);
  for (let i = 0; i < pos.length; i += 3) { // world to the slab's unit box
    pos[i] = (pos[i] - r.x) / r.w;
    pos[i + 1] = (pos[i + 1] - y0 - FLOOR / 2) / FLOOR;
    pos[i + 2] = (pos[i + 2] - r.z) / r.d;
  }
  const g = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(pos, 3))
    .setAttribute('normal', new Float32BufferAttribute(nor, 3)).setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.groups = groups;
  return { g, edges };
}

// floor i's slice of the opening in each wall: the sill, the band, jambs and soffit, A's mullion and tracery (lit), and
// the niche (dark): a back, two cheeks, the wall's inside round the opening, a floor at the sill and a ceiling at the apex
function openingSlice(r, y0, o) {
  const lit = tris(), dark = tris(), { s } = o, a = y0 - o.y0, c = a + FLOOR, { tWall, roomD, cW } = sizes(s, r);
  const proud = SIZE * 0.012, band = s.band ?? Math.max(0.036, s.hw * 0.18), zP = -tWall * 0.3; // zP: a window's tympanum
  // the band's outer edge concentric with the arch, as deep at the crown as on the jambs: it goes on over the apex
  const hood = inset(s, -band), lo = Math.max(a, s.ySill), hi = Math.min(c, hood.yApex);
  const ys = hi > lo + 1e-4 ? cuts({ ...hood, lights: [s, ...(s.lights ?? [])] }, lo, hi) : [];
  const shade = (y, deep, k) => { // darker up into the vault and deeper in, a little warm light off the sill
    const up = clamp01((y - s.ySill) / Math.max(0.1, s.yApex - s.ySill)), bounce = (1 - deep * 0.75) * Math.max(0, 1 - up * 2.5);
    return k.clone().lerp(DEEP, up * 0.58 + deep * 0.25).lerp(DARK_SILL, bounce * 0.55);
  };
  for (const b of walls(r, o.cx, o.cz, o.y0)) {
    const P = (u, y, n) => at(b, u, y, n), span = (b.u1 - b.u0) * 0.46;
    const sillH = s.sillH ?? Math.min(0.055, s.hw * 0.24), sy0 = Math.max(a, s.ySill - sillH), sy1 = Math.min(c, s.ySill);
    if (sy1 > sy0 + 1e-4) { // the sill, proud of the wall, its top sloping in to the jambs' foot
      const sw = Math.min(s.hw + band * 1.12, span), sp = SIZE * 0.024;
      lit.quad(P(-sw, sy0, sp), P(sw, sy0, sp), P(sw, sy1, sp * 0.75), P(-sw, sy1, sp * 0.75), SILL);
      if (Math.abs(sy1 - s.ySill) < 1e-3) lit.quad(P(-sw, sy1, sp * 0.75), P(sw, sy1, sp * 0.75), P(sw, sy1 + 0.008, -tWall), P(-sw, sy1 + 0.008, -tWall), SILL, SILL, JAMB, JAMB);
      if (Math.abs(sy0 - (s.ySill - sillH)) < 1e-3) lit.quad(P(-sw, sy0, 0), P(sw, sy0, 0), P(sw, sy0, sp), P(-sw, sy0, sp), STEP);
      lit.quad(P(-sw, sy0, 0), P(-sw, sy0, sp), P(-sw, sy1, sp * 0.75), P(-sw, sy1, 0), ARCH);
      lit.quad(P(sw, sy0, sp), P(sw, sy0, 0), P(sw, sy1, 0), P(sw, sy1, sp * 0.75), ARCH);
    }
    for (let k = 0; k < ys.length - 1; k++) {
      const ya = ys[k], yb = ys[k + 1], wa = halfWidth(ya, s), wb = halfWidth(yb, s);
      const oa = Math.min(span, halfWidth(ya, hood)), ob = Math.min(span, halfWidth(yb, hood));
      lit.quad(P(-oa, ya, proud), P(-wa, ya, proud), P(-wb, yb, proud), P(-ob, yb, proud), ARCH); // the band and its edge
      lit.quad(P(wa, ya, proud), P(oa, ya, proud), P(ob, yb, proud), P(wb, yb, proud), ARCH);
      lit.quad(P(-oa, ya, 0), P(-oa, ya, proud), P(-ob, yb, proud), P(-ob, yb, 0), STEP);
      lit.quad(P(oa, ya, proud), P(oa, ya, 0), P(ob, yb, 0), P(ob, yb, proud), STEP);
      if (ya >= s.yApex - 1e-5) continue; // over the apex only the band's crown
      // each opening's jambs and soffit, from the band (or a window's tympanum, set back) to the wall's back; e: the
      // edges at ya and yb, outline and holes, the stone between them in pairs: (e0, e1) solid, (e1, e2) open...
      const ea = [-wa, ...holes(s, ya).flat(), wa], eb = [-wb, ...holes(s, yb).flat(), wb], last = ea.length - 1;
      const zIn = (e, j, side) => (Math.abs(e[j + side] - e[j]) > 1e-5 ? zP : proud); // proud where the hole meets the band
      for (let j = 1; j < last; j += 2) {
        const [la, lb, ra, rb] = [ea[j], eb[j], ea[j + 1], eb[j + 1]];
        if (ra - la < 1e-6 && rb - lb < 1e-6) continue; // a light closed under its apex
        lit.quad(P(la, ya, zIn(ea, j, -1)), P(la, ya, -tWall), P(lb, yb, -tWall), P(lb, yb, zIn(eb, j, -1)), ARCH, JAMB, JAMB, ARCH);
        lit.quad(P(ra, ya, -tWall), P(ra, ya, zIn(ea, j + 1, 1)), P(rb, yb, zIn(eb, j + 1, 1)), P(rb, yb, -tWall), JAMB, ARCH, ARCH, JAMB);
      }
      if (s.lights) { // the band's reveal in to the tympanum, and the tympanum and mullion between the lights
        lit.quad(P(-wa, ya, zIn(ea, 0, 1)), P(-wa, ya, proud), P(-wb, yb, proud), P(-wb, yb, zIn(eb, 0, 1)), STEP);
        lit.quad(P(wa, ya, proud), P(wa, ya, zIn(ea, last, -1)), P(wb, yb, zIn(eb, last, -1)), P(wb, yb, proud), STEP);
        const ka = ya < s.lights[0].ySpring ? SILL : TYMPANUM, kb = yb <= s.lights[0].ySpring ? SILL : TYMPANUM;
        for (let j = 0; j < last; j += 2) lit.quad(P(ea[j], ya, zP), P(ea[j + 1], ya, zP), P(eb[j + 1], yb, zP), P(eb[j], yb, zP), ka, ka, kb, kb);
      }
      const bA = shade(ya, 1, BACK), bB = shade(yb, 1, BACK), lA = shade(ya, 0.2, SHADE_CHEEK), lB = shade(yb, 0.2, SHADE_CHEEK);
      const rA = shade(ya, 0.2, LIT_CHEEK), rB = shade(yb, 0.2, LIT_CHEEK), t = -tWall + 0.004;
      dark.quad(P(-cW, ya, -roomD), P(cW, ya, -roomD), P(cW, yb, -roomD), P(-cW, yb, -roomD), bA, bA, bB, bB);
      dark.quad(P(-cW, ya, t), P(-cW, ya, -roomD), P(-cW, yb, -roomD), P(-cW, yb, t), lA, bA, bB, lB);
      dark.quad(P(cW, ya, -roomD), P(cW, ya, t), P(cW, yb, t), P(cW, yb, -roomD), bA, rA, rB, bB);
      const da = in98(ea, cW), db = in98(eb, cW); // the wall's inside, round each opening
      for (let j = 0; j < last; j += 2) {
        const [kA, kB] = j === 0 ? [lA, lB] : j === last - 1 ? [rA, rB] : [bA, bB];
        dark.quad(P(da[j], ya, -tWall), P(da[j + 1], ya, -tWall), P(db[j + 1], yb, -tWall), P(db[j], yb, -tWall), kA, kA, kB, kB);
      }
      if (Math.abs(ya - s.ySill) < 1e-3) dark.quad(P(-cW, ya, -roomD), P(-cW, ya, -tWall), P(cW, ya, -tWall), P(cW, ya, -roomD), bA, DARK_SILL, DARK_SILL, bA);
      if (Math.abs(yb - s.yApex) < 1e-3) dark.quad(P(-cW, yb, -tWall), P(-cW, yb, -roomD), P(cW, yb, -roomD), P(cW, yb, -tWall), DEEP);
    }
    if (s.mullion && ys.length) tracery(lit, P, s, a, c, tWall);
  }
  return { lit: lit.geo(), dark: dark.geo() };
}
// edges e (outline, holes) seen from inside: the niche's half width cW for the outline, each hole 2% narrower
const in98 = (e, cW) => e.map((u, j) => (j === 0 ? -cW : j === e.length - 1 ? cW : j % 2 ? u + 0.01 * (e[j + 1] - u) : u - 0.01 * (u - e[j - 1])));
// A's mullion up to the springing, its two sub-arches and the trefoil over them, each cut to this floor's heights a..c
function tracery(lit, P, s, a, c, tWall) {
  const mw = s.hw * 0.082, zA = 0.004, depth = tWall * 0.62, m0 = Math.max(a, s.ySill), m1 = Math.min(c, s.ySpring + s.hw * 0.05);
  if (m1 > m0 + 1e-4) {
    const zB = zA - depth;
    lit.quad(P(-mw, m0, zA), P(mw, m0, zA), P(mw, m1, zA), P(-mw, m1, zA), SILL);
    lit.quad(P(-mw, m0, zB), P(-mw, m0, zA), P(-mw, m1, zA), P(-mw, m1, zB), STEP, ARCH, ARCH, STEP);
    lit.quad(P(mw, m0, zA), P(mw, m0, zB), P(mw, m1, zB), P(mw, m1, zA), ARCH, STEP, STEP, ARCH);
  }
  if (c <= s.ySpring + 0.01) return;
  const zB = zA - depth * 0.85, th = mw * 0.63;
  const bar = (uc, yc, rad, a0, a1, n) => { // a stone bar along an arc, its face and both edges
    for (let k = 0; k < n; k++) {
      const t0 = a0 + (a1 - a0) * k / n, t1 = a0 + (a1 - a0) * (k + 1) / n;
      const pt = (t, d) => [uc + Math.cos(t) * (rad + d), yc + Math.sin(t) * (rad + d)];
      const [i0, o0, i1, o1] = [pt(t0, -th), pt(t0, th), pt(t1, -th), pt(t1, th)], ym = (i0[1] + i1[1]) / 2;
      if (ym < a || ym > c || Math.abs(o0[0]) > halfWidth(ym, s) + 0.02) continue;
      lit.quad(P(i0[0], i0[1], zA), P(o0[0], o0[1], zA), P(o1[0], o1[1], zA), P(i1[0], i1[1], zA), ARCH);
      lit.quad(P(i1[0], i1[1], zB), P(i1[0], i1[1], zA), P(i0[0], i0[1], zA), P(i0[0], i0[1], zB), JAMB);
      lit.quad(P(o0[0], o0[1], zB), P(o0[0], o0[1], zA), P(o1[0], o1[1], zA), P(o1[0], o1[1], zB), STEP);
    }
  };
  const subR = s.hw * 0.46, subX = s.hw * 0.48, ty = s.ySpring + (s.yApex - s.ySpring) * 0.52, lr = s.hw * 0.215;
  bar(-subX, s.ySpring, subR, 0, Math.PI * 0.92, 8);
  bar(subX, s.ySpring, subR, Math.PI * 0.08, Math.PI, 8);
  bar(0, ty + lr * 0.8, lr, -Math.PI * 0.2, Math.PI * 1.2, 10);
  bar(-lr * 0.84, ty - lr * 0.22, lr * 0.92, Math.PI * 0.38, Math.PI * 1.82, 10);
  bar(lr * 0.84, ty - lr * 0.22, lr * 0.92, -Math.PI * 0.82, Math.PI * 0.62, 10);
}
// the four bells, one hung in each wall's niche, whole: they go in with the motif's first floor
function chamberBells(r, o) {
  const { s } = o, { bellZ, yHang, beam } = sizes(s, r), one = chamberBell(s.D, beam);
  const all = walls(r, o.cx, o.cz, o.y0).map(b => {
    const p = at(b, 0, yHang, -bellZ);
    return one.clone().applyMatrix4(new Matrix4().set(b.T.x, 0, b.N.x, p.x, 0, 1, 0, p.y, b.T.z, 0, b.N.z, p.z, 0, 0, 0, 1));
  });
  one.dispose();
  return all;
}

export function createOpenings(scene) {
  const litMat = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide, emissive: '#ffffff', emissiveIntensity: 0 });
  const lit = pool(scene, litMat), from = { value: 0 };
  // only the motif settling now flashes, from its first vertex on (the pools are drawn unindexed): not the windows and
  // the chamber settled before it
  litMat.onBeforeCompile = sh => {
    sh.uniforms.uFlashFrom = from;
    sh.vertexShader = 'uniform float uFlashFrom;\nvarying float vFlash;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvFlash = step(uFlashFrom, float(gl_VertexID));');
    sh.fragmentShader = 'varying float vFlash;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vFlash;');
  };
  const dark = pool(scene, new MeshBasicMaterial({ vertexColors: true })), hands = createClockHands(scene);
  return {
    // slab m (cut to its plan) wears course `key`, a motif centred on (cx, cz), its glacis `batter`: its geometry is set
    // and its faces returned (the flash of scene.js's turn fades on them)
    dress(m, key, cx, cz, batter) {
      const i = Math.round((m.position.y - FLOOR / 2) / FLOOR), y0 = i * FLOOR, odd = i % 2 === 1;
      const r = { x: m.position.x, z: m.position.z, w: m.scale.x, d: m.scale.z }, ch = chamberOf(key, i);
      const o = ch && { ...ch, y0: ch.lo * FLOOR, cx, cz };
      const clock = clockOf(key, i), course = !batter && COURSES[key]; // a string course on a glacis stays painted
      const { g, edges } = o ? piercedGeo(r, y0, o) : stoneGeo(m, FLOOR, cx, cz, batter);
      m.geometry = g;
      // a piece in relief stands on plain ashlar: the big one at the foot, the shaft's over it
      const plain = `A/${o?.s.door || key === 'A/imposta' ? 'base' : 'fust'}-${odd ? 'senar' : 'parell'}`;
      const mats = courseMats(o || clock || course ? plain : key, edges, odd);
      if (key !== 'ferro') copeSlab(mats, r, batter, y0); // its top and glacis in coping stones
      if ((o ?? clock ?? (COURSES[key] && { lo: i }))?.lo === i) from.value = lit.count; // the motif's first floor
      if (o) {
        const slice = o.s.door ? { lit: portalSlice(r, y0, o) } : openingSlice(r, y0, o);
        lit.add(slice.lit);
        if (slice.dark) dark.add(slice.dark);
        if (i === o.lo && o.s.D) chamberBells(r, o).forEach(lit.add);
      }
      if (clock) {
        lit.add(clockSlice(r, y0, clock, cx, cz));
        if (i === clock.lo + clock.n - 1) hands.show(clockFaces(r, clock, cx, cz)); // the hands with the last floor
      }
      if (course) lit.add(course(r, y0, cx, cz));
      return mats;
    },
    // what flashes with a floor wearing `key` besides its own faces: its opening's frames (and bells), the whole motif so
    // far: a chamber's or a window's floors flash it together, which is what it settling reads as
    flashing: key => (clockOf(key, 0) ? [litMat, hands.mat] : chamberOf(key, 0) || COURSES[key] ? [litMat] : []),
    // a wide terrace's balustrade (coping.js terraceRail), built as the floor over it settles wearing `key`: it flashes
    // with that floor's turn → what flashes
    terrace(g, key) {
      if (!this.flashing(key).length) from.value = lit.count;
      lit.add(g);
      return [litMat];
    },
    tick: hands.tick, // the clock's hands, when the minute turns
    reset() { lit.reset(); dark.reset(); hands.reset(); litMat.emissiveIntensity = 0; from.value = 0; },
  };
}
