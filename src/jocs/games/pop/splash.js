// The home first waits for a tap: a browser lets the home's music sound only after one on the page (iOS always asks for it).
// Meanwhile it shows its title big, the live Mulassa and Drac, and mulassa.cat's gold button (style.css .sp-home); the tap
// starts the music (main.js unlock), the title and the figures glide to their place on the home and the rest comes in.
export function waitForTap({ label, onGo }) {
  const btn = Object.assign(document.createElement('button'), { type: 'button', id: 'tap-start', textContent: label });
  document.getElementById('play').parentElement.append(btn);
  document.body.classList.add('sp-home');
  addEventListener('pointerup', () => {
    // first, last, invert, play: measured where they wait and where they land, then animated from the one to the other
    const moving = [document.querySelector('#menu .pop-title'), document.querySelector('#menu .c-art')];
    const from = moving.map(el => el.getBoundingClientRect());
    btn.remove();
    document.body.classList.replace('sp-home', 'sp-in');
    moving.forEach((el, i) => {
      const a = from[i], b = el.getBoundingClientRect();
      el.animate([{ transformOrigin: '0 0', transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})` },
        { transformOrigin: '0 0', transform: 'none' }], { duration: 550, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    });
    setTimeout(() => document.body.classList.remove('sp-in'), 700);
    onGo();
  }, { once: true, capture: true });
}
