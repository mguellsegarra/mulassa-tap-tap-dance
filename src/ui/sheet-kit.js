// Small DOM pieces the sheets (feedback, profile, board) share: the status line and the button that spins while working.
import { fmtNum } from '../i18n/format.js';
import { tr } from '../i18n/messages.js';
export const byId = doc => id => doc.getElementById(id);
export const num = v => fmtNum(Math.round(Number(v))); // points the Catalan way: 12.340
// tr() with one slot kept for a DOM node: the text before and after it
export const trSplit = (key, slot, params = {}) => tr(key, { ...params, [slot]: '\u0000' }).split('\u0000');
export const statusLine = el => (text, ok = false) => { el.textContent = text; el.classList.toggle('ok', ok); };
// A button's label; `spin` puts the plain ring in front (index.html .btn-spin). Working buttons are disabled and spin.
export function setButton(doc, btn, label, disabled = false, spin = disabled) {
  btn.textContent = label; btn.disabled = disabled;
  if (spin) { const ring = doc.createElement('span'); ring.className = 'btn-spin'; btn.prepend(ring); }
}
// `el` readable right now: the page visible, not hidden, wholly inside the window and every box round it that clips
// (a sheet's scrolling body), and on top (a hit test in the middle of each of its line boxes lands in it: no other sheet
// over it; per line, as an inline span that wraps leaves its bounding box's corners to its parent).
export function onScreen(el, doc = el?.ownerDocument) {
  const win = doc?.defaultView;
  if (!el?.isConnected || !win || doc.visibilityState === 'hidden' || el.closest('[hidden], [inert]')) return false;
  if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height || r.top < 0 || r.left < 0 || r.bottom > win.innerHeight || r.right > win.innerWidth) return false;
  for (let p = el.parentElement; p && p !== doc.body; p = p.parentElement) {
    if (win.getComputedStyle(p).overflow === 'visible') continue;
    const c = p.getBoundingClientRect(), top = c.top + p.clientTop, left = c.left + p.clientLeft;
    if (r.top < top - 0.5 || r.left < left - 0.5 || r.bottom > top + p.clientHeight + 0.5 || r.right > left + p.clientWidth + 0.5) return false;
  }
  const inside = b => { const hit = doc.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return Boolean(hit && el.contains(hit)); };
  const lines = [...(el.getClientRects?.() ?? [r])].filter(b => b.width && b.height);
  return lines.length > 0 && lines.every(inside);
}
// cb once `el` has been onScreen for `dwell` ms in a row (a sheet still fading in, a tab in the background, a notice
// scrolled below the fold or under another sheet never count). Checked a few times a second until then; returns a cancel.
export function whenSeen(el, cb, { dwell = 1000, every = 200, seen = onScreen, now = () => performance.now(), timer = setTimeout, clear = clearTimeout } = {}) {
  let since = null, t = 0, live = true;
  const tick = () => {
    if (!live) return;
    if (!seen(el)) since = null;
    else if ((since ??= now()) + dwell <= now()) { live = false; cb(); return; }
    t = timer(tick, every);
  };
  tick();
  return () => { live = false; clear(t); };
}
