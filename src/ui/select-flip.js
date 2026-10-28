// A pending figure (or the fold's card) re-lays the pills, the strip and the dock's buttons in one go (the info column leaves, the strip
// centres). snap() reads their painted places just before; play() (end of measure()) slides each from there to its new place by a
// transform, so the layout moves at once but nothing is painted jumping: no layout shift, same look as before.
// els(): the elements that slide; one inside another slides relative to it.
// A measure() a moment later (the observer, the hidden column's fade) may move things again: it is caught too, from where the slide had got to.
const MS = 240, WINDOW = 500;
export function setupFlip({ win, root, els, reduced }) {
  let before = null, until = 0; const live = new Set(); // the slides under way: stopped while measure() reads, so its reads see the layout alone
  const place = el => { const b = el.getBoundingClientRect(); return b.width || b.height ? { x: b.left, y: b.top } : null; };
  return {
    ms: MS,
    snap(shown, soft = false) { // panel(): just before its layout change (dropped if no measure() follows in the task); soft: measure()'s start, inside the window
      const now = win.performance?.now() ?? 0;
      if (soft && (before || now > until)) return;
      before = null; if (!shown || reduced()) return;
      if (!soft) until = now + WINDOW;
      before = new Map(els().map(el => [el, place(el)]));
      for (const a of live) a.cancel();
      if (!soft) queueMicrotask(() => { before = null; });
    },
    play() {
      const was = before; before = null;
      if (!was) return;
      const list = els(), z = parseFloat(win.getComputedStyle?.(root).zoom) || 1, delta = new Map();
      for (const el of list) { const a = was.get(el), b = a && place(el); delta.set(el, b ? { x: (a.x - b.x) / z, y: (a.y - b.y) / z } : null); }
      for (const el of list) {
        const d = delta.get(el);
        // just shown: it has no old place to slide from, so it waits for the slides, then fades in (popping in at once, its
        // neighbours slid under it); an element already animating (the strip's own arrivals) keeps its own
        if (!d && el.animate && !was.get(el) && place(el) && !el.getAnimations?.().length) { el.animate({ opacity: [0, 0, 1], offset: [0, 0.6, 1] }, { duration: MS / 0.6, easing: 'ease-out' }); continue; } // not in `live`: an opacity never moves snap()'s reads, and cancelling it popped them in
        if (!d || !el.animate) continue;
        let up = el.parentElement; while (up && !delta.has(up)) up = up.parentElement;
        const u = up && delta.get(up), x = d.x - (u?.x ?? 0), y = d.y - (u?.y ?? 0);
        if (Math.abs(x) > 1 || Math.abs(y) > 1) { const a = el.animate({ transform: [`translate(${x}px, ${y}px)`, 'translate(0, 0)'] }, { duration: MS, easing: 'ease-in-out' }); live.add(a); a.finished.then(() => live.delete(a), () => live.delete(a)); }
      }
    },
  };
}
