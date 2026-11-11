// A run's 3, 2, 1 over the board: each number pops in (game.css #count) on its own beat, then done(). step(dt) is called
// by the game's frame, so a paused game holds it; start() begins it again from the top.
export function createCountdown(el, { from = 3, each, beat, done }) {
  let left = 0, shown = 0;
  return {
    start() { left = from * each; shown = 0; },
    stop() { el.hidden = true; },
    step(dt) {
      left -= dt;
      const n = Math.ceil(left / each - 1e-6);
      if (n > 0 && n !== shown) {
        shown = n;
        el.hidden = false;
        const b = el.firstChild;
        b.textContent = n;
        b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; // the pop again, for each number
        beat(n);
      }
      if (left > 0) return;
      el.hidden = true;
      done();
    },
  };
}
