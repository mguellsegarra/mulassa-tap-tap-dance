// The selector's own music: the menu tune as lo-fi (tools/music/build_games_menu.py), on Plassa's one music switch.
// A browser lets it sound only after a tap or a key on the page (Chrome also after the tap that led here).
import { createMenuMusic } from '#plassa/menu-music.js';
import { createPageAudio } from '#plassa/page-audio.js';
import { musicPref } from '#plassa/music-pref.js';
import { onEveryGesture } from '#plassa/gesture.js';
import { blipOn } from '#plassa/ui-sound.js';
import url from './music.mp3?url';
import loop from './music.json' with { type: 'json' };

export function setupMusic() {
  let on = musicPref.get(), ctx = null;
  try { ctx = new AudioContext(); } catch { return { on: () => on, set() {}, blip() {} }; } // no Web Audio: a silent page
  const out = ctx.createGain();
  out.connect(ctx.destination);
  const life = createPageAudio(ctx, out, { hearing: () => on }), tune = createMenuMusic(ctx, out, { url, loop });
  if (on) { tune.play(); life.resume(); } // refused without a tap yet: the first one asks again
  onEveryGesture(life.gesture);
  return {
    on: () => on,
    // inside the speaker's tap
    set(v) {
      on = v;
      musicPref.set(v);
      if (v) { tune.play(); life.wake(); } else tune.stop();
    },
    blip: blipOn(ctx, out),
  };
}
