// The particles, one pool: bursts and flames as one instanced mesh.
import * as THREE from 'three';

const SPARKS = 1600, FLAME = ['#fff3d6', '#ffe066', '#f5c518', '#ff8a1e', '#ff5a1e'];

export function createSparks(scene) {
  const sparks = new THREE.InstancedMesh(new THREE.BoxGeometry(.2, .2, .2), new THREE.MeshBasicMaterial(), SPARKS);
  sparks.frustumCulled = false;
  scene.add(sparks);
  const P = Array.from({ length: SPARKS }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 1, g: 26 }));
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  let next = 0;

  function burst(c, colors, n = 26, power = 1) {
    for (let k = 0; k < n; k++) {
      const p = P[next], a = Math.random() * Math.PI * 2, s = (2 + Math.random() * 5) * power;
      Object.assign(p, { life: .6 + Math.random() * .5, x: c.x, y: 1.2, z: c.z, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: (4 + Math.random() * 8) * power, s: .6 + Math.random(), g: 26 });
      sparks.setColorAt(next, col.set(colors[k % colors.length]));
      next = (next + 1) % SPARKS;
    }
    sparks.instanceColor.needsUpdate = true;
  }

  // the blast's shock wave: a flat ring of embers racing out over the tiles from the culprit
  function ring(c, colors, n, speed) {
    for (let k = 0; k < n; k++) {
      const p = P[next], a = k / n * Math.PI * 2, v = speed * (.85 + Math.random() * .3);
      Object.assign(p, { life: .55 + Math.random() * .25, x: c.x, y: .35, z: c.z, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: 1.5 + Math.random() * 2, s: 1 + Math.random() * .8, g: 4 });
      sparks.setColorAt(next, col.set(colors[k % colors.length]));
      next = (next + 1) % SPARKS;
    }
    sparks.instanceColor.needsUpdate = true;
  }

  function flame(x, y, z, vx, vy, vz, life = .4) {
    const p = P[next];
    Object.assign(p, { life: life * (.7 + Math.random() * .6), x, y, z, vx, vy, vz, s: .7 + Math.random() * 1.1, g: -3 });
    sparks.setColorAt(next, col.set(FLAME[Math.floor(Math.random() * 5)]));
    next = (next + 1) % SPARKS;
    sparks.instanceColor.needsUpdate = true;
  }

  function step(dt) {
    let any = false;
    P.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= dt;
        p.vy -= p.g * dt;
        p.x += p.vx * dt; p.y = Math.max(.1, p.y + p.vy * dt); p.z += p.vz * dt;
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(p.x, p.z, 0);
        dummy.scale.setScalar(p.life > 0 ? p.s : .001);
        any = true;
      } else {
        dummy.position.set(0, -50, 0);
        dummy.scale.setScalar(.001);
      }
      dummy.updateMatrix();
      sparks.setMatrixAt(i, dummy.matrix);
    });
    sparks.instanceMatrix.needsUpdate = any || sparks.instanceMatrix.version === 0;
  }
  return { burst, ring, flame, step };
}
