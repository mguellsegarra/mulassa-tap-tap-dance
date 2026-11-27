// The Tombairot's measures, palette and outlines (no three.js here): the numbers its body, head and pose share.
// Metres, the ground at y 0, its front towards +z. Measured on the owner's photos and Ardit's 2019 video with an adult
// beside it as the ruler (research/bestiari/tombairot/README.md): about 3.4 m to the horn's tip and 3.5 m long.
export const TOMBA_V1 = {
  yellow: '#f6d31c', groove: '#d79f0e',                       // the foam rings and the shadow between two of them
  fringe: ['#1d6a38', '#2a8046'], window: '#141712',          // the leafy felt down both edges, the carrier's window
  scale: ['#36a865', '#27958a', '#44b673'], lining: '#25a585', // felt scales in two greens and a teal, the wings' satin front
  gold: ['#efc024', '#cf9a12'], goldIn: '#6f530c',            // the gathered satin skirt, and inside it
  plush: '#3fb244', plushDark: '#1f6f2c', mask: '#f2d21b', white: '#f7f4ea', black: '#15120f',
  red: '#d3202e', horn: '#dc4c60', mouth: '#8f1d2c', tongue: '#e3283a', ear: '#b0627a',
  shoe: '#2b3a67', sole: '#efe9dc', jeans: '#34425e',
};
// hem: the skirt's edge at rest; waist: where the rings start (the skirt hangs from under the lowest); ring: a ring's
// thickness, two real pool noodles (22 real rings read as noise at phone size: 11 bold ones); cell: a felt scale.
export const TOMBA_V1_DIM = { hem: .04, waist: .8, ring: .13, rings: 11, neckRings: 4, neckR: .13, cell: .25 };
export const TOMBA_V1_NECK_Y = TOMBA_V1_DIM.waist + TOMBA_V1_DIM.rings * TOMBA_V1_DIM.ring; // 2.23: the top of the body, the neck's pivot

const tombaV1Lerp = (pts, y) => {
  let i = 0; while (i < pts.length - 2 && y > pts[i + 1][0]) i++;
  const [a, p] = pts[i], [b, q] = pts[i + 1];
  return p + (q - p) * Math.max(0, Math.min(1, (y - a) / (b - a)));
};
// A ring's radius, i from the waist up: a fat beehive, widest a little above the skirt, upright to mid height and then
// leaning in fast to the neck's width (share of the body's height -> radius, off the 2019 video's front view; 1 cm grid).
const TOMBA_V1_PROFILE = [[0, .56], [.15, .58], [.3, .57], [.45, .52], [.56, .44], [.7, .33], [.82, .25], [.92, .18], [1, .15]];
export const tombaV1RingR = i => i <= 0 ? .57 : Math.round(tombaV1Lerp(TOMBA_V1_PROFILE, (i - 1) / (TOMBA_V1_DIM.rings - 2)) * 100) / 100;
export const tombaV1ConeR = y => tombaV1RingR(Math.floor((y - TOMBA_V1_DIM.waist) / TOMBA_V1_DIM.ring + 1e-6));

// The scaled body: over both flanks and the whole back, open at the front where the rings show. Long and level, like a
// horse's (silhouette off the older edition's side photo: about as long as the figure is tall, its spine near the bow
// tie's height). Its front wings hang to the skirt's top; behind them the scales stop higher and the skirt is taller.
// Half-width and rear reach by height: a rounded loaf with a round rump.
const TOMBA_V1_SHELL_W = [[.7, .55], [1.75, .55], [1.95, .5], [2, .3], [2.3, .3]];
const TOMBA_V1_SHELL_BACK = [[.7, -2.3], [1.8, -2.3], [2, -2.15], [2.22, -2]];
export const TOMBA_V1_SCALES_Y = .72;  // the wings' hem, over the skirt's top
export const TOMBA_V1_BACK_HEM = 1.22; // the scales' hem behind the wings (z under -0.4), two scales higher
const tombaV1Oval = (x, z, a, back, front) => { // straight flanks back to `front`, then a boxy round end
  if (z >= front) return Math.abs(x) <= a;
  const t = (front - z) / (front - back);
  return t <= 1 && Math.abs(x) <= a * (1 - t ** 2.6) ** (1 / 2.6);
};
// Its front stops behind the rings' front corners, where the fringe runs: the fringe stays proud of the lining.
export const tombaV1ShellIn = (x, y, z) => y < 2.22 && y >= (z > -.4 ? TOMBA_V1_SCALES_Y : TOMBA_V1_BACK_HEM)
  && z <= .42 * tombaV1ConeR(Math.max(y, TOMBA_V1_DIM.waist)) - .05 && tombaV1Oval(x, z, tombaV1Lerp(TOMBA_V1_SHELL_W, y), tombaV1Lerp(TOMBA_V1_SHELL_BACK, y), -1.8);
// The skirt's outline at its top: the lowest ring's round front and the body's footprint behind it.
export const tombaV1SkirtIn = (x, z) => x * x + z * z <= .5 * .5 || (z <= .1 && tombaV1Oval(x, z, .55, -2.3, -1.8));
