// A lost WebGL context (a GPU reset, the browser reclaiming memory) on either canvas: three.js redraws once it is back, but
// meanwhile the run must not go on unseen, and a context that never comes back must say so. The main game's own owner is
// ui/pause-actions.js (bound to its state); this is the same contract for Pop's two canvases.
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
