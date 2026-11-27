// The Tombairot on the shared stage (scene/figure-scenes.js): shown, its colla, its motion and the share photo's pose.
import { tomba, tombaColla } from './tomba-objects.js';
import { tombaCollaTick, TOMBA_COLLA_SPOTS, poseTomba, tombaEnd, tombaGape, prepareTombaMotion } from './tomba-stage.js';
import { animPlayableTomba } from './tomba-play.js';

export const TOMBA_SCENE = {
  id: 'tombairot-valls',
  band: 'grallers', // its song is played by a cobla de grallers in the cercavila (a guess: the line-up the Bou already has)
  rotllana: true, // the plaça cleared to one round ring of people (scene/rotllana.js), as the Bou's
  prepare: prepareTombaMotion,
  root: () => tomba.frame,
  show(on) { if (tomba) tomba.frame.visible = on; },
  collaTick: tombaCollaTick, collaSpots: TOMBA_COLLA_SPOTS, colla: () => tombaColla,
  animate: animPlayableTomba,
  hero: { scale: 1, pose() { poseTomba(tombaEnd()); } }, // its last bow
  onBoth: tombaGape, // TOMBA!: a wide gape
};
