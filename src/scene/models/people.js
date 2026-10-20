// The spectators: one person builder (kids, riders, hats, fans) and skinCrowd, which merges the whole crowd into one skinned mesh.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { pick, Vox, SKIN_MAT } from './voxel.js';
import { C } from './mulassa.js';

// ---------------------------------------------------------------- People
export const SKIN = ['#f1c9a5', '#e0ac85', '#c68d63', '#8d5a3b', '#f6d7bd'];
export const HAIR = ['#2b1d14', '#15110f', '#6b4423', '#c9a45c', '#8c8c8c', '#a0522d'];
export const SHIRT = ['#f07a1a', '#f07a1a', '#f07a1a', '#d93a3a', '#2f62d6', '#eeeeee', '#3a9d4b', '#f2c230', '#8e44ad', '#ff8fb1', '#333333', '#29b6c6'];
const PANTS = ['#33456e', '#2a2a2a', '#c8b28a', '#4a6fa5', '#5b3b2a'];
export function buildPerson(o = {}) {
  const shirt = o.shirt || pick(SHIRT), skin = o.skin || pick(SKIN), hair = o.hair || pick(HAIR);
  const pants = o.pants || pick(PANTS), k = o.kid ? 0.72 : 1;
  const g = new THREE.Group();
  const v = new Vox();
  // Standing people get each leg as its own group pivoting at the hip, and the torso/head/arms
  // hang from a hip pivot too, so walkers can swing legs and lean without the body tearing apart.
  const hip = o.seated ? 0 : 0.78;
  const torso = new THREE.Group();
  torso.position.y = hip;
  g.add(torso);
  const legs = [];
  if (o.seated) {
    v.box(0.09, 0.01, 0.15, 0.14, 0.14, 0.5, pants).box(-0.09, 0.01, 0.15, 0.14, 0.14, 0.5, pants); // bottoms off the shirt's
    v.box(0, 0, 0, 0.42, 0.62, 0.26, shirt);
  } else {
    for (const s of [1, -1]) {
      const l = new THREE.Group();
      l.position.set(s * 0.1, hip, 0);
      l.add(new Vox().box(0, -hip, 0.02, 0.15, 0.06, 0.24, C.shoe, 0).box(0, 0.06 - hip, 0, 0.16, 0.72, 0.2, pants).mesh());
      g.add(l);
      legs.push(l);
    }
    v.box(0, 0.78, 0, 0.44, 0.6, 0.26, shirt);
    if (o.faixa) v.box(0, 0.8, 0, 0.46, 0.16, 0.28, o.faixa, 0);
  }
  const top = o.seated ? 0.62 : 1.38;
  v.box(0, top, 0, 0.34, 0.34, 0.32, skin);
  // Keep the hair front at z=0.15, behind the skin at z=0.16: coplanar faces flicker.
  // The back of the hair stops where the top starts (0.26): overlapping, their sides and backs were coplanar and the
  // two shades of hair strobed on every head.
  v.box(0, top + 0.26, -0.02, 0.36, 0.12, 0.34, hair);
  v.box(0, top + 0.1, -0.17, 0.36, 0.16, 0.04, hair);
  v.box(0.08, top + 0.17, 0.165, 0.05, 0.05, 0.01, C.black, 0).box(-0.08, top + 0.17, 0.165, 0.05, 0.05, 0.01, C.black, 0);
  // the brim is wider than the hair (0.36): at 0.34 its sides were flush with the head's and flickered
  // the crown's front 1 cm ahead of the hair's (0.15): flush, the hat and the hair flickered
  if (o.hat) v.box(0, top + 0.34, 0, 0.3, 0.1, 0.32, o.hat, 0).box(0, top + 0.3, 0.08, 0.42, 0.03, 0.44, o.hat, 0);
  if (o.rider) { // a kid on the shoulders, astride the neck: part of the torso, so it rides every lean and hop
    const ks = pick(SHIRT), kk = pick(SKIN);
    for (const s of [1, -1]) {
      v.box(s * 0.25, top + 0.01, -0.065, 0.13, 0.12, 0.47, pants); // thighs over the shoulders
      // the shoe under the shin, not into it (same width: their sides were coplanar)
      v.box(s * 0.25, top - 0.33, 0.14, 0.12, 0.34, 0.12, pants).box(s * 0.25, top - 0.39, 0.16, 0.12, 0.06, 0.16, C.shoe, 0);
      v.box(s * 0.19, top + 0.24, -0.215, 0.08, 0.28, 0.1, ks); // hands on the grown-up's head (fronts 1.5 cm behind the hair's back)
    }
    v.box(0, top + 0.12, -0.29, 0.3, 0.42, 0.18, ks); // behind the head (hair back at z -0.19)
    v.box(0, top + 0.54, -0.27, 0.26, 0.26, 0.24, kk).box(0, top + 0.72, -0.29, 0.28, 0.1, 0.26, pick(HAIR));
    v.box(0.06, top + 0.65, -0.145, 0.04, 0.04, 0.01, C.black, 0).box(-0.06, top + 0.65, -0.145, 0.04, 0.04, 0.01, C.black, 0);
  }
  const body = v.mesh();
  body.position.y = -hip; // geometry stays in person space; only the pivot moved to the hip
  torso.add(body);
  const arms = [1, -1].map(s => {
    const a = new THREE.Group();
    a.position.set(s * 0.29, top - 0.02 - hip, 0);
    const av = new Vox().box(0, -0.42, 0, 0.13, 0.42, 0.14, shirt).box(0, -0.56, 0, 0.12, 0.14, 0.12, skin);
    if (o.fan && s === 1) { // a ventall in the right hand: it swings with the arm
      av.box(0, -0.66, 0.02, 0.03, 0.1, 0.03, '#7a4a22', 0);
      av.box(0, -0.8, 0.02, 0.02, 0.14, 0.32, o.fan, 0).box(0, -0.88, 0.02, 0.02, 0.08, 0.2, o.fan, 0);
    }
    a.add(av.mesh());
    torso.add(a);
    return a;
  });
  g.scale.setScalar(k);
  return { g, body, torso, arms, legs, appearance: { skin, hair, shirt, pants } };
}
// The whole crowd as ONE skinned mesh (a draw call instead of five per person): every part mesh is baked as built
// (same boxes, same vertex colours) into a shared geometry whose "bones" are each person's own pivot groups (torso,
// legs, arms). The groups stay in the scene and animate exactly as before; the GPU puts each part where its group's
// world matrix says. Bind pose = identity, so a vertex lands at bone.matrixWorld × (its part-local position).
// A hidden person must be scaled to zero (p.g.scale 0): the groups still update, only the mesh draws them.
export function skinCrowd(people) {
  const parts = [], bones = [];
  for (const p of people) {
    p.scale = p.g.scale.x; // kids are smaller: the size to restore when shown again
    p.bone0 = bones.length; // their first bone (the torso): drac-soot.js chars a person's bones
    for (const bone of [p.torso, ...p.legs, ...p.arms]) {
      const k = bones.push(bone) - 1;
      for (const mesh of bone.children.filter(o => o.isMesh)) {
        mesh.updateMatrix();
        const geo = mesh.geometry.applyMatrix4(mesh.matrix), n = geo.attributes.position.count;
        const idx = new Uint16Array(n * 4), wt = new Float32Array(n * 4);
        for (let i = 0; i < n; i++) { idx[i * 4] = k; wt[i * 4] = 1; }
        geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
        geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wt, 4));
        parts.push(geo);
        bone.remove(mesh);
      }
    }
  }
  const mesh = new THREE.SkinnedMesh(mergeGeometries(parts), SKIN_MAT);
  parts.forEach(geo => geo.dispose());
  mesh.bind(new THREE.Skeleton(bones, bones.map(() => new THREE.Matrix4())), new THREE.Matrix4());
  mesh.frustumCulled = false; // people walk about: bounds from the bones would be stale (and they ring the camera anyway)
  return mesh;
}
// ---- The backdrop: a dense band of simple figures (legs, torso, head, eyes: 56 vertices) standing along the façades,
// out beyond the play camera's square (it keeps inside inner - 1.5), so never between it and her. ONE instanced
// mesh; shirt/skin/hair per instance, and the hop to the beat, sway and wave run in the vertex shader from a few
// uniforms (main.js sets them once a frame: no per-instance CPU work at all).
export const HATS = ['#b3122a', '#b3122a', '#d9c27a', '#26262e']; // barretina red, straw, black
