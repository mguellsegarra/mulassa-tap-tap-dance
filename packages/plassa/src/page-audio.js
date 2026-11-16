// A page's AudioContext lifecycle. audio-wake.js owns the shared unlock and checked recovery;
// this host owns the page listeners, iOS session, fade timing and continuous stall watch.
// The game says when something should sound (hearing) and handles a run's stall (stall).
// - Leaving (hidden, blur, pagehide): the sound fades (a bare suspend() left the device's last buffer behind: a stray note)
//   and the context stops. Back: an unlocked context resumes on its own when something should sound, and is checked.
// - iOS often keeps it stopped until a tap after another app or tab, or keeps it `running` with its clock standing still
//   (AirPods dropping out): stopped, and the next tap anywhere wakes it; reported only if that tap can't.
// - iOS's audio session: 'playback' while something sounds (the other app's music pauses, the ringer switch can't mute
//   it), 'ambient' when silent, 'auto' hidden; a running context even as 'ambient' pauses the other app, so a silent page stays stopped.
import { errors, errorName } from './errors.js';
import { resumeAudioContext, wakeAudioContext, createAudioRecovery } from './audio-wake.js';
import { pageActive } from './page-leave.js';

const STALL_MS = 1000;
const coarse = matchMedia('(pointer: coarse)');

export function createPageAudio(ctx, out, { hearing, stall = () => false }) {
  let hushT = 0, woke = false, epoch = 0, lastCt = NaN, stallT = null;
  const running = () => ctx.state === 'running';
  const silent = () => !!navigator.audioSession && !hearing();

  function session(restart = true) {
    const as = navigator.audioSession, type = document.hidden ? 'auto' : hearing() ? 'playback' : 'ambient';
    if (!as || as.type === type) return;
    try { as.type = type; } catch { return; } // older iOS
    // a running context keeps its 'ambient' route until it restarts; back only if nothing gave up playback meanwhile
    const back = () => as.type === 'playback' && resume();
    if (restart && type === 'playback' && running()) ctx.suspend().then(back, e => { errors.report('audio-route-restart-failed', { name: errorName(e) }); back(); });
  }
  function hush() {
    const t = ctx.currentTime;
    out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(0, t, .015); // Pop's fade, tuned on an iPhone: no click on a hidden tab (mulassa.cat's is 6 ms / 40 ms)
    clearTimeout(hushT);
    session(false); // hidden: 'auto', in case iOS freezes the timer below; never the route restart, which resumes
    hushT = setTimeout(() => ctx.suspend(), 80);
  }
  function unhush() {
    clearTimeout(hushT);
    const t = ctx.currentTime;
    out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(1, t, .02);
  }
  const wakeHost = {
    session, silent, unhush, resume,
    get woke() { return woke; }, set woke(value) { woke = value; },
    failed: e => errors.report('audio-resume-failed', { name: errorName(e), audioState: ctx.state }),
  };
  const recovery = createAudioRecovery({
    context: () => ctx, epoch: () => epoch, hearing, hush, wake, focused: pageActive,
    report: (kind, tags) => errors.report(kind, tags),
  });
  const { checkBack, stalled } = recovery;
  function resume() { return resumeAudioContext(ctx, wakeHost); }
  function wake() { wakeAudioContext(ctx, wakeHost); }
  function gesture() {
    if (recovery.gesture()) return;
    if (hearing() && !running()) wake();
    else if (hearing()) woke = true;
  }
  function activity(e) {
    if (!pageActive()) {
      epoch++;
      hush();
      // iOS, back from another tab or the URL bar: shown, but no focus until a tap
      if ((e?.type === 'visibilitychange' || (e?.type === 'blur' && coarse.matches)) && !document.hidden && woke) checkBack(e.type === 'blur');
    } else if (hearing()) {
      if (woke) { resume(); checkBack(); } // back from another app there is no gesture: it may resume, else the next tap wakes it
    } else hush(); // a hidden page may never have run hush()'s timer
  }
  document.addEventListener('visibilitychange', activity);
  addEventListener('blur', activity);
  addEventListener('focus', activity);
  addEventListener('pageshow', activity);
  addEventListener('pagehide', () => { epoch++; hush(); });

  // each frame: a clock standing still while something should sound. `stall()` returns true when the game handled it
  // (a run pauses: the pause's hush and Continua's wake inside a tap restart it); else it waits for the next tap.
  function watch(now) {
    const ct = ctx.currentTime, moved = ct !== lastCt;
    lastCt = ct;
    if (!woke || !hearing() || !pageActive() || (moved && running())) { stallT = null; return; }
    stallT ??= now;
    if (now - stallT > STALL_MS) { stallT = null; if (!stall()) stalled(); }
  }
  return { hush, resume, wake, gesture, watch };
}
