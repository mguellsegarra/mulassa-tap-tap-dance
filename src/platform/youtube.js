// POC: a song whose `youtube` id is set plays from YouTube's own embed (its ads, its Premium) and the run's clock is the
// video's. Local only, never release. The IFrame API reports the time in steps (~250 ms), so the clock runs on
// performance.now() from the last report and eases onto each new one; a seek, an ad or a stall (> 150 ms off) snaps.
// shortcut: ?ytoff=<ms> shifts it by hand (the embed's delay is unknown); a calibration screen if this goes further.
import { Q } from '../core/flags.js';

const OFF = (+Q.get('ytoff') || 0) / 1000;
let player = null, readyP = null, anchor = null; // anchor: { t: video s, at: performance.now() ms }

export function ytReady(id) {
  if (readyP) return readyP;
  const box = document.createElement('div');
  box.id = 'yt-poc';
  box.style.cssText = 'position:fixed;left:8px;bottom:8px;width:320px;height:180px;z-index:50;border-radius:8px;overflow:hidden;box-shadow:0 4px 16px #0006';
  box.innerHTML = '<div id="yt-poc-player"></div>';
  document.body.append(box);
  readyP = new Promise(resolve => {
    window.onYouTubeIframeAPIReady = () => {
      player = new window.YT.Player('yt-poc-player', {
        width: 320, height: 180, videoId: id, host: Q.has('ytnocookie') ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com',
        playerVars: { playsinline: 1, controls: 1, rel: 0 },
        events: { onReady: () => resolve(window.__ytp = player), onStateChange: () => { anchor = null; }, onError: e => { window.__yterr = e.data; console.warn('youtube error', e.data); } },
      });
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.append(s);
  });
  return readyP;
}

export function ytPlay(from) { player?.seekTo(from, true); player?.playVideo(); anchor = null; }
export function ytStop() { player?.pauseVideo(); anchor = null; }

// the video's time now, or null while it is not playing (an ad, buffering, paused)
export function ytNow(perfMs = performance.now()) {
  if (player?.getPlayerState?.() !== 1) return null;
  const t = player.getCurrentTime(), now = performance.now();
  if (!anchor || Math.abs(t - (anchor.t + (now - anchor.at) / 1000)) > 0.15) anchor = { t, at: now, last: t };
  else if (t !== anchor.last) { anchor.last = t; anchor.t += 0.1 * (t - (anchor.t + (now - anchor.at) / 1000)); } // a fresh report: ease 10 %
  return anchor.t + (perfMs - anchor.at) / 1000 + OFF;
}
