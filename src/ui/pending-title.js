// The title keeps the viewport's size for every figure, on up to two lines, so changing figure does not change the type.
// Only a name that would not fit steps down. Run on selection/resize/font load, never per frame.
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
  const fits = size => text.offsetHeight <= size * 1.1 * 2 + 1; // two lines at most; the card's shares absorb the rest
  for (let size = largest; size >= 16; size -= .5) {
    text.style.fontSize = `${size}px`;
    if (fits(size)) break;
  }
}
