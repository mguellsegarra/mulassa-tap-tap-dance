import * as THREE from 'three';
import { ClothGridAstra } from './cloth-grid.js';

function profileAstra(y) {
  const t = Math.max(0, Math.min(1, (y - 0.78) / 1.4));
  const rx = 0.585 - 0.47 * t ** 1.35;
  const bend = Math.max(0, (y - 2.18) / 0.64);
  const nose = 0.58 - 0.22 * t + 0.2 * bend * bend;
  const dome = Math.min(1, Math.max(0, (y - 1.27) / 0.89));
  const rear = -0.95 + 1.1 * (1 - Math.sqrt(1 - dome * dome)) + 0.2 * bend * bend;
  return { rx, rz: (nose - rear) / 2, z: (nose + rear) / 2 };
}

function mantleAstra() {
  const grid = new ClothGridAstra([0.041, 0.065 / 3, 0.041], [-0.738, 0, -1.066], [36, 134, 45]);
  // The lateral gold panel continues under the felt. The yellow rings stay exposed at the front.
  grid.stamp([-0.69, 0.055, -1.02], [0.69, 2.84, 0.68], (x, y, z) => {
    const { rx, rz, z: center } = profileAstra(y);
    const angle = Math.atan2(x / rx, (z - center) / rz),
      a = Math.abs(angle);
    const r = Math.hypot(x / rx, (z - center) / rz);
    const pitch = 0.065;
    const band = Math.floor((y - 0.78) / pitch);
    const groove = (y - 0.78) / pitch - band < 1 / 3;
    const skirt = y < 0.78;
    const pleat = Math.cos(23 * angle + 0.34 * Math.sin(2 * y + angle));
    const row = Math.floor((y - 0.75) / 0.16);
    const lap = Math.cos(12 * angle + (row % 2) * Math.PI);
    const scallop = (y - 0.052 * lap) / 0.16;
    const tile = Math.floor(scallop),
      lip = scallop - tile;
    const edge = 1.25 + 0.065 * Math.cos(39 * y);
    const tailHem = 0.79 + 0.3 * Math.max(0, -Math.cos(angle)) ** 2;
    const felt = !skirt && a > edge && y > tailHem;
    let outer = 1;
    if (skirt || (!felt && a > edge)) outer += 0.038 * pleat;
    else if (felt) outer += (0.009 + 0.024 * (1 - lip)) / rx;
    else outer += (groove ? -0.019 : 0.014) / rx;
    if (r > outer) return;
    // A simple cavity under the skirt leaves room for the carrier.
    if (y < 1.14 && Math.hypot(x / 0.42, (z + 0.19) / 0.57) < 1 && r < 0.9) return;
    if (skirt || (!felt && a > edge)) {
      if (pleat > 0.5) return 0xf6c75b;
      return pleat < -0.58 ? 0xb98030 : 0xe2aa42;
    }
    if (felt) {
      if (a - edge < 0.2 || y > 2.18) return lap > 0 ? 0x287347 : 0x235b37;
      if (lip < 0.22) return 0x226f63;
      const col = Math.floor(((angle * 12) / Math.PI + tile) / 2);
      return [0x1b8b72, 0x389f85, 0x4aaf92, 0x268574][Math.abs(tile * 7 + col * 3) % 4];
    }
    if (Math.abs(x) < 0.108 && y > 0.91 && y < 1.19 && z > center) return;
    if (Math.abs(Math.abs(x) - 0.118) < 0.019 && y > 0.89 && y < 1.2 && z > center) return 0x276543;
    return groove ? 0xd3a323 : band % 3 === 0 ? 0xffdf45 : 0xffda40;
  });
  // A dark gauze panel sits inside the actual cutout.
  grid.stamp([-0.14, 0.885, 0.375], [0.14, 1.21, 0.427], (x, y, z) => {
    if (Math.abs(x) > 0.124 || y < 0.905 || y > 1.19 || z < 0.392) return 0x392e26;
    return 0x272c28;
  });
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const y = 0.924 + i * 0.081,
        { rx, rz, z } = profileAstra(y);
      const x = s * 0.123;
      grid.oval(x, y, z + rz * Math.sqrt(1 - (x / rx) ** 2), 0.032, 0.053, 0.035, 0x286e42, s * 0.27);
    }

    for (let i = 0; i < 19; i++) {
      const y = 0.83 + i * 0.073,
        { rx, rz, z } = profileAstra(y);
      grid.oval(s * rx * 0.95, y, z + rz * 0.31, 0.060, 0.055, 0.064, i % 3 === 1 ? 0x458951 : 0x286e42, s * 0.78);
    }
  }
  grid.stamp([-0.155, 2.10, 0.348], [0.155, 2.26, 0.43], (x, y, z) => {
    const wing = Math.abs(x) / 0.155;
    if (wing <= 1 && Math.abs(y - 2.18) < 0.023 + 0.055 * wing && z < 0.39 + wing * 0.028) return 0xbf2637;
  });
  for (const y of [2.52, 2.66]) {
    const { z, rz } = profileAstra(y);
    grid.oval(0, y, z - rz, 0.036, 0.063, 0.049, 0xc43b47);
  }
  grid.oval(0, 2.174, 0.414, 0.044, 0.05, 0.035, 0xea404b);
  for (const z of [-0.56, -0.38, -0.2, -0.02]) {
    let y = 1.6;
    while (y < 2.18 && profileAstra(y).z - profileAstra(y).rz < z) y += 0.005;
    grid.oval(0, y - 0.014, z, 0.073, 0.06, 0.083, 0xce3540);
  }
  return grid.mesh('mantell-Astra');
}

function plushHeadAstra() {
  const g = new ClothGridAstra(0.02, [-0.44, -0.32, -0.24], [44, 52, 45]);
  g.oval(0, 0.19, 0.027, 0.212, 0.264, 0.202, 0x49a457);
  g.oval(0, 0.07, 0.21, 0.181, 0.143, 0.253, 0x52a857);
  // A curved smile between the projecting muzzle and the lighter lower jaw.
  g.oval(0, 0.016, 0.288, 0.155, 0.091, 0.199, 0x81313c);
  g.oval(0, -0.029, 0.25, 0.156, 0.061, 0.213, 0x68ae66);
  g.oval(0, 0.119, 0.323, 0.191, 0.117, 0.22, 0x6bbd63);
  for (const s of [-1, 1]) {
    g.oval(s * 0.105, 0.205, 0.415, 0.035, 0.016, 0.044, 0x367d42);
    g.oval(s * 0.265, 0.326, -0.027, 0.133, 0.048, 0.065, 0x559d52, -s * 0.31);
    g.oval(s * 0.296, 0.321, 0.014, 0.069, 0.019, 0.024, 0x86b767, -s * 0.31);
    g.oval(s * 0.091, 0.308, 0.167, 0.082, 0.091, 0.063, 0xe5b444);
    g.oval(s * 0.091, 0.311, 0.206, 0.06, 0.07, 0.047, 0xfff3d1);
    g.oval(s * 0.083, 0.309, 0.244, 0.034, 0.046, 0.022, 0x282d2b);
    g.oval(s * 0.083 - 0.012, 0.329, 0.26, 0.013, 0.015, 0.009, 0xffffff);
    for (let j = -1; j <= 1; j++) {
      g.oval(s * (0.088 + j * 0.048), 0.402 - 0.025 * j ** 2, 0.172, 0.049, 0.027, 0.043, 0xc44047, -s * j * 0.65);
    }
    g.oval(s * 0.112, 0.035, 0.408, 0.023, 0.034, 0.02, 0xf9e4ba);
  }
  for (let i = 0; i < 3; i++) g.oval(0, 0.43 - i * 0.06, -0.004 - i * 0.071, 0.049, 0.096 - i * 0.01, 0.055, 0xc23543);
  for (let i = 0; i < 8; i++) {
    g.oval(0.012 + i * 0.004, -0.012 - i * 0.015, 0.408 + i * 0.009, 0.05 - i * 0.002, 0.032, 0.045, 0xe44a54);
  }
  for (const s of [-1, 1])
    for (let i = 0; i < 5; i++) {
      g.oval(0.041 + s * 0.012 * i, -0.117 - 0.014 * i, 0.471 + 0.006 * i, 0.021 - i * 0.002, 0.024, 0.026, 0xe44a54);
    }
  return g.mesh('cap-Astra');
}

export function buildTombairotAstra() {
  const root = new THREE.Group(),
    body = new THREE.Group(),
    head = plushHeadAstra();
  const mantle = mantleAstra();
  head.position.set(0.006, 2.792, 0.421);
  body.add(mantle, head);
  const grid = new ClothGridAstra(0.035, [-0.525, 0, -0.42], [30, 41, 24]);
  grid.oval(0, 0.85, -0.1, 0.2, 0.3, 0.15, 0x303643);
  grid.oval(0, 1.12, -0.11, 0.46, 0.12, 0.14, 0x3a4245);
  for (const s of [-1, 1]) {
    grid.oval(0.106 * s, 0.447, -0.11, 0.087, 0.36, 0.093, 0x353943);
    grid.oval(0.106 * s, 0.096, -0.066, 0.081, 0.094, 0.144, 0x43392f);
  }
  const carrier = grid.mesh('portador-Astra');
  root.add(body, carrier);
  const rig = { root, body, head, mantle, carrier };
  poseTombairotAstra(rig, 0);
  return rig;
}

// One four-second sway. The shoes remain on the floor as the carrier turns the figure.
export function poseTombairotAstra(rig, t = 0) {
  const a = (t * Math.PI) / 2;
  rig.body.rotation.set(0.009 * Math.sin(2 * a), 0.065 * Math.sin(a), 0.017 * Math.sin(a));
  rig.head.rotation.set(0.13 + 0.048 * Math.sin(2 * a), 0.035 + 0.1 * Math.sin(a), 0.016 + 0.034 * Math.sin(a));
}
