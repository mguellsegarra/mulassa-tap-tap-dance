// The first time a playable figure shows and has no heart from this player, a small ribbon points at its heart. Once per
// figure and device, counted as soon as it shows, on a bare selector: after the visit's greeting, under no sheet at all. It goes by itself after a moment or at a tap on it; it lives inside the selector, so it leaves with it.
import { tr } from '../i18n/messages.js';

const seenKey = id => `heart-tip-${id}`, SHOW_MS = 6000, LEAVE_MS = 260; // LEAVE_MS: sel-tip-out's length

export function setupHeartTip({ store, hearts, figure, busy = () => false, doc = document, win = globalThis }) {
  let tip = null, shownFor = null, timer = null, retry = null;
  const place = () => {
    const heart = doc.getElementById('select-heart');
    if (!tip || !heart) return;
    // #select may be zoomed: rects come in screen pixels, left and top are applied in its zoomed ones
    const host = tip.parentElement, z = host.getBoundingClientRect().width / host.offsetWidth || 1; // not the tip's own rect: it animates its scale
    const r = heart.getBoundingClientRect(), w = tip.offsetWidth;
    // Beside the heart where the row has room (nothing covered); under it on phones.
    const side = win.innerWidth >= 900;
    tip.classList.toggle('sel-heart-tip-side', side);
    if (side) { tip.style.left = `${r.right / z + 16}px`; tip.style.top = `${(r.top + r.height / 2) / z - tip.offsetHeight / 2}px`; return; }
    const centre = (r.left + r.width / 2) / z, x = Math.max(12, Math.min(centre - w / 2, win.innerWidth / z - w - 12));
    tip.style.left = `${x}px`; tip.style.top = `${r.bottom / z + 10}px`;
    tip.style.setProperty('--tail', `${centre - x}px`);
  };
  function hide() {
    if (!tip) return;
    clearTimeout(timer);
    const leaving = tip; leaving.classList.add('sel-tip-out'); setTimeout(() => leaving.remove(), LEAVE_MS);
    tip = null; shownFor = null;
    doc.getElementById('select-heart')?.classList.remove('sel-heart-called');
  }
  function show(f, heart) {
    store.set(seenKey(f.id), '1');
    tip = doc.createElement('div'); tip.className = 'sel-heart-tip'; tip.setAttribute('role', 'status'); shownFor = f.id;
    tip.textContent = tr(f.plural ? 'ui.hearts.tip.plural' : 'ui.hearts.tip.singular');
    tip.addEventListener('click', hide); // only a hint: a mouse or a finger clears it, the heart stays the one real control
    (doc.getElementById('select') ?? doc.body).append(tip);
    timer = setTimeout(hide, SHOW_MS);
    heart.classList.add('sel-heart-called');
    place();
    // the panel is still laying itself out (and the heart pulses in place): follow it for a moment, then stop reading
    const until = win.performance?.now?.() + 1000;
    const follow = () => { if (!tip) return; place(); if (win.performance.now() < until) win.requestAnimationFrame(follow); };
    win.requestAnimationFrame?.(follow);
  }
  function update() {
    const f = figure(), heart = doc.getElementById('select-heart'), covered = busy() || doc.querySelector('dialog[open]');
    if (tip && (f?.id !== shownFor || covered || !heart?.checkVisibility?.() || hearts.mine(shownFor))) hide();
    if (f && hearts.mine(f.id)) store.set(seenKey(f.id), '1'); // a heart given knows the way: taking it back must not bring the ribbon
    if (tip || !f || covered || !heart?.checkVisibility?.()) return;
    if (hearts.count(f.id) === null || hearts.mine(f.id) || store.get(seenKey(f.id))) return; // the totals not in yet: asked again when they are
    // under the loader nobody would see it, and its one showing would be spent: ask again once the screen is clear
    if (doc.getElementById('loader')?.checkVisibility?.({ opacityProperty: true, visibilityProperty: true })) { clearTimeout(retry); retry = setTimeout(update, 400); return; }
    show(f, heart);
  }
  win.addEventListener?.('resize', place);
  return { update, hide };
}
