// The selector's keyboard: ↑↓ jump between the screen's rows like a game menu, ←→ walk a row (the corner buttons, the
// pills, the cards or the levels), Home / End, PageUp / PageDown (towns), Enter / Space and Escape. setupSelect (select-ui.js)
// owns what each move does.
export function setupSelectKeys({ doc, win, $, root, towns, strip, levels, pending, bar, cards, pills, corner, view,
  busy, sfx, centre, pick, setStep, setLevel, setTown, nextStep, play, refocus }) {
  // ↑↓ jump between the screen's rows like a game menu: the corner buttons, pills, info tiles, «Aviat», figures or levels,
  // footer buttons; ←→ walk the corner row (left to right as drawn).
  const cornerRow = { contains: el => corner.includes(el) };
  const rows = [cornerRow, towns, $('select-info'), pending, strip, levels, root.querySelector('.sel-footer')];
  const usable = el => el && !el.disabled && !el.closest('[hidden]') && el.getClientRects().length > 0; // fixed corners have no offsetParent
  const rowTarget = r => (r === cornerRow ? corner.find(usable) : r === towns ? bar.find(p => p.dataset.town === view.town && usable(p)) || bar.find(usable) : r === strip ? cards[view.cur] : r === levels ? levels.children[view.level]
    : [...r.querySelectorAll('button, a[href]')].find(el => el.tabIndex >= 0 && usable(el)));
  function focusMove(target, sound = true) {
    if (!target || target === doc.activeElement) return;
    target.focus({ preventScroll: true });
    if (sound && doc.activeElement === target) sfx('menu');
  }
  function rowStep(a, dir) {
    const at = rows.findIndex(r => r.contains(a));
    if (at < 0) { focusMove(rowTarget(view.step === 'level' ? levels : strip)); return; } // nothing focused yet
    for (let i = at + dir; i >= 0 && i < rows.length; i += dir) {
      const t = rowTarget(rows[i]);
      if (usable(t)) { focusMove(t); return; }
    }
  }
  function focusCard(i) {
    const target = cards[Math.max(0, Math.min(cards.length - 1, i))];
    if (target === doc.activeElement && target === cards[view.cur]) return;
    const previousFigure = view.figure;
    pick(target, 'arrow');
    focusMove(target, view.figure === previousFigure);
    centre(strip, target);
  }

  win.addEventListener('keydown', e => {
    if (e.defaultPrevented || !view.shown || busy() || e.altKey || e.ctrlKey || e.metaKey) return;
    const a = doc.activeElement, inTowns = towns.contains(a), card = a?.closest?.('.sel-card');
    const key = e.key, move = { ArrowLeft: -1, ArrowRight: 1 }[key];
    // One move per press. Consume repeats so a held key cannot scroll the browser either.
    if (e.repeat) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(key)
        || (key === 'Enter' || key === ' ') && root.contains(a)) e.preventDefault();
      return;
    }
    if (key === 'ArrowUp' || key === 'ArrowDown') { e.preventDefault(); rowStep(a, key === 'ArrowUp' ? -1 : 1); return; }
    const inlineHeader = root.hasAttribute('data-header-inline');
    if (move && (corner.includes(a) || inlineHeader && inTowns)) {
      e.preventDefault();
      // On wide screens the towns sit between the logo and the corner buttons: follow that visible order.
      const header = (inlineHeader ? [...bar, ...corner] : corner).filter(usable);
      const target = header[header.indexOf(a) + move];
      if (target) {
        focusMove(target);
        if (towns.contains(target)) centre(towns, target, 'instant');
      }
      return;
    }
    if (inTowns && (move || key === 'Home' || key === 'End')) { // Optional arrows; Tab and native Enter / Space still work.
      e.preventDefault();
      const i = Math.max(0, Math.min(bar.length - 1, key === 'Home' ? 0 : key === 'End' ? bar.length - 1 : bar.indexOf(a) + move));
      focusMove(bar[i]); centre(towns, bar[i], 'instant');
      return;
    }
    if (inTowns) {
      if (key !== 'Escape' || view.step !== 'level') return; // Keep Escape's existing return from difficulty.
    }
    if (a?.closest?.('a, input, textarea') || pending.contains(a)) return;
    if (view.step === 'level') {
      if (key === 'Escape') { e.preventDefault(); setStep('figures'); refocus(); }
      else if (move) { e.preventDefault(); setLevel(view.level + move); if (levels.contains(a)) levels.children[view.level].focus({ preventScroll: true }); }
      else if ((key === 'Enter' || key === ' ') && (levels.contains(a) || a === $('select-play') || !a || a === doc.body)) { e.preventDefault(); play(); }
      return;
    }

    if (move || key === 'Home' || key === 'End') {
      e.preventDefault();
      focusCard(key === 'Home' ? 0 : key === 'End' ? cards.length - 1 : cards.indexOf(card ?? cards[view.cur]) + move);
      return;
    }
    if (key === 'PageUp' || key === 'PageDown') {
      e.preventDefault();
      const ids = pills.map(p => p.dataset.town), i = (ids.indexOf(view.town) + (key === 'PageUp' ? -1 : 1) + ids.length) % ids.length;
      setTown(ids[i]);
      return;
    }
    if ((key === 'Enter' || key === ' ') && (card || !a || a === doc.body)) { e.preventDefault(); if (card) pick(card, 'enter'); else nextStep(); }
  });
}
