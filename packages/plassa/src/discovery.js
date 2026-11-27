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
