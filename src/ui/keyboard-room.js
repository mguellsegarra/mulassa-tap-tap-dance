// The on-screen keyboard covers the bottom of the page without resizing it (iOS Safari; Chrome's default too), and
// 100dvh ignores it: a sheet's field could sit under the keyboard with its button out of reach. While a field has
// focus and the visible part is short, <html data-kb> and --kb-* fit the open sheet into that part (base.css).
const kbHtml = document.documentElement;
function fitAboveKeyboard(e) {
  const vv = globalThis.visualViewport, field = document.activeElement;
  const up = Boolean(vv && kbHtml.clientHeight - vv.height > 100 && field?.matches?.('input, textarea'));
  kbHtml.toggleAttribute('data-kb', up);
  if (!up) return;
  kbHtml.style.setProperty('--kb-top', `${vv.offsetTop}px`);
  kbHtml.style.setProperty('--kb-bottom', `${kbHtml.clientHeight - vv.offsetTop - vv.height}px`);
  kbHtml.style.setProperty('--kb-h', `${vv.height}px`);
  if (e?.type === 'resize') field.scrollIntoView({ block: 'center' }); // the sheet just shrank: its button under the field too
}
globalThis.visualViewport?.addEventListener('resize', fitAboveKeyboard);
globalThis.visualViewport?.addEventListener('scroll', fitAboveKeyboard);
addEventListener('focusout', () => setTimeout(fitAboveKeyboard)); // leaving a field: the sheet's size back even if the keyboard stays a moment
