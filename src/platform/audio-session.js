// The iOS audio session (navigator.audioSession), mixed into Chip: the type each screen asks for, and when the context
// must stay stopped because a running one pauses the other app's audio whatever the type.
import { errors } from '../services/errors.js';
import { audioFailureTags } from './audio-load.js';

export const AUDIO_SESSION = {
  // iOS: a silent menu is 'ambient' (sfx mix with Spotify or any other app's music, which keeps playing); the menu music,
  // the radio or a run take the 'playback' session (the other app pauses, and the ringer switch can't silence the song).
  // A hidden page drops to 'auto': only 'playback' sounds in the background, so iOS itself stops it if our suspend never ran
  session(restart = true) {
    const type = globalThis.document?.hidden ? 'auto' : this.menuMusic === false && !this.bus ? 'ambient' : 'playback';
    const as = globalThis.navigator?.audioSession;
    if (!as || as.type === type) return;
    try { as.type = type; } catch { return; } // older iOS
    // iOS: a running context keeps its 'ambient' route until it restarts (unlocked, no gesture needed): else the ringer
    // switch still mutes it while the other app pauses. Back only if nothing gave up playback meanwhile (a mute, a hidden
    // page); a refused suspend is reported and still goes through resume(). suspend() passes restart=false: a pause coming
    // back from another app would otherwise resume the song under the pause menu
    const back = () => as.type === 'playback' && this.resume();
    const refused = e => { errors.report('audio-route-restart-failed', audioFailureTags(e)); back(); };
    if (restart && type === 'playback' && this.ctx?.state === 'running') this.ctx.suspend().then(back, refused);
  },
  // iOS pauses the other app's audio while a context runs, even as 'ambient' (an iPhone, 1.2.10): a silent menu stays stopped
  silentMenu() { return !!globalThis.navigator?.audioSession && this.menuMusic === false && !this.bus && !this.free; },
  wakeOrRest() { if (this.silentMenu()) { if (this.ctx.state === 'running') this.suspend(); } else if (this.woke) this.wake(); }, // a switch (a tap)
};
