// The «Jocs» hero comes alive: the chosen game's clip (data-video, a live game's only) starts loading and playing as soon as
// its card is shown, and fades in over its still picture, under the text, once its first frame is ready; moves never stop it,
// only closing the sheet does. A big screen plays the wide clip where the wide still is, a phone the upright one
// (data-video-tall) as its backdrop (games-sheet.css); never with reduced motion or data saving.
export function setupHeroVideo({ menu, video, wide, win = globalThis }) {
  let card = null, turn = 0; // turn: only the latest start may show or give up its clip
  // the hero's own flag hides its stills while a clip loads or plays (no :has(), docs/agents/graphics.md)
  const mark = () => video.parentElement?.classList.toggle('clip', video.classList.contains('due') || video.classList.contains('on'));
  const calm = () => !win.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !win.navigator?.connection?.saveData;
  // back to the start, so a clip shown again begins from its first frame
  const still = () => { video.classList.remove('on', 'due'); mark(); video.pause(); if (video.currentTime) video.currentTime = 0; };
  const start = () => {
    still();
    const clip = wide.matches ? card?.dataset.video : card?.dataset.videoTall;
    if (!menu.open || !clip || !calm()) return;
    const mine = ++turn;
    // the card's picture is not the clip's first frame: the clip shows its own (beside it, .jpg) as a poster while it loads
    video.classList.add('due'); mark();
    if (video.getAttribute('src') !== clip) { video.poster = clip.replace(/\.mp4$/, '.jpg'); video.src = clip; }
    // shown once its first frame is on screen (iOS can resolve play() before it paints); a refused play keeps the still
    const show = () => { if (!video.paused && mine === turn) { video.classList.add('on'); mark(); } };
    video.play().then(() => (video.requestVideoFrameCallback ? video.requestVideoFrameCallback(show) : show()),
      () => { if (mine === turn) { video.classList.remove('due'); mark(); } }); // an earlier start's aborted play leaves this one alone
  };
  menu.addEventListener('close', still);
  wide.addEventListener?.('change', start); // turning a tablet swaps the clip
  return { show(next) { card = next; start(); } };
}
