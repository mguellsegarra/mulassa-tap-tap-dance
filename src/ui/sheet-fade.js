// Sheets (and the Bústia's text) that scroll: data-more-up / data-more-down tell the CSS fades when there is more to see.
// A sheet's .sheet-body scrolls with its native bar hidden (it never fits the rounded frame, and iOS paints no styled bar
// on touch), so a drawn gold bar on the frame's right says there is more and where you are; only while it overflows.
const SLACK = 4; // a body a few px over (rounding, the fades' margins) fits: no bar, no fade
const bar = e => {
  const b = e.sheetBar;
  if (!b) return;
  const over = e.scrollHeight - e.clientHeight;
  b.hidden = over <= SLACK;
  if (b.hidden) return;
  const top = Math.max(e.offsetTop + 6, 32), track = e.offsetTop + e.clientHeight - 6 - top; // clear of the corner X
  const h = Math.max(28, track * e.clientHeight / e.scrollHeight);
  b.style.top = `${top}px`; b.style.height = `${track}px`;
  b.firstChild.style.height = `${h}px`;
  b.firstChild.style.transform = `translateY(${(track - h) * Math.min(1, e.scrollTop / over)}px)`;
};
const mark = e => {
  e.toggleAttribute('data-more-up', e.scrollTop > 1);
  e.toggleAttribute('data-more-down', e.scrollTop + e.clientHeight < e.scrollHeight - SLACK);
  bar(e);
};
export function sheetFades(root = document) {
  const list = root.querySelectorAll?.('.sheet, .sheet-body.fade, .feedback-scroll, .sheet > .sheet-body') ?? [];
  for (const e of list) {
    e.addEventListener('scroll', () => mark(e), { passive: true });
    if (e.localName === 'dialog') { e.addEventListener('toggle', () => requestAnimationFrame(() => mark(e))); continue; }
    const ro = new ResizeObserver(() => mark(e));
    ro.observe(e);
    if (!e.matches('.sheet > .sheet-body')) continue;
    e.sheetBar = document.createElement('div');
    e.sheetBar.className = 'sheet-bar';
    e.sheetBar.hidden = true;
    e.sheetBar.setAttribute('aria-hidden', 'true');
    e.sheetBar.append(document.createElement('i'));
    e.parentNode.append(e.sheetBar);
    e.parentNode.addEventListener('toggle', () => requestAnimationFrame(() => mark(e)));
    for (const c of e.children) ro.observe(c); // content that grows (a list loading) inside a capped body
  }
  addEventListener('resize', () => list.forEach(mark));
}
