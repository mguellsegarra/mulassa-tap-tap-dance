// The campanar's stone: its textures (Codex's, textures/A, C and XS, loaded once each; the needle's tiles and iron drawn
// here), the stone material (Codex's beige grey mapped onto the Plaça del Blat's warm palette, quoins at each face's real
// edges), and the world-aligned UVs that line the courses up floor to floor. facade.js says which slab wears which.
import { BoxGeometry, Mesh, MeshLambertMaterial, Color, Vector2, TextureLoader, RepeatWrapping, SRGBColorSpace, CanvasTexture,
  DoubleSide } from 'three';
import { SIZE, FLOOR } from './rules.js';
import { copeSlab } from './coping.js';

export const box = new BoxGeometry(1, 1, 1);
const loader = new TextureLoader(), textures = new Map();
export function tex(key) {
  if (!textures.has(key)) {
    const t = NEEDLE[key] ? new CanvasTexture(NEEDLE[key]()) : loader.load(`/jocs/campanar/textures/${key}.png`);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    textures.set(key, t);
  }
  return textures.get(key);
}
// the needle's courses, drawn here: one tile is a full side wide and a floor high (512 × 128)
const NEEDLE = {
  escates() { // two rows of fish-scale tiles, a scale every fifth of a metre
    const c = Object.assign(document.createElement('canvas'), { width: 512, height: 128 }), g = c.getContext('2d');
    g.fillStyle = '#a9997a';
    g.fillRect(0, 0, 512, 128);
    for (let row = 0; row < 3; row++) for (let col = -1; col < 13; col++) {
      g.fillStyle = row % 2 ? '#efe5cf' : '#ddd0b2';
      g.beginPath();
      g.arc(col * 42.7 + (row % 2) * 21.3 + 21.3, row * 64 - 4, 20, 0, Math.PI);
      g.fill();
    }
    return c;
  },
  ferro() { // iron lattice: rails at top and bottom, posts, a pointed arch between each two; the rest see-through
    const c = Object.assign(document.createElement('canvas'), { width: 512, height: 128 }), g = c.getContext('2d');
    g.strokeStyle = '#3b3d48';
    g.lineWidth = 9;
    g.strokeRect(-10, 5, 532, 118);
    for (let k = 0; k < 8; k++) {
      const x = k * 64;
      g.beginPath();
      g.moveTo(x, 0); g.lineTo(x, 128);
      g.moveTo(x, 110); g.quadraticCurveTo(x + 2, 40, x + 32, 26); g.quadraticCurveTo(x + 62, 40, x + 64, 110);
      g.stroke();
    }
    return c;
  },
};
// the corner quoins: painted at each face's real edges (a cut slab keeps them), from a strip one slab high whose left is
// the corner; alternate floors swap the long and the short block, and the two faces of a corner disagree, as stone does
const QUOIN = SIZE * 0.16;
export const quoinOf = w => Math.min(QUOIN, w * 0.12); // a quoin's width on a face w wide, as the shader paints it
// Codex's stone is beige grey: its shades are mapped onto the Plaça del Blat's warm stone (by lightness: a warm brown for
// openings and joints, sandstone, butter for the lit faces), a little of the original colour kept for bells and hands
const PALETTE = ['#7a4f2e', '#e2b77c', '#fbe7b5'].map(c => new Color(c));
function stoneMat(map, edge, quoin) {
  const mat = new MeshLambertMaterial({ map, emissive: '#ffffff', emissiveIntensity: 0 });
  mat.customProgramCacheKey = () => (edge ? 'campanar-stone-quoin' : 'campanar-stone');
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uDark: { value: PALETTE[0] }, uMid: { value: PALETTE[1] }, uLight: { value: PALETTE[2] } });
    let head = 'uniform vec3 uDark, uMid, uLight;\n', quoins = '';
    if (edge) {
      Object.assign(sh.uniforms, { uEdge: { value: edge }, uQuoin: { value: quoin } });
      head += 'uniform vec2 uEdge;\nuniform sampler2D uQuoin;\n';
      // v unwrapped (the texture repeats): a fract() here broke the derivatives at each floor's edge, a dotted seam;
      // the strip's last fifth, a dark joint, is left out: it read as a line down the corner
      quoins = `
      float du = min( vMapUv.x - uEdge.x, uEdge.y - vMapUv.x ) * ${SIZE.toFixed(4)};
      if ( du < min(${QUOIN.toFixed(4)}, (uEdge.y - uEdge.x) * ${(SIZE * 0.12).toFixed(4)}) ) sampledDiffuseColor = texture2D( uQuoin, vec2( du / ${QUOIN.toFixed(4)} * 0.8, vMapUv.y ) );`;
    }
    sh.fragmentShader = head + sh.fragmentShader.replace('#include <map_fragment>', `
      vec4 sampledDiffuseColor = texture2D( map, vMapUv );${quoins}
      float l = pow( dot( sampledDiffuseColor.rgb, vec3( 0.299, 0.587, 0.114 ) ), 1.0 / 2.2 );
      vec3 warm = l < 0.5 ? mix( uDark, uMid, l / 0.5 ) : mix( uMid, uLight, clamp( ( l - 0.5 ) / 0.35, 0.0, 1.0 ) );
      diffuseColor.rgb *= mix( warm, sampledDiffuseColor.rgb, 0.15 );`);
  };
  return mat;
}
// a top's texture until coping.js draws its coping stones (scene.js turn): the big ashlar, for the foot's first frame
const TOP = 'A/base-parell';
// fish-scale roof tiles for the crown's pyramid: light stone-coloured rows, as on the real campanar
export function scales() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#c9bb9c';
  g.fillRect(0, 0, 64, 64);
  for (let row = 0; row < 5; row++) for (let col = -1; col < 5; col++) {
    g.fillStyle = row % 2 ? '#efe5cf' : '#ddd0b2';
    g.beginPath();
    g.arc(col * 16 + (row % 2) * 8 + 8, row * 14, 8, 0, Math.PI);
    g.fill();
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(4, 2);
  t.colorSpace = SRGBColorSpace;
  return t;
}
// stone UVs from world position: one texture width per first slab's side, one course per floor (v counts floors from
// the ground), so the courses line up floor to floor and a cut slab keeps its part of the pattern. → the geometry and
// each side face's u range (for its quoins)
export function stoneGeo(m, h, batter) {
  const g = box.clone(), pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    if (batter && pos.getY(i) > 0) {
      pos.setX(i, (batter.x - m.position.x + pos.getX(i) * batter.w) / m.scale.x);
      pos.setZ(i, (batter.z - m.position.z + pos.getZ(i) * batter.d) / m.scale.z);
    }
    const wx = m.position.x + pos.getX(i) * m.scale.x, wz = m.position.z + pos.getZ(i) * m.scale.z;
    const wy = m.position.y + pos.getY(i) * h;
    if (nor.getY(i)) uv.setXY(i, wx / SIZE + 0.5, wz / SIZE + 0.5);
    else uv.setXY(i, (nor.getX(i) ? -nor.getX(i) * wz : nor.getZ(i) * wx) / SIZE + 0.5, wy / FLOOR);
  }
  if (batter) g.computeVertexNormals();
  const edges = [0, 1, 2, 3, 4, 5].map(f => {
    const us = [0, 1, 2, 3].map(k => uv.getX(f * 4 + k));
    return new Vector2(Math.min(...us), Math.max(...us));
  });
  return { g, edges };
}
// a face set: four sides on `key` with quoins at their edges, the top on the paving; floor parity picks the quoins
export function stoneMats(key, edges, odd) {
  const q = f => tex(`A/cantonera-${(f < 2) === odd ? 'senar' : 'parell'}`);
  const side = f => stoneMat(tex(key), edges[f], q(f)), top = stoneMat(tex(TOP));
  return [side(0), side(1), top, top, side(4), side(5)];
}
// a slab's faces for its course: the iron lattice see-through on every face, the tiles without quoins, or stone
export function courseMats(key, edges, odd) {
  if (key === 'ferro') return Array(6).fill(new MeshLambertMaterial({ map: tex('ferro'), alphaTest: 0.5, side: DoubleSide, emissive: '#ffffff', emissiveIntensity: 0 }));
  if (key === 'escates') { const t = stoneMat(tex('escates')), top = stoneMat(tex(TOP)); return [t, t, top, top, t, t]; }
  return stoneMats(key, edges, odd);
}
// the campanar's foot: the big ashlar from the first frame down out of sight, its top in coping stones
export function campanarFoot() {
  const base = new Mesh(box);
  base.scale.set(SIZE, 200, SIZE);
  base.position.y = -100;
  const foot = stoneGeo(base, 200);
  base.geometry = foot.g;
  base.material = copeSlab(stoneMats('A/base-parell', foot.edges, false), { x: 0, z: 0, w: SIZE, d: SIZE }, null, 0);
  return base;
}
