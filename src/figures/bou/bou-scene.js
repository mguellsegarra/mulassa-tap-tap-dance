// The Bou on the shared stage (scene/figure-scenes.js): shown, its colla, its motion and the share photo's pose.
import { Q } from '../../core/env.js';
import { bou, bouColla } from './bou-objects.js';
import { bouCollaTick, BOU_COLLA_SPOTS, poseBou, BOU_END, bouBrama } from './bou-stage.js';
import { animPlayableBou } from './bou-play.js';
import { bouEndShot } from './bou-end-shot.js';

const NO_BOU = Q.has('nobou'); // dev: its colla and the plaça without the Bou itself (to film them)
export const BOU_SCENE = {
  id: 'bou-tradicional-valls',
  root: () => bou.frame,
  show(on) { if (bou) bou.frame.visible = on && !NO_BOU; },
  collaTick: bouCollaTick, collaSpots: BOU_COLLA_SPOTS, colla: () => bouColla,
  animate: animPlayableBou,
  hero: { scale: 0.8, pose() { poseBou(BOU_END); } }, // its last stance, back on its entrance facing
  onBoth: bouBrama, // a BRAMA: squashed, mouth wide, tongue out
  endShot: bouEndShot, // its song's end: the camera comes down to its banknotes
};
