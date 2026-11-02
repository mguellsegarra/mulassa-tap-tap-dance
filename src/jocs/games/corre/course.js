// What a run puts in the street: door pairs with their numbers and the carts of petards.
import * as THREE from 'three';
import { Vox } from '../../../scene/models/voxel.js';
import { HALF, X_SPAN, bend, heading } from './street.js';
import { gateZ, gateText, hazardZ, hazardX } from './rules.js';

const GOOD = '#1fa58f', BAD = '#d8344a', GATE_H = 4.6;
const panelGeo = new THREE.PlaneGeometry(HALF - .1, GATE_H);
const labelGeo = new THREE.PlaneGeometry(HALF - .3, (HALF - .3) * .6);

function label(text) {
  const c = Object.assign(document.createElement('canvas'), { width: 256, height: 154 }), x = c.getContext('2d');
  x.font = "400 150px 'Jersey 10', monospace";
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineJoin = 'round';
  x.lineWidth = 16;
  x.strokeStyle = '#17131a';
  x.strokeText(text, 128, 80);
  x.fillStyle = '#fff8e6';
  x.fillText(text, 128, 80);
  const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
  return t;
}

const frameGeo = new Vox()
  .box(-HALF + .12, 0, 0, .24, GATE_H + .4, .24, '#f2e7c8', 0).box(HALF - .12, 0, 0, .24, GATE_H + .4, .24, '#f2e7c8', 0)
  .box(0, 0, 0, .18, GATE_H + .4, .24, '#f2e7c8', 0).box(0, GATE_H + .3, 0, HALF * 2, .28, .28, '#f2e7c8', 0).mesh().geometry;

const cartGeo = (() => {
  const v = new Vox();
  v.box(0, .45, 0, 1.5, .5, 1, '#6c4427', 0);
  for (const s of [-1, 1]) v.box(s * .78, .05, 0, .1, .55, .55, '#26211f', 0);
  for (let i = 0; i < 6; i++) v.box(-.5 + (i % 3) * .5, .95, -.25 + (i >> 1 & 1) * .5, .28, .75, .28, i % 2 ? '#c62a22' : '#e6b32e', 0);
  return v.mesh().geometry;
})();
const sparkGeo = new THREE.BoxGeometry(.3, .3, .3);

export function createCourse(scene, run, worldZ, material) {
  const group = new THREE.Group(), textures = [], mats = [];
  scene.add(group);
  const gates = run.gates.map((pair, i) => {
    const g = new THREE.Group(), parts = [];
    g.position.z = worldZ(gateZ(i));
    g.position.x = bend(g.position.z);
    g.rotation.y = heading(g.position.z);
    g.add(new THREE.Mesh(frameGeo, material));
    pair.forEach((gate, side) => {
      const x = (side ? 1 : -1) * HALF / 2;
      const mat = new THREE.MeshBasicMaterial({ color: gate[0] === '-' ? BAD : GOOD, transparent: true, opacity: .62, depthWrite: false, side: THREE.DoubleSide });
      const panel = new THREE.Mesh(panelGeo, mat);
      panel.position.set(x, GATE_H / 2, 0);
      const tex = label(gateText(gate)), lab = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      const m = new THREE.Mesh(labelGeo, lab);
      m.position.set(x, 2.9, .05);
      m.renderOrder = 1; // always over its panel, however the two are sorted
      textures.push(tex);
      mats.push(mat, lab);
      g.add(panel, m);
      parts.push([panel, m]);
    });
    group.add(g);
    return { g, parts };
  });
  const sparkMat = new THREE.MeshBasicMaterial({ color: '#ffd24a' });
  mats.push(sparkMat);
  const hazards = run.hazards.map((lane, i) => {
    const g = new THREE.Group();
    g.position.set(hazardX(lane) * X_SPAN + bend(worldZ(hazardZ(i))), 0, worldZ(hazardZ(i)));
    g.scale.setScalar(1.7);
    g.add(new THREE.Mesh(cartGeo, material));
    const sparks = [0, 1, 2, 3, 4].map(() => { const s = new THREE.Mesh(sparkGeo, sparkMat); g.add(s); return s; });
    group.add(g);
    return { g, sparks };
  });
  return {
    pass(i, side) { for (const m of gates[i].parts[side]) m.visible = false; }, // the door they ran through bursts; the frame and the other stay until behind the camera
    blow(i) { hazards[i].g.visible = false; },
    update(time, cameraZ) {
      for (const { g } of gates) g.visible = g.position.z < cameraZ - 1 && g.position.z > cameraZ - 215;
      for (const { g, sparks } of hazards) {
        if (!g.visible) continue;
        sparks.forEach((s, k) => {
          const t = (time * 3 + k * .2) % 1, a = k * 1.26;
          s.position.set(Math.cos(a) * (.3 + t), 1.8 + t * 1.5, Math.sin(a) * (.3 + t));
          s.scale.setScalar(1 - t);
        });
      }
    },
    dispose() {
      scene.remove(group);
      textures.forEach(t => t.dispose());
      mats.forEach(m => m.dispose());
    },
  };
}
