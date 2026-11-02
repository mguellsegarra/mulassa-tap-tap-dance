// The real Plaça del Blat, from the private viewer's world files, turned so that the carrer de la Cort lies along the game's -z.
// The world is baked into game coordinates once, so everything shares one frame and no mesh needs a transform.
import * as THREE from 'three';
import { STREET_LENGTH, MESH_FROM } from './street.js';

const BASE = '/jocs/corre/world/';
const TILES = ['v_-2_-1.bin', 'v_-2_0.bin', 'v_-2_1.bin', 'v_-1_-2.bin', 'v_-1_-1.bin', 'v_-1_0.bin', 'v_-1_1.bin', 'v_0_-2.bin', 'v_0_-1.bin', 'v_0_0.bin', 'v_0_1.bin', 'v_1_-2.bin', 'v_1_-1.bin', 'v_1_0.bin'];
const FAR = 'far-low.bin';
const GROUND = { file: 'ground.bin', x0: -199.5, z0: -193, step: 2, nx: 201, nz: 201 };
// The Cort's axis at its mouth on the square, from the LiDAR long section S03, in the viewer's metres.
const MOUTH = [14, -16], LEN = Math.hypot(27, 9.5), DIR = [-27 / LEN, 9.5 / LEN];
const COS = -DIR[1], SIN = DIR[0]; // game x = x cos + z sin, game z = -x sin + z cos
const MOUTH_Y = 1.4;

export const ROTATION = Math.atan2(SIN, COS);
// A point of the real square in game coordinates.
export const toGame = (x, z) => {
  const dx = x - MOUTH[0], dz = z - MOUTH[1];
  return { x: dx * COS + dz * SIN, z: -STREET_LENGTH - dx * DIR[0] - dz * DIR[1] };
};

function bake(buffer) {
  const head = new DataView(buffer), vertices = head.getUint32(0, true), indices = head.getUint32(4, true);
  const ox = head.getInt32(8, true) / 100, oy = head.getInt32(12, true) / 100, oz = head.getInt32(16, true) / 100;
  const shorts = new Int16Array(buffer, 20, vertices * 8), signed = new Int8Array(buffer, 20, vertices * 16), bytes = new Uint8Array(buffer, 20, vertices * 16);
  const position = new Float32Array(vertices * 3), normal = new Float32Array(vertices * 3), color = new Uint8Array(vertices * 3), kind = new Uint8Array(vertices);
  for (let i = 0; i < vertices; i++) {
    const a = i * 3, s = i * 8, b = i * 16, dx = ox + shorts[s] / 100 - MOUTH[0], dz = oz + shorts[s + 2] / 100 - MOUTH[1];
    position[a] = dx * COS + dz * SIN;
    position[a + 1] = oy + shorts[s + 1] / 100 - MOUTH_Y;
    position[a + 2] = -STREET_LENGTH - dx * DIR[0] - dz * DIR[1];
    const nx = signed[b + 6] / 127, nz = signed[b + 8] / 127;
    normal[a] = nx * COS + nz * SIN;
    normal[a + 1] = signed[b + 7] / 127;
    normal[a + 2] = -nx * SIN + nz * COS;
    color[a] = bytes[b + 9]; color[a + 1] = bytes[b + 10]; color[a + 2] = bytes[b + 11];
    const k = bytes[b + 12]; // a roof's tile rows carry their fall line in the world: it turns with the world
    if (k > 15) {
      const fall = (k - 16) * Math.PI / 240 - ROTATION, wrapped = ((fall % Math.PI) + Math.PI) % Math.PI;
      kind[i] = 16 + Math.round(wrapped * 240 / Math.PI) % 240;
    } else kind[i] = k;
  }
  const raw = new Uint32Array(buffer.slice(20 + vertices * 16, 20 + vertices * 16 + indices * 4)), kept = [];
  // what lies back along the Cort is the game's own street
  for (let i = 0; i < indices; i += 3) {
    const a = raw[i], b = raw[i + 1], c = raw[i + 2];
    if (Math.max(position[a * 3 + 2], position[b * 3 + 2], position[c * 3 + 2]) < MESH_FROM) kept.push(a, b, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  g.setAttribute('color', new THREE.BufferAttribute(color, 3, true));
  g.setAttribute('surfaceKind', new THREE.BufferAttribute(kind, 1));
  g.setIndex(kept);
  g.computeBoundingSphere();
  return g;
}

const get = async name => {
  const res = await fetch(BASE + name);
  if (!res.ok) throw new Error(`${res.status} ${name}`);
  return res.arrayBuffer();
};

export async function loadWorld(scene, material, farMaterial) {
  const [ground, far, ...tiles] = await Promise.all([GROUND.file, FAR, ...TILES].map(get));
  const add = (buffer, m) => { const mesh = new THREE.Mesh(bake(buffer), m); scene.add(mesh); };
  add(far, farMaterial);
  tiles.forEach(t => add(t, material));
  const h = new Int16Array(ground), { x0, z0, step, nx, nz } = GROUND;
  // Height of the real ground under a game point; the game's own street is level.
  return (x, z) => {
    if (z > MESH_FROM) return 0;
    const dz0 = z + STREET_LENGTH, rx = MOUTH[0] + x * COS - dz0 * SIN, rz = MOUTH[1] + x * SIN + dz0 * COS;
    const fx = Math.max(0, Math.min(nx - 1.001, (rx - x0) / step)), fz = Math.max(0, Math.min(nz - 1.001, (rz - z0) / step)), i = Math.floor(fx), j = Math.floor(fz), a = fx - i, b = fz - j;
    const at = (p, q) => h[p * nz + q] / 100;
    return (at(i, j) * (1 - b) + at(i, j + 1) * b) * (1 - a) + (at(i + 1, j) * (1 - b) + at(i + 1, j + 1) * b) * a - MOUTH_Y;
  };
}
