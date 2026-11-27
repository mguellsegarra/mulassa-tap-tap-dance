// Body (arc-spaced pleated oval gold satin skirt, plump yellow stepped foam-ring cone with carved
// viewing window, carapace + garlands + bow tie), graceful curved neck and single carrier legs.
import * as THREE from 'three';
import { Vox } from '../../scene/models/voxel.js';
import {
  TOMBAIROT_NEON_PAL as P,
  TOMBAIROT_NEON_DIM as D,
  neonBoxC,
  neonConeProfile,
} from './tombairot-neon-palette.js';
import { addCarapaceNeon, addFringeAndBowNeon } from './tombairot-neon-shell.js';

const yB = y => y - D.bodyY; // world height -> body-local y

function addSkirtNeon(v) {
  // Smooth stepped oval skirt core in goldFold (recessed pleat valleys) + dark closed interior cap.
  const zc = -0.22;
  const top = D.coneBot + 0.025, bot = D.skirtBot + 0.012, h = top - bot;
  const layers = [
    [0.98, 0.86],
    [0.90, 1.12],
    [0.76, 1.30],
    [0.54, 1.38],
  ];
  for (const [w, d] of layers) v.box(0, yB(bot), zc, w, h, d, P.goldFold, 0);

  // Dark closed underside lining inset inside the skirt (painted underside; zero sky leak from low views)
  v.box(0, yB(0.12), zc, 0.72, 0.16, 1.04, P.inside, 0);

  // 28 vertical gold satin pleats spaced evenly by ellipse arc length (uniform folds on front, sides & back!)
  const rxP = 0.505, rzP = 0.705;
  const SAMPLES = 360, cum = [0];
  for (let i = 1; i <= SAMPLES; i++) {
    const a0 = ((i - 1) / SAMPLES) * Math.PI * 2, a1 = (i / SAMPLES) * Math.PI * 2;
    const dx = rxP * (Math.cos(a1) - Math.cos(a0)), dz = rzP * (Math.sin(a1) - Math.sin(a0));
    cum.push(cum[i - 1] + Math.hypot(dx, dz));
  }
  const totalLen = cum[SAMPLES], PLEATS = 28;
  const yMid = 0.25, yHi = D.coneBot - 0.004, yLo = D.skirtBot;
  for (let p = 0; p < PLEATS; p++) {
    const target = (p / PLEATS) * totalLen;
    let lo = 0, hi = SAMPLES;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < target) lo = m + 1; else hi = m; }
    const a = (lo / SAMPLES) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const px = rxP * ca, pz = zc + rzP * sa;
    const dr = (p % 2) * 0.004;
    const pw = 0.068 + 0.018 * Math.abs(sa);
    const pd = 0.068 + 0.018 * Math.abs(ca);
    v.box(px + ca * dr, yB(yMid), pz + sa * dr, pw, yHi - yMid, pd, P.gold, 0);
    v.box(px + ca * (0.013 + dr), yB(yLo), pz + sa * (0.013 + dr), pw + 0.006, yMid - yLo + 0.006, pd + 0.006, P.gold, 0);
  }
}

function addYellowConeNeon(v) {
  const N = 16;
  const dy = (D.coneTop - D.coneBot) / N;
  const winMin = 2, winMax = 4; // rings 2..4 (~0.83..1.06 m) carved for dark viewing window
  const winHW = 0.105;

  for (let i = 0; i < N; i++) {
    const y0 = D.coneBot + i * dy;
    const { u, rx, zFront } = neonConeProfile(y0 + dy * 0.5);
    // Pull upper rings' rear plane smoothly forward so the green shoulder mantle fully wraps the neck base
    const zBack = u > 0.70 ? -0.14 + ((u - 0.70) / 0.30) * 0.13 : -0.14;
    const gH = 0.018, rH = dy - gH;
    const isWin = i >= winMin && i <= winMax;

    // Soft golden groove between plump yellow foam rings
    const grx = rx - 0.016, gzF = zFront - 0.016;
    const gZ1 = zBack + (gzF - zBack) * 0.66;
    v.box(0, yB(y0), (zBack + gZ1) / 2, grx * 2, gH, gZ1 - zBack, P.yellowShade, 0);
    if (isWin) {
      const sideW = grx * 0.84 - winHW;
      for (const s of [-1, 1]) v.box(s * (winHW + sideW / 2), yB(y0), (gZ1 + gzF) / 2, sideW, gH, gzF - gZ1, P.yellowShade, 0);
    } else {
      v.box(0, yB(y0), (gZ1 + gzF) / 2, grx * 1.68, gH, gzF - gZ1, P.yellowShade, 0);
    }

    // Plump canary-yellow foam roll: rounder 3-slice arc (1.00 / 0.88 / 0.64)
    const yR = y0 + gH;
    const span = zFront - zBack;
    const z1 = zBack + span * 0.54;
    const z2 = zBack + span * 0.82;
    v.box(0, yB(yR), (zBack + z1) / 2, rx * 2, rH, z1 - zBack, P.yellow, 0);
    v.box(0, yB(yR), (z1 + z2) / 2, rx * 1.76, rH, z2 - z1, P.yellow, 0);
    if (isWin) {
      const outerX = rx * 0.64;
      const sideW = Math.max(0.05, outerX - winHW);
      for (const s of [-1, 1]) {
        v.box(s * (winHW + sideW / 2), yB(yR), (z2 + zFront) / 2, sideW, rH, zFront - z2, P.yellow, 0);
      }
    } else {
      v.box(0, yB(yR), (z2 + zFront) / 2, rx * 1.28, rH, zFront - z2, P.yellow, 0);
    }
  }

  // Dark recessed viewing window (espiell): inset cleanly deeper than yellow split slices
  const winY0 = D.coneBot + winMin * dy;
  const winY1 = D.coneBot + (winMax + 1) * dy;
  const { zFront: zWin } = neonConeProfile((winY0 + winY1) / 2);
  v.box(0, yB(winY0 + 0.012), zWin - 0.105, winHW * 2 + 0.03, winY1 - winY0 - 0.020, 0.06, P.inside, 0);

  // Bushy dark-green leafy framing around window (staggered sizes & offsets -> zero coplanar faces)
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const ty = winY0 + 0.014 + k * 0.064;
      const { zFront: zt } = neonConeProfile(ty);
      const alt = k % 2;
      neonBoxC(v, s * (winHW + 0.022 + alt * 0.006), yB(ty), zt - 0.004 + alt * 0.005,
        0.056 + alt * 0.006, 0.054, 0.084 + alt * 0.008, alt ? P.fringeLight : P.fringeDark);
    }
  }
  for (let k = -2; k <= 2; k++) {
    const { zFront: zt } = neonConeProfile(winY1);
    const alt = Math.abs(k) % 2;
    neonBoxC(v, k * 0.050, yB(winY1 + 0.016 + alt * 0.006), zt - 0.002 + alt * 0.006,
      0.052, 0.048 + alt * 0.006, 0.072 + alt * 0.006, alt ? P.fringeLight : P.fringeDark);
  }
}

export function buildTombairotNeonBody() {
  const body = new THREE.Group();
  body.name = 'body';
  body.position.y = D.bodyY;
  const v = new Vox();
  addSkirtNeon(v);
  addYellowConeNeon(v);
  addCarapaceNeon(v);
  addFringeAndBowNeon(v);
  body.add(v.mesh());
  return body;
}

export function buildTombairotNeonNeck() {
  const neck = new THREE.Group();
  neck.name = 'neck';
  neck.position.set(0, yB(D.neckPivotY), 0);
  const v = new Vox();

  // Base knuckle centred on the neck pivot (sunk deep into cone top & shoulder mantle)
  neonBoxC(v, 0, -0.025, -0.015, 0.28, 0.21, 0.28, P.shellDark);
  neonBoxC(v, 0, -0.025, 0.08, 0.23, 0.15, 0.13, P.yellowShade);

  // 8 crisp curved yellow foam rings climbing smoothly right up under the plush jaw (photo4/5)
  const RINGS = 8;
  const dy = (D.neckLen - 0.01) / RINGS;
  for (let i = 0; i < RINGS; i++) {
    const u = (i + 0.5) / RINGS;
    const y0 = 0.005 + i * dy;
    const zc = -0.034 * Math.sin(u * Math.PI) + D.headPivotZ * u;
    const w = 0.265 - 0.035 * u;
    const d = 0.24 - 0.015 * u;

    // Green back spine staggered in y so it never shares a horizontal plane with yellow grooves
    const backCol = i >= 6 ? P.headDark : P.shellDark;
    v.box(0, y0 - 0.007, zc - 0.048, w + 0.012, dy + 0.012, d * 0.66, backCol, 0);

    // Recessed golden groove + plump 2-step curved yellow foam ring
    const gH = 0.017, rH = dy - gH;
    v.box(0, y0, zc + 0.072, w - 0.032, gH, 0.115, P.yellowShade, 0);
    v.box(0, y0 + gH, zc + 0.066, w, rH, 0.088, P.yellow, 0);
    v.box(0, y0 + gH, zc + 0.128, w * 0.78, rH, 0.044, P.yellow, 0);

    // Bushy dark-green leafy tufts climbing both sides of the neck (staggered -> zero coplanarity)
    const alt = i % 2;
    for (const s of [-1, 1]) {
      neonBoxC(v, s * (w * 0.52 + 0.014 + alt * 0.007), y0 + dy * 0.46 + (alt ? 0.004 : -0.003),
        zc + 0.014 + (alt ? 0.016 : -0.010), 0.076 + alt * 0.006, 0.048, 0.078 + alt * 0.008,
        alt ? P.fringeLight : P.fringeDark);
    }

    // 3 plump stepped red crest bumps along the back of the neck (photo4 & photo5)
    if (i === 1 || i === 3 || i === 6) {
      neonBoxC(v, 0, y0 + dy * 0.5, zc - d * 0.5 - 0.045, 0.078, 0.092, 0.092, P.red);
    }
  }

  // Top knuckle centred on the head pivot so the head nods/turns freely without any gap
  neonBoxC(v, 0, D.neckLen, D.headPivotZ, 0.24, 0.22, 0.24, P.headDark);

  neck.add(v.mesh());
  return neck;
}

export function buildTombairotNeonLegs() {
  const legs = [];
  for (const s of [-1, 1]) {
    const shoe = new THREE.Group();
    shoe.name = s < 0 ? 'shoeL' : 'shoeR';
    shoe.position.set(s * D.footX, 0, D.footZ);
    const sv = new Vox();
    sv.box(0, 0, 0.035, 0.115, 0.045, 0.26, P.black, 0);     // flat sole at y = 0
    sv.box(0, 0.045, 0.005, 0.105, 0.055, 0.15, P.black, 0); // ankle upper
    shoe.add(sv.mesh());

    const pants = new THREE.Group();
    pants.name = s < 0 ? 'legL' : 'legR';
    pants.position.set(s * D.footX, D.ankleY, D.footZ);
    const pv = new Vox();
    pv.box(0, 0, 0, 0.145, 1.0, 0.155, P.pants, 0);
    pants.add(pv.mesh());

    legs.push({ shoe, pants, side: s });
  }
  return legs;
}
