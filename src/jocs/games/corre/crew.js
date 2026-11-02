// The two collas as instanced voxel castellers, the Mulassa at the head of ours, and the confetti.
import * as THREE from 'three';
import { Vox, MAT } from '../../../scene/models/voxel.js';
import { buildMulassa } from '../../../figures/mulassa/mulassa.js';

const MAX = 130; // drawn at most; the count on screen stays true
const SKIN = '#f0bd8e', WHITE = '#fbf6e8', BLACK = '#1b1719', HAIR = '#6b4526';
const FLOOR_H = 1.42; // a casteller's shoulders, floor to floor
const WALK_IN = .9; // seconds to reach the castell's spot before the first floor climbs

function bodyGeometry(shirt, pose) { // pose -1 / 1: which leg leads; 0: standing
  const v = new Vox(), step = pose * .2;
  v.box(-.14, 0, step, .2, .78, .24, WHITE, 0); // trousers
  v.box(.14, 0, -step, .2, .78, .24, WHITE, 0);
  v.box(-.14, 0, step + .02, .22, .1, .3, BLACK, 0); // espardenyes
  v.box(.14, 0, -step + .02, .22, .1, .3, BLACK, 0);
  v.box(0, .72, 0, .52, .2, .32, BLACK, 0); // faixa
  v.box(0, .92, 0, .58, .52, .34, shirt, 0);
  v.box(-.36, .9, -step * .8, .14, .5, .17, shirt, 0); // arms swing against the legs
  v.box(.36, .9, step * .8, .14, .5, .17, shirt, 0);
  v.box(0, 1.44, 0, .4, .4, .38, SKIN, 0);
  v.box(0, 1.76, -.02, .43, .1, .42, HAIR, 0); // a cap of hair: from above and behind, the shirts have to show, not dark heads
  v.box(0, 1.6, -.2, .43, .16, .06, HAIR, 0);
  v.box(-.1, 1.56, .195, .08, .08, .02, BLACK, 0); // eyes
  v.box(.1, 1.56, .195, .08, .08, .02, BLACK, 0);
  return v.mesh().geometry;
}

const pinya = i => { // rings round the trunk, wider and wider
  let ring = 0, seats = 7, left = i;
  while (left >= seats) { left -= seats; ring++; seats += 5; }
  const r = 1.35 + ring * .68, a = left / seats * Math.PI * 2 + ring * .4;
  return { x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r, ry: Math.atan2(-Math.cos(a), -Math.sin(a)), s: 1, at: 0 };
};

// Where each person stands in a castell, bottom floor first: the trunk, then the pinya.
export function castellSlots(c, drawn, reveal) {
  const slots = [];
  c.floors.forEach((count, f) => {
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2 + (count === 2 ? 0 : Math.PI / 2), r = count === 1 ? 0 : .42;
      slots.push({ x: Math.cos(a) * r, y: f * FLOOR_H, z: Math.sin(a) * r * .9, ry: 0, s: f === c.floors.length - 1 && c.floors.length > 1 ? .72 : 1, at: WALK_IN + f * reveal });
    }
  });
  for (let i = 0; slots.length < drawn; i++) slots.push(pinya(i));
  return slots;
}
export const castellHeight = c => c.floors.length * FLOOR_H + .5;
export const castellTime = (c, reveal) => WALK_IN + c.floors.length * reveal;
export const enxanetaY = c => (c.floors.length - 1) * FLOOR_H + .95;

export function createCrew(scene, shirt, faceYaw, ground) {
  const meshes = [0, -1, 1].map(pose => {
    const m = new THREE.InstancedMesh(bodyGeometry(shirt, pose), MAT, MAX);
    m.frustumCulled = false;
    m.count = 0;
    scene.add(m);
    return m;
  });
  const people = [], flying = [], dummy = new THREE.Object3D();
  return {
    people,
    clear() { people.length = flying.length = 0; },
    // Keep as many as the count asks for: newcomers pop in at the head, the lost are thrown up and ahead, never at the camera.
    count(n, x, z) {
      const want = Math.min(n, MAX);
      while (people.length < want) people.push({ x: x + (Math.random() - .5), y: 0, z: z + Math.random(), ry: faceYaw, s: .01, phase: Math.random() * 2, frame: 0 });
      while (people.length > want) {
        const p = people.pop();
        flying.push({ ...p, vx: (p.x - x) * 1.6 + (Math.random() - .5) * 4, vy: 5 + Math.random() * 4, vz: -2 - Math.random() * 6, spin: (Math.random() - .5) * 10, life: .75 });
      }
    },
    // The running blob: a sunflower, so that adding people keeps everyone where they were.
    run(dt, x, z, time, moving, span) {
      const drawn = people.length, gap = Math.min(.55, (span - .6) / Math.sqrt(Math.max(drawn, 1))), k = Math.min(1, dt * 11), long = Math.min(2.6, 5 / span); // a narrow street stretches the blob, so they queue instead of piling up
      const reach = gap * Math.sqrt(drawn) + .3, cx = Math.max(-span + reach, Math.min(span - reach, x));
      people.forEach((p, i) => {
        const r = gap * Math.sqrt(i + .5), a = i * 2.39996;
        const tz = z + Math.sin(a) * r * long;
        p.x += (cx + Math.cos(a) * r + ground.bend(tz) - p.x) * k;
        p.z += (tz - p.z) * k;
        p.y = ground.at(p.x, p.z) + (moving ? Math.abs(Math.sin(time * 12 + p.phase * 3)) * .14 : 0);
        p.ry = faceYaw + ground.heading(p.z);
        p.s = Math.min(1, p.s + dt * 5);
        p.frame = moving ? 1 + (Math.floor(time * 9 + p.phase) % 2) : 0;
      });
    },
    // They walk to their spots at a steady pace, then each one climbs when their floor's turn comes.
    build(dt, cx, cz, slots, age) {
      const pace = 34 * dt, k = Math.min(1, dt * 9), base = ground.at(cx, cz);
      people.forEach((p, i) => {
        const t = slots[i], up = age >= t.at, tx = cx + t.x, tz = cz + t.z + (up || !t.y ? 0 : 1.1);
        const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz), go = Math.min(1, d ? pace / d : 1);
        p.x += dx * go; p.z += dz * go;
        p.y += ((up ? t.y + base : ground.at(p.x, p.z)) - p.y) * k;
        p.ry += (d > .3 ? Math.PI - p.ry : t.ry - p.ry) * k; // facing where they go, then their place
        p.s += ((up ? t.s : 1) - p.s) * k;
        p.frame = d > .25 ? 1 + (Math.floor(age * 9 + p.phase) % 2) : 0;
      });
    },
    draw(dt) {
      const used = [0, 0, 0];
      const put = (p, rx, s) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(rx, p.ry, 0);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        if (used[p.frame] < MAX) meshes[p.frame].setMatrixAt(used[p.frame]++, dummy.matrix);
      };
      for (const p of people) put(p, 0, p.s);
      for (let i = flying.length - 1; i >= 0; i--) {
        const p = flying[i];
        p.life -= dt;
        if (p.life <= 0) { flying.splice(i, 1); continue; }
        p.vy -= 22 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.ry += p.spin * dt;
        put(p, (.75 - p.life) * 5, p.s * Math.min(1, p.life * 2.5));
      }
      meshes.forEach((m, i) => { m.count = used[i]; m.instanceMatrix.needsUpdate = true; });
    },
  };
}

// The Mulassa, trotting: the game's model with eight simple legs under the cloth.
export function createMulassa(scene) {
  const rig = buildMulassa(), group = new THREE.Group(), legs = [];
  const legGeo = new THREE.BoxGeometry(.14, .55, .16), legMat = new THREE.MeshLambertMaterial({ color: '#26262e' });
  for (const z of [1.2, .45, -.35, -1.15]) for (const s of [-1, 1]) {
    const l = new THREE.Mesh(legGeo, legMat);
    l.position.set(s * .28, .27, z);
    rig.root.add(l);
    legs.push(l);
  }
  rig.root.rotation.y = Math.PI;
  group.add(rig.root);
  group.scale.setScalar(1.05);
  scene.add(group);
  return {
    group,
    pose(time, moving) {
      const t = time * (moving ? 13 : 3), a = moving ? 1 : .35;
      rig.body.rotation.z = Math.sin(t) * .06 * a;
      rig.body.rotation.x = Math.sin(t * 2) * .03 * a;
      rig.body.position.y = .9 + Math.abs(Math.sin(t)) * .16 * a;
      rig.neck.rotation.x = .15 + Math.sin(t * 2) * .1 * a;
      rig.neck.rotation.y = Math.sin(t) * .12 * a;
      rig.head.rotation.x = .2;
      rig.jaw.rotation.x = Math.max(0, Math.sin(t * 2)) * .12;
      rig.ears.forEach((e, i) => { e.rotation.x = -.25 + Math.sin(t * 2 + i) * .3; });
      rig.tail.rotation.z = Math.sin(t) * .45;
      legs.forEach((l, i) => { l.position.y = .27 + Math.max(0, Math.sin(t + (i % 2 ? Math.PI : 0) + (i >> 1))) * a * .13; });
    },
  };
}

export function createConfetti(scene) {
  const N = 180, mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(.16, .16, .05), new THREE.MeshBasicMaterial(), N);
  mesh.frustumCulled = false;
  mesh.count = 0;
  const bits = Array.from({ length: N }, () => ({ life: 0 })), dummy = new THREE.Object3D(), color = new THREE.Color();
  mesh.setColorAt(0, color.set('#ffffff'));
  scene.add(mesh);
  let next = 0;
  return {
    clear() { for (const b of bits) b.life = 0; },
    burst(x, y, z, count, colors, power = 1) {
      for (let i = 0; i < count; i++) {
        const b = bits[next];
        Object.assign(b, { x, y, z, vx: (Math.random() - .5) * 13 * power, vy: (3 + Math.random() * 10) * power, vz: (Math.random() - .5) * 13 * power, life: .7 + Math.random() * .8, r: Math.random() * 6 });
        mesh.setColorAt(next, color.set(colors[i % colors.length]));
        next = (next + 1) % N;
      }
      mesh.instanceColor.needsUpdate = true;
    },
    update(dt, drift = 0) { // drift keeps it with the crew, which is running forward through it
      let shown = 0;
      bits.forEach((b, i) => {
        if (b.life > 0) {
          b.life -= dt;
          b.vy -= 14 * dt;
          b.x += b.vx * dt; b.y = Math.max(.02, b.y + b.vy * dt); b.z += (b.vz + drift) * dt; b.r += dt * 8;
          dummy.position.set(b.x, b.y, b.z);
          dummy.rotation.set(b.r, b.r * .7, 0);
          dummy.scale.setScalar(1);
        } else dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        if (b.life > 0) shown = i + 1;
      });
      mesh.count = shown;
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
