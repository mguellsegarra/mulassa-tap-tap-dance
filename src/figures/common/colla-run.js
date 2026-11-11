// The run's state a colla follows (tickColla's `run`), refreshed in place: no object a frame.
import { camera } from '../../scene/stage.js';
import { G } from '../../game/state.js';
import { REEL } from '../../game/showreel.js';
import { END_LENS } from '../../scene/framing.js';

export function collaRun(run) { const reel = REEL.on && G.state === 'select'; run.play = reel || G.state === 'play'; run.paused = !reel && !!G.paused; run.collapsed = !reel && !!G.collapseT; run.lens = G.state === 'select' || END_LENS.k ? camera.position : null; run.lensK = G.state === 'select' ? 1 : END_LENS.k; return run; } // (the showreel dances as a run does; lens: on the selector, and under a figure's end shot, framing.js lensShrink)
