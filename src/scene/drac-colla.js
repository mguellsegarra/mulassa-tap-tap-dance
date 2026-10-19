// The Drac's colla in the plaça: the four helpers who clap the beat round the dance (fixed references for the carrier:
// they never follow, drift or turn with it) and a few members sitting on the paving by the band. One skinned mesh each
// (skinCrowd, the crowd's own material: one draw call, no new program); the pivot groups carry every pose.
// `helpers` is in the dance frame (m): its owner places it with placeDance, like the Drac's parent. `seated` is in the
// plaça (m, origin = the helpers' centre). update(beat, energy) is a pure function of the song's beat: seekable.
import * as THREE from 'three';
import { HELPERS } from '../game/drac-layout.js';
import { skinCrowd } from './models/people.js';
import { buildHelper, poseHelper, buildSeated, poseSeated, HELPER_LOOKS, SEATED_LOOKS } from './models/colla.js';

// Where the members sit (Marc: spread round the helpers' ring, not in a heap): on the paving just outside the four helpers
// (5.1 m out, drac-layout.js), in the three gaps between them that the play camera does not look through (it looks in
// between S and E, ~2.99 rad): E-N ~1.42, N-W ~6.27 (behind the Drac, the band's side) and W-S ~4.56. One a gap first,
// so every quality shows the ring, then the others ~0.3-0.4 rad either side, across each gap (less on the camera's side). Clear of the dance, the helpers, the camera's shot and the crowd, which stands beyond
// crowd-build RING.arena while the Drac is out (tests/drac-colla.mjs).
// [azimuth (rad, x = r cos a, z = r sin a), radius (m), posture (models/colla.js SEATED), look]
export const SEATS = [
  [1.42, 6.0, 0, 0], [6.27, 6.0, 1, 1], [4.56, 6.0, 2, 2],
  [1.0, 6.1, 1, 3], [4.14, 6.1, 0, 4], [5.85, 6.1, 2, 3], [1.72, 6.1, 0, 2],
];
// how many sit at each quality (a seated member is ~60 boxes; the hidden ones are not drawn at all)
export const SEATED_COUNT = { minimal: 0, low: 3, medium: 5, high: 7 };

// one skinned mesh for a list of people ({g, bones}); the index count of each person's part, in order (draw ranges)
function skin(list) {
  const ends = [];
  let n = 0;
  for (const p of list) { for (const b of p.bones) for (const m of b.children) if (m.isMesh) n += m.geometry.index.count; ends.push(n); }
  const mesh = skinCrowd(list.map(p => ({ g: p.g, torso: p.bones[0], legs: [], arms: p.bones.slice(1) })));
  mesh.receiveShadow = false;
  return { mesh, ends };
}
// a letter on a dark disc, as a sprite (debug layer: which helper is W, N, S or E)
function letter(id) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1d25'; g.beginPath(); g.arc(64, 64, 58, 0, 2 * Math.PI); g.fill();
  g.fillStyle = '#fff3d6'; g.font = 'bold 80px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(id, 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.setScalar(0.55); s.renderOrder = 1;
  return s;
}

export function createColla({ profile }) {
  const helpers = new THREE.Group(), seated = new THREE.Group(), labels = new THREE.Group();
  helpers.name = 'colla-helpers'; seated.name = 'colla-seated'; labels.name = 'colla-labels';
  const crew = HELPERS.map((h, i) => {
    const p = buildHelper(HELPER_LOOKS[i], i + 1);
    p.g.name = `helper-${h.id}`; p.g.userData.helper = h;
    p.g.position.set(h.x, 0, h.z); p.g.rotation.y = h.yaw;
    helpers.add(p.g);
    return p;
  });
  const members = SEATS.map(([a, r, posture, look], i) => {
    const p = buildSeated(SEATED_LOOKS[look], posture, 11 + i), x = Math.cos(a) * r, z = Math.sin(a) * r;
    p.g.position.set(x, 0, z); p.g.rotation.y = Math.atan2(-x, -z); // facing the centre
    seated.add(p.g);
    return p;
  });
  const H = skin(crew), S = skin(members);
  helpers.add(H.mesh, labels);
  seated.add(S.mesh);
  labels.visible = false;
  let shown = 0;
  const colla = {
    helpers, seated, labels, crew, members,
    get count() { return shown; },
    update(beat, energy) {
      for (let i = 0; i < crew.length; i++) poseHelper(crew[i], beat, energy);
      for (let i = 0; i < shown; i++) poseSeated(members[i], beat, energy, i % 3 === 2);
    },
    setProfile(p, count = SEATED_COUNT[p.name] ?? 0) {
      shown = Math.min(members.length, count);
      S.mesh.geometry.setDrawRange(0, shown ? S.ends[shown - 1] : 0);
      seated.visible = shown > 0;
      H.mesh.castShadow = S.mesh.castShadow = p.name === 'high'; // like the crowd
    },
    setLabels(on) {
      if (on && !labels.children.length) for (const h of HELPERS) labels.add(letter(h.id).translateX(h.x).translateY(2.2).translateZ(h.z)); // created once
      labels.visible = on;
    },
    dispose() {
      for (const { mesh } of [H, S]) { mesh.geometry.dispose(); mesh.skeleton.dispose(); }
      for (const s of labels.children) { s.material.map.dispose(); s.material.dispose(); }
    },
  };
  colla.setProfile(profile);
  return colla;
}
