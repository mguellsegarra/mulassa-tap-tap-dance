// A lost WebGL context (a GPU reset, the browser reclaiming memory) on either canvas: three.js redraws once it is back, but
// meanwhile the run must not go on unseen, and a context that never comes back must say so. The main game's own owner is
// ui/pause-actions.js (bound to its state); this is the same contract for Pop's two canvases.
import { errors, errorName } from './errors.js';

const NO_RESTORE_MS = 5000; // on screen, as the main game: then the error card offers a reload

export function guardGpu(canvases, { lost, restored, dead }) {
  let timer = 0;
  const gone = new Set();
  function late() {
    timer = 0;
    if (!gone.size) return;
    if (document.hidden) { timer = setTimeout(late, NO_RESTORE_MS); return; } // hidden: the browser may restore it once back
    dead();
  }
  for (const c of canvases) {
    c.addEventListener('webglcontextlost', e => {
      e.preventDefault(); // asks the browser to restore it
      gone.add(c);
      lost(c);
      clearTimeout(timer);
      timer = setTimeout(late, NO_RESTORE_MS);
    });
    c.addEventListener('webglcontextrestored', () => {
      gone.delete(c);
      if (!gone.size) { clearTimeout(timer); timer = 0; }
      restored(c);
    });
  }
}

// No WebGL at all (disabled, a blocklisted GPU, Chrome blocking the site after a GPU crash): a card that says so, not the
// watchdog's «refresh» (mulassa.cat's stage.js contract). `make` builds the renderer; its throw still stops the boot.
export function rendererOrCard(make) {
  try { return make(); } catch (err) {
    const W = window.__gameBootWords || {};
    window.__mulassaBooted = 'no-webgl'; // errors.js: this warning, not a boot-failed one
    window.__gameFail?.(W.webglTitle, W.webglText);
    errors.report('webgl-unavailable', { phase: 'renderer-create', webgl2: String(typeof WebGL2RenderingContext !== 'undefined'), name: errorName(err) });
    errors.start();
    err.mulassaReported = true; // errors.js drops the uncaught copy
    throw err;
  }
}
