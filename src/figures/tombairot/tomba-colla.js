// The Tombairot's colla: the Escola Candela's children and teachers in the school's orange T-shirts (the 2018 photos,
// Ardit's 2019 video: research/bestiari/tombairot/), on the shared colla bodies (scene/models/colla.js, common/colla.js).
// GAME ADAPTATION: in the cercavila they walk round it; here four stand round its dance and clap (two children, two
// adults), and a fifth child holds the school's «Candela» sign up on its staff, as the boy in front of it does in the
// photos. No one seated, no fire: a school figure.
import { createColla } from '../common/colla.js';

const TOMBA_TEE = { dye: false, rolled: true, legs: '#2c3347', sole: '#ece6da', upper: '#2b3a67', lace: null, top: '#f07f1d', shade: '#c65f0c' };
// (hair and skin: people.js's HAIR / SKIN shades, written out: the colla code is inlined apart from it in the tests)
const TOMBA_KID = [0.82, 0.7]; // a child's build: narrower and 70 % as tall (the bones keep their poses)
// The sign (photo1, the sheet): a white board edged in red, a blue band top and bottom, a red loop and «andela» in
// dark red; drawn on both faces (the camera may be behind it). Board 0.62 x 0.46 m on the staff's top (y: its top).
const SIGN = { white: '#f6f4ee', edge: '#c8283a', blue: '#2f5fa8', red: '#d3202e', ink: '#7a1d2a', gold: '#e7b43a' };
function candelaSign(v, top) {
  const y = top - 0.5, z = 0.035;
  v.box(0, y - 0.02, z, 0.66, 0.5, 0.03, SIGN.edge, 0).box(0, y, z, 0.62, 0.46, 0.034, SIGN.white, 0);
  for (const k of [1, -1]) {
    const f = z + k * 0.0185; // a face, a hair proud of the board
    v.plate(0, y + 0.38, f, 0.62, 0.08, 0, k, SIGN.blue).plate(0, y, f, 0.62, 0.08, 0, k, SIGN.blue);
    v.plate(-0.16 * k, y + 0.12, f, 0.16, 0.22, 0, k, SIGN.gold).plate(-0.16 * k, y + 0.15, f + k * 0.002, 0.1, 0.16, 0, k, SIGN.white); // the gold ring
    v.plate(-0.17 * k, y + 0.13, f + k * 0.004, 0.05, 0.2, 0, k, SIGN.red).plate(-0.12 * k, y + 0.13, f + k * 0.004, 0.1, 0.035, 0, k, SIGN.red); // the red C's loop
    v.plate(0.1 * k, y + 0.2, f, 0.3, 0.06, 0, k, SIGN.ink); // «andela»
  }
}
export const TOMBA_HELPER_LOOKS = [
  { ...TOMBA_TEE, build: TOMBA_KID, hair: '#6b4423' }, // a child
  { ...TOMBA_TEE, legs: '#34425e', hair: '#c9a45c', skin: '#f6d7bd' }, // a teacher, jeans
  { ...TOMBA_TEE, build: TOMBA_KID, hair: '#2b1d14', skin: '#c68d63', legs: '#151417' }, // a child, black leggings
  { ...TOMBA_TEE, legs: '#34425e', hair: '#15110f' }, // a teacher
  { ...TOMBA_TEE, build: TOMBA_KID, hair: '#6b4423', top: '#f4f2ee', staff: true, staffTop: candelaSign, legs: '#151417' }, // the sign's boy (white T-shirt, photo1)
];
// Its dance turns within 3.8 m of the plaça's centre (the pivot at the centre, the tail 2.8 m behind it, a 1.1 m walk):
// the four 5.3 m out, as the Bou's, the sign 5.6 m out across the plaça from the play camera, facing the centre (and
// so the camera), seen over the figure's back.
// a: their bearing round the centre in the dance frame (0 = its front); the camera is at TOMBA_CAM_IN.
export const TOMBA_CAM_IN = -0.7; // the play camera's bearing in the dance frame (tomba-objects.js TOMBA_YAW)
const tombaSpot = (id, a, r) => Object.freeze({ id, x: Math.sin(a) * r, z: Math.cos(a) * r, yaw: a + Math.PI });
export const TOMBA_SPOTS = Object.freeze([
  tombaSpot('W', TOMBA_CAM_IN - 1.0, 5.3), tombaSpot('N', TOMBA_CAM_IN + 2.3, 5.3), tombaSpot('S', TOMBA_CAM_IN + 1.0, 5.3),
  tombaSpot('E', TOMBA_CAM_IN - 2.3, 5.3), tombaSpot('C', TOMBA_CAM_IN + Math.PI - 0.55, 5.6),
]);
// a dance-frame point in the plaça, the frame turned to `yaw`
export const tombaToWorld = (x, z, yaw) => ({ x: x * Math.cos(yaw) + z * Math.sin(yaw), z: -x * Math.sin(yaw) + z * Math.cos(yaw) });
export const createTombaColla = profile => createColla({ profile, spots: TOMBA_SPOTS, seats: [], helperLooks: TOMBA_HELPER_LOOKS, name: 'tomba-colla' });
