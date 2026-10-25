// Free mode's held fire chars the spectators it touches (src/figures/drac/drac-soot.js): contact follows the fire's volume
// (in front of the tubes, not round the Drac), the soot is per person on a material of its own (vertex colours, SKIN_MAT
// and everyone else untouched), a re-touch renews the hold without adding up, the held pose gives way to the live one,
// leaving free mode releases everyone, and the smoke stays within its cap.
import assert from 'node:assert/strict';
import * as THREE from 'three';

globalThis.location ??= { search: '', hostname: 'localhost' };
globalThis.matchMedia ??= () => ({ matches: false, addEventListener() {} });
const { sootMaterial, sootFrame, sootPose, sootFrozen, sootAnchored, sootState, SOOT } = await import('../../../src/figures/drac/drac-soot.js');
const { PHOTO } = await import('../../../src/game/photo-control.js');
const { createDracFx } = await import('../../../src/figures/drac/drac-fx.js');
const { buildDrac, DRAC_SCALE } = await import('../../../src/figures/drac/drac.js');
const { buildPerson, skinCrowd } = await import('../../../src/scene/models/people.js');
const { SKIN_MAT } = await import('../../../src/scene/models/voxel.js');
const { buildBackdrop } = await import('../../../src/scene/models/backdrop.js');

const scene = new THREE.Scene(), drac = buildDrac(), cam = new THREE.PerspectiveCamera();
drac.root.scale.setScalar(DRAC_SCALE); // as the game draws it: mouths ~2.5 m up
scene.add(drac.root); cam.position.set(0, 4, 12); cam.lookAt(0, 1, 0);
const fx = createDracFx(scene, { smoke: 96, jets: 420, calm: { matches: false } });
const IN = { on: true, cam, fire: drac.fire, streak: false, flare: false, held: true, manual: true, max: 96, jmax: 420, wmax: 0, viewH: 800, x: 0, z: 0 };
const people = Array.from({ length: 14 }, (_, i) => { const p = buildPerson({ kid: i % 4 === 3, hat: i % 3 ? null : '#b3122a' }); p.legs.length || assert.fail('standing'); return p; });
const band = [buildPerson()]; // in the mesh, never charred (not in the list sootFrame gets)
const mesh = skinCrowd([...people, ...band]);
const colours = mesh.geometry.attributes.color.array.slice();
mesh.material = sootMaterial(people, mesh.skeleton.bones.length);
assert.notEqual(mesh.material, SKIN_MAT, 'the crowd gets its own copy: the colles keep SKIN_MAT');
const tex = mesh.material.onBeforeCompile && (() => { const sh = { uniforms: {}, vertexShader: 'a\n#include <color_vertex>\nb' }; mesh.material.onBeforeCompile(sh); assert.match(sh.vertexShader, /sootB/); return sh.uniforms.uSoot.value; })();
const bytes = p => [0, 1, 2, 3, 4].map(k => tex.image.data[(p.bone0 + k) * 4]);

// the backdrop's instanced figures as photo mode moves them (photo-obstacles.js photoExtras)
const back = buildBackdrop(6, 14), extras = [];
for (let i = 0; i < back.n; i++) { const m = new THREE.Matrix4(); back.mesh.getMatrixAt(i, m); extras.push({ pos: new THREE.Vector2(m.elements[12], m.elements[14]), mesh: back.mesh, index: i, matrix: m, vx: 0, vz: 0 }); }
const moveExtra = (p, x, z) => { p.pos.set(x, z); p.matrix.elements[12] = x; p.matrix.elements[14] = z; };
const folk = [people, extras];
const frame = (dt, on = true, held = true) => { scene.updateMatrixWorld(true); IN.held = held; fx.update(dt, IN); sootFrame(dt, fx, folk, on, held); };
frame(1 / 60, true, false); // the fire points known
const E = fx.nozzles;
assert(E, 'the fire points are exposed while the Drac shows');
// stand p on the floor at (x, z) facing wherever, drawn there
const place = (p, x, z) => { p.g.position.set(x, 0, z); p.g.rotation.set(0, 0, 0); p.g.updateMatrixWorld(true); };
// the mouths' mean heading on the floor, and a sideways direction
const hx = E[3] + E[11], hz = E[5] + E[13], hl = Math.hypot(hx, hz), fwdX = hx / hl, fwdZ = hz / hl;
const mx = (E[0] + E[8]) / 2, mz = (E[2] + E[10]) / 2;
const [front, beside, behind, far, ...rest] = people;
place(front, mx + fwdX * 3, mz + fwdZ * 3); // where the mouths' jets come down to head height (the flamarada burns above heads)
place(beside, -fwdZ * 2.2, fwdX * 2.2); // right next to the Drac's body, out of every flame
place(behind, E[16] + E[19] * 1.4, E[18] + E[21] * 1.4); // behind: the tail's flame and jet, low and straight back
place(far, mx + fwdX * 9, mz + fwdZ * 9);
const near = rest.pop(); place(near, mx + fwdX * 1.2, mz + fwdZ * 1.2); // right under the snout, the flame over their head
const wedge = rest.pop(); place(wedge, mx + fwdX * 2.2 - fwdZ * 1.2, mz + fwdZ * 2.2 + fwdX * 1.2); // in front, off to one side: facing the flamarada
rest.forEach((p, i) => place(p, 30 + i, 30));

frame(1 / 60);
assert(sootFrozen(front), 'whoever stands in the flame is charred');
assert(!sootFrozen(beside) && !sootFrozen(far), 'standing next to the Drac or far down the line is not contact');
assert(sootFrozen(near), 'under the snout: the flame over their head counts (cartoon licence, SOOT.under)');
assert(sootFrozen(wedge), 'anyone in front of the snout within the jets reach burns (SOOT.front)');
assert(!sootFrozen(behind), "the residual tail no longer chars someone in the old full-size plume");
for (let i = 0; i < 12; i++) frame(1 / 60);
assert.deepEqual(bytes(front), [255, 255, 255, 255, 255], 'all five of their bones black');
assert.deepEqual(bytes(far), [0, 0, 0, 0, 0], 'nobody else');
assert.deepEqual(band.map(p => tex.image.data[p.bone0 * 4]), [0]);
assert.deepEqual(mesh.geometry.attributes.color.array, colours, 'the costumes (vertex colours) are never written');
// an instanced backdrop figure in the same flame, another far off: only the touched one's aSoot
moveExtra(extras[0], mx + fwdX * 3.1 - fwdZ * 0.4, mz + fwdZ * 3.1 + fwdX * 0.4); moveExtra(extras[1], 40, 40);
const backColours = back.mesh.instanceColor.array.slice();
for (let i = 0; i < 12; i++) frame(1 / 60);
const aSoot = back.mesh.geometry.attributes.aSoot;
assert(sootFrozen(extras[0]) && aSoot.getX(0) === 1 && aSoot.getY(0) === 1, 'a backdrop figure in the flame: black and still');
assert(!sootFrozen(extras[1]) && aSoot.getX(1) === 0, 'the far one untouched');
assert.deepEqual(back.mesh.instanceColor.array, backColours, 'their shirts (instance colours) are never written');
moveExtra(extras[0], 40, 41);

// the held pose: the crowd poses them live underneath; frozen, the drawn pose is the one held at the touch
const held = front.sootS.slice();
front.torso.rotation.x = 0.7; front.arms[0].rotation.x = -2; front.g.position.y = 0.2;
sootPose(front);
assert(Math.abs(front.torso.rotation.x - held[6]) < 1e-6 && Math.abs(front.arms[0].rotation.x - held[10]) < 1e-6 && Math.abs(front.g.position.y - held[1]) < 1e-6, 'frozen in the pose they had');
// A held walking intent releases position, including when the figure itself is blocked. The black pose remains.
assert(sootAnchored(front));
PHOTO.on = true; PHOTO.intentX = 3.2; PHOTO.intentZ = 0; PHOTO.speed = 0;
assert(!sootAnchored(front) && sootFrozen(front), 'a blocked WASD walker can ask a charred spectator to yield');
const heldX = front.g.position.x, heldZ = front.g.position.z;
front.g.position.x += 1; front.g.position.z += 0.5; sootPose(front);
assert.equal(front.g.position.x, heldX + 1); assert.equal(front.g.position.z, heldZ + 0.5);
assert.equal(bytes(front)[0], 255, 'stepping aside never restores the costume colour');
assert(Math.abs(front.arms[0].rotation.x - held[10]) < 1e-6, 'the held limbs travel with the spectator');
PHOTO.intentX = 0;
assert(sootAnchored(front), 'releasing walking holds the new position without restoring an old world anchor');
sootPose(front); assert.equal(front.g.position.x, heldX + 1); assert.equal(front.g.position.z, heldZ + .5);
front.g.position.x = heldX; front.g.position.z = heldZ; PHOTO.on = false;

// a held E keeps renewing it, never beyond `hold`
for (let i = 0; i < 120; i++) frame(1 / 60);
assert(front.sootT <= SOOT.hold && front.sootT > SOOT.hold - 0.05, 'a re-touch renews the hold, it never adds up');
// let go: they stay charred for `hold`, then come back over `fade`
for (let t = 0; t < SOOT.hold - 0.1; t += 1 / 60) frame(1 / 60, true, false);
assert(sootFrozen(front) && bytes(front)[0] === 255, 'still charred until the hold runs out');
for (let t = 0; t < 0.2 + SOOT.fade / 2; t += 1 / 60) frame(1 / 60, true, false);
assert(!sootFrozen(front) && front.sootW > 0 && front.sootW < 1 && bytes(front)[0] > 0 && bytes(front)[0] < 255, 'coming back: eased, not popped');
// halfway the drawn pose sits between the held one and the live one (the live one advanced meanwhile)
front.torso.rotation.x = 0.7; sootPose(front);
assert(front.torso.rotation.x > Math.min(held[6], 0.7) - 1e-6 && front.torso.rotation.x < Math.max(held[6], 0.7) + 1e-6);
for (let t = 0; t < SOOT.fade; t += 1 / 60) frame(1 / 60, true, false);
assert.equal(front.sootW, 0); assert.deepEqual(bytes(front), [0, 0, 0, 0, 0], 'whole again');
assert.equal(sootState().affected, 0, 'off the list');

// the fire is the Drac's, in the world: turned round, it reaches whoever stood behind
drac.root.rotation.y += Math.PI; frame(1 / 60, true, false);
const E2 = fx.nozzles, bx = (E2[0] + E2[8]) / 2 + (E2[3] + E2[11]) / 2 * 3, bz = (E2[2] + E2[10]) / 2 + (E2[5] + E2[13]) / 2 * 3;
place(behind, bx, bz); place(front, mx + fwdX * 9, mz + fwdZ * 9);
frame(1 / 60);
assert(sootFrozen(behind) && !sootFrozen(front), 'contact follows the turned fire');

// leaving free mode (or Tab to the Mulassa, a new game): released at once, back within `fade`
frame(1 / 60, false, false);
assert(!sootFrozen(behind), 'released');
for (let t = 0; t < SOOT.fade + 0.05; t += 1 / 60) frame(1 / 60, false, false);
assert.equal(sootState().affected, 0, 'nobody stays charred');

// many charred at once: a little smoke, at most `smokers` heads, within the puff pool
rest.forEach((p, i) => place(p, E2[0] + E2[3] * (2.6 + 0.12 * i) + 0.3 * (i % 2), E2[2] + E2[5] * (2.6 + 0.12 * i)));
frame(1 / 60);
assert(sootState().affected >= 6, `a group in the flame: ${sootState().affected}`);
fx.clear(); frame(1 / 60, true, false); // (no jets' own smoke from here: E is up)
for (let t = 0; t < 2; t += 1 / 60) frame(1 / 60, true, false);
const live = fx.state().smoke;
assert(live > 0 && live <= Math.ceil(SOOT.smokers * SOOT.smoke * 1.5 * 2) + 2, `discreet smoke: ${live} puffs`);
console.log(`drac-soot: ok (${live} smoke puffs for ${sootState().affected} charred)`);
