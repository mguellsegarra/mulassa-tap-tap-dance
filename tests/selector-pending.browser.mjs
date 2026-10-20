// On the existing dev server with ?mute: enter selection, then call this at each viewport/pointer family.
// Uses the real catalogue and DOM handlers; no fixture names, timing delays or production hooks.
export async function checkPendingCards() {
  await document.fonts.ready;
  await new Promise(requestAnimationFrame); // Commit any preceding viewport resize before comparing selections.
  const $ = s => document.querySelector(s), panel = $('#select-pending');
  if ($('.sel-more').getAttribute('aria-expanded') === 'false') $('.sel-soon').click();
  const box = e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
  const rows = [], failures = [];
  for (const card of document.querySelectorAll('.sel-card.aviat[data-id]')) {
    card.click();
    // The contact card uses the final dock position; compare painted bounds once its drop finishes.
    await Promise.all($('#select-bottom').getAnimations().map(a => a.finished.catch(() => {})));
    const entry = { id: card.dataset.id, box: box(panel), button: box($('#aviat-write')), links: box($('.sel-pending-links')) };
    if (innerWidth >= 520 && entry.button[2] > 361) failures.push(`${entry.id}: contact action too wide`);
    if (innerWidth >= 900 && innerHeight > 500 && innerHeight < 800 && entry.box[2] > 641) failures.push(`${entry.id}: contact card too wide`);
    if (Math.abs(entry.button[0] + entry.button[2] / 2 - entry.box[0] - entry.box[2] / 2) > 1) failures.push(`${entry.id}: contact action not centred`);
    const panelBox = panel.getBoundingClientRect(), dockBox = $('#select-bottom').getBoundingClientRect();
    if (panelBox.right > dockBox.left + 1 && panelBox.left < dockBox.right - 1 && panelBox.bottom > dockBox.top + 1 && panelBox.top < dockBox.bottom - 1) failures.push(`${entry.id}: contact card overlaps dock`);
    const first = rows[0] ?? entry;
    for (const key of ['box', 'button', 'links']) {
      if (entry[key].some((v, i) => Math.abs(v - first[key][i]) > 1)) failures.push(`${entry.id}: ${key} moved`);
    }
    if (panel.scrollHeight > panel.clientHeight + 1) failures.push(`${entry.id}: internal overflow`);
    if (innerHeight > 500 && !$('#select').hasAttribute('data-header-inline')) {
      const p = panel.getBoundingClientRect(), towns = $('.sel-towns').getBoundingClientRect();
      const nav = $('#select-nav'), navBox = nav.getBoundingClientRect();
      const cards = [...$('#select-strip').children].filter(el => !el.hidden && el.offsetHeight);
      const sideDock = $('#select-bottom').getBoundingClientRect().left >= p.right;
      const bottom = sideDock ? innerHeight : navBox.height && getComputedStyle(nav).visibility !== 'hidden'
        ? navBox.top : Math.min(...cards.map(el => el.getBoundingClientRect().top));
      entry.bandMargins = [p.top - towns.bottom, bottom - p.bottom];
      if (Math.abs(entry.bandMargins[0] - entry.bandMargins[1]) > 1) failures.push(`${entry.id}: not centred in available band`);
    }
    const ink = el => {
      const range = document.createRange(); range.selectNodeContents(el);
      return [...range.getClientRects()].filter(r => r.width && r.height);
    };
    const title = $('#aviat-title'), entity = $('#aviat-entity'), copy = $('#aviat-text'), write = $('#aviat-write');
    const owners = [...entity.querySelectorAll('.sel-entity-part')];
    if (owners.length === 2) {
      const units = [...entity.querySelectorAll('.sel-entity-unit')], plus = entity.querySelector('.sel-entity-plus');
      if (units.length !== 2 || !units[1].contains(plus) || !units[1].contains(owners[1])) failures.push(`${entry.id}: separator detached from manager`);
      else {
        const boxes = units.map(e => e.getBoundingClientRect()), stacked = Math.abs(boxes[0].top - boxes[1].top) > 1;
        const content = $('.sel-pending-content'), contentWidth = content.getBoundingClientRect().width;
        const available = getComputedStyle(content).display === 'grid' ? contentWidth / 2 : contentWidth;
        const namesFit = owners.every(e => e.lastElementChild.getBoundingClientRect().height <= parseFloat(getComputedStyle(e).lineHeight) + 1);
        const gap = parseFloat(getComputedStyle(entity).columnGap);
        // Stacking uses a 3px separator gap; the one-line arrangement uses 6px.
        const rowWidth = boxes[0].width + boxes[1].width + gap + (stacked ? 3 : 0);
        if (namesFit && rowWidth <= available + .5 && stacked) failures.push(`${entry.id}: unnecessary second entity row`);
        const width = stacked ? Math.max(...boxes.map(b => b.width)) : boxes[0].width + boxes[1].width + gap;
        if (Math.abs(entity.getBoundingClientRect().width - width) > 1) failures.push(`${entry.id}: entity labels have excess horizontal space`);
      }
    }

    const paragraphs = [...copy.children].filter(e => !e.hidden && getComputedStyle(e).display !== 'none');
    const visibleRows = [title, entity, ...paragraphs, write];
    for (const [above, below] of visibleRows.slice(1).map((e, i) => [visibleRows[i], e])) {
      // On short wide windows the title and entity intentionally share one row.
      const a = above.getBoundingClientRect(), b = below.getBoundingClientRect();
      if (a.right <= b.left || b.right <= a.left) continue;
      if (Math.max(...ink(above).map(r => r.bottom)) > b.top + 1) failures.push(`${entry.id}: ${above.id}/${below.id} overlap`);
    }
    for (const el of [title, entity, copy]) {
      const p = panel.getBoundingClientRect();
      if (ink(el).some(r => r.left < p.left || r.right > p.right || r.top < p.top || r.bottom > p.bottom)) failures.push(`${entry.id}: clipped ${el.id}`);
    }
    // A roomy card with all copy must distribute air between every visible row, including the note.
    // This catches stable boxes whose old reserved tracks left a large hole above tightly packed paragraphs.
    if (entry.box[3] >= 330 && paragraphs.length === 2 && entity.getBoundingClientRect().top >= title.getBoundingClientRect().bottom - 1) {
      const bounds = el => {
        // Range over a link container also includes its invisible 44px target. Walk painted text and icons instead.
        const r = [], walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          if (!walker.currentNode.textContent.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(walker.currentNode);
          r.push(...range.getClientRects());
        }
        r.push(...[...el.querySelectorAll('svg')].map(e => e.getBoundingClientRect()));
        return { top: Math.min(...r.map(q => q.top)), bottom: Math.max(...r.map(q => q.bottom)) };
      };
      const painted = [bounds(title), entity.getBoundingClientRect(), ...paragraphs.map(bounds), write.getBoundingClientRect(), bounds($('.sel-pending-links'))];
      const p = panel.getBoundingClientRect();
      const gaps = [painted[0].top - p.top, ...painted.slice(1).map((r, i) => r.top - painted[i].bottom), p.bottom - painted.at(-1).bottom];
      entry.gaps = gaps;
      if (Math.max(...gaps) - Math.min(...gaps) > 16) failures.push(`${entry.id}: uneven visible row spacing`);
    }
    if (entry.button[3] < 44 || [...$('.sel-pending-links').children].some(e => e.getBoundingClientRect().height < 44)) failures.push(`${entry.id}: small target`);
    rows.push(entry);
  }
  return { viewport: [innerWidth, innerHeight], touch: matchMedia('(pointer: coarse)').matches, failures: [...new Set(failures)], rows };
}
