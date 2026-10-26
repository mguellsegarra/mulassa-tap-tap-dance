// «Música en pausa» (#audio-resume-menu). Back from another app or tab, iOS often keeps the audio stopped until a tap (from
// another Safari tab the page doesn't even get focus): the selector stood there silent, as if hung. Stopped means a context
// that isn't running, or one that says `running` with its clock standing still. If the clock hasn't moved AUDIO_BACK_MS after
// returning, the card says so; any tap on it, the backdrop too, is the gesture that wakes the sound. A run has its own pause menu.
import { G, chip } from '../game/state.js';
import { focusIn } from './focus.js';
import { errors } from '../services/errors.js';

const AUDIO_BACK_MS = 700; // the unprompted resume() takes a moment even when iOS allows it
const AUDIO_MOVED = 0.1; // seconds of audio clock that prove the sound came back
let audioCard = null;

function closeWhenRunning() { if (chip?.running) audioCard.close(); } // it came back by itself: nothing left to say
function audioCardEl() { // looked up on first use, wired once
  if (audioCard) return audioCard;
  audioCard = document.getElementById('audio-resume-menu');
  audioCard?.addEventListener('click', () => { chip?.wake(); audioCard.close(); });
  audioCard?.addEventListener('close', () => chip?.ctx?.removeEventListener?.('statechange', closeWhenRunning));
  return audioCard;
}

// Not afterActive(): back from another Safari tab the page is visible but has no focus until a tap, so pageActive() is false
export function offerAudioResume() {
  const from = chip?.ctx?.currentTime, epoch = G.activityEpoch;
  setTimeout(() => {
    if (epoch !== G.activityEpoch || document.hidden) return; // left again meanwhile
    if (G.state === 'play' || !chip || (chip.menuMusic === false && !chip.free)) return; // nothing to hear
    if (chip.running && chip.ctx.currentTime - from >= AUDIO_MOVED) return; // it plays
    const card = audioCardEl();
    if (!card || card.open) return;
    errors.report('audio-not-back', { state: chip.ctx.state });
    if (chip.running) chip.suspend(); // frozen while `running`: wake() only resumes a stopped context, so the tap can restart it
    chip.ctx.addEventListener?.('statechange', closeWhenRunning);
    card.showModal(); focusIn(card, 'audio-resume-ok');
  }, AUDIO_BACK_MS);
}
