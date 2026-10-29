// Back from another app or tab, iOS often keeps the audio stopped until a tap (from another Safari tab the page doesn't even
// get focus). Stopped means a context that isn't running, or one that says `running` with its clock standing still. No card:
// the screen stays as it is and the next tap anywhere, which keeps its own action, wakes the sound. A run has its own pause menu.
import { G, chip } from '../game/state.js';
import { errors } from '../services/errors.js';

const AUDIO_BACK_MS = 700; // the unprompted resume() takes a moment even when iOS allows it
const AUDIO_MOVED = 0.1; // seconds of audio clock that prove the sound came back
let audioWaiting = false;

// Registered at import, before sheets-setup.js's window capture handlers, which can stop a key before later listeners see it
for (const ev of ['touchend', 'click', 'keydown']) addEventListener(ev, () => {
  if (!audioWaiting) return;
  if (chip.running) audioWaiting = false; // it came back
  else chip.wake(); // refused without focus (from another Safari tab): the next tap tries again
}, { capture: true, passive: true });

// Not afterActive(): back from another Safari tab the page is visible but has no focus until a tap, so pageActive() is false
export function checkAudioBack() {
  const from = chip?.ctx?.currentTime, epoch = G.activityEpoch;
  setTimeout(() => {
    if (epoch !== G.activityEpoch || document.hidden) return; // left again meanwhile
    if (G.state === 'play' || !chip || (chip.menuMusic === false && !chip.free)) return; // nothing to hear
    if (chip.running && chip.ctx.currentTime - from >= AUDIO_MOVED) return; // it plays
    audioStalled('audio-not-back');
  }, AUDIO_BACK_MS);
}
// Also on the menu without leaving the page (pause-actions.js watchAudio): AirPods that drop out and back left the loop's
// clock frozen while `running`, and taps only unhushed it until a run's own stall pause suspended and resumed it.
export function audioStalled(kind = 'menu-audio-stalled') {
  if (!audioWaiting) errors.report(kind, { state: chip.ctx.state });
  if (chip.running) chip.suspend(); // frozen while `running`: wake() only resumes a stopped context, so the tap can restart it
  audioWaiting = true; // input.js wakes on taps too, but only with focus, which the Safari-tab case gets after the tap
}
