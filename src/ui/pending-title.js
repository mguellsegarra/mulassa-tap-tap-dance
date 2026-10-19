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
  const content = title.closest('.sel-pending-content');
  // Read intrinsic rows, not the distributed gaps. The footer keeps its own fixed tracks.
  const rows = () => [...content.querySelectorAll('h2, .sel-entity, .sel-pending-icon, p')]
    .filter(el => !el.hidden && win.getComputedStyle(el).display !== 'none');
  const fits = size => {
    const visible = rows(), heights = visible.map(el => el.getBoundingClientRect().height);
    const wide = win.getComputedStyle(content).display === 'grid';
    const identity = wide ? Math.max(...heights.slice(0, 2)) : 0;
    const used = wide ? identity + heights.slice(2).reduce((a, b) => a + b, 0) : heights.reduce((a, b) => a + b, 0);
    return text.scrollWidth <= title.clientWidth + 1 && text.offsetHeight <= size * 1.1 * 2 + 1
      && used <= content.clientHeight + 1;
  };
  for (let size = largest; size >= 16; size -= .5) {
    text.style.fontSize = `${size}px`;
    if (fits(size)) break;
  }

}

// A single figure's open-code note repeats the GitHub link under it: it shows only while the card has room for it
// at selection, resize and font readiness, alongside the title.
export function fitPendingNote(card) {
  const note = card?.querySelector('.sel-pending-copy p + p');
  if (!note) return;
  note.hidden = false;
  note.hidden = card.scrollHeight > card.clientHeight + 1;
}
