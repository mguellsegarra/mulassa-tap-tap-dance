// The Tombairot's measures, palette and outlines (no three.js here): the numbers its body, head and pose share.
// Metres, the ground at y 0, its front towards +z. Measured on the owner's photos and Ardit's 2019 video with an adult
// beside it as the ruler (research/bestiari/tombairot/README.md): about 3.4 m to the horn's tip and 3.7 m long.
export const TOMBA = {
  yellow: '#f6d31c', groove: '#d79f0e',                       // the foam rings and the shadow between two of them
  fringe: ['#1d6a38', '#2a8046'], window: '#141712',          // the leafy felt down both edges (and the tail), the carrier's window
  scale: ['#36a865', '#27958a', '#44b673'],                   // felt scales in two greens and a teal
  gold: ['#efc024', '#cf9a12'],                               // the gathered satin skirt: a fold in the light, one in the shade
  plush: '#3fb244', plushDark: '#1f6f2c', mask: '#f2d21b', black: '#15120f',
  red: '#d3202e', horn: '#dc4c60', mouth: '#8f1d2c', tongue: '#e3283a', ear: '#b0627a',
  shoe: '#2b3a67', sole: '#efe9dc', jeans: '#34425e',
};
// hem: the skirt's edge; waist: where the rings start (the skirt hangs from under the lowest: 23 % of the height);
// ring: a ring's thickness, two real pool noodles (22 real rings read as noise at phone size: 12 bold ones); neckRing
// and neckR: the neck's.
export const TOMBA_DIM = { hem: .05, waist: .9, ring: .13, rings: 12, neckRing: .11, neckR: .15 };
export const TOMBA_NECK_Y = TOMBA_DIM.waist + TOMBA_DIM.rings * TOMBA_DIM.ring; // 2.46: the cone's tip, the neck's pivot
// The neck: seven rings, each further forward than the one below and by a longer step (it curves over the children).
export const TOMBA_NECK_LEAN = [0, .01, .03, .06, .1, .15, .21];

const tombaLerp = (pts, y) => {
  let i = 0; while (i < pts.length - 2 && y > pts[i + 1][0]) i++;
  const [a, p] = pts[i], [b, q] = pts[i + 1];
  return p + (q - p) * Math.max(0, Math.min(1, (y - a) / (b - a)));
};
// A ring's radius, i from the waist up: a tall pointed beehive, upright for its lowest fifth and then narrowing steadily
// to the neck's own width (share of the cone's height -> radius, measured on the 2019 video's three-quarter view; its
// base is 0.82 of its height, as in the front views).
const TOMBA_PROFILE = [[0, .64], [.2, .64], [.4, .55], [.6, .38], [.8, .23], [1, TOMBA_DIM.neckR]];
export const tombaRingR = i => Math.round(tombaLerp(TOMBA_PROFILE, i / (TOMBA_DIM.rings - 1)) * 100) / 100;

// The scaled body: a row every 25 cm from TOMBA_ROWS_Z back, a tier every two rings up from the waist. A row is its
// tiers' half-widths, bottom first. The first row is the cone's own back (its scales lie on the rings, 3 cm proud: it
// hides the yellow), the second halfway to the loaf behind: a broad round-shouldered section as tall as the cone (it
// shows at both sides of the cone's tip from the front, as in the photos), with a low crest for the pompoms, that
// shortens and narrows to a round rump. Its length and its
// rump are the older edition's side photo (inferred for 2019).
export const TOMBA_ROWS_Z = -.03, TOMBA_ROW = .25, TOMBA_TIER = 2 * TOMBA_DIM.ring;
const TOMBA_LOAF = [.66, .66, .62, .59, .52, .38], TOMBA_CREST = .16;
const tombaCm = x => Math.round(x * 100) / 100;
const tombaWrap = TOMBA_LOAF.map((_, j) => tombaCm(tombaRingR(2 * j) + .03));
export const TOMBA_ROWS = [tombaWrap, TOMBA_LOAF.map((w, j) => Math.floor((w + tombaWrap[j]) * 50) / 100), ...Array(4).fill([...TOMBA_LOAF, TOMBA_CREST]), TOMBA_LOAF,
  TOMBA_LOAF.slice(1).map(w => tombaCm(w - .03)), TOMBA_LOAF.slice(2).map(w => tombaCm(w - .08)), TOMBA_LOAF.slice(3).map(w => tombaCm(w - .14))];
// A row's tiers, bottom first: [y0, y1, half-width]. The lowest hangs 8 cm over the skirt; the crest is 10 cm tall.
export const tombaTiers = row => row.map((w, j) => {
  const y = tombaCm(TOMBA_DIM.waist + j * TOMBA_TIER);
  return [j ? y : y - .08, tombaCm(j < TOMBA_LOAF.length ? y + TOMBA_TIER : y + .1), w];
});
