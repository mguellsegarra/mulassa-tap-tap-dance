// A game's home first waits for a tap: a browser lets the home's music sound only after one on the page (iOS always asks
// for it). Meanwhile <body class="sp-home"> shows the home's title big over its art and a button (the game's CSS lays
// that out); the tap starts the music (onGo, inside the gesture), the art and the button fade where they are, the title
// glides to its place on the home (first, last, invert, play) and <body class="sp-in"> brings the rest in.
// Enter or Space on the focused button counts too (sheet-keys.js): a key press has no pointerup.
export function waitForTap({ label, onGo, into, art, title, onIn = () => {} }) { // onIn: the home whole, its fade in done
  const btn = Object.assign(document.createElement('button'), { type: 'button', id: 'tap-start', className: 'btn btn-primary btn-big', textContent: label }); // the game's main button (base.css), its colour
  into.append(btn); // where the home's main button sits
  document.body.classList.add('sp-home');
  let gone = false;
  const go = () => {
    if (gone) return;
    gone = true;
    onGo();
    // the fades start a frame later: an iPhone's audio unlock (onGo, which must run inside the tap) and the animations' start
    // in one frame took 104-109 ms; apart, neither passed 40 (LAN probe, 10 Nov 2026)
    requestAnimationFrame(() => {
      const hide = { duration: 120, easing: 'ease-in', fill: 'forwards' }; // short: the whole tap → home in ~0.45 s (it read as slow at ~1 s on an iPhone)
      const fades = [art, btn].map(el => el.animate([{ opacity: 1 }, { opacity: 0 }], hide));
      fades[0].finished.then(() => {
        const a = title.getBoundingClientRect();
        btn.remove();
        document.body.classList.replace('sp-home', 'sp-in');
        fades[0].cancel(); // the home's own fade in takes over (the game's .sp-in)
        const b = title.getBoundingClientRect();
        title.animate([{ transformOrigin: '0 0', transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})` },
          { transformOrigin: '0 0', transform: 'none' }], { duration: 350, easing: 'cubic-bezier(.2, .8, .2, 1)' });
        setTimeout(() => { document.body.classList.remove('sp-in'); onIn(); }, 420); // after the game's own fade in (≤ .35 s)
      });
    });
  };
  addEventListener('pointerup', go, { once: true, capture: true });
  btn.addEventListener('click', go);
}
