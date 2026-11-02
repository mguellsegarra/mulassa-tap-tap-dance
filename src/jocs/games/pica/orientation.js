// Phones play upright and tablets sideways, as in the Mulassa game: the other way round a cover asks to turn (the web can't
// lock orientation on iOS or outside fullscreen, so the cover is the lock). Mouse devices may have any window shape.
export const wrongOrient = ({ coarse, shortSide, w, h }) => coarse && (shortSide >= 600 ? h > w : w > h);

export function setupOrientation(onWrong) {
  const coarse = matchMedia('(pointer: coarse)');
  const check = () => {
    const tablet = coarse.matches && Math.min(screen.width, screen.height) >= 600;
    const wrong = wrongOrient({ coarse: coarse.matches, shortSide: Math.min(screen.width, screen.height), w: innerWidth, h: innerHeight });
    document.body.classList.toggle('tablet', tablet);
    document.body.classList.toggle('wrong-orient', wrong);
    if (wrong) onWrong();
  };
  addEventListener('resize', check);
  addEventListener('orientationchange', check);
  matchMedia('(orientation: portrait)').addEventListener('change', check); // iOS: resize can come with the old size
  check();
}
