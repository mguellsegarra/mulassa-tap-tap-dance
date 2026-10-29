// Paste into a page (preview_evaluate, DevTools, Playwright evaluate) and call:
//   measureRows('#my-card')                       → vertical rhythm of the card's direct children
//   measureRows('#my-card', { row: '.links' })    → also the horizontal spaces of that row's children
// Measures *ink* (what is painted: text lines, images/SVG, filled or bordered boxes), not layout boxes,
// so a 44 px link around 15 px of text or an art slot wider than its art shows up as real space.
// Returns: viewport, card rect, overflow (scrollHeight - clientHeight), per-row ink height,
// gaps = [top margin, gap row1→row2, …, bottom margin], and for `row`: [left, between…, right].
(() => {
  const seen = c => c && !/^rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent'; // a transparent border or fill paints nothing
  const painted = el => {
    const cs = getComputedStyle(el);
    if (seen(cs.backgroundColor) || cs.backgroundImage !== 'none') return true;
    return ['Top', 'Bottom'].some(s => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none' && seen(cs[`border${s}Color`]));
  };
  const visible = el => {
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0;
  };
  function ink(el) {
    const rects = [];
    const walk = node => {
      if (node.nodeType === 3) {
        if (!node.textContent.trim()) return;
        const r = document.createRange(); r.selectNodeContents(node);
        for (const q of r.getClientRects()) if (q.width && q.height) rects.push(q);
        return;
      }
      if (node.nodeType !== 1 || !visible(node)) return;
      if (/^(IMG|SVG|CANVAS|VIDEO|svg)$/.test(node.tagName) || painted(node)) {
        const q = node.getBoundingClientRect();
        if (q.width && q.height) { rects.push(q); return; } // a painted box contains its children's ink
      }
      for (const c of node.childNodes) walk(c);
    };
    walk(el);
    if (!rects.length) return null;
    return {
      top: Math.min(...rects.map(r => r.top)), bottom: Math.max(...rects.map(r => r.bottom)),
      left: Math.min(...rects.map(r => r.left)), right: Math.max(...rects.map(r => r.right)),
    };
  }
  window.measureRows = (selector, { row } = {}) => {
    const card = document.querySelector(selector);
    if (!card) return { error: `no ${selector}` };
    const c = card.getBoundingClientRect(), cs = getComputedStyle(card);
    const inner = { top: c.top + parseFloat(cs.borderTopWidth), bottom: c.bottom - parseFloat(cs.borderBottomWidth),
      left: c.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft),
      right: c.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight) };
    const rows = [...card.children].filter(visible).map(el => ({ el, b: ink(el) })).filter(r => r.b);
    const gaps = [Math.round(rows[0].b.top - inner.top)];
    for (let i = 1; i < rows.length; i++) gaps.push(Math.round(rows[i].b.top - rows[i - 1].b.bottom));
    gaps.push(Math.round(inner.bottom - rows.at(-1).b.bottom));
    const out = {
      viewport: `${innerWidth}x${innerHeight}`,
      card: [c.left, c.top, c.width, c.height].map(Math.round),
      overflow: card.scrollHeight - card.clientHeight,
      rows: rows.map(({ el, b }) => `${el.id || el.tagName.toLowerCase() + '.' + [...el.classList][0]}:${Math.round(b.bottom - b.top)}`),
      gaps,
    };
    if (row) {
      const items = [...card.querySelector(row).children].filter(visible).map(ink).filter(Boolean);
      const h = [Math.round(items[0].left - inner.left)];
      for (let i = 1; i < items.length; i++) h.push(Math.round(items[i].left - items[i - 1].right));
      h.push(Math.round(inner.right - items.at(-1).right));
      out.row = h;
      out.clipped = [...card.querySelector(row).querySelectorAll('*')].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').length;
    }
    return out;
  };
  return 'measureRows ready';
})();
