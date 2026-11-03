// The tutorial's coach: a drawn glove that taps whatever the player should touch next, a ring where it lands, and a
// parchment bubble saying what that thing is. It follows its target every frame, so scrolling or layout can't strand it.
// Pixel art, like the MULASSA letters of the logo: cream on a dark outline, a gold cuff. 14×18 pixels, the fingertip at x 5.
const GLOVE = `<svg viewBox="0 0 14 18" shape-rendering="crispEdges" aria-hidden="true">
  <path fill="#33210f" d="M4 0h2v1H4zM3 1h1v14H3zM6 1h1v4H6zM7 4h2v1H7zM9 5h2v1H9zM6 5h1v3H6zM9 6h1v2H9zM11 6h2v1h-2zM11 7h1v1h-1zM13 7h1v7h-1zM0 7h2v1H0zM0 8h1v2H0zM2 8h1v2H2zM1 10h1v2H1zM2 12h1v2H2zM12 13h1v2h-1zM3 15h10v1H3zM3 16h1v1H3zM12 16h1v1h-1zM3 17h10v1H3z"/>
  <path fill="#fff2d5" d="M4 1h2v7H4zM7 5h2v3H7zM10 6h1v2h-1zM12 7h1v1h-1zM1 8h1v2H1zM4 8h9v2H4zM2 10h11v2H2zM3 12h10v1H3zM3 13h9v1H3zM4 14h8v1H4zM1 9h2v1H1z"/>
  <path fill="#e3bf62" d="M4 16h8v1H4z"/></svg>`;

export function coach(layer) {
  const ring = Object.assign(document.createElement('div'), { className: 'alq-ring', hidden: true });
  const hand = Object.assign(document.createElement('div'), { className: 'alq-hand', hidden: true, innerHTML: `<span>${GLOVE}</span>` });
  const tip = Object.assign(document.createElement('div'), { className: 'alq-tip', hidden: true, innerHTML: '<p></p><i></i>' });
  [ring, hand].forEach(e => e.setAttribute('aria-hidden', 'true'));
  tip.setAttribute('role', 'status');
  layer.append(ring, hand, tip);
  let target = null, raf = 0;
  const place = () => {
    const r = target.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    ring.style.translate = `${x}px ${y}px`;
    hand.style.translate = `${x}px ${r.top + r.height * .55}px`; // the fingertip just below the centre
    if (!tip.hidden) {
      // Under the glove, so the message bar above the shelf stays readable; above the target only when there's no room below.
      const w = tip.offsetWidth, h = tip.offsetHeight, below = r.bottom + 78 + h < innerHeight - 12;
      const left = Math.min(Math.max(12, x - w / 2), innerWidth - 12 - w);
      tip.style.translate = `${left}px ${below ? r.bottom + 78 : r.top - h - 14}px`;
      tip.classList.toggle('below', below);
      tip.style.setProperty('--notch', `${Math.min(Math.max(18, x - left), w - 18)}px`);
    }
    raf = requestAnimationFrame(place);
  };
  return {
    point(el, text) {
      tip.hidden = !el || !text;
      if (text) tip.firstChild.textContent = text;
      if (el === target) return;
      cancelAnimationFrame(raf);
      target = el ?? null;
      hand.hidden = ring.hidden = !target;
      if (target) place();
    },
    stop() { cancelAnimationFrame(raf); ring.remove(); hand.remove(); tip.remove(); },
  };
}
