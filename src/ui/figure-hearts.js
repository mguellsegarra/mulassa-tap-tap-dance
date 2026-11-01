// The heart of a figure: the totals come once from the server and each tap updates only after the server saved it.
import { tr } from '../i18n/messages.js';

const BIT_COLORS = ['#e0364c', '#ff6b7f', '#f5c518', '#c0283c'], BITS = 30, FAILED_MS = 3500;
// A big burst of hearts out of the button, all around and mostly upwards; nothing under reduced motion. Each one removes itself.
function heartBurst(button) {
  const doc = button.ownerDocument, win = doc.defaultView;
  const icon = button.querySelector('svg');
  icon.classList.remove('sel-heart-pop'); void icon.getBoundingClientRect(); icon.classList.add('sel-heart-pop');
  if (win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const i = icon.getBoundingClientRect(), r = button.getBoundingClientRect(), host = button.closest('dialog') ?? doc.body;
  const nav = win.navigator, bits = nav?.hardwareConcurrency <= 4 || nav?.deviceMemory <= 4 ? 12 : BITS; // old machines: the same gesture, fewer layers
  for (let n = 0; n < bits; n++) {
    const bit = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    bit.setAttribute('viewBox', '0 0 24 24'); bit.setAttribute('aria-hidden', 'true'); bit.classList.add('sel-heart-bit');
    bit.innerHTML = `<path fill="${BIT_COLORS[n % BIT_COLORS.length]}" d="M12 20.5 4.2 12.9a4.8 4.8 0 0 1 6.8-6.8l1 1 1-1a4.8 4.8 0 0 1 6.8 6.8z"/>`;
    const a = -Math.PI * (-.15 + 1.3 * Math.random()), d = 110 + Math.random() * 170, big = n % 5 === 0;
    const x = r.left + r.width * (.2 + .6 * Math.random());
    bit.style.cssText = `left:${x}px;top:${i.top + i.height / 2}px;--s:${big ? 36 + Math.random() * 18 : 16 + Math.random() * 16}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--r:${(Math.random() - .5) * 100}deg;animation-delay:${Math.random() * .12}s`;
    bit.addEventListener('animationend', () => bit.remove());
    host.append(bit);
  }
}

// A tap the server did not save: say so beside the button, which stays as it was. In screen pixels, like the burst.
function heartFailed(button) {
  const doc = button.ownerDocument, win = doc.defaultView, r = button.getBoundingClientRect();
  const note = doc.createElement('div');
  note.className = 'sel-heart-fail'; note.setAttribute('role', 'alert'); note.textContent = tr('ui.hearts.failed');
  (button.closest('dialog') ?? doc.body).append(note);
  const next = button.closest('.sel-pending')?.querySelector('.sel-pending-actions')?.getBoundingClientRect();
  if (next) note.style.maxWidth = `${r.width}px`; // on a pending card: as wide as its button, centred in the room above the next one
  note.style.left = `${Math.max(12, Math.min(r.left + r.width / 2 - note.offsetWidth / 2, win.innerWidth - note.offsetWidth - 12))}px`;
  note.style.top = `${r.bottom + (next?.height ? Math.max(4, (next.top - r.bottom - note.offsetHeight) / 2) : 10)}px`;
  setTimeout(() => note.remove(), FAILED_MS);
  return note;
}
export function setupHearts({ service, needConfirmed, onChange = () => {} }) {
  let totals = null, loading = null, session = 0, failed = null; const mine = new Set(), saving = new Set();
  // an answer from before a change of account never lands on the new one
  function load() {
    const asked = session;
    loading ??= Promise.resolve().then(() => service.figureHearts()).then(rows => { // a board without hearts (the dev mock): no counts, no crash
      if (asked !== session) return;
      totals = new Map(); mine.clear();
      for (const r of rows) { totals.set(r.figure, r.hearts); if (r.mine) mine.add(r.figure); }
      onChange();
    }).catch(() => { if (asked === session) loading = null; });
    return loading;
  }
  const save = async (figure, button) => {
    if (saving.has(figure.id)) return;
    failed?.remove(); // a new try: the old failure no longer holds
    saving.add(figure.id); const on = !mine.has(figure.id), asked = session;
    try {
      const total = await service.setFigureHeart(figure.id, on);
      if (asked !== session) return;
      (totals ??= new Map()).set(figure.id, total);
      if (on) { mine.add(figure.id); heartBurst(button); } else mine.delete(figure.id); // only once the server saved it
    } catch { if (asked === session && button) { failed?.remove(); failed = heartFailed(button); } /* nothing else changed: the count and the state stay as the server has them */ } finally { saving.delete(figure.id); onChange(); }
  };
  return {
    load,
    reload() { failed?.remove(); session++; loading = null; totals = null; mine.clear(); onChange(); return load(); },
    count: id => totals ? (totals.get(id) ?? 0) : null,
    mine: id => mine.has(id),
    tap(figure, button) { needConfirmed('heart', () => { const asked = session; load().then(() => { if (asked === session) save(figure, button); }); }); },
    paint(button, figure) {
      const n = totals ? (totals.get(figure.id) ?? 0) : null, on = mine.has(figure.id);
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-label', tr(on ? 'ui.hearts.saved' : 'ui.hearts.action', { name: figure.fullName || figure.name }));
      button.querySelector('span').textContent = n || ''; // no zero: nobody yet is not a number worth showing
    },
  };
}
