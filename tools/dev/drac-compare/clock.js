// The comparison's one clock (dev only): the source <video>'s own time. The page poses the model at the frame the video
// presents (requestVideoFrameCallback's mediaTime while playing, currentTime after a seek); nothing else keeps time.
// Starts muted and never plays by itself; ?mute locks the sound off. No DOM beyond the video-like object it is given
// (currentTime, duration, paused, muted, playbackRate, play(), pause()).
import { SOURCE } from './phrases.js';

export const RATES = [1, 0.5, 0.25];

export function createVideoClock(video, { mute = false, end = SOURCE.end, fps = SOURCE.fps } = {}) {
  video.muted = true; video.defaultMuted = true; video.autoplay = false;
  const state = { full: false, sound: false, mute };
  const limit = () => (state.full && Number.isFinite(video.duration) ? video.duration : end);
  const clamp = t => Math.min(Math.max(Number(t) || 0, 0), limit());
  const seek = t => { video.currentTime = clamp(t); return video.currentTime; };
  return {
    state, limit, seek,
    time: () => video.currentTime,
    // whole source frames, landing 1 ms into the frame so the browser shows that frame, not the one before
    step(n) {
      video.pause();
      return seek((Math.round(video.currentTime * fps) + n) / fps + 0.001);
    },
    play() {
      if (video.currentTime >= limit() - 0.5 / fps) video.currentTime = 0;
      return video.play();
    },
    pause() { video.pause(); },
    toggle() { return video.paused ? this.play() : this.pause(); },
    setRate(r) { if (RATES.includes(r)) video.playbackRate = r; return video.playbackRate; },
    // source sound only on an explicit request, never under ?mute
    setSound(on) { state.sound = !mute && !!on; video.muted = !state.sound; return state.sound; },
    setFull(on) { state.full = !!on; if (video.currentTime > limit()) seek(limit()); return state.full; },
    // each shown time passes here: playback stops at the end of the range
    guard(t) {
      const L = limit();
      if (t >= L && !video.paused) { video.pause(); video.currentTime = L; }
      return Math.min(Math.max(t, 0), L);
    },
  };
}
