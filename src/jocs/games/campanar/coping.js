// The campanar's horizontal and sloping stone, drawn in the shader rather than by a texture (Fable's study, «R»): the
// tops of the floors, the glacis between bodies and the weatherings are coping stones laid in rings from the outer edge
// (a light rim, rings a third of a side deep, joints a floor apart and half a stone over each ring, mitred at the
// corners), with a contact shadow at the foot of the wall above. All in world space, so the joints of a top, a glacis
// and a weathering agree and a cut slab keeps its part. A string course rings each setback, the weathering is one mitred
// hip roof, the spire's octagon wears fish scales with a rib on each arris, the pinnacles have a capping and a finial.
// Every material here keeps emissive white at 0, for the white flash a floor turning to stone gets (scene.js turn).
import { Mesh, MeshLambertMaterial, Color, Group, BufferGeometry, Float32BufferAttribute, CylinderGeometry,
  OctahedronGeometry, Vector4, DoubleSide } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SIZE, FLOOR } from './rules.js';

const PAL = ['#7a4f2e', '#e2b77c', '#fbe7b5'].map(c => new Color(c)); // stone.js's warm palette
const palU = () => ({ uDark: { value: PAL[0] }, uMid: { value: PAL[1] }, uLight: { value: PAL[2] } });
const tone = t => PAL[1].clone().lerp(PAL[2], t); // a stone tone between the palette's sandstone (0) and butter (1)
const EPS = SIZE * 0.01; // a ledge narrower than this is flush
const flatGeo = g => { const n = g.index ? g.toNonIndexed() : g; n.computeVertexNormals(); return n; };
const planV4 = r => new Vector4(r.x, r.z, r.w / 2, r.d / 2);
const extent = r => ({ x0: r.x - r.w / 2, x1: r.x + r.w / 2, z0: r.z - r.d / 2, z1: r.z + r.d / 2 });
// a plan's corners, counter-clockwise seen from above; side i runs from corner i to i + 1: +x, -z, -x, +z
const planCorners = r => { const e = extent(r); return [[e.x1, e.z1], [e.x1, e.z0], [e.x0, e.z0], [e.x0, e.z1]]; };
const ledgesOf = (lo, up) => { const a = extent(lo), b = extent(up); return [a.x1 - b.x1, b.z0 - a.z0, b.x0 - a.x0, a.z1 - b.z1]; };
const SIDE_FACE = [0, 5, 1, 4]; // a box's side faces (material index)

// triangles pushed one by one (positions, colours), flat normals at the end
function triangles() {
  const pos = [], col = [];
  const tri = (pts, c) => { for (const p of pts) { pos.push(p[0], p[1], p[2]); if (c) col.push(c.r, c.g, c.b); } };
  return {
    tri, quad: (a, b, c, d, k) => { tri([a, b, c], k); tri([a, c, d], k); },
    geo() {
      const g = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(pos, 3));
      if (col.length) g.setAttribute('color', new Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    },
  };
}

const COPING = `
  {
    vec2 p = vW.xz, e = uOuter.zw - abs( p - uOuter.xy ), q = abs( p - uInner.xy ) - uInner.zw;
    float dIn = uInner.z > 0.0 ? length( max( q, 0.0 ) ) : 9.0;
    bool slope = abs( vN0.x ) + abs( vN0.z ) > 0.001;
    bool onX = slope ? abs( vN0.x ) > abs( vN0.z ) : e.x < e.y; // the edge this stone lies along runs in z
    float dOut = max( onX ? e.x : e.y, 0.0 ), along = onX ? p.y : p.x, up = vW.y - uLay.x, k = uLay.z;
    if ( slope ) { dOut = length( vec2( dOut, up ) ); dIn = uInner.z > 0.0 ? length( vec2( dIn, max( uLay.y - up, 0.0 ) ) ) : 9.0; }
    float px = length( fwidth( vW ) ), rim = 0.085 * k, D = 0.30 * k, S = 0.48 * k;
    float ring = dOut < rim ? -1.0 : floor( ( dOut - rim ) / D );
    float a = along / S + 0.5 * mod( ring, 2.0 );
    float jl = ( 0.5 - abs( fract( a ) - 0.5 ) ) * S;
    float rr = dOut < rim ? rim - dOut : dOut - rim - ring * D;
    float rl = dOut < rim ? rr : min( rr, D - rr );
    float mitre = slope ? 9.0 : abs( e.x - e.y ) * 0.7071;
    float lw = 0.005 * k;
    float line = ( 1.0 - smoothstep( lw, lw + px, min( min( jl, rl ), mitre ) ) ) * clamp( 2.5 * lw / px, 0.0, 1.0 );
    float h = fract( sin( dot( vec2( ring, floor( a ) ) + ( onX ? 17.0 : 0.0 ), vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
    vec3 col = mix( uMid, uLight, ring < 0.0 ? 0.96 : 0.45 + 0.25 * h );
    col = mix( col, mix( uDark, uMid, 0.62 ), line * 0.8 );
    col *= mix( vec3( 0.70, 0.61, 0.56 ), vec3( 1.0 ), smoothstep( 0.0, 0.22 * k, dIn ) );
    col = mix( col, vec3( dot( col, vec3( 0.299, 0.587, 0.114 ) ) ) * vec3( 1.0, 0.96, 0.88 ), 0.18 ); // as the walls keep some grey
    diffuseColor.rgb *= col;
  }`;
// coping stones on a ledge: outer, inner the ledge's two plans (inner null: none yet, the floor above sets it later,
// setCopingInner), y0 the foot's height, rise the slope's, scale the stones'
export function copingMat(outer, inner, y0 = 0, rise = FLOOR, scale = 1) {
  const mat = new MeshLambertMaterial({ side: DoubleSide, emissive: '#ffffff', emissiveIntensity: 0 });
  const u = mat.userData.coping = { ...palU(), uOuter: { value: planV4(outer) }, uInner: { value: inner ? planV4(inner) : new Vector4() }, uLay: { value: new Vector4(y0, rise, scale, 0) } };
  mat.customProgramCacheKey = () => 'campanar-coping';
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vW, vN0;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz; vN0 = normal;');
    sh.fragmentShader = 'uniform vec3 uDark, uMid, uLight;\nuniform vec4 uOuter, uInner, uLay;\nvarying vec3 vW, vN0;\n' + sh.fragmentShader.replace('#include <map_fragment>', COPING);
  };
  return mat;
}
// a floor's faces (stone.js courseMats): its top in coping stones; with a glacis, the sides that slope too
export function copeSlab(mats, r, batter, y0) {
  // the top only: the coping is double-sided, and a bottom in it showed from above through an opening, on the very
  // plane of the floor under it's top, and blinked
  mats[2] = copingMat(r, null, y0);
  if (batter) {
    const glacis = copingMat(r, batter, y0, FLOOR);
    if (ledgesOf(r, batter)[0] >= EPS) for (const f of SIDE_FACE) mats[f] = glacis; // the same ledge all round
  }
  return mats;
}
// the floor above has settled on plan `upper`: its wall's contact shadow on this floor's top
export const setCopingInner = (slab, upper) => [slab.material].flat()[2]?.userData.coping?.uInner.value.copy(planV4(upper));

// an upright box's four walls and top, no bottom
function boxAt(s, e, y0, y1, c, cTop = c, sides = [1, 1, 1, 1]) {
  const P = [[e.x1, e.z1], [e.x1, e.z0], [e.x0, e.z0], [e.x0, e.z1]];
  for (let i = 0; i < 4; i++) if (sides[i]) { const a = P[i], b = P[(i + 1) % 4]; s.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], c); }
  s.quad([e.x1, y1, e.z1], [e.x1, y1, e.z0], [e.x0, y1, e.z0], [e.x0, y1, e.z1], cTop);
}
// the string course: a band round the lower body's top, a little proud of the wall, its top level with the slope's foot
function stringCourse(lower, y) {
  const s = triangles(), e = extent(lower), by = SIZE * 0.022;
  boxAt(s, { x0: e.x0 - by, x1: e.x1 + by, z0: e.z0 - by, z1: e.z1 + by }, y - FLOOR * 0.16, y);
  return s.geo();
}
// the weathering over a setback, the same ledge all round (concentric squares, rules.js): one mitred hip from the lower
// plan's edge up to the upper wall, the string course round it, both in coping stones. → a mesh or null
export function hipWeathering(lower, upper, y, rise) {
  const led = ledgesOf(lower, upper)[0];
  if (led < EPS) return null;
  const h = Math.min(rise, led * 0.7), L = planCorners(lower), U = planCorners(upper), s = triangles();
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4, p = (c, yy) => [c[0], yy, c[1]];
    s.quad(p(L[i], y), p(L[j], y), p(U[j], y + h), p(U[i], y + h));
  }
  s.quad(...U.map(c => [c[0], y + h, c[1]])); // closed on top: under the floor above, or round the spire's foot
  return new Mesh(mergeGeometries([s.geo(), stringCourse(lower, y)]), copingMat(lower, upper, y, h));
}

// a wide terrace's balustrade (Valls' «balustrada calada»), where a weathering would only lie flat: on each side a plinth
// proud of the wall, square balusters and a handrail along the outer edge, and on its corners a small pier with a
// pyramid cap; flat stone tones, for openings.js's lit pool (no draw call more). → its geometry, or null on a terrace
// less than TERRACE deep (hipWeathering then). The ledge is the same all round (concentric squares, rules.js)
export const TERRACE = SIZE * 0.15;
export function terraceRail(lower, upper, y) {
  if (ledgesOf(lower, upper)[0] < TERRACE) return null;
  const s = triangles(), e = extent(lower), t = SIZE * 0.022, pw = t * 1.8, h = FLOOR * 0.5, by = SIZE * 0.012, foot = y + FLOOR * 0.08;
  const sideBox = (i, inn, out, a0, a1, y0, y1, c, cTop) => { // a box on side i, from `inn` in from its edge to `out` beyond it
    const edge = [e.x1, e.z0, e.x0, e.z1][i], dir = [1, -1, -1, 1][i], [p, q] = [edge - dir * inn, edge + dir * out].sort((m, n) => m - n);
    boxAt(s, i % 2 ? { x0: a0, x1: a1, z0: p, z1: q } : { x0: p, x1: q, z0: a0, z1: a1 }, y0, y1, c, cTop);
  };
  for (let i = 0; i < 4; i++) {
    const [a0, a1] = i % 2 ? [e.x0, e.x1] : [e.z0, e.z1], n = Math.max(1, Math.round((a1 - a0 - 2 * pw) / (t * 2.2)));
    sideBox(i, t * 1.3, by, a0 - by, a1 + by, y, foot, P_BAND, P_TOP);
    for (let k = 0; k < n; k++) {
      const u = a0 + pw + (k + 0.5) * (a1 - a0 - 2 * pw) / n;
      sideBox(i, t * 0.95, -t * 0.35, u - t * 0.3, u + t * 0.3, foot, y + h - FLOOR * 0.07, P_BODY);
    }
    sideBox(i, t * 1.2, t * 0.1, a0, a1, y + h - FLOOR * 0.07, y + h, P_BAND, P_TOP);
  }
  planCorners(lower).forEach(([x, z]) => {
    const cx = x - Math.sign(x - lower.x) * pw / 2, cz = z - Math.sign(z - lower.z) * pw / 2, top = y + h + FLOOR * 0.1, b = top + FLOOR * 0.05;
    const sq = w => ({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - w / 2, z1: cz + w / 2 }), R = pw * 0.5;
    boxAt(s, sq(pw), y, top, P_BODY, P_TOP);
    boxAt(s, sq(pw * 1.25), top, b, P_BAND);
    const Q = [[R, R], [R, -R], [-R, -R], [-R, R]].map(([u, v]) => [cx + u, b, cz + v]);
    Q.forEach((p, j) => s.tri([p, Q[(j + 1) % 4], [cx, b + pw * 1.8, cz]], P_BODY));
  });
  return s.geo();
}

// the spire's fish scales, drawn from each flat face (object space): a scale keeps its size all the way up, centred on
// its face, a row's round ends over the row below and shading it; upright faces (rings, ribs) stay plain light stone
const SCALES = `
  {
    float steep = length( vN0.xz );
    vec3 col = mix( uMid, uLight, 0.9 );
    if ( vN0.y > 0.02 && steep > 0.05 ) {
      vec2 t = vec2( -vN0.z, vN0.x ) / steep;
      float u = dot( vP.xz, t ) / SW, v = vP.y / RH, row = floor( v ), f = 1.0 - fract( v );
      float fx = fract( u + 0.5 * mod( row, 2.0 ) ) - 0.5, r = length( vec2( fx, f * 0.5 ) );
      bool inside = r < 0.5;
      col = mix( uMid, uLight, mod( inside ? row : row - 1.0, 2.0 ) > 0.5 ? 0.9 : 0.5 );
      col *= inside ? mix( 0.80, 1.0, smoothstep( 0.0, 0.7, f ) ) : 0.78;
      float px = length( fwidth( vP ) ) / SW;
      float line = ( 1.0 - smoothstep( 0.035, 0.035 + px, abs( r - 0.5 ) ) ) * clamp( 0.12 / px, 0.0, 1.0 );
      col = mix( col, mix( uDark, uMid, 0.3 ), line * 0.8 );
    }
    diffuseColor.rgb *= col;
  }`;
export function scaleStoneMat(sw = 0.11, rh = 0.075) {
  const mat = new MeshLambertMaterial({ side: DoubleSide }), u = palU();
  mat.customProgramCacheKey = () => 'campanar-scales';
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vP, vN0;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = transformed; vN0 = normal;');
    const head = `uniform vec3 uDark, uMid, uLight;\nvarying vec3 vP, vN0;\n#define SW ${sw.toFixed(4)}\n#define RH ${rh.toFixed(4)}\n`;
    sh.fragmentShader = head + sh.fragmentShader.replace('#include <map_fragment>', SCALES);
  };
  return mat;
}
// the spire's stone (g0: its octagon and rings) with flat faces and a rib up each arris. r0: the foot's radius, H the
// spire's height, cage where the iron begins
export function ribbedSpire(g0, r0, H, cage) {
  const radius = t => r0 * (1 - t / H), parts = [flatGeo(g0)];
  for (let k = 0; k < 8; k++) {
    const a = (k + 0.5) * Math.PI / 4, w = r0 * 0.09, s = triangles(), da = w / r0;
    const at = (t, d) => [Math.cos(a + d) * radius(t) * 0.97, t, Math.sin(a + d) * radius(t) * 0.97], out = t => [Math.cos(a) * (radius(t) + w), t, Math.sin(a) * (radius(t) + w)];
    s.tri([at(0, da), out(0), out(cage)]); s.tri([at(0, da), out(cage), at(cage, da * 2)]);
    s.tri([out(0), at(0, -da), at(cage, -da * 2)]); s.tri([out(0), at(cage, -da * 2), out(cage)]);
    const g = s.geo(), n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setY(i, 0); // upright to the scales' shader: a plain light rib
    parts.push(g);
  }
  for (const p of parts) p.deleteAttribute('uv');
  return mergeGeometries(parts);
}

// the bell chamber's pinnacles on the parapet's corners: a shaft, a band, a smaller shaft, a capping, a pyramid and a
// finial, in flat stone tones, all one mesh
const pinnacleStone = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
const P_TOP = tone(0.85), P_BAND = tone(1), P_BODY = tone(0.45);
export function copedPinnacles(r, y) {
  const s = triangles(), p = Math.min(r.w, r.d) * 0.16, parts = [];
  const paint = (g, c) => g.setAttribute('color', new Float32BufferAttribute(Array.from({ length: g.attributes.position.count }, () => [c.r, c.g, c.b]).flat(), 3));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = r.x + sx * (r.w / 2 - p / 2), cz = r.z + sz * (r.d / 2 - p / 2);
    const sq = w => ({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - w / 2, z1: cz + w / 2 });
    boxAt(s, sq(p), y, y + p * 0.8, P_BODY, P_TOP);
    boxAt(s, sq(p * 1.22), y + p * 0.8, y + p * 0.95, P_BAND);
    boxAt(s, sq(p * 0.74), y + p * 0.95, y + p * 1.45, P_BODY, P_TOP);
    boxAt(s, sq(p * 0.92), y + p * 1.45, y + p * 1.57, P_BAND);
    parts.push(paint(flatGeo(new CylinderGeometry(0, p * 0.56, p * 2.1, 4).rotateY(Math.PI / 4)).translate(cx, y + p * 1.57 + p * 1.05, cz), P_BODY),
      paint(flatGeo(new OctahedronGeometry(p * 0.2)).translate(cx, y + p * 3.62, cz), P_BAND));
  }
  const g = new Group();
  if (parts.length) g.add(new Mesh(mergeGeometries([s.geo(), ...parts].map(x => { x.deleteAttribute('uv'); return x; })), pinnacleStone));
  return g;
}
export const isSharedCoping = m => m === pinnacleStone;
