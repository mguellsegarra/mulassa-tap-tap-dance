// The page's clock, made virtual (shared by capture.mjs and logo.mjs): after window.__virt(), performance.now, Date,
// requestAnimationFrame, setTimeout and AudioContext.currentTime only move on window.__step(ms), so every captured frame
// is exactly the same slice of game time whatever the render costs. Pass it to page.addInitScript().
export function virtualClock() {
  const P = performance, realNow = P.now.bind(P), realRaf = requestAnimationFrame.bind(window), realST = setTimeout.bind(window), RealDate = Date;
  let virt = false, T = 0, dateOff = 0, seq = 0;
  let raf = [], timers = [];
  P.now = () => (virt ? T : realNow());
  const vDate = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(virt ? T + dateOff : RealDate.now()); } static now() { return virt ? T + dateOff : RealDate.now(); } };
  window.Date = vDate;
  window.requestAnimationFrame = cb => { const id = ++seq; if (virt) raf.push({ id, cb }); else realRaf(ts => (virt ? raf.push({ id, cb }) : cb(ts))); return id; };
  const realCAF = cancelAnimationFrame.bind(window);
  window.cancelAnimationFrame = id => { raf = raf.filter(r => r.id !== id); realCAF(id); };
  window.setTimeout = (cb, ms = 0, ...a) => { if (!virt) return realST(cb, ms, ...a); const id = 1e9 + ++seq; timers.push({ id, at: T + Math.max(0, ms), cb, a }); return id; };
  const realCT = clearTimeout.bind(window);
  window.clearTimeout = id => { timers = timers.filter(t => t.id !== id); realCT(id); };
  // the song clock: one timeline with performance.now, always "running" (the context is muted by ?mute anyway)
  const base = realNow();
  for (const C of [window.BaseAudioContext, window.AudioContext].filter(Boolean)) {
    Object.defineProperty(C.prototype, 'currentTime', { configurable: true, get() { return (P.now() - base) / 1000; } });
    Object.defineProperty(C.prototype, 'state', { configurable: true, get() { return 'running'; } });
    Object.defineProperty(C.prototype, 'outputLatency', { configurable: true, get() { return 0; } });
    Object.defineProperty(C.prototype, 'baseLatency', { configurable: true, get() { return 0; } });
  }
  // two real compositor frames: the canvas drawn by the last __step is on screen (a heavy frame, a finale beat's
  // fireworks, could otherwise be screenshotted before it was presented: the previous frame again)
  window.__settle = () => new Promise(r => realRaf(() => realRaf(r)));
  window.__virt = () => { if (!virt) { T = realNow(); dateOff = RealDate.now() - T; virt = true; } };
  window.__step = ms => {
    T += ms;
    for (;;) { // timers due by now, in order (a timer may add another)
      timers.sort((x, y) => x.at - y.at);
      if (!timers.length || timers[0].at > T) break;
      const t = timers.shift(); try { t.cb(...t.a); } catch (e) { console.error(e); }
    }
    const q = raf; raf = [];
    for (const r of q) { try { r.cb(T); } catch (e) { console.error(e); } }
  };
}


// CSS animations and transitions run on the browser's own clock: under the virtual one they are paused and moved on
// by each step instead (window.__stepAnims), so a pressed button's halo lasts as long in the video as in the game.
// The touch pad as a player's thumbs would press it (window.__padDriver): every note of the chart the autoplay hits,
// the button down for a short tap (a MANTÉN: to its end), both at once on a GUAPA, and a mash on a GLOBUS. Only the
// pad's look (its own .down class and GUAPA flash, src/ui/pad.js); the game's judging stays the autoplay's.
export function padDriver() {
  const TAP = 0.09, MASH = 1 / 12, HANDOFF = 0.06; // a thumb's press; the autoplay mashes at 12 taps/s (judge.js)
  const pad = document.getElementById('pad'), buttons = [...pad.querySelectorAll('button')];
  let was = new Set(), flash = false;
  const held = t => {
    const on = new Set(), chart = window.__dbg.G.chart || [];
    for (const n of chart) {
      if (n.t > t + 0.01) break;
      if (n.balloon) {
        if (t >= n.t && t < n.end - HANDOFF) { const k = Math.floor((t - n.t) / MASH); if ((t - n.t) - k * MASH < MASH * 0.6) on.add(k % 2 ? 'R' : 'L'); }
      } else if (t >= n.t && t < Math.max(n.t + TAP, n.end || 0)) {
        if (n.input === 'B') { on.add('L'); on.add('R'); } else on.add(n.input);
      }
    }
    return on;
  };
  window.__padDriver = () => {
    const G = window.__dbg.G;
    const on = G.state === 'play' ? held(window.__dbg.songTime()) : new Set();
    for (const b of buttons) b.classList.toggle('down', on.has(b.dataset.d));
    if (on.has('L') && on.has('R') && !(was.has('L') && was.has('R'))) { // GUAPA: restart the flash, as padFeedback does
      flash = !flash; pad.classList.remove(flash ? 'both-a' : 'both-b'); pad.classList.add(flash ? 'both-b' : 'both-a');
    }
    was = on;
  };
}
export function stepAnims() {
  window.__stepAnims = ms => {
    for (const a of document.getAnimations()) {
      if (a.playState === 'running') { a.pause(); a.currentTime = 0; a.__v = true; continue; } // new this step: from its start
      if (a.__v && a.playState === 'paused') a.currentTime = (a.currentTime || 0) + ms;
    }
  };
}
