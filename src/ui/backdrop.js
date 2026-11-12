// A tap outside a sheet closes it, except a sheet nobody asked for (data-unasked: the greeting's news, notices and tips).

// Light dismiss: a tap on the dimmed backdrop outside any sheet closes it exactly like Escape (the same 'cancel'
// handlers run: the pause resumes, the delete confirmation goes back to the list…). Press and release must both be
// outside, so dragging a text selection out of a sheet never closes it, and a swipe (a phone player trying to scroll from
// the margin under the sheet) is no tap either.
let backdropDown = null, backdropX = 0, backdropY = 0;
const outside = (dlg, e) => { const r = dlg.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
addEventListener('pointerdown', e => {
  backdropDown = e.target?.matches?.('dialog.sheet[open]:not([data-unasked])') && outside(e.target, e) ? e.target : null;
  backdropX = e.clientX; backdropY = e.clientY;
}, true);
addEventListener('click', e => {
  const dlg = e.target;
  if (!dlg?.matches?.('dialog.sheet[open]') || dlg !== backdropDown || !outside(dlg, e)) return;
  if (Math.hypot(e.clientX - backdropX, e.clientY - backdropY) > 10) return; // a swipe, not a tap
  backdropDown = null;
  if (dlg.dispatchEvent(new Event('cancel', { cancelable: true }))) dlg.close();
}, true);

// A sheet nobody asked for comes up under a finger that was busy elsewhere (data-unasked, greeting.js): no tap outside
// closes it (above), and for its first ARM_MS no tap inside presses its buttons either. Escape and the back gesture still close it.
const ARM_MS = 400;
// one watch on the whole document: a game page appends mulassa.cat's sheets after this module runs (jocs/main-sheets.js)
new MutationObserver(records => {
  for (const { target: d } of records) if (d.open && d.matches?.('dialog[data-unasked]')) d.dataset.since = String(performance.now());
}).observe(document, { subtree: true, attributes: true, attributeFilter: ['open'] });
addEventListener('click', e => {
  const d = e.target?.closest?.('dialog[data-unasked][open]');
  if (d && performance.now() - Number(d.dataset.since) < ARM_MS) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
