// Sheets (and the Bústia's text) that scroll: data-more-up / data-more-down tell the CSS fades when there is more to see.
const mark = e => {
  e.toggleAttribute('data-more-up', e.scrollTop > 1);
  e.toggleAttribute('data-more-down', e.scrollTop + e.clientHeight < e.scrollHeight - 1);
};
export function sheetFades(root = document) {
  const list = root.querySelectorAll?.('.sheet, .sheet-body.fade, .feedback-scroll') ?? [];
  for (const e of list) {
    e.addEventListener('scroll', () => mark(e), { passive: true });
    if (e.localName === 'dialog') e.addEventListener('toggle', () => requestAnimationFrame(() => mark(e)));
    else new ResizeObserver(() => mark(e)).observe(e);
  }
  addEventListener('resize', () => list.forEach(mark));
}
