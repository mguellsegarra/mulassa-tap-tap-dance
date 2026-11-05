// The home first waits for a tap: a browser lets the home's music sound only after one on the page (iOS always asks for it).
// Meanwhile it shows its title big, the live Mulassa and Drac, and mulassa.cat's gold button (style.css .sp-home); the tap
// starts the music (main.js unlock); the figures fade, the title glides to its place on the home and the rest comes in.
export function waitForTap({ label, onGo }) {
  const btn = Object.assign(document.createElement('button'), { type: 'button', id: 'tap-start', textContent: label });
  document.getElementById('play').parentElement.append(btn);
  document.body.classList.add('sp-home');
  addEventListener('pointerup', () => {
    onGo(); // the music starts with the tap itself
    const art = document.querySelector('#menu .c-art'), hide = { duration: 180, easing: 'ease-in', fill: 'forwards' };
    const fades = [art, btn].map(el => el.animate([{ opacity: 1 }, { opacity: 0 }], hide)); // the figures and the button fade where they are
    fades[0].finished.then(() => {
      // then the title glides to its place on the home (first, last, invert, play) and the rest comes in
      const title = document.querySelector('#menu .pop-title'), a = title.getBoundingClientRect();
      btn.remove();
      document.body.classList.replace('sp-home', 'sp-in');
      fades[0].cancel(); // the home's own fade in takes over (style.css .sp-in)
      const b = title.getBoundingClientRect();
      title.animate([{ transformOrigin: '0 0', transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})` },
        { transformOrigin: '0 0', transform: 'none' }], { duration: 550, easing: 'cubic-bezier(.2, .8, .2, 1)' });
      setTimeout(() => document.body.classList.remove('sp-in'), 700);
    });
  }, { once: true, capture: true });
}
