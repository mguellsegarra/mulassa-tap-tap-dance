// One owner of the strip's real scroll position: keys, buttons and wheels retarget the same motion.
export function stripScroll(row, win, reduced) {
  let frame = 0, target = row.scrollLeft, position = target, velocity = 0, last = 0, end = null, tween = null;
  const clamp = x => Math.max(0, Math.min(Math.max(0, row.scrollWidth - row.clientWidth), x));
  const write = x => row.scrollTo({ left: x, behavior: 'instant' });
  function stop() {
    if (frame) win.cancelAnimationFrame(frame);
    frame = 0; velocity = 0; target = position = row.scrollLeft; end = null; tween = null;
  }
  function tick(now) {
    let dt = Math.min(0.05, Math.max(0, (now - last) / 1000)), x = position;
    last = now;
    if (tween) {
      const t = Math.max(0, Math.min(1, (now - tween.start) / tween.duration));
      position = tween.from + (target - tween.from) * (t * t * (3 - 2 * t));
      write(position);
      if (t === 1 || reduced()) {
        write(target); frame = 0; velocity = 0; tween = null;
        const done = end; end = null; done?.();
      } else frame = win.requestAnimationFrame(tick);
      return;
    }
    // Small integration steps keep the critically damped spring stable on a slow frame too.
    while (dt > 0) {
      const h = Math.min(dt, 1 / 120), distance = target - x;
      const acceleration = Math.max(-9000, Math.min(9000, 196 * distance - 28 * velocity));
      velocity = Math.max(-1800, Math.min(1800, velocity + acceleration * h));
      const next = x + velocity * h;
      if ((target - next) * distance < 0) { x = target; velocity = 0; } else x = next;
      dt -= h;
    }
    position = x; write(x);
    if (Math.abs(target - position) < 0.5 && Math.abs(velocity) < 8 || reduced()) {
      write(target); frame = 0; velocity = 0;
      const done = end; end = null; done?.();
    } else frame = win.requestAnimationFrame(tick);
  }
  function to(left, immediate = false, done = null, duration = 0) {
    target = clamp(left); end = done;
    tween = null;
    if (immediate || reduced() || !win.requestAnimationFrame) {
      const finish = end; stop(); write(clamp(left)); target = row.scrollLeft; finish?.(); return;
    }
    if (duration) tween = { from: row.scrollLeft, start: win.performance.now(), duration };
    if (!frame) { position = row.scrollLeft; last = win.performance.now(); frame = win.requestAnimationFrame(tick); }
  }
  return { to, by: delta => to((frame ? target : row.scrollLeft) + delta), stop, get target() { return frame ? target : row.scrollLeft; } };
}
