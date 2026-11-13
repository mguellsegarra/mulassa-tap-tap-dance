// The Bou's rave lasers (src/figures/bou/bou-rave.js) on a bare scene: every beam ends where it lands, on the floor or on
// the Bou, never through it and out of its other side.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { buildBou } from '../../../src/figures/bou/bou.js';

const camera = new THREE.PerspectiveCamera(54, 16 / 9, 0.5, 200);
camera.position.set(-6.6, 4.3, 0.9); camera.lookAt(0, 1, 0); camera.updateMatrixWorld();
const bou = buildBou(); bou.root.updateMatrixWorld(true);
const paper = { getContext: () => ({ createRadialGradient: () => ({ addColorStop() {} }), fillRect() {} }) }; // (the follow spot's pool texture)
let seed = 11;
const context = vm.createContext({ THREE, scene: new THREE.Scene(), camera, glc: { height: 1080 }, bou, document: { createElement: () => paper },
  seeded: () => () => (seed = seed * 16807 % 2147483647) / 2147483647 });
vm.runInContext(readFileSync(new URL('../../../src/figures/bou/bou-rave.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, ''), context);
const run = code => vm.runInContext(code, context);
const pos = run('bouBeamPos'), dots = run('bouDotGeo').attributes.position, N = run('BOU_BEAMS');

const body = []; bou.root.traverse(o => { if (o.isMesh && o.geometry.attributes.position.count > 600) body.push(o); });
const ray = new THREE.Raycaster(), a = new THREE.Vector3(), b = new THREE.Vector3(), from = new THREE.Vector3(), end = new THREE.Vector3(), dir = new THREE.Vector3();
let onBou = 0, onFloor = 0;
for (let beat = 0; beat < 32; beat += 0.25) { // the final's eight bars: the fans open, close and sweep up and down
  run('bouRave')(1, beat * 0.42, 300 + beat, 300, 0, 0, new THREE.Color('#ff3b30'), 9);
  for (let i = 0; i < N; i++) {
    from.addVectors(a.fromBufferAttribute(pos, i * 4), b.fromBufferAttribute(pos, i * 4 + 1)).multiplyScalar(0.5); // each end: the middle of its two corners
    end.addVectors(a.fromBufferAttribute(pos, i * 4 + 2), b.fromBufferAttribute(pos, i * 4 + 3)).multiplyScalar(0.5);
    const len = from.distanceTo(end); dir.subVectors(end, from).normalize();
    assert(end.y > -1e-3, `beam ${i} at beat ${beat} stops at the floor (${end.y.toFixed(3)} m)`);
    ray.set(from, dir); ray.far = len - 0.02;
    assert.equal(ray.intersectObjects(body, false).length, 0, `beam ${i} at beat ${beat} goes through the Bou`);
    if (end.y > 0.05) { onBou++; ray.far = len + 0.05; assert(ray.intersectObjects(body, false).length > 0, `beam ${i} at beat ${beat} ends in mid-air`); }
    else onFloor++;
    assert(a.fromBufferAttribute(dots, i).distanceTo(end) < 0.1, `beam ${i}: its dot of light where it lands`);
  }
}
assert(onBou > 20 && onFloor > onBou, `beams on the Bou ${onBou}, on the floor ${onFloor}`);
console.log(`bou rave: ${onBou} beams end on the Bou, ${onFloor} on the floor, none through it ok`);
{ // rays from inside a mesh's box (the DDA must start where the ray starts, not where it leaves the box): every triangle tried,
  // both faces, as the beams count them (three's Raycaster skips back faces)
  const tri = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], at = new THREE.Vector3(), local = new THREE.Ray(), inv = new THREE.Matrix4();
  const brute = (o, d) => { let best = Infinity; for (const m of body) {
    local.set(o, d).applyMatrix4(inv.copy(m.matrixWorld).invert()); const P = m.geometry.attributes.position, I = m.geometry.index;
    for (let i = 0; i < (I ? I.count : P.count); i += 3) {
      for (let k = 0; k < 3; k++) tri[k].fromBufferAttribute(P, I ? I.getX(i + k) : i + k);
      if (local.intersectTriangle(tri[0], tri[1], tri[2], false, at)) best = Math.min(best, at.applyMatrix4(m.matrixWorld).distanceTo(o));
    } } return best; };
  const hit = run('bouBeamHit'), box = new THREE.Box3(); for (const m of body) box.expandByObject(m);
  const o = new THREE.Vector3(), d = new THREE.Vector3(); let n = 0;
  for (let i = 0; i < 300; i++) {
    o.set(box.min.x + (box.max.x - box.min.x) * ((i * 0.618) % 1), box.min.y + (box.max.y - box.min.y) * ((i * 0.414) % 1), box.min.z + (box.max.z - box.min.z) * ((i * 0.732) % 1));
    d.set(Math.sin(i * 1.3), Math.cos(i * 0.7) - 0.3, Math.sin(i * 2.1 + 1)).normalize();
    const want = brute(o, d), got = hit(o, d);
    assert(want === got || Math.abs(want - got) < 1e-4, `a ray from inside its box: ${got} m, every triangle ${want} m`); if (want < Infinity) n++;
  }
  console.log(`bou rave: ${n} rays from inside its box land where every triangle says`);
}
