// Palette, dimensions and shared contour functions for El Tombairot (Gemini Neon version).
// Every top-level name is suffixed/prefixed with Neon to stay unique under tests/render/load-main.mjs.

export const TOMBAIROT_NEON_PAL = {
  // Bright canary-yellow foam rings (anelles) + soft warm-gold groove
  yellow: '#f6dc32',
  yellowShade: '#dcb722',
  // Pleated gold satin skirt (faldilla de setí)
  gold: '#e8c130',
  goldFold: '#c4981c',
  // Two-tone cool emerald/sea-green felt carapace scales (closca)
  shellDark: '#126b4e',
  shellMid: '#26946e',
  shellLight: '#4cb58f',
  // Dark forest-green leafy front garland & window framing (serrell)
  fringeDark: '#195c27',
  fringeLight: '#2f8236',
  // Warm plush grass-green head & ears (distinct from cool teal carapace)
  head: '#40ab47',
  headLight: '#56c25a',
  headDark: '#2b7d33',
  earIn: '#7a3348',
  // Festive crimson accents (crest, brows, bow tie, forked tongue, dorsal pompoms)
  red: '#d9292f',
  redDark: '#99181f',
  // Eyes, teeth, viewing window recess & carrier
  eyeRim: '#f4d734',
  white: '#f8f5ec',
  black: '#181515',
  inside: '#161312',
  pants: '#252936',
};

// World-metre heights (floor = 0, total ~2.96 m to red head crest, facing +z).
export const TOMBAIROT_NEON_DIM = {
  bodyY: 0.72,       // body pivot height above ground (carrier hip height)
  skirtBot: 0.055,   // hem nearly brushes the ground (shoes peek slightly on bob/low view)
  coneBot: 0.68,     // bottom of yellow foam-ring cone / top of gold skirt
  coneTop: 1.90,     // bow tie / base of neck (~65% of total height)
  neckPivotY: 1.88,  // neck joint pivot height in world metres
  neckLen: 0.54,     // neck pivot to head pivot
  headPivotZ: 0.085, // gentle crane forward curve at top of neck
  footX: 0.145,      // carrier shoe lateral offset (one carrier inside)
  footZ: -0.08,      // carrier stance centre
  ankleY: 0.07,      // top of shoe / bottom of trouser leg
  hipY: 0.86,        // hip height inside skirt
};

export const TOMBAIROT_NEON_SIZE = { h: 2.96, w: 1.24, l: 1.56 };

// Centred-x/z, centred-y box helper on top of Vox.box (which takes bottom y).
export function neonBoxC(v, x, cy, z, w, h, d, color) {
  return v.box(x, cy - h / 2, z, w, h, d, color, 0);
}

// Shared yellow foam-ring cone profile for world y in [coneBot, coneTop].
// Returns { u, rx, zFront, zSeam } so rings, window, leafy fringe and bow tie share one surface.
export function neonConeProfile(y) {
  const { coneBot, coneTop } = TOMBAIROT_NEON_DIM;
  const u = Math.max(0, Math.min(1, (y - coneBot) / (coneTop - coneBot)));
  const c = Math.cos(u * Math.PI * 0.5);
  const bellW = Math.pow(Math.max(0, c), 1.15);
  const bellZ = Math.pow(Math.max(0, c), 1.06);
  const rx = 0.152 + 0.392 * bellW;       // 0.544 m at base -> 0.152 m at bow tie
  const zFront = 0.165 + 0.365 * bellZ;   // +0.53 m at base -> +0.165 m at bow tie
  const zSeam = 0.015 + 0.065 * bellW;
  return { u, rx, zFront, zSeam };
}

// Shared green carapace outer contour for world y in [0.65, 1.74].
// Broad rounded flanks sloping smoothly into a gently horizontal dorsal ridge for the 4 red pompoms.
export function neonShellProfile(y) {
  const s = Math.max(0, Math.min(1, (y - 0.65) / (1.74 - 0.65)));
  const dome = Math.sqrt(Math.max(0, 1 - s * s * 0.90));
  const rx = 0.145 + 0.43 * dome;          // 0.575 m flanks -> 0.145 m dorsal ridge
  const zFront = 0.055 - 0.045 * s;        // meets yellow core cleanly behind leafy seam
  const zBack = -0.58 - 0.38 * Math.pow(Math.max(0, 1 - s * s), 0.78); // -0.96 m base -> -0.58 m top ridge
  return { s, rx, zFront, zBack };
}
