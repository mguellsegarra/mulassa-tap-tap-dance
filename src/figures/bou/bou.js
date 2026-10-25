// Approved p13 silhouette from the Bou study, kept unchanged for its song dance.
import * as THREE from 'three';
import { Vox, MAT } from '../../scene/models/voxel.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildBouRig } from './bou-rig.js';
import { buildBouHead } from './bou-heads.js';
import { makeTailSwing } from './bou-tail.js';
const K = {
  hide: '#6b3d31', top: '#7d4f42',   // a livelier, redder brown
  ochre: '#82503d',   // a touch lighter than the hide, no strong contrast
  head: '#5b5157', muzzle: '#2a2629', lip: '#9a949c',
  horn: '#9c948f', hornTip: '#3a3436', ear: '#5e5860', earIn: '#b8b4bd', rim: '#c2a06a', letter: '#c9b48c',
  skirt: '#4a353b', strip: ['#4c3838', '#5e4743'], inside: '#1e1614', gold: '#d9a521', hole: '#120e0e',
  white: '#f4efe4', black: '#1a1412', red: '#b02a36', pink: '#e58a8a', tuft: '#7d6450',
};

const arc = (cz, cy, r, a0, a1, n = 6) => Array.from({ length: n + 1 }, (_, i) => {
  const a = a0 + (a1 - a0) * i / n; return [cz + r * Math.cos(a), cy + r * Math.sin(a)];
});
const R2 = -1.45, F2 = 1.25, B2 = .9, FE2 = .95, H = Math.PI / 2;
const PROFILE= { name: 'Papada', top: 1.85, head: 1.45, headY: 1.66, headTilt: .2, closed: true, slim: true, blocky: true, barrel: true, mantle: true, brow: 'steps', dewlap: [[1.12, .3, .28, .62], [.96, .22, .22, .52], [.82, .175, .16, .42]],
    profile: t => [[F2, B2], [F2, t - .12], ...arc(F2 - .12, t - .12, .12, 0, H, 3), ...arc(R2 + .38, t - .38, .38, H, 2 * H), [R2, B2]] };
const extrude = (pts, depth, x) => {
  const shape = new THREE.Shape(); shape.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) shape.lineTo(q[0], q[1]);
  // Shape x -> body z, the extrusion across the body.
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 }).rotateY(-H).translate(x, 0, 0);
};
// One carretilla: a kraft tube and its red cap, mouth at +z. Painted by hand, not through Vox: Vox draws a random per box
// (its colour jitter, even at 0), and the tubes must not shift the plaça's random layout built after the Bou.
let BOU_TUBE = null;
function bouTube() {
  const paint = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; } return g.setAttribute('color', new THREE.BufferAttribute(a, 3)); };
  return mergeGeometries([paint(new THREE.BoxGeometry(.05, .05, .18).translate(0, 0, .09), K.letter), paint(new THREE.BoxGeometry(.056, .056, .025).translate(0, 0, .1695), K.red)]);
}
// cap: one of bou-heads.js's heads, «Bonàs» ('a') by default; null keeps the p13 head (and its neck block).
export function buildBou({ cap = 'a' } = {}) {
  const p={horn:[.45,.18,.05],eyes:'round',...PROFILE}, rig=buildBouRig(), W=1.22, top=p.top;
  const solid = new Vox(), v = new Vox();
  // Blocky ("less caravan", like the Mulassa): a core box with stepped edges all round instead of a curved rump.
  const zc = (R2 + F2) / 2, L = F2 - R2, inset = p.blocky ? .07 : 0;
  // Barrel (seen from the front not so square): horizontal bands that step in towards the hem and the back,
  // the ends tucked in by the same amount. Everything on the flanks sits on its band's face.
  // Only a slight tuck at the hem.
  const bands = p.barrel ? [[B2, 1.02, W - .08], [1.02, 1.16, W - .03], [1.16, top - .22, W], [top - .22, top - .12, W - .1],
    [top - .12, top - .05, W - .24], [top - .05, top, W - .42]] : null;
  // Only the bands above the main one tuck their ends in; below it the rump and chest drop straight.
  const tuck = (y0, w) => y0 < 1.16 ? 0 : W - w;
  const wAt = y => bands ? (bands.find(b => y >= b[0] && y < b[1]) ?? bands.at(-1))[2] : W, wb = wAt(B2 + 1e-3);
  // Below the ochre's lowest point (1.28 m) the bands are ochre behind the shoulder, so their stepped edges don't
  // read as dark stripes under the ochre; ahead of it they stay hide.
  const slab = (y0, y1, w, za, zb, tone) => {
    const l = zb - za, c = (za + zb) / 2;
    v.box(0, y0, c, w, y1 - y0, l - .14, tone, 0); v.box(0, y0, c, w - .14, y1 - y0, l, tone, 0);
  };
  if (bands) bands.forEach(([y0, y1, w], i) => {
    const tone = i === bands.length - 1 ? '#76493d' : K.hide, l = L - tuck(y0, w), za = zc - l / 2, zb = zc + l / 2;
    if (!p.mantle) return slab(y0, y1, w, za, zb, tone);
    const cut = Math.min(y1, 1.275);
    if (cut > y0) {   // lower part: ochre to the shoulder edge, hide ahead of it (core and stepped ends split at FE2)
      v.box(0, y0, (za + .07 + FE2) / 2, w, cut - y0, FE2 - za - .07, K.ochre, 0); v.box(0, y0, (za + FE2) / 2, w - .14, cut - y0, FE2 - za, K.ochre, 0);
      v.box(0, y0, (FE2 + zb - .07) / 2, w, cut - y0, zb - .07 - FE2, tone, 0); v.box(0, y0, (FE2 + zb) / 2, w - .14, cut - y0, zb - FE2, tone, 0);
    }
    if (y1 > cut) slab(Math.max(y0, cut), y1, w, za, zb, tone);
  });
  else if (p.blocky) {
    v.box(0, B2, zc, W, top - .14 - B2, L - 2 * inset, K.hide, 0);                 // core
    v.box(0, B2 + .04, zc, W - 2 * inset, top - .18 - B2, L, K.hide, 0);           // stepped ends
    v.box(0, top - .14, zc, W - 2 * inset, .08, L - 2 * inset, K.hide, 0);         // first step of the back
    v.box(0, top - .06, zc, W - 4 * inset, .06, L - 4 * inset, '#76493d', 0);     // top of the back
  } else solid.add(extrude(p.profile(top), W, W / 2), K.hide, 0);
  // The ochre plate on each flank: hem to the S line, a straight front edge, down the rump.
  const RZ = R2 + .02 + inset;
  const S = [[FE2, 1.62], [FE2 - .08, 1.48], [.6, 1.36], [.1, 1.4], [-.5, 1.52], [-1.0, 1.62], [RZ + .18, 1.62], [RZ, 1.5]];
  const curve = new THREE.SplineCurve(S.map(([z, y]) => new THREE.Vector2(z, y))).getPoints(24).map(q => [q.x, q.y]);
  const plate = [[RZ, B2], [FE2, B2], ...curve, [RZ, B2 + .01]];
  // On the barrel the ochre is voxels ("all more voxel", following 154-155 s): 10 cm columns whose tops step
  // along the S, high at the rump, a dip under the lettered saddle, a straight high edge at the front.
  const OCH = [[RZ, 1.36], [RZ + .1, 1.52], [-1.05, 1.6], [-.75, 1.52], [-.45, 1.42], [-.1, 1.34], [.3, 1.3], [.6, 1.3],
    [.78, 1.36], [FE2 - .1, 1.6], [FE2, 1.6]];
  const ochreTop = z => { let i = 0; while (i < OCH.length - 2 && z > OCH[i + 1][0]) i++;
    const [a, p0] = OCH[i], [b, q0] = OCH[i + 1]; return p0 + (q0 - p0) * Math.min(1, Math.max(0, (z - a) / (b - a))); };
  for (const [y0, y1, w] of bands ?? [[0, 9, W]]) {
    if (bands) {
      for (let z = RZ; z < FE2 - 1e-6; z += .1) {
        const zm = Math.min(z + .05, FE2 - .05), t = Math.round(ochreTop(zm) / .08) * .08, lo = Math.max(y0 + .012, B2 + .02), hi = Math.min(y1 - .012, t);   // clear of band edges and the rim by >1 cm: no shimmer at a distance
        if (hi - lo > .005) for (const s of [-1, 1]) v.box(s * (w / 2 + .006), lo, Math.min(z + .05, FE2 - .05), .012, hi - lo, .1, K.ochre, 0);
      }
    } else for (const s of [-1, 1]) solid.add(extrude(plate, .01, s > 0 ? w / 2 + .012 : -w / 2 - .002), K.ochre, 0);
    // The ochre rump, on each band's rear face.
    if (bands && y0 < 1.6) v.box(0, Math.max(y0, B2 + .04) + .003, zc - (L - tuck(y0, w)) / 2 - .004, w - .24, Math.min(y1, 1.6) - Math.max(y0, B2 + .04) - .006, .01, K.ochre, 0);
  }
  if (!bands) v.box(0, B2 + .06, R2 - .004, W - .2, p.blocky ? .62 : .56, .01, K.ochre, 0);
  // Pale rim, tab with its peg, lettered saddle, strips, rump skirt, frames, tail root: as in round 1.
  // The pale rim runs along the flat underside only, up to where the chest starts to round.
  const front = p.blocky ? F2 - inset : Math.max(...p.profile(top).filter(q => q[1] < B2 + 1e-6).map(q => q[0]));
  const lb = bands ? L - tuck(B2, wb) - .14 : front - R2 - inset;
  v.box(0, B2 - .03, bands ? zc : (R2 + inset + front) / 2, wb + .03, .04, lb + .02, K.rim, 0);
  for (const s of [-1, 1]) {
    // Cloth hems; the barrel's hang 12 cm lower so less of the carriers' legs shows.
    const drop = bands ? .12 : 0;
    const tab = p.mantle ? .43 : .58 - drop;
    v.box(s * (wb / 2 - .04), tab, FE2 - .14, .12, B2 - tab, .28, K.ochre, 0).box(s * (wb / 2 - .04), tab - .02, FE2 - .14, .14, .03, .3, K.rim, 0);
    if (!p.barrel) v.box(s * (wb / 2 - .1), .36, FE2 - .14, .04, .2, .04, K.black, 0);   // peg (the owner removed it on p13)
    // The donors' lettering; the blanket version leaves it out (the blanket goes there instead).
    if (!p.mantle) {
      for (let r = 0; r < 6; r++) for (let z = -.75; z < FE2 - .32; z += .16) {
        if ((r * 7 + Math.round(z * 10)) % 5 === 0) continue;
        v.box(s * (wAt(1.44 + r * .065) / 2 + .018), 1.44 + r * .065, z + (r % 2) * .06, .01, .03, .1, K.letter, 0);
      }
      for (let y = 1.2; y < top - .15; y += .08) v.box(s * (wAt(y + .025) / 2 + .018), y, FE2 - .2, .01, .05, .05, K.letter, 0);
    }
    // Strips from the tab back to the rump skirt, no gaps at either end, about 10 cm apart.
    const z0 = bands ? FE2 - .325 : FE2 - .4, z1 = bands ? zc - lb / 2 + .58 : R2 + .65, n = Math.round((z0 - z1) / .1) + 1;
    // With the blanket the sides are one solid brown skirt, no strips.
    // One hem level for the side skirt, the tab, the rump skirt and the front.
    if (p.mantle) { const zf = FE2 - .28; v.box(s * (wb / 2 - .02), .43, (zf + z1 - .035) / 2, .03, B2 - .435, zf - z1 + .035, K.skirt, 0); }   // ends exactly at the tab: no slit
    else for (let i = 0; i < n; i++) v.box(s * (wb / 2 - .02), .5 - drop + (i % 3) * .03, z0 - i * (z0 - z1) / (n - 1), .03, B2 - .5 + drop - (i % 3) * .03, .07, K.strip[i % 2], 0);
    if (!p.mantle) v.box(s * (wb / 2 - .06), .62 - drop, (z0 + z1) / 2, .02, .275 + drop, z0 - z1, K.inside, 0);
  }
  const sd = bands ? .12 : 0;
  const rear = (bands ? zc - lb / 2 : R2) + .05;
  // With the blanket the rump skirt's rear corners step in twice, like the rest of the body.
  if (p.mantle) for (const [w, z0] of [[wb - .02, rear + .14], [wb - .16, rear + .07], [wb - .3, rear]])
    v.box(0, .55 - sd, (z0 + rear + .5) / 2, w, B2 - .555 + sd, rear + .5 - z0, K.skirt, 0);
  else v.box(0, .55 - sd, rear + .25, wb - .02, B2 - .555 + sd, .5, K.skirt, 0);
  // The dewlap: steps [bottom, height, reach ahead of the chest, width], the widest under the chin. The gold viewing
  // frames sit on its front.
  // The front closed down to the knees, as on the real one: chest and the sides ahead of the tab, a pale hem.
  if (p.closed && bands) {
    // The front: its lower edge climbs in steps from the tab's foot to under the dewlap (no post at the side).
    // Eight small steps, easing up from the tab's foot to under the dewlap (smoother).
    const ends = Array.from({ length: 9 }, (_, k) => { const u = k / 8; return [FE2 + (F2 - .02 - FE2) * u, .43 + .375 * u * (2 - u)]; });   // ends flush under the chest: nothing sticks out
    for (let k = 0; k < ends.length - 1; k++) {
      const [z0, y] = ends[k], z1 = ends[k + 1][0];
      v.box(0, y, (z0 + z1) / 2, wb, B2 - y - .005, z1 - z0, K.hide, 0);   // flush with the body: the rim sits on it, no floating ledge
      // The pale hem only along the sides, and across the front edge (stacked across, they read as stripes).
    }
  } else if (p.closed) {
    const fz = F2 - .04;
    v.box(0, .48, fz, wb, B2 - .48 - .005, .08, K.hide, 0).box(0, .46, fz, wb + .02, .03, .09, K.rim, 0);
    for (const s of [-1, 1]) {
      v.box(s * (wb / 2 - .03), .48, (FE2 + fz) / 2, .06, B2 - .48 - .005, fz - FE2, K.hide, 0);
      v.box(s * (wb / 2 - .03), .46, (FE2 + fz) / 2, .07, .03, fz - FE2 + .01, K.rim, 0);
    }
  }
  const dew = p.dewlap ?? [];
  const tone = u => '#' + new THREE.Color(p.headTone === 'grey' ? K.head : K.hide).lerp(new THREE.Color(K.hide), u).getHexString();
  // A comic head (cap) leaves out the top step: its chin swings down right there (tools/qa/bou-audit.mjs).
  dew.forEach(([y, h, d, w], i) => (!cap || i) && v.box(0, y, F2 + d / 2 - .02 + i * .003, w, h, d + .02 - i * .006, tone(.35 + .65 * i / Math.max(1, dew.length - 1)), 0));
  // The chest under the dewlap, down to the apron's hem: the lower bands sit back, which left a hole there.
  if (p.closed && bands) {
    const fz = zc + lb / 2;
    v.box(0, .805, (fz + F2) / 2 - .01, wb - .06, 1.16 - .805, F2 - fz + .02, K.hide, 0);   // flush with the hem's sides
  }
  if (p.slim && !cap) v.box(0, 1.28, F2 + .11, .72, .46, .26, tone(.45), 0);   // neck: one block in a tone between head and body (the shoulder read too busy)
  // Without a dewlap they sit on the chest under the chin; with one, on its lower steps, clear of the head.
  // The lower frame sits low on its step, under the next one (5 cm high, the step above hid its top
  // border and its holes stood out of the gold), 2 mm clear of the step's underside (no shared plane).
  const frames = dew.length ? [[dew[2][0] + .002, dew[2][2] - .02], [dew[1][0] + .06, dew[1][2] - .02]] : [[1.12, .0], [1.28, .04]];
  for (const [y, dz] of frames) {
    const z = F2 + .03 + dz;
    v.box(0, y, z, .4, .14, .06, K.gold, 0);
    for (const s of [-1, 1]) v.box(s * .09, y + .025, z + .035, .13, .09, .02, K.hole, 0);
  }
  // The blanket in the Mulassa's style (figures/mulassa/mulassa.js): velvet over the back with a gold frame, a gold
  // fringe and the arms of Valls (red lozenge, white fess, mural crown) on each side. Dark olive velvet as on the
  // Bou's own blanket (the owner's photo). It drapes over each band of the barrel.
  if (p.mantle && bands) {
    // One solid block with straight sides from the back down: no gaps over the narrower top bands. It hangs
    // past the rim so the gold fringe sits on the brown skirt.
    const VEL = '#3b3f1f', bz = -.15, bl = 1.3, low = .885, mw = W + .06, x = mw / 2 + .008;
    // Straight sides up to the widest band, then its shoulders step in with the back's bands.
    const sh = bands.filter(([y0]) => y0 >= top - .22), side = sh[0][0];
    v.box(0, low, bz, mw, side - low + .015, bl, VEL, 0);
    for (const e of [-1, 1]) v.box(0, low + .025, bz + e * bl / 2, mw + .04, side - low - .025 + .02, .05, K.gold, 0);   // its top 5 mm over the velvet's ledge: gold at the corner, not green
    sh.forEach(([y0, y1, w], k) => {
      const last = k === sh.length - 1, hi = (last ? top + .03 : y1 + .015) - y0;
      v.box(0, y0 - .003, bz, w + .06, hi + .003, bl, VEL, 0);
      for (const e of [-1, 1]) v.box(0, y0 + .006, bz + e * bl / 2, w + .08, hi - .003, .05, K.gold, 0);   // end borders follow the steps, level with the velvet (6 mm proud: no shimmer)
    });
    for (const s of [-1, 1]) {
      v.box(s * x, low - .012, bz, .02, .05, bl + .04, K.gold, 0);                                         // bottom bar
      for (let z = bz - bl / 2 + .05; z <= bz + bl / 2 - .04; z += .1) v.box(s * x, low - .09, z, .02, .08, .05, K.gold, 0); // fringe
      v.box(s * x, low + .12, bz, .02, .03, bl - .25, K.gold, 0);                                         // inner line
      const ey = low + .26;
      for (let i = 0; i < 9; i++) { const lw = .3 * (1 - Math.abs(i - 4) / 5); v.box(s * (x + .004), ey + i * .034, bz, .02, .034, lw, i >= 3 && i <= 5 ? K.white : K.red, 0); }
      v.box(s * (x + .004), ey + .33, bz, .02, .05, .22, K.gold, 0);
      for (const k of [-1, 0, 1]) v.box(s * (x + .004), ey + .38, bz + k * .08, .02, .04, .045, K.gold, 0);
    }
  }
  const shell = new THREE.Group(); shell.position.y = -.85; shell.add(...(solid.g.length ? [solid.mesh()] : []), v.mesh()); rig.body.add(shell);
  // Its carretilles (UAF videos 2021/2024: a comb of tubes along both edges of the back): no rack, only
  // small tubes where its comb stands, hidden until they burn (figures/bou/bou-show.js grows them in and out). Pairs from the
  // rump out of both flanks, nearly flat, then three straight up the middle. Their mouths at +z (figures/bou/bou-show.js BOU_JET_NOZZLE).
  const back = new THREE.Box3(); for (const m of shell.children) { m.geometry.computeBoundingBox(); back.union(m.geometry.boundingBox); }
  const fire = [], Z = new THREE.Vector3(0, 0, 1);
  const carretilla = (x, z, dir) => {
    const g = new THREE.Group(); g.position.set(x, back.max.y - .87, z); g.quaternion.setFromUnitVectors(Z, dir.normalize());
    g.add(new THREE.Mesh(BOU_TUBE ??= bouTube(), MAT));
    g.visible = false; rig.body.add(g); fire.push(g);
  };
  for (let k = 0; k < 6; k++) for (const s of [-1, 1]) carretilla(s * (back.max.x - .12), zc - .8 + k * .32, new THREE.Vector3(s, .06, 0));
  for (let k = 0; k < 3; k++) carretilla(0, zc - .45 + k * .45, new THREE.Vector3(0, 1, -.1));
  const alt = cap && buildBouHead(cap, rig.body), head = alt ? alt.head : slimHead(p, F2 - .02); if (!alt) rig.body.add(head);
  // The tail (free of the body, a proper chain, comic): it springs from a small dock at the top of
  // the rump, where the back ends, then hangs in links that swing and bounce on their own and never enter the body:
  // a hide link, three wound red and white ribbon links, a hide link, the brush.
  const bandAt = y => bands.find(b => y >= b[0] && y < b[1]) ?? bands.at(-1);
  const rearAt = y => y < B2 - .04 ? zc - lb / 2 + .05 : y < B2 ? zc - (lb + .02) / 2 : zc - (L - tuck(bandAt(y)[0], bandAt(y)[2])) / 2;   // skirt, rim, then each band's rear face
  const dockY = top - .17, dockZ = rearAt(top - .25) - .1;   // 10 cm off the rump's most protruding band: the tail (never swinging forward) keeps clear
  const dock = new Vox().box(0, dockY - .07, (dockZ + rearAt(dockY) + .03) / 2, .13, .14, rearAt(dockY) + .03 - dockZ, K.hide, 0).mesh();   // the dock, sunk 3 cm into the rump
  dock.position.y = -.85; rig.body.add(dock);
  const LINKS = [[.12, 'hide'], [.13, 'rib'], [.13, 'rib'], [.13, 'rib'], [.1, 'hide'], [.28, 'tuft']];
  // Each link spans exactly its two nodes (overlapping ends crossed their stripes at every bend: flicker), and a hide
  // knuckle a little thinner than any link fills the outside of each bend; its faces sit inside the links' (never one
  // plane with theirs).
  LINKS.forEach(([l, kind], i) => {
    const g = new THREE.Group(), t = new Vox();
    if (kind === 'tuft') t.box(0, -l, 0, .16, l, .13, K.tuft, 0).box(0, -l - .05, 0, .1, .07, .08, K.tuft, 0);
    else if (kind === 'hide') t.box(0, -l, 0, .1, l, .1, K.hide, 0);
    else for (let k = 0; k < 4; k++) {   // a sleeve, its stripes one face further each turn: a wound ribbon
      const [dx, dz, w, d] = [[0, .056, .128, .016], [.056, 0, .016, .096], [0, -.056, .128, .016], [-.056, 0, .016, .096]][k];   // sunk into the core: no face just off another
      if (!k) t.box(0, -l, 0, .1, l, .1, K.hide, 0);
      for (let j = 0; j < 2; j++) t.box(dx, -l + j * l / 2 + (j ? 0 : .002), dz, w, l / 2 - .002, d, (i + j + k) % 2 ? K.white : K.red, 0);   // 2 mm short of the link's ends: not the core's end plane
    }
    const m = t.mesh(); if (i % 2) m.scale.set(.9, 1, .9);   // every other link a little thinner: straight, their sides never share a plane
    g.add(m); rig.tail.add(g);
  });
  for (let i = 1; i < LINKS.length; i++) { const g = new THREE.Group(); g.add(new Vox().box(0, -.04, 0, .08, .08, .08, K.hide, 0).mesh()); rig.tail.add(g); }
  rig.tail.position.set(0, dockY - .85, dockZ);
  const swingTail = makeTailSwing(rig.tail, LINKS.map(([l]) => l));
  return { ...rig, head, cap: alt, swingTail, fire };
}

function slimHead(p, front) {
  const head = new THREE.Group(); head.position.set(0, p.headY - .85, front); head.rotation.x = p.headTilt; head.scale.setScalar(p.head);
  // Head palette: grey (the first take) or the body's brown (on video the head is the hide's colour).
  const H = p.headTone === 'grey' ? { head: K.head, alt: '#5f5559', bridge: '#6a5e62', dark: K.muzzle, ear: K.ear, earIn: K.earIn }
    : { head: K.hide, alt: '#764639', bridge: '#825547', dark: '#3a221d', ear: '#5a352c', earIn: '#c29f8a' };
  const h = new Vox(), BRIDGE = H.bridge, PALE = '#d9d2c6';
  // Skull and face as a core with stepped edges, like the body.
  h.box(0, -.18, .1, .46, .4, .36, H.head).box(0, -.2, .1, .38, .44, .42, H.head).box(0, .24, .1, .3, .03, .3, H.head);
  h.box(0, -.28, .42, .32, .26, .34, H.head).box(0, -.3, .42, .26, .3, .36, H.head);
  h.box(0, -.005, .42, .14, .02, .34, BRIDGE, 0);           // nose bridge
  h.box(0, -.32, .62, .3, .25, .1, K.muzzle);               // muzzle
  h.box(0, -.115, .625, .31, .03, .1, PALE, 0);             // pale band over the muzzle
  // Pale lip, then the chin and the jaw stepping back underneath to the throat (not one slab).
  h.box(0, -.355, .635, .32, .055, .11, PALE, 0);           // lip, clear of the muzzle's faces (it blinked)
  h.box(0, -.385, .6, .24, .04, .1, PALE, 0);               // chin
  h.box(0, -.345, .517, .29, .065, .155, H.head, 0);          // jaw, reaching in under the lip and up into the face: no gap
  h.box(0, -.325, .385, .27, .045, .13, H.head, 0);          // jaw, under the cheek
  for (const s of [-1, 1]) {
    h.box(s * .075, -.2, .672, .06, .05, .01, K.hole, 0).box(s * .085, -.235, .672, .07, .018, .01, PALE, 0); // nostrils, a pale stroke under each
    h.box(s * .24, -.08, .215, .02, .1, .12, K.white, 0).box(s * .248, -.07, .225, .02, .06, .06, K.black, 0); // eye: outside the skull, its front 5 mm behind the skull's (they blinked)
    h.box(s * .24, .025, .22, .04, .035, .15, H.dark, 0);  // lid, proud of the eye and the skull
    h.box(s * .31, -.04, .02, .16, .1, .06, H.ear, 0).box(s * .33, -.025, .056, .1, .06, .01, H.earIn, 0);   // inner ear clear of the ear's faces
    const [span, rise, fwd] = p.horn;
    // On a 3 cm grid: faces either coincide (same colour) or sit clearly apart, so the stepped horn doesn't shimmer.
    const q = v => Math.round(v / .03) * .03;
    for (let k = 0; k <= 10; k++) {
      const t = k / 10, sz = q(.12 - .05 * t);
      const tip = t >= .7, e = tip ? .012 : 0;   // the dark tip a touch thicker: its faces never meet the pale ones
      h.box(s * q(.21 + span * t), q(.02 + rise * t * t) - e / 2, q(.08 + fwd * t), sz + e, sz + e, sz + e, tip ? K.hornTip : K.horn, 0);
    }
  }
  for (let k = -2; k <= 2; k++) h.box(k * .08, .22, .12 + (k % 2) * .04, .08, .06, .08, H.dark, 0); // curly poll
  // The forehead, three takes: a big forelock tuft, the carved wood grain, or a festive browband.
  const DARK = '#3c3438', MID = '#544a4f';
  if (p.brow === 'tuft') {
    // A chunky forelock falling over the brow, lighter than the face, off to one side.
    const T = '#7c6c70';
    h.box(0, .12, .35, .36, .14, .1, T, 0).box(-.04, .02, .39, .26, .12, .09, T, 0).box(-.09, -.06, .42, .12, .1, .07, T, 0);
    h.box(.1, .2, .38, .12, .08, .08, MID, 0).box(-.12, .14, .41, .08, .06, .05, MID, 0).box(-.09, -.08, .46, .06, .05, .03, DARK, 0);
  } else if (p.brow === 'steps') {
    // The forehead comes down in three steps until it meets the nose bridge: each a bit lower, further forward
    // and narrower, alternating two close tones so the steps read.
    for (let i = 0; i < 3; i++) {
      const top = .225 - i * .085, front = .34 + i * .09, w = [.44, .4, .34][i];
      const back = .2 + i * .012, bot = -.02 - i * .008;   // staggered so the steps share no back or bottom plane
      h.box(0, bot, (back + front) / 2, w, top - bot, front - back, i % 2 ? H.alt : H.head, 0);
    }
  } else if (p.brow === 'grain') {
    for (const [y, a] of [[.17, 0], [.1, 1.4], [.03, 2.8]]) for (let x = -.19; x < .19; x += .03)
      h.box(x, y + .02 * Math.sin(x * 14 + a), .315, .03, .022, .012, DARK, 0);
  } else if (p.brow === 'band') {
    h.box(0, .07, .315, .48, .07, .02, K.red, 0);
    for (const x of [-.15, 0, .15]) h.box(x, .075, .33, .05, .05, .02, K.gold, 0);
    h.box(0, .24, .25, .14, .12, .14, K.red, 0).box(0, .36, .25, .07, .07, .07, K.gold, 0);   // pompom
  }
  head.add(h.mesh());
  return head;
}
