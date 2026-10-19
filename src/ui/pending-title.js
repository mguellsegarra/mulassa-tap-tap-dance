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
  const fits = () => text.offsetHeight <= title.clientHeight + 1 && text.scrollWidth <= title.clientWidth + 1;
  // Half-pixel steps keep a long title as large as its reserved one/two-line slot permits.
  title.style.removeProperty('--title-lines');
  const shrink = () => { for (let size = largest; size >= 16; size -= .5) { text.style.fontSize = `${size}px`; if (fits()) return true; } return false; };
  // Still too long at 16 px for a one-line slot (a narrow phone): a second line, never over the entity.
  if (!shrink() && parseFloat(win.getComputedStyle(title).getPropertyValue('--title-lines')) === 1) { title.style.setProperty('--title-lines', '2'); shrink(); }

}

// A single figure's open-code note repeats the GitHub link under it: it shows only while the card has room for it
// (the spacers have already given theirs). Same moments as the title, plus the end of the card's max-height easing.
export function fitPendingNote(card) {
  const note = card?.querySelector('.sel-pending-copy p + p');
  if (!note) return;
  note.hidden = false;
  note.hidden = card.scrollHeight > card.clientHeight + 1;
}

// Refit on the card's own changes: its portrait slot's size (the title) and the end of its max-height easing (the
// note: measured mid-ease, a resize would decide on a height the card is only passing through).
export function watchPending(card, title, icon, win, live) {
  if (win.ResizeObserver) new win.ResizeObserver(() => { if (live()) fitPendingTitle(title, win); }).observe(icon);
  card.addEventListener?.('transitionend', e => { if (e.target === card && e.propertyName === 'max-height' && live()) fitPendingNote(card); });
}
