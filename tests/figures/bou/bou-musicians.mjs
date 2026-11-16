// The approved review roster must remain compatible with the game's single skinned crowd draw.
import assert from 'node:assert/strict';
import { buildBouMusicians } from '../../../src/figures/bou/bou-musicians.js';
import { skinCrowd } from '../../../src/scene/models/people.js';
import { poseBand } from '../../../src/scene/models/band.js';
import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';
const players = buildBouMusicians();
assert.deepEqual(players.map(p => p.kind), ['gralla', 'gralla', 'gralla-baixa', 'timbal']);
assert.equal(players[0].meta.gender, 'home');
assert.equal(players[0].appearance.skin, '#f6d7bd');
assert.equal(players[0].appearance.hair, '#c9a45c');
assert.equal(players[2].meta.gender, 'dona');
assert.equal(players[2].appearance.hair, '#6b4423');
// A flat shirt ledge beside the head looked like a cut across M3's raised sleeve.
const bassBody = players[2].body.geometry, P = bassBody.attributes.position, C = bassBody.attributes.color, I = bassBody.index;
let collarLedge = false;
for (let i = 0; i < I.count; i += 3) {
  const triangle = [I.getX(i), I.getX(i + 1), I.getX(i + 2)];
  if (triangle.every(v => Math.abs(P.getY(v) - .6) < 1e-5 && C.getX(v) > .8) && triangle.some(v => Math.abs(P.getX(v)) > .175)) collarLedge = true;
}
assert(!collarLedge, 'M3 has no exposed horizontal shirt ledge beside the neck');
// Raised sleeves must clear the head's front silhouette, even when they are farther forward in depth.
const drummer = players[3], head = new THREE.Box3(new THREE.Vector3(-.17, .6, -1), new THREE.Vector3(.17, .94, 1));
for (let i = 0; i <= 60; i++) {
  for (let hand = 0; hand < 2; hand++) {
    const arm = drummer.arms[hand]; arm.rotation.x = drummer.rest[hand * 2] - .6 * i / 60; arm.updateMatrix();
    const geometry = arm.children[0].geometry, bounds = new THREE.Box3(), point = new THREE.Vector3();
    for (let v = 0; v < 24; v++) bounds.expandByPoint(point.fromBufferAttribute(geometry.attributes.position, v));
    const sleeve = new OBB().fromBox3(bounds), centre = sleeve.center.clone().applyMatrix4(arm.matrix);
    sleeve.applyMatrix4(arm.matrix); sleeve.center.copy(centre); // OBB applies the basis and translation, not the local centre's rotation
    assert(!sleeve.intersectsBox3(head), 'M4 raised sleeves clear the head silhouette');
  }
}
const packed = skinCrowd(players);
assert(packed.isSkinnedMesh, 'all four musicians fit in one skinned mesh');
assert(packed.skeleton.bones.length <= 24, 'four existing musician rigs fit the shared bone budget');
for (const beat of [0, .25, .5, 1, 2.5, 15.75]) {
  poseBand(players, beat);
  players.forEach(p => p.g.updateMatrixWorld(true));
  packed.skeleton.update();
  assert(packed.skeleton.boneMatrices.every(Number.isFinite), 'performing poses keep the packed rig finite');
}
console.log(`Bou musicians: four approved players, one packed mesh, ${packed.skeleton.bones.length} bones`);
