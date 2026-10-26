// The run's state a colla follows (tickColla's `run`), refreshed in place: no object a frame.
import { camera } from '../../scene/stage.js';
import { G } from '../../game/state.js';
import { REEL } from '../../game/showreel.js';

export function collaRun(run) { const reel = REEL.on && G.state === 'select'; run.play = reel || G.state === 'play'; run.paused = !reel && !!G.paused; run.collapsed = !reel && !!G.collapseT; run.lens = G.state === 'select' ? camera.position : null; return run; } // (the showreel dances as a run does; lens: on the selector, framing.js lensShrink)
