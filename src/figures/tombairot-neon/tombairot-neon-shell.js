// Green felt-scaled carapace, 4 plump red dorsal pompoms, dark-green leafy front garlands
// and crimson bow tie for El Tombairot (Gemini Neon version).
// Scales read the exact stepped carapace surface so none ever float or share a coplanar plane.
import {
  TOMBAIROT_NEON_PAL as P,
  TOMBAIROT_NEON_DIM as D,
  neonBoxC,
  neonConeProfile,
  neonShellProfile,
} from './tombairot-neon-palette.js';

const yShell = y => y - D.bodyY;

// Exact half-width of the 3-slice carapace core at (y, z) so side scales hug the rear curve tightly.
function neonShellWidthAt(y, z) {
  const { rx, zFront, zBack } = neonShellProfile(y);
  const depth = zFront - zBack;
  const za = zBack + depth * 0.26;
  const zb = zBack + depth * 0.11;
  if (z >= za) return rx;
  if (z >= zb) return rx * 0.84;
  return rx * 0.61;
}

export function addCarapaceNeon(v) {
  // 10 horizontal stepped tiers forming a solid, rounded emerald dome behind the yellow cone
  const TIERS = 10, yLo = 0.652, yHi = 1.74, th = (yHi - yLo) / TIERS;
  for (let k = 0; k < TIERS; k++) {
    const y0 = yLo + k * th;
    const { rx, zFront, zBack } = neonShellProfile(y0 + th * 0.5);
    const depth = zFront - zBack;
    const za = zBack + depth * 0.26;
    const zb = zBack + depth * 0.11;
    v.box(0, yShell(y0), (za + zFront) / 2, rx * 2, th, zFront - za, P.shellDark, 0);
    v.box(0, yShell(y0), (zb + za) / 2, rx * 1.68, th, za - zb, P.shellDark, 0);
    v.box(0, yShell(y0), (zBack + zb) / 2, rx * 1.22, th, zb - zBack, P.shellDark, 0);
  }
  // Wide upper shoulder mantle bridging carapace top smoothly up to the neck base (zero side yellow)
  v.box(0, yShell(1.66), -0.105, 0.42, 0.226, 0.29, P.shellDark, 0);

  // Dense, lush, shingled overlapping felt scales wrapping sides, upper dome and curved back
  const rows = [
    { y: 0.72, nSide: 6, nBack: 5, colF: P.shellLight, colM: P.shellMid, colR: P.shellMid },
    { y: 0.90, nSide: 6, nBack: 5, colF: P.shellLight, colM: P.shellMid, colR: P.shellMid },
    { y: 1.08, nSide: 6, nBack: 4, colF: P.shellLight, colM: P.shellMid, colR: P.shellMid },
    { y: 1.25, nSide: 5, nBack: 4, colF: P.shellLight, colM: P.shellMid, colR: P.shellDark },
    { y: 1.44, nSide: 5, nBack: 3, colF: P.shellMid, colM: P.shellMid, colR: P.shellDark },
    { y: 1.60, nSide: 4, nBack: 2, colF: P.shellMid, colM: P.shellDark, colR: P.shellDark },
  ];
  rows.forEach((row, r) => {
    const { rx, zFront, zBack } = neonShellProfile(row.y);
    const zSpan = zFront - (zBack + 0.16);
    const proud = 0.022 + (r % 3) * 0.005;
    const yOff = 0.011 + (r % 2) * 0.005;

    // Side flank scales anchored directly into neonShellWidthAt(y, z) -> zero floating corner scales
    for (const s of [-1, 1]) {
      for (let j = 0; j < row.nSide; j++) {
        const frac = (j + 0.38 + (r % 2) * 0.20) / row.nSide;
        if (frac > 0.95) continue;
        const z = zFront - 0.055 - frac * zSpan;
        const xSurf = neonShellWidthAt(row.y, z);
        const col = j < 2 ? row.colF : (j < 4 ? row.colM : row.colR);
        // Slightly vary scale depth by j so scale edges never coincide with tier slice boundaries
        const wZ = zSpan / row.nSide * 0.88;
        neonBoxC(v, s * (xSurf - 0.016 + proud), yShell(row.y + 0.025 + yOff), z, 0.076, 0.122, wZ, col);
        neonBoxC(v, s * (xSurf - 0.010 + proud), yShell(row.y - 0.060 + yOff), z, 0.064, 0.062, wZ * 0.72, col);
      }
    }

    // Rounded rear scales covering the whole back dome
    const backSpan = rx * 1.40;
    for (let j = 0; j < row.nBack; j++) {
      const frac = row.nBack === 1 ? 0 : (j / (row.nBack - 1) - 0.5);
      const x = frac * backSpan;
      const zCurve = zBack + Math.abs(frac) * 0.15;
      const wX = Math.min(0.162, backSpan / Math.max(1, row.nBack - 0.35));
      const col = r < 3 ? P.shellMid : (j % 2 === 0 ? P.shellMid : P.shellDark);
      const yRear = yOff + 0.009; // clear of side scales at rear corners (zero coplanarity)
      neonBoxC(v, x, yShell(row.y + 0.025 + yRear), zCurve - proud + 0.016, wX, 0.122, 0.074, col);
      neonBoxC(v, x, yShell(row.y - 0.060 + yRear), zCurve - proud + 0.010, wX * 0.72, 0.062, 0.062, col);
    }
  });

  // 4 bold, plump bright-red dorsal pompoms proudly crowning the horizontal spine ridge (photo1 & photo5)
  const pomZ = [-0.21, -0.355, -0.50, -0.645];
  pomZ.forEach((z, i) => {
    const ridgeY = 1.74 - i * 0.016;
    const sz = i === 3 ? 0.128 : 0.148;
    neonBoxC(v, 0, yShell(ridgeY + 0.052), z, sz, sz * 0.92, sz, P.red);
    neonBoxC(v, 0, yShell(ridgeY + 0.128), z, sz * 0.68, sz * 0.46, sz * 0.68, P.red);
  });
}

export function addFringeAndBowNeon(v) {
  // Bushy dark-green leafy garland sweeping along both front seams from skirt top to bow tie.
  // Clear offsets from yellow rings & carapace tiers guarantee zero coplanar faces.
  const TUFTS = 17;
  for (let i = 0; i < TUFTS; i++) {
    const y = D.coneBot - 0.014 + (i / (TUFTS - 1)) * (D.coneTop - D.coneBot + 0.018);
    const { rx, zSeam } = neonConeProfile(y);
    const alt = i % 2 ? 1 : -1;
    const jy = 0.008 * alt + 0.003;
    for (const s of [-1, 1]) {
      neonBoxC(v, s * (rx + 0.012 + alt * 0.014), yShell(y + jy), zSeam + 0.014, 0.114, 0.086, 0.094, P.fringeDark);
      neonBoxC(v, s * (rx + 0.048 - alt * 0.008), yShell(y + 0.020 + jy), zSeam + 0.048, 0.070, 0.066, 0.072, P.fringeLight);
    }
  }

  // Iconic bright crimson bow tie centred proudly on the front neck base (proud of top yellow rings)
  const yBow = 1.868;
  const { zFront } = neonConeProfile(yBow);
  neonBoxC(v, 0, yShell(yBow), zFront + 0.034, 0.074, 0.074, 0.096, P.redDark); // central knot
  for (const s of [-1, 1]) {
    neonBoxC(v, s * 0.068, yShell(yBow), zFront + 0.030, 0.070, 0.102, 0.056, P.red);        // inner flare
    neonBoxC(v, s * 0.136, yShell(yBow + 0.004), zFront + 0.018, 0.076, 0.154, 0.056, P.red); // outer wing
  }
}
