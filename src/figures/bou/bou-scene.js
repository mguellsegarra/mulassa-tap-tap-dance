// The Bou on the shared stage (scene/figure-scenes.js): shown, its colla, its motion and the share photo's pose.
import { Q } from '../../core/env.js';
import { bou, bouColla } from './bou-objects.js';
import { bouCollaTick, BOU_COLLA_SPOTS, poseBou, BOU_END, bouBrama, prepareBouMotion } from './bou-stage.js';
import { animPlayableBou } from './bou-play.js';
import { placeBouClip, BOU_CLIP_END } from './bou-clip.js';
import { clipShot } from '../common/clip-shot.js';

// «Mira el ball»: its dance filmed by its own music video's cameras (bou-clip.js) up to the last chord
const bouFilmShot = clipShot('bou-tradicional-valls', placeBouClip, BOU_CLIP_END, () => bou.frame.rotation.y);
const NO_BOU = Q.has('nobou'); // dev: its colla and the plaça without the Bou itself (to film them)
export const BOU_SCENE = {
  id: 'bou-tradicional-valls',
  band: 'grallers',
  rotllana: true, // the plaça cleared to one round ring of people (scene/rotllana.js)
  prepare: prepareBouMotion,
  root: () => bou.frame,
  show(on) { if (bou) bou.frame.visible = on && !NO_BOU; },
  collaTick: bouCollaTick, collaSpots: BOU_COLLA_SPOTS, colla: () => bouColla,
  animate: animPlayableBou,
  hero: { scale: 0.8, pose() { poseBou(BOU_END); } }, // its last stance, back on its entrance facing
  onBoth: bouBrama, // a BRAMA: squashed, mouth wide, tongue out
  filmShot: bouFilmShot,
};
