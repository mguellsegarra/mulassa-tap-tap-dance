// A tap outside a sheet closes it.

// Light dismiss: a tap on the dimmed backdrop outside any sheet closes it exactly like Escape (the same 'cancel'
// handlers run: the pause resumes, the delete confirmation goes back to the list…). Press and release must both be
// outside, so dragging a text selection out of a sheet never closes it.
let backdropDown = null;
const outside = (dlg, e) => { const r = dlg.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
addEventListener('pointerdown', e => { backdropDown = e.target?.matches?.('dialog.sheet[open]') && outside(e.target, e) ? e.target : null; }, true);
addEventListener('click', e => {
  const dlg = e.target;
  if (!dlg?.matches?.('dialog.sheet[open]') || dlg !== backdropDown || !outside(dlg, e)) return;
  backdropDown = null;
  if (dlg.dispatchEvent(new Event('cancel', { cancelable: true }))) dlg.close();
}, true);
