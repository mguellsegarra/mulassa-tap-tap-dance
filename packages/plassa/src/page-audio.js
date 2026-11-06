// A game page's AudioContext through the page's life, consolidated from mulassa.cat's own (platform/audio.js suspend and
// wake, platform/audio-session.js, ui/audio-resume.js, ui/pause-actions.js's page activity and watchAudio), which keeps
// its copy until it moves onto this base. One context and its last gain node (`out`); the game says when something
// should sound (`hearing`) and what a stalled clock does (`stall`). Pausing a run on leaving is page-leave.js's.
// - Leaving (hidden, blur, pagehide): the sound fades (a bare suspend() left the device's last buffer behind: a stray note)
//   and the context stops. Back: an unlocked context resumes on its own when something should sound, and is checked.
// - iOS often keeps it stopped until a tap after another app or tab, or keeps it `running` with its clock standing still
//   (AirPods dropping out): reported once, stopped, and the next tap anywhere wakes it.
// - iOS's audio session: 'playback' while something sounds (the other app's music pauses, the ringer switch can't mute
//   it), 'ambient' when silent, 'auto' hidden; a running context even as 'ambient' pauses the other app, so a silent page stays stopped.
import { errors, errorName } from './errors.js';
import { pageActive } from './page-leave.js';

const BACK_MS = 700; // the unprompted resume() takes a moment even when iOS allows it
const MOVED = 0.1; // seconds of audio clock that prove the sound came back
const STALL_MS = 1000;
const coarse = matchMedia('(pointer: coarse)');

export function createPageAudio(ctx, out, { hearing, stall = () => false }) {
  let hushT = 0, woke = false, epoch = 0, lastCt = NaN, stallT = null;
  let waiting = false; // true: reported, the next tap wakes it; 'quiet': only our own suspend on a blur
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
    out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(0, t, .006);
    clearTimeout(hushT);
    session(false); // hidden: 'auto', in case iOS freezes the timer below; never the route restart, which resumes
    hushT = setTimeout(() => ctx.suspend(), 40);
  }
  function unhush() {
    clearTimeout(hushT);
    const t = ctx.currentTime;
    out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(1, t, .01);
  }
  // without a gesture: allowed once the page has been tapped (Chrome also right after the tap that led here)
  function resume() {
    session();
    if (silent()) return Promise.resolve(false);
    unhush();
    const failed = e => { errors.report('audio-resume-failed', { name: errorName(e), audioState: ctx.state }); return false; };
    try { return Promise.resolve(ctx.resume()).then(running, failed); } catch (e) { return Promise.resolve(failed(e)); }
  }
  // inside a real tap or key: resume, and iOS's silent sample the first time
  function wake() {
    session();
    if (silent() || !pageActive() || navigator.userActivation?.isActive === false) return;
    if (!running()) resume(); else unhush(); // a hidden page's timer may never have suspended it
    if (woke) return;
    const b = ctx.createBufferSource();
    b.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    b.connect(ctx.destination); b.start();
    woke = true;
  }
  // every tap or key on the page (gesture.js)
  function gesture() {
    if (waiting && running()) waiting = false; // it came back
    else if (waiting || (hearing() && !running())) wake();
  }
  function stalled(kind = 'menu-audio-stalled') {
    if (kind && waiting !== true) errors.report(kind, { audioState: ctx.state });
    if (running()) hush(); // frozen while `running`: wake() only resumes a stopped context, so the tap can restart it
    waiting = kind ? true : waiting || 'quiet';
  }
  // `left`: a blur with the page still on screen (Android's address bar): stopped because we suspended it, nothing failed
  function checkBack(left = false) {
    const from = ctx.currentTime, at = epoch;
    setTimeout(() => {
      if (at !== epoch || document.hidden || !hearing()) return; // left again meanwhile, or nothing to hear
      if (running() && ctx.currentTime - from >= MOVED) return; // it plays
      stalled(left ? null : 'audio-not-back');
    }, BACK_MS);
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
