// A figure's filmShot (scene/figure-scenes.js, run by ui/frame-camera.js): «Mira el ball» filmed by its own music video's
// cameras (figures/common/clip-camera.js) up to `end`, and the idle selector too (its UI faded: the whole screen is the
// picture; under the UI the showreel's shots stay, fitted to the free band, which a full-frame film cannot be). Reduced
// motion keeps the showreel's one still shot. frameYaw(): the dance frame's turn on the plaça.
import { camera } from '../../scene/stage.js';
import { G, clock } from '../../game/state.js';
import { REEL } from '../../game/showreel.js';
import { CALM } from '../../core/env.js';

export function clipShot(id, place, end, frameYaw, idle = true) { // idle false: the idle selector keeps the showreel's shots
  let t0 = null; // the clock when «Mira el ball» began: its opening creeps in from there, the music's wait included
  return () => {
    const watching = G.state === 'play' && G.watch;
    if (!watching) t0 = null;
    if (REEL.id !== id || CALM.matches) return;
    if (watching ? REEL.song && REEL.beat < end : idle && G.state === 'select' && REEL.on && REEL.idle) place(camera, REEL.beat, frameYaw(), watching ? clock - (t0 ??= clock) : Infinity, !watching);
  };
}
