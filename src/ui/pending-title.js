// Keep the title's row stable while retaining the full name. Run on selection/resize/font load, never per frame.
export function fitPendingTitle(title, win) {
  const doc = title?.ownerDocument;
  if (!doc || !win.getComputedStyle || !title.clientWidth) return;
  let text = title.firstElementChild;
  if (!text) {
    text = doc.createElement('span');
    text.textContent = title.textContent;
    title.replaceChildren(text);
  }
  const largest = parseFloat(win.getComputedStyle(title).fontSize);
  // Half-pixel steps keep a long title as large as its reserved one/two-line slot permits.
  for (let size = largest; size >= 16; size -= .5) {
    text.style.fontSize = `${size}px`;
    if (text.offsetHeight <= title.clientHeight + 1 && text.scrollWidth <= title.clientWidth + 1) break;
  }
  // A portrait too small to show keeps its slot. Centre the name in that unused
  // space as well, without moving the entity or actions below it.
  const portrait = title.nextElementSibling;
  const hiddenArt = portrait?.firstElementChild && win.getComputedStyle(portrait.firstElementChild).visibility === 'hidden';
  const gap = parseFloat(win.getComputedStyle(title.parentElement).rowGap) || 0;
  const offset = hiddenArt ? (parseFloat(win.getComputedStyle(portrait).height) + gap) / 2 : 0;
  text.style.translate = `0 ${offset}px`;
}
