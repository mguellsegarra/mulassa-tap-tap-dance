// The small voxel props: the goodies and the petard. Each stands on y = 0 at about the Figures' height.
import { Vox } from '../../../scene/models/voxel.js';

const stack = (v, rows, color) => { // a rounded body: rows of [y, width]
  for (const [y, w, h = .24] of rows) v.box(0, y, 0, w, h, w, color, 0);
  return v;
};

export function buildPetard() {
  const v = new Vox(), R = 1.15, S = .2, cy = R + .02;
  // a real ball, shell only: lit from the top left so it reads as round from the board's high camera
  for (let x = -R; x <= R; x += S) for (let y = -R; y <= R; y += S) for (let z = -R; z <= R; z += S) {
    const d = Math.hypot(x, y, z);
    if (d > R || d < R - S * 1.8) continue;
    const light = (-x * .5 + y * .75 + z * .45) / R;
    v.box(x, cy + y, z, S, S, S, light > .9 ? '#a9a6b8' : light > .5 ? '#34323e' : light > -.1 ? '#22202a' : '#15141b', 0);
  }
  v.box(0, cy + R - .08, 0, .62, .32, .62, '#6f6c7c', 0).box(0, cy + R + .24, 0, .44, .08, .44, '#8d8a9c', 0); // the collar
  // the fuse curling out, and its spark
  for (const [x, y] of [[0, .32], [.07, .46], [.17, .58], [.3, .67], [.45, .72], [.6, .72]]) v.box(x, cy + R + y, 0, .13, .15, .13, '#e8d8b8', 0);
  const tipX = .74, tipY = cy + R + .76;
  v.box(tipX, tipY - .17, 0, .34, .34, .34, '#ff8a1e', 0).box(tipX, tipY - .1, 0, .2, .2, .36, '#fff3d6', 0);
  for (const [dx, dy, dz] of [[.32, 0, 0], [-.3, .12, 0], [0, .32, 0], [.22, .22, .12], [.22, -.24, -.1], [0, 0, .32], [0, 0, -.32]]) v.box(tipX + dx, tipY + dy - .05, dz, .11, .11, .11, '#ffe066', 0);
  return v.mesh();
}

export function buildCalcot() {
  const v = new Vox();
  v.box(0, 0, 0, .46, .22, .46, '#26201c', 0).box(0, .22, 0, .5, .3, .5, '#3a2c22', 0).box(0, .52, 0, .46, .14, .46, '#5a4636', 0); // the charred foot
  v.box(0, .66, 0, .4, 1.1, .4, '#f4efe4', 0).box(0, 1.76, 0, .34, .4, .34, '#d6e6a6', 0).box(0, 2.16, 0, .28, .3, .28, '#8fbf63', 0);
  // long thin blades parting from the stem, not stubby blocks
  for (const [dx, dz, n] of [[-.075, 0, 9], [.075, 0, 10], [0, .07, 8], [0, -.07, 7], [-.04, -.04, 6]]) {
    for (let i = 0; i < n; i++) v.box(dx * (i + 1) * .6, 2.46 + i * .17, dz * (i + 1) * .6, .11, .2, .11, i > n - 3 ? '#2f7a3a' : '#3f8a45', 0);
  }
  // its romesco, in a clay bowl beside it
  for (const [y, w, h, c] of [[0, .62, .1, '#8a4a2a'], [.1, .86, .14, '#a35a32'], [.24, .96, .1, '#a35a32']]) v.box(.95, y, .3, w, h, w, c, 0);
  return v.box(.95, .3, .3, .76, .07, .76, '#d9642c', 0).mesh();
}

export function buildCampanar() {
  const stone = '#c9a878', dark = '#8a6a4a', v = new Vox();
  v.box(0, 0, 0, 1.5, .25, 1.5, dark, 0).box(0, .25, 0, 1.2, 1.5, 1.2, stone);
  v.box(0, 1.75, 0, 1.3, .12, 1.3, dark, 0).box(0, 1.87, 0, 1.12, .9, 1.12, stone);
  for (const s of [-1, 1]) v.box(s * .57, 2, 0, .02, .55, .42, '#2a1a10', 0).box(0, 2, s * .57, .42, .55, .02, '#2a1a10', 0);
  v.box(0, 2.1, 0, .34, .3, .34, '#f5c518', 0); // the bell
  v.box(0, 2.77, 0, 1.25, .1, 1.25, dark, 0);
  for (const [y, w] of [[2.87, .9], [3.07, .65], [3.27, .4], [3.47, .2]]) v.box(0, y, 0, w, .2, w, '#6f8f8a', 0);
  return v.box(0, 3.67, 0, .08, .3, .08, '#f5c518', 0).box(0, 3.8, 0, .24, .07, .07, '#f5c518', 0).mesh();
}

export function buildCarretilla() {
  const v = new Vox();
  v.box(-.5, 0, 0, .34, .1, .34, '#3a2c22', 0).box(-.5, .1, 0, .16, 1.75, .16, '#6b4a2b', 0); // the pole it's held on
  for (let i = 0; i < 6; i++) { // the tube, tilted up, spitting fire from its mouth
    const x = -.75 + i * .24, y = 1.65 + i * .13;
    v.box(x, y, 0, .3, .42, .42, i === 1 || i === 4 ? '#f5c518' : '#c0283c', 0);
  }
  v.box(.52, 2.28, 0, .1, .42, .42, '#26222a', 0);
  const FIRE = ['#fff3d6', '#ffe066', '#f5c518', '#ff8a1e', '#ff5a1e'];
  for (let i = 0; i < 26; i++) { // a widening shower, hot near the mouth; fixed spots so it reads the same every load
    const d = (i + 1) / 26, a = i * 2.4;
    const x = .7 + d * 1.15, y = 2.5 + d * .75 - d * d * 1.5 + Math.sin(a) * d * .5, z = Math.cos(a) * d * .55;
    const size = .24 - d * .1;
    v.box(x, y, z, size, size, size, FIRE[Math.min(4, Math.floor(d * 5))], 0);
  }
  return v.mesh();
}
