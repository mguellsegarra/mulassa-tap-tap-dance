// Mulassa Games' hero comes alive: the chosen game's clip (data-video, a live game's only) starts loading and playing as soon as
// its card is shown, and fades in under the text once its first frame is on screen; moves never stop it. A big screen plays
// the wide clip where the wide still is, a phone the upright one (data-video-tall) as its backdrop (style.css); never with
// reduced motion or data saving. Until then the hero's still is the clip's own first frame (poster(), beside it as .jpg):
// the video is never shown empty (iOS Safari showed black for a few frames on every change of game).
export function setupHeroVideo({ video, wide, win = globalThis }) {
  let card = null, turn = 0, refused = false; // turn: only the latest start may show or give up its clip
  // the hero's own flag holds its still in place while a clip loads or plays (no :has(), docs/agents/graphics.md)
  // …and lets it go once the clip is on screen (.playing): a big screen's clip fades out on its left, the still showed through it
  const mark = () => { const hero = video.parentElement?.classList, on = video.classList.contains('on'); hero?.toggle('clip', on || video.classList.contains('due')); hero?.toggle('playing', on); };
  const calm = () => !win.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !win.navigator?.connection?.saveData;
  // back to the start, so a clip shown again begins from its first frame
  const still = () => { video.classList.remove('on', 'due'); mark(); video.pause(); if (video.currentTime) video.currentTime = 0; };
  const clipOf = c => (calm() ? (wide.matches ? c?.dataset.video : c?.dataset.videoTall) : undefined);
  const start = () => {
    still();
    const clip = clipOf(card);
    if (!clip) return;
    const mine = ++turn;
    refused = false;
    video.classList.add('due'); mark();
    if (video.getAttribute('src') !== clip) video.src = clip;
    // shown once its first frame is on screen (iOS can resolve play() before it paints); a refused play keeps the still
    const show = () => { if (!video.paused && mine === turn) { video.classList.add('on'); mark(); } };
    video.play().then(() => (video.requestVideoFrameCallback ? video.requestVideoFrameCallback(show) : show()),
      () => { if (mine === turn) { refused = true; video.classList.remove('due'); mark(); } }); // an earlier start's aborted play leaves this one alone
  };
  wide.addEventListener?.('change', start); // turning a tablet swaps the clip
  // a play refused before any tap (an iPhone in Low Power Mode, a browser that wants a gesture first) starts on the first one,
  // inside it: the first game's clip stood still until another game was chosen
  for (const type of ['pointerdown', 'touchend', 'keydown']) win.addEventListener?.(type, () => { if (refused) start(); }, true);
  return { show(next) { card = next; start(); }, poster: c => clipOf(c)?.replace(/\.mp4$/, '.jpg') };
}
