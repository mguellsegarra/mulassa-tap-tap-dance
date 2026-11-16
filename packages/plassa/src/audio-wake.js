// Gesture unlock and checked recovery shared by the main game and Plassa pages.
// Hosts own their session, fade timing and error tags; recovery owns waiting for the next tap.
export function resumeAudioContext(ctx, { session, silent, unhush, failed }) {
  session();
  if (silent()) return Promise.resolve(false);
  unhush();
  const tapped = navigator.userActivation?.isActive;
  const refused = e => { if (tapped) failed(e); return false; };
  try { return Promise.resolve(ctx.resume?.()).then(() => ctx.state === 'running', refused); }
  catch (e) { return Promise.resolve(refused(e)); }
}

export function wakeAudioContext(ctx, host) {
  host.session();
  if (host.silent() || document.hidden || !document.hasFocus() || navigator.userActivation?.isActive === false) return;
  if (ctx.state !== 'running') host.resume(); else host.unhush();
  if (host.woke) return;
  const source = ctx.createBufferSource();
  source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  source.connect(ctx.destination); source.start();
  host.woke = true;
}

export function createAudioRecovery({ context, epoch, hearing, hush, wake, focused, report }) {
  const backMs = 700, moved = 0.1;
  let waiting = false, pending = null;
  const running = () => context()?.state === 'running';
  function confirm() {
    const from = context().currentTime;
    setTimeout(() => {
      if (!pending) return;
      if (running() && context().currentTime - from >= moved) { waiting = false; pending = null; return; }
      report(pending, { audioState: context().state });
      pending = null;
    }, backMs);
  }
  function gesture() {
    if (!waiting) return false;
    if (running()) { waiting = false; pending = null; return true; }
    wake();
    if (pending && focused()) confirm();
    return true;
  }
  function stalled(kind = 'menu-audio-stalled') {
    if (kind && waiting !== true) pending = kind;
    if (running()) hush();
    waiting = kind ? true : waiting || 'quiet';
  }
  function checkBack(left = false) {
    const from = context()?.currentTime, at = epoch();
    setTimeout(() => {
      if (at !== epoch() || document.hidden || !hearing()) return;
      if (running() && context().currentTime - from >= moved) return;
      stalled(left ? null : 'audio-not-back');
    }, backMs);
  }
  return { gesture, stalled, checkBack };
}
