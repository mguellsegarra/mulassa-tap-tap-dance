// A game's home first waits for a tap: a browser lets the home's music sound only after one on the page (iOS always asks
// for it). Meanwhile <body class="sp-home"> shows the home's title big over its art and a button (the game's CSS lays
// that out); the tap starts the music (onGo, inside the gesture), the art and the button fade where they are, the title
// glides to its place on the home (first, last, invert, play) and <body class="sp-in"> brings the rest in.
// Enter or Space on the focused button counts too (sheet-keys.js): a key press has no pointerup.
export function waitForTap({ label, onGo, into, art, title }) {
  const btn = Object.assign(document.createElement('button'), { type: 'button', id: 'tap-start', textContent: label });
  into.append(btn); // where the home's main button sits
  document.body.classList.add('sp-home');
  let gone = false;
  const go = () => {
    if (gone) return;
    gone = true;
    onGo();
    const hide = { duration: 180, easing: 'ease-in', fill: 'forwards' };
    const fades = [art, btn].map(el => el.animate([{ opacity: 1 }, { opacity: 0 }], hide));
    fades[0].finished.then(() => {
      const a = title.getBoundingClientRect();
      btn.remove();
      document.body.classList.replace('sp-home', 'sp-in');
      fades[0].cancel(); // the home's own fade in takes over (the game's .sp-in)
      const b = title.getBoundingClientRect();
      title.animate([{ transformOrigin: '0 0', transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})` },
        { transformOrigin: '0 0', transform: 'none' }], { duration: 550, easing: 'cubic-bezier(.2, .8, .2, 1)' });
      setTimeout(() => document.body.classList.remove('sp-in'), 700);
    });
  };
  addEventListener('pointerup', go, { once: true, capture: true });
  btn.addEventListener('click', go);
}
