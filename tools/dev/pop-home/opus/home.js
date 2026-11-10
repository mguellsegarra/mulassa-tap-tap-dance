// The mock-up's behaviour: the real board behind, the real models' portraits, the proposal from ?p=, the record from ?best=.
// It neither reads nor writes the game's own record (pica-best).
import { createBoard } from '/src/jocs/games/pop/board.js';
import { newGame } from '/src/jocs/games/pop/rules.js';

const q = new URLSearchParams(location.search);
const P = /^[ABCD]$/.test(q.get('p')) ? q.get('p') : 'A';
const best = q.has('best') ? +q.get('best') || 0 : 57;
const home = document.querySelector(`.home[data-p="${P}"]`);
document.body.dataset.p = P;
home.hidden = false;

// provisional texts (strings.md): name and what to do with it
const KINDS = {
  mula: ['Mulassa', 'Toca-la abans que se li acabi la metxa'],
  petard: ['Petard', 'Toca’l per apagar-lo abans que peti'],
  drac: ['Drac', 'No el toquis'],
  dracFals: ['Drac vermell', 'No el toquis'],
  mulaFalsa: ['Mulassa verda', 'És falsa: no la toquis'],
  calcot: ['Calçot', '+5 punts'],
  campanar: ['Campanar', 'Temps lent 5\u00a0s'],
  carretilla: ['Carretilla', 'El Drac crema totes les Mulasses'],
};
// C's cards and D's list on a phone: what to do in two words
const TINY = { mula: 'Toca-la', petard: 'Toca’l', drac: 'No el toquis', dracFals: 'No el toquis', mulaFalsa: 'No la toquis', calcot: '+5 punts', campanar: 'Temps lent', carretilla: 'Foc a totes' };
const SHORT = { mula: 'Mulassa', petard: 'Petard', drac: 'Drac', dracFals: 'Drac vermell', mulaFalsa: 'Verda', calcot: '+5', campanar: 'Lent', carretilla: 'Foc' };

const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const tpl = id => document.getElementById(id).content.cloneNode(true);
for (const el of $$('[data-logo]')) el.replaceWith(tpl('logo'));
for (const el of $$('[data-icon]')) el.prepend(tpl(el.dataset.icon));
for (const el of $$('[data-best-num]')) el.textContent = best;
for (const el of $$('[data-best]')) el.classList.toggle('none', !best);

// the figures' lists, each in its proposal's own markup
const img = k => `<img data-k="${k}" alt="">`;
for (const ul of $$('.how-list')) ul.innerHTML = ul.dataset.kinds.split(' ').map(k => `<li>${img(k)}<span><b>${KINDS[k][0]}</b>${KINDS[k][1]}</span></li>`).join('');
// D on a phone: the short words (TINY); on a wide screen the whole line
for (const ul of $$('.d-how')) ul.innerHTML = ul.dataset.kinds.split(' ').map(k => `<li>${img(k)}<span><b>${KINDS[k][0]}</b><span class="long">${KINDS[k][1]}</span><span class="tiny">${TINY[k]}</span></span></li>`).join('');
for (const box of $$('.b-tiles')) box.innerHTML = box.dataset.kinds.split(' ').map(k => `<button class="b-tile" data-kind="${k}" aria-label="${KINDS[k][0]}">${img(k)}<i class="badge"></i><span>${SHORT[k]}</span></button>`).join('');
for (const c of $$('.c-card')) c.innerHTML = `<div class="c-por">${img(c.dataset.kind)}</div><div class="nb"><b>${KINDS[c.dataset.kind][0]}</b><span class="long">${KINDS[c.dataset.kind][1]}</span><span class="tiny">${TINY[c.dataset.kind]}</span></div>`;

// B: a tile tells what it does in the line under the tiles
const info = home.querySelector('.b-info');
for (const t of $$('.b-tile', home)) t.addEventListener('click', () => {
  for (const o of $$('.b-tile', home)) o.setAttribute('aria-pressed', o === t);
  const [name, what] = KINDS[t.dataset.kind];
  info.innerHTML = `<b>${name}:</b> ${what.charAt(0).toLowerCase()}${what.slice(1)}`;
});

// D: the two tabs (both panes show side by side on a wide screen; CSS)
for (const b of $$('[data-tab]', home)) b.addEventListener('click', () => {
  for (const o of $$('[data-tab]', home)) o.setAttribute('aria-pressed', o === b);
  home.dataset.tab = b.dataset.tab;
});
if (q.get('tab') === 'how') home.querySelector('[data-tab="how"]')?.click();

// A: «Com es juga» in its own sheet
const how = document.querySelector('.how-sheet');
const openHow = () => { how.hidden = false; how.querySelector('.sheet-x').focus({ focusVisible: false }); };
for (const b of $$('[data-open-how]')) b.addEventListener('click', openHow);
how.querySelector('.sheet-x').addEventListener('click', () => { how.hidden = true; });
how.addEventListener('click', e => { if (e.target === how) how.hidden = true; });
if (q.has('how')) openHow();

// music: only the button's state here (the game's own toggle is audio.js)
for (const m of $$('.music')) m.addEventListener('click', () => {
  const on = m.getAttribute('aria-pressed') !== 'true';
  for (const o of $$('.music')) o.setAttribute('aria-pressed', on);
});

// Juga and the way back: a toast instead of a game or a navigation
const toast = document.querySelector('.mock-toast');
const say = text => { toast.querySelector('span').textContent = text; toast.hidden = false; };
for (const b of $$('.play')) b.addEventListener('click', () => { how.hidden = true; document.body.classList.add('playing'); say('Maqueta: aquí començaria la partida.'); });
for (const a of $$('.back')) a.addEventListener('click', e => { e.preventDefault(); say('Maqueta: aniria a mulassa.cat/#jocs'); });
toast.querySelector('button').addEventListener('click', () => { toast.hidden = true; document.body.classList.remove('playing'); });

// the live board behind, in its menu state, as pop/ shows it
const board = createBoard(document.getElementById('game'));
const layout = () => (innerWidth > innerHeight ? { cols: 6, rows: 4 } : { cols: 4, rows: 6 });
let game;
const reset = () => { game = newGame(layout()); game.state = 'menu'; board.insets.top = 0; board.setGame(game); };
reset();
addEventListener('resize', () => (layout().cols !== game.cols ? reset() : board.fit()));
let last = performance.now();
requestAnimationFrame(function frame(now) {
  board.frame(Math.max(0, Math.min(.05, (now - last) / 1000)));
  last = now;
  requestAnimationFrame(frame);
});

// the real models' portraits, drawn by the board's renderer; static (no running Mulassa on the home)
const imgs = $$('img[data-k]');
const sizes = new Map();
for (const i of imgs) sizes.set(+(i.dataset.size || 160), [...(sizes.get(+(i.dataset.size || 160)) || []), i.dataset.k]);
for (const [size, kinds] of sizes) {
  const pics = await board.portraits([...new Set(kinds)], size);
  for (const i of imgs) if (+(i.dataset.size || 160) === size) i.src = pics[i.dataset.k];
}
await document.fonts.ready;
document.documentElement.classList.add('ready'); // the captures wait for this
