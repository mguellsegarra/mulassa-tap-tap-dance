// Dresses the real /pop/ home (in the iframe) as proposal ?p=A..D; ?p=ara leaves it as it is now.
const q = new URLSearchParams(location.search);
const P = /^([ABCD]|ara)$/.test(q.get('p')) ? q.get('p') : 'A';
const f = document.getElementById('f');

f.addEventListener('load', () => {
  const d = f.contentDocument, $ = id => d.getElementById(id);
  d.documentElement.dataset.hero = P;
  d.head.append(Object.assign(d.createElement('link'), { rel: 'stylesheet', href: new URL('./hero.css', import.meta.url).href }));
  // pitch + Juga + record as one group; display: contents by default, so the phones' order is untouched
  const side = Object.assign(d.createElement('div'), { className: 'hx-side' });
  const pitch = d.querySelector('.c-pitch');
  pitch.before(side);
  side.append(pitch, d.querySelector('.c-play-row'));
  // the owner's record (57, #11) when this browser has none: only this frame's DOM, never its storage
  const fill = () => {
    if ($('menu-best').classList.contains('empty')) { $('menu-best').classList.remove('empty'); $('menu-best-num').textContent = '57'; }
    if ($('menu-rank').hidden) { $('menu-rank').hidden = false; $('menu-rank').textContent = ' · #11'; }
  };
  const mo = new MutationObserver(fill);
  mo.observe($('menu-best'), { attributes: true, attributeFilter: ['class'] });
  mo.observe($('menu-rank'), { attributes: true, attributeFilter: ['hidden'] });
  fill();
});
