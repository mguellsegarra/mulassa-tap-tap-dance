import { Q } from '../../../core/flags.js';
import { start, stored } from './game.js';
import { rulesFor } from './rules.js';
import { warmIcons } from './icons.js';

// ?nou (dev and LAN hosts only, like every flag): wipe this game's saved state on each load and play as a new player:
// tutorial, the four elements, free hints. ?nou=pista starts that tutorial at the hint step (Vapor already found).
// Before start(), which reads the progress.
if (Q.has('nou')) {
  Object.keys(localStorage).filter(k => k.startsWith('minijocs.alquimia.')).forEach(k => localStorage.removeItem(k));
  if (Q.get('nou') === 'pista') localStorage.setItem('minijocs.alquimia.found', JSON.stringify(['vapor']));
}
// ?valls (same hosts): a played-in game with a dozen Valls elements; ?valls=primer: none yet, with Camisa castellera and Flor
// ready, to see the first one arrive. Replaces this browser's progress.
if (Q.has('valls')) {
  const { general, valls } = rulesFor(), first = Q.get('valls') === 'primer';
  const found = first ? [...new Set([...general.slice(0, 60), 'camisa', 'flor'])] : [...general.slice(0, 8), ...valls.slice(0, 12), ...general.slice(8, 110)];
  localStorage.setItem('minijocs.alquimia.found', JSON.stringify(found));
  localStorage.setItem('minijocs.alquimia.lesson', '1');
}

// The cover in index.html stays until the menu can show whole: its fonts and its painting, never half drawn (ten
// seconds at most, then the menu as it is). Juga waits for the player's own icons; the cover comes back only after 300 ms.
const app = document.getElementById('app'), cover = document.getElementById('loader');
cover.style.animation = 'none'; // the script is alive: it owns the cover now, not the no-JS give-up
let icons = null;
const beforePlay = async () => {
  const slow = setTimeout(() => cover.classList.remove('out'), 300);
  await icons;
  clearTimeout(slow);
  cover.classList.add('out');
};
start(app, () => { location.href = '/#jocs'; }, beforePlay);

const art = getComputedStyle(app.querySelector('.alq-menu')).backgroundImage.match(/url\("?([^")]+)/)?.[1];
// fonts.load, not fonts.ready: ready resolves at once on a reload, before the page has even asked for them.
const fonts = ["800 16px 'Baloo 2'", "16px 'Jersey 10'"].map(f => document.fonts.load(f).catch(() => {}));
const ready = Promise.all([...fonts, art && Object.assign(new Image(), { src: art }).decode().catch(() => {})]);
Promise.race([ready, new Promise(r => setTimeout(r, 10e3))]).then(() => {
  cover.classList.add('out');
  icons = warmIcons(stored());
});
