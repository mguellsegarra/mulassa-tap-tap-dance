// A list or sheet body that scrolls fades out at the edge where there is more to see, instead of cutting a row at the
// border (mulassa.cat's ui/sheet-fade.js, its fades only: the drawn bar stays the main game's until it moves onto this base).
// data-more-up / data-more-down set game.css's .scroll-hint mask.
const SLACK = 4; // a few px over (rounding) fits: no fade
const mark = e => {
  e.toggleAttribute('data-more-up', e.scrollTop > 1);
  e.toggleAttribute('data-more-down', e.scrollTop + e.clientHeight < e.scrollHeight - SLACK);
};
export function scrollHints(list) {
  for (const e of list) {
    e.classList.add('scroll-hint');
    e.addEventListener('scroll', () => mark(e), { passive: true });
    new ResizeObserver(() => mark(e)).observe(e); // shown, or the page resized
    new MutationObserver(() => mark(e)).observe(e, { childList: true }); // rows loaded
  }
}
