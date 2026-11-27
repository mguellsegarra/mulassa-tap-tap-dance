// A discovery's moment, shared by the games: Mulassa Alchemy's good mix (branch jocs/alchemy-2.0.0, overlays.js
// showFound and style.css .alq-rays/.alq-found; it moves onto this when it merges): rays in the find's colour turning
// behind its art, which rises in with its name. It never takes a tap, so a game can go on under it: after `ms` the art
// flies into `to` (where the game keeps the find) and the moment goes. Its look is game.css's .discovery.
// art: a node; at: the share of the screen's height its middle stands at. → a promise, resolved once it has gone
export function presentDiscovery({ art, title, sub = '', tint = '#ffd76a', ms = 1700, to = null, at = 0.5, host = document.body }) {
  const el = document.createElement('div'), reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.className = 'discovery';
  el.setAttribute('role', 'status');
  el.style.setProperty('--tint', tint);
  el.style.top = `${at * 100}%`;
  el.innerHTML = '<div class="discovery-rays"></div><div class="discovery-card"><div class="discovery-art"></div><b></b><span></span></div>';
  el.querySelector('.discovery-art').append(art);
  el.querySelector('b').textContent = title;
  el.querySelector('span').textContent = sub;
  host.append(el);
  return new Promise(done => setTimeout(() => {
    const box = el.querySelector('.discovery-art'), from = box.getBoundingClientRect(), dest = to?.getBoundingClientRect();
    el.classList.add('leaving');
    if (dest?.width && !reduced) { // into its place, as small as it is kept there
      const dx = dest.x + dest.width / 2 - from.x - from.width / 2, dy = dest.y + dest.height / 2 - from.y - from.height / 2;
      box.style.translate = `${dx}px ${dy}px`;
      box.style.scale = dest.width / from.width;
    }
    setTimeout(() => { el.remove(); done(); }, reduced ? 0 : 420);
  }, ms));
}

// A find's toast (Mulassa Tower's in-play find, Fable's review): one compact line low in the HUD's look, its art, its
// name and why it was earned; a first find also gets a badge (badge: its word) and small rays. One at a time: a new one
// takes the place of the one showing, never queued. No tap. Its look is game.css's .discovery-toast; a game keeps its
// own bands clear with --toast-left / --toast-right.
let toast = null; // the one on screen: { el, timer }
export function toastDiscovery({ art, title, sub = '', tint = '#ffd76a', badge = '', ms = 2600, host = document.body }) {
  clearDiscoveryToast();
  const el = document.createElement('div');
  el.className = 'discovery-toast';
  el.setAttribute('role', 'status');
  el.style.setProperty('--tint', tint);
  el.innerHTML = `<div class="discovery-toast-art">${badge ? '<i class="discovery-rays"></i>' : ''}</div><div class="discovery-toast-text"><b></b><span></span></div>`;
  el.firstChild.append(art);
  if (badge) el.firstChild.append(Object.assign(document.createElement('em'), { textContent: badge }));
  el.lastChild.firstChild.textContent = title; // the text's own b and span: the art may hold its own
  el.lastChild.lastChild.textContent = sub;
  host.append(el);
  const timer = setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 300);
    if (toast?.el === el) toast = null;
  }, ms);
  toast = { el, timer };
}
// the toast showing goes at once (a new one, the run's end)
export function clearDiscoveryToast() {
  if (!toast) return;
  clearTimeout(toast.timer);
  toast.el.remove();
  toast = null;
}
