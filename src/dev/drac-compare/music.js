// The game's Drac song under the video (dev only): the page's one clock stays the video; the song follows it through
// the song's own time map (game/drac-time.js: reference seconds -> song seconds), so what you hear is what the game
// plays at that moment of the dance. Off by default, never under ?mute, never at the same time as the video's sound.
import dracSong from '../../song-drac.json' with { type: 'json' };
import { dracTime } from '../../game/drac-time.js';

const DRIFT = 0.06; // s off before it seeks back onto the map (a seek is audible; small drift is not)
export function createMusicSync(video, { mute = false, makeAudio = () => new Audio() } = {}) {
  let audio = null, on = false;
  const target = () => dracTime.songAtRef(video.currentTime);
  function tick() {
    if (!on || !audio) return;
    if (video.paused || video.currentTime >= dracTime.refEnd) { if (!audio.paused) audio.pause(); return; }
    const want = target(), t = video.currentTime;
    const slope = (dracTime.songAtRef(t + 0.05) - dracTime.songAtRef(Math.max(0, t - 0.05))) / (t + 0.05 - Math.max(0, t - 0.05));
    audio.playbackRate = video.playbackRate * slope; // song seconds per video second (near 1 by design)
    if (Math.abs(audio.currentTime - want) > DRIFT) audio.currentTime = want;
    if (audio.paused) audio.play().catch(() => {});
  }
  return {
    get on() { return on; },
    set(next) {
      on = !mute && !!next;
      if (on && !audio) { audio = makeAudio(); audio.preload = 'auto'; audio.src = `/${dracSong.audio}`; }
      if (!on && audio) audio.pause();
      return on;
    },
    tick,
  };
}
