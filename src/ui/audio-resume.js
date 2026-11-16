// Registered before sheets can stop input; the shared recovery waits for a focused tap.
import { G, chip } from '../game/state.js';
import { errors } from '../services/errors.js';
import { createAudioRecovery } from '#plassa/audio-wake.js';

const mainAudioRecovery = createAudioRecovery({
  context: () => chip?.ctx, epoch: () => G.activityEpoch,
  hearing: () => G.state !== 'play' && !!chip && (chip.menuMusic !== false || !!chip.free),
  hush: () => chip.suspend(), wake: () => chip.wake(), focused: () => document.hasFocus(),
  report: (kind, tags) => errors.report(kind, tags),
});
for (const ev of ['touchend', 'click', 'keydown'])
  addEventListener(ev, mainAudioRecovery.gesture, { capture: true, passive: true });
export function checkAudioBack(left = false) { mainAudioRecovery.checkBack(left); }
export function audioStalled(kind = 'menu-audio-stalled') { mainAudioRecovery.stalled(kind); }
