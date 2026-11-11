// The Bou on the shared stage (scene/figure-scenes.js): shown, its colla, its motion and the share photo's pose.
import { Q } from '../../core/env.js';
import { bou, bouColla } from './bou-objects.js';
import { bouCollaTick, BOU_COLLA_SPOTS, poseBou, BOU_END, bouBrama, prepareBouMotion } from './bou-stage.js';
import { animPlayableBou } from './bou-play.js';
import { bouEndShot } from './bou-end-shot.js';
import { BOU_FINALE } from './bou-bills.js';
import { placeBouClip, BOU_CLIP_END } from './bou-clip.js';
import { camera } from '../../scene/stage.js';
import { G, clock } from '../../game/state.js';
import { REEL } from '../../game/showreel.js';
import { CALM } from '../../core/env.js';

// «Mira el ball»: its dance filmed by its own music video's cameras (bou-clip.js) up to the last chord, where its end shot
// takes over; and the selector left untouched (its UI faded: the whole screen is the picture; under the UI the showreel's
// shots stay, fitted to the free band, which a full-frame film cannot be). Reduced motion keeps the showreel's one still shot
let bouFilmT0 = null; // the clock when «Mira el ball» began: its opening creeps in from there, the music's wait included
function bouFilmShot() {
  const watching = G.state === 'play' && G.watch;
  if (!watching) bouFilmT0 = null;
  if (REEL.id !== 'bou-tradicional-valls' || CALM.matches) return;
  if (watching ? REEL.song && REEL.beat < BOU_CLIP_END : G.state === 'select' && REEL.on && REEL.idle) placeBouClip(camera, REEL.beat, bou.frame.rotation.y, watching ? clock - (bouFilmT0 ??= clock) : Infinity, !watching);
}
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
  endShot: bouEndShot, // its song's end: the camera comes down to its banknotes
  closeUp: () => BOU_FINALE.on && BOU_FINALE.k >= 1, // the crane down on the note: sharp from there until the notes go (not mid-crane: the new buffer costs a frame, seen while the shot still moves)
  filmShot: bouFilmShot,
};
