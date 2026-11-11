// A home's music: a tune rendered once to a file (Pop's: tools/music/build_pop_menu.py; the selector's: build_games_menu.py),
// so the home spends nothing on it. It starts on the tune's first note, faded in, and loops for good; stop() fades it out.
// url and loop (its points) come from the page, so this runs in the tests (tests/jocs/pop-menu-music.mjs) too.
export function createMenuMusic(ctx, out, { url, loop }) {
  const gain = ctx.createGain();
  gain.connect(out);
  let buffer = null, loading = null, src = null, wanted = false, waiting = false;
  const load = () => (loading ??= fetch(url).then(r => r.arrayBuffer()).then(a => ctx.decodeAudioData(a)).then(b => { buffer = b; },
    () => { loading = null; })); // offline: tried again on the next home
  function begin() {
    if (!wanted || src || !buffer) return;
    // only once the context runs: scheduled while suspended, iOS woke it with the fade in already over (the first note at full blast)
    if (ctx.state !== 'running') {
      if (!waiting) { waiting = true; ctx.addEventListener?.('statechange', () => { waiting = false; begin(); }, { once: true }); }
      return;
    }
    src = Object.assign(ctx.createBufferSource(), { buffer, loop: true, loopStart: loop.start, loopEnd: loop.end });
    src.connect(gain);
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 1); // a second's fade in: the tune's first note, never a jolt
    src.start(t);
  }
  return {
    play() { wanted = true; load().then(begin); },
    // into a run (or away): a short fade, then it is let go
    stop() {
      wanted = false;
      if (!src) return;
      const s = src, t = ctx.currentTime;
      src = null;
      if (ctx.state !== 'running') { gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(0, t); s.stop(); return; } // suspended since: cut at once
      // its fade in may still be pending (it ramps up for a second): dropped, or it would bring the music back under the count
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.setTargetAtTime(0, t, .05);
      s.stop(t + .3);
    },
  };
}
