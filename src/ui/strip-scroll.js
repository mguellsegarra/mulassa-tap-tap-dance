// One owner of a row's real scroll position: keys, buttons, pills and wheels retarget the same motion.
// Each request runs a timed curve from where the row is, at the speed it has, to the new target: the time grows
// a little with the distance and is capped (a far town no longer waits on a spring's tail). A target more than half a row
// away, asked at rest, is jumped to that half row first: every card slid past was laid out and painted (a far town's pill stalled old laptops).
export const scrollMs = distance => Math.min(450, 220 + 3.5 * Math.sqrt(distance));
const STEP = 0.07; // a stalled frame advances the curve at most this much (s): a hitch delays it, never skips it
export function stripScroll(row, win, reduced) {
  let frame = 0, target = row.scrollLeft, from = 0, span = 0, v0 = 0, elapsed = 0, duration = 0, last = 0;
  const clamp = x => Math.max(0, Math.min(Math.max(0, row.scrollWidth - row.clientWidth), x));
  const write = x => row.scrollTo({ left: x, behavior: 'instant' });
  // p(0)=0, p'(0)=v0, p(1)=1, p'(1)=p''(1)=0: a quick start, a soft landing; v0 in [0, 4] never overshoots.
  const curve = t => t * (v0 + t * ((6 - 3 * v0) + t * ((3 * v0 - 8) + t * (3 - v0))));
  const slope = t => (1 - t) * (1 - t) * (v0 + (12 - 4 * v0) * t);
  function stop() {
    if (frame) win.cancelAnimationFrame(frame);
    frame = 0; target = row.scrollLeft;
  }
  function finish() {
    write(target); frame = 0;
  }
  function tick(now) {
    const dt = Math.max(0, (now - last) / 1000); last = now;
    elapsed += Math.min(STEP, dt);
    if (elapsed >= duration || reduced()) { finish(); return; }
    write(from + span * curve(elapsed / duration));
    frame = win.requestAnimationFrame(tick);
  }
  function to(left, immediate = false) {
    if (immediate || reduced() || !win.requestAnimationFrame) {
      stop(); write(clamp(left)); target = row.scrollLeft; return;
    }
    // Carry the current speed (px/s) into the new curve, so a change of mind mid-way bends instead of stopping.
    const t = frame && duration ? elapsed / duration : 1, speed = t < 1 ? span * slope(t) / duration : 0;
    from = frame && t < 1 ? from + span * curve(t) : row.scrollLeft;
    target = clamp(left);
    const far = frame ? 0 : Math.abs(target - from) - row.clientWidth / 2; // from rest only: a moving row (a rapid wheel) keeps sliding
    if (far > 0) { from += Math.sign(target - from) * far; write(from); }
    span = target - from;
    duration = scrollMs(Math.abs(span)) / 1000; elapsed = 0;
    v0 = Math.abs(span) < 0.5 ? 0 : Math.max(-4, Math.min(4, speed * duration / span));
    if (!frame) { last = win.performance.now(); frame = win.requestAnimationFrame(tick); }
  }
  return { to, stop, get target() { return frame ? target : row.scrollLeft; } };
}
