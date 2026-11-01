// The first time a playable figure shows and has no heart from this player, a small ribbon points at its heart. Once per
// figure and device, counted as soon as it shows. It goes by itself after a moment; it lives inside the selector, so it leaves with it.
import { tr } from '../i18n/messages.js';

const seenKey = id => `heart-tip-${id}`, SHOW_MS = 6000;

export function setupHeartTip({ store, hearts, figure, busy = () => false, doc = document, win = globalThis }) {
  let tip = null, shownFor = null, timer = null, retry = null;
  const place = () => {
    const heart = doc.getElementById('select-heart');
    if (!tip || !heart) return;
    const r = heart.getBoundingClientRect(), w = tip.getBoundingClientRect().width;
    // Beside the heart where the row has room (nothing covered); under it on phones.
    const side = win.innerWidth >= 900;
    tip.classList.toggle('sel-heart-tip-side', side);
    if (side) { tip.style.left = `${r.right + 16}px`; tip.style.top = `${r.top + r.height / 2 - tip.getBoundingClientRect().height / 2}px`; return; }
    const x = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, win.innerWidth - w - 12));
    tip.style.left = `${x}px`; tip.style.top = `${r.bottom + 12}px`;
    tip.style.setProperty('--tail', `${r.left + r.width / 2 - x}px`);
  };
  function hide() {
    if (!tip) return;
    clearTimeout(timer);
    tip.remove(); tip = null; shownFor = null;
    doc.getElementById('select-heart')?.classList.remove('sel-heart-called');
  }
  function show(f, heart) {
    store.set(seenKey(f.id), '1');
    tip = doc.createElement('div'); tip.className = 'sel-heart-tip'; tip.setAttribute('role', 'status'); shownFor = f.id;
    const words = doc.createElement('span'); words.textContent = tr(f.plural ? 'ui.hearts.tip.plural' : 'ui.hearts.tip.singular');
    const close = doc.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', tr('html.attr.close'));
    close.addEventListener('click', hide);
    tip.addEventListener('click', () => { const h = doc.getElementById('select-heart'); hide(); h?.click(); }); // it looks like a button: it is one
    close.addEventListener('click', e => e.stopPropagation());
    tip.append(words, close); (doc.getElementById('select') ?? doc.body).append(tip);
    timer = setTimeout(hide, SHOW_MS);
    heart.classList.add('sel-heart-called');
    place();
    // the panel is still laying itself out (and the heart pulses in place): follow it for a moment, then stop reading
    const until = win.performance?.now?.() + 1000;
    const follow = () => { if (!tip) return; place(); if (win.performance.now() < until) win.requestAnimationFrame(follow); };
    win.requestAnimationFrame?.(follow);
  }
  function update() {
    const f = figure(), heart = doc.getElementById('select-heart');
    if (tip && (f?.id !== shownFor || busy() || !heart?.checkVisibility?.() || hearts.mine(shownFor))) hide();
    if (tip || !f || busy() || !heart?.checkVisibility?.()) return;
    if (hearts.count(f.id) === null || hearts.mine(f.id) || store.get(seenKey(f.id))) return; // the totals not in yet: asked again when they are
    // under the loader nobody would see it, and its one showing would be spent: ask again once the screen is clear
    if (doc.getElementById('loader')?.checkVisibility?.({ opacityProperty: true, visibilityProperty: true })) { clearTimeout(retry); retry = setTimeout(update, 400); return; }
    show(f, heart);
  }
  win.addEventListener?.('resize', place);
  return { update, hide };
}
