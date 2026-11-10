// The level step after «Juga»: the main game's three levels as its selector draws them (level-seg.css: the warmth, the ring,
// the tremble of the harder ones), the last one picked already chosen and still (no shake until a tap), and «Juga».
import { level, setLevel } from './level.js';
import { MULT } from './rules.js';

export function setupLevelStep({ t, onPlay }) {
  const $ = id => document.getElementById(id), menu = $('level-menu'), seg = $('level-seg'), num = new Intl.NumberFormat(document.documentElement.lang); // its points' multiplier, in the page's language (1,3 / 1.3)
  seg.innerHTML = [0, 1, 2].map(l => `<button type="button" class="btn btn-secondary" data-level="${l}" aria-pressed="false">${t(`level.${l}`)}<span class="sub">×${num.format(MULT[l])}</span></button>`).join('');
  const show = quiet => {
    seg.toggleAttribute('data-quiet', quiet); // only a tap shakes (level-seg.css)
    for (const b of seg.children) b.setAttribute('aria-pressed', String(+b.dataset.level === level()));
  };
  seg.addEventListener('click', e => { const b = e.target.closest('[data-level]'); if (b) { setLevel(+b.dataset.level); show(false); } });
  const close = () => { menu.hidden = true; };
  $('level-go').addEventListener('click', () => { close(); onPlay(); });
  $('level-back').addEventListener('click', () => { close(); $('play').focus({ focusVisible: false }); });
  return {
    open() { show(true); menu.hidden = false; $('level-go').focus({ focusVisible: false }); },
    isOpen: () => !menu.hidden,
    close,
  };
}
