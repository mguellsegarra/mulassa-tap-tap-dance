// A player's badge says what it is (src/ui/profile-notes.js checkBadge): its name in a small label over it, wherever a name
// shows (boards, podium, standings, cards, seasons). A mouse gets it on hover; a finger has no hover, so a tap on the badge
// shows it for a moment and is spent there (the row around it would open the player's card). A badge inside a button (the
// profile's «Tria insígnia» entry) keeps its tap. The label is a manual popover: the top layer, over any open sheet.
// A finger's target is 44 px around the 16 px mark, measured here, not drawn: the selector's rows clip anything that sticks out.
const TOUCH_MS = 2200, SLOP = 14;

export function setupBadgeTip({ doc = document, win = globalThis } = {}) {
  let tip = null, on = null, timer = null;
  const markOf = t => t?.closest?.('.player-badge[data-tip]') ?? null;
  // the nearest mark within SLOP of a finger's tap, on show (not under a sheet, not scrolled away); a button there (the name) keeps its tap
  function nearMark(e) {
    const own = e.target.closest?.('button, a, input, select, textarea, label');
    if (own && !(own.matches('.player-name') && e.clientX > own.getBoundingClientRect().right)) return null; // past the name's text: its invisible 44 px pad (profile.css), the mark's ground
    let best = null, bestD = Infinity;
    for (const m of doc.querySelectorAll('.player-badge[data-tip]')) {
      const r = m.getBoundingClientRect(), dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right), dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
      if (!r.width || dx > SLOP || dy > SLOP || dx + dy >= bestD || markOf(doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) !== m) continue;
      best = m; bestD = dx + dy;
    }
    return best;
  }
  function hide() {
    clearTimeout(timer);
    if (tip?.isConnected) { tip.hidePopover?.(); tip.remove(); }
    on = null;
  }
  function show(mark) {
    if (on === mark) return;
    hide();
    tip ??= Object.assign(doc.createElement('div'), { className: 'badge-tip' });
    if (tip.showPopover) tip.popover = 'manual'; // a [popover] without the API would be a hidden one
    tip.setAttribute('aria-hidden', 'true'); // the badge's own aria-label already says it
    tip.textContent = mark.dataset.tip; tip.classList.remove('below');
    // no popover (older browsers): inside the badge's sheet, so a modal's top layer does not hide it
    (tip.showPopover ? doc.body : mark.closest('dialog') ?? doc.body).append(tip); tip.showPopover?.(); on = mark;
    const r = mark.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, centre = r.left + r.width / 2;
    const x = Math.max(8, Math.min(centre - w / 2, win.innerWidth - w - 8)), below = r.top - h - 10 < 8; // no room above: under it
    tip.classList.toggle('below', below);
    const y = below ? r.bottom + 10 : r.top - h - 10;
    tip.style.left = `${x}px`; tip.style.top = `${y}px`;
    tip.style.setProperty('--tail', `${centre - x}px`);
    if (tip.showPopover) return;
    // a sheet holding it may be its fixed origin (a transform): measured without the entrance's nudge, then corrected
    tip.style.animation = 'none';
    const at = tip.getBoundingClientRect();
    tip.style.left = `${2 * x - at.left}px`; tip.style.top = `${2 * y - at.top}px`; tip.style.animation = '';
  }
  doc.addEventListener('pointerover', e => { if (e.pointerType === 'mouse') { const m = markOf(e.target); if (m) show(m); else if (on) hide(); } });
  doc.addEventListener('pointerout', e => { if (e.pointerType === 'mouse' && on && !on.contains(e.relatedTarget)) hide(); });
  doc.addEventListener('click', e => {
    const m = markOf(e.target) ?? (e.pointerType !== 'mouse' && e.detail ? nearMark(e) : null); // detail 0: a key, not a finger
    if (!m || m.closest('button')) { if (on) hide(); return; }
    e.preventDefault(); e.stopPropagation(); // capture: the row's own click (open the card) never hears it
    if (e.pointerType === 'mouse') { show(m); return; } // hover already shows it: the click only must not open the card
    if (on === m) { hide(); return; }
    show(m); timer = setTimeout(hide, TOUCH_MS);
  }, true);
  for (const ev of ['scroll', 'resize']) win.addEventListener(ev, () => { if (on) hide(); }, true);
  doc.addEventListener('close', hide, true); // a sheet closing takes its rows with it
  return { hide };
}
