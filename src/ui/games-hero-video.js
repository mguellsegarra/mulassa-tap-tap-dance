// The «Jocs» hero comes alive: a few seconds without a touch, the chosen game's clip (data-video, a live game's only)
// fades in over its still picture, under the text; any move brings the still back. A big screen plays the wide clip where the
// wide still is, a phone the upright one (data-video-tall) as its backdrop (games-sheet.css); never with reduced motion or data
// saving. A clip loads only the first time it is due.
const HERO_IDLE_MS = 2000;

export function setupHeroVideo({ menu, video, wide, win = globalThis }) {
  let card = null, timer = 0;
  const calm = () => !win.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !win.navigator?.connection?.saveData;
  // back to the start: the still is the clip's first frame, so the next fade-in shows no jump
  const still = () => { win.clearTimeout(timer); video.classList.remove('on'); video.pause(); if (video.currentTime) video.currentTime = 0; };
  const wake = () => {
    still();
    const clip = wide.matches ? card?.dataset.video : card?.dataset.videoTall;
    if (!menu.open || !clip || !calm()) return;
    timer = win.setTimeout(() => {
      if (video.getAttribute('src') !== clip) video.src = clip;
      // shown once its first frame is on screen (iOS can resolve play() before it paints); a refused play keeps the still
      const show = () => { if (!video.paused) video.classList.add('on'); }; // (a move in between already brought the still back)
      video.play().then(() => (video.requestVideoFrameCallback ? video.requestVideoFrameCallback(show) : show()), () => {});
    }, HERO_IDLE_MS);
  };
  for (const kind of ['pointermove', 'pointerdown', 'keydown', 'wheel']) menu.addEventListener(kind, wake, { passive: true });
  menu.addEventListener('close', still);
  wide.addEventListener?.('change', wake); // turning a tablet swaps the clip
  return { show(next) { card = next; video.classList.remove('on'); wake(); } };
}
