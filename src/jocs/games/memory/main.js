import { LEVELS, pictureOf } from './figures.js';
import { createGame, shuffled, fitCards } from './game.js';
import { createBoard } from './board.js';
import { unlockSound, setSound, soundOn, sfx } from './sound.js';

const $ = id => document.getElementById(id);
let game, board, level, buttons = [];

$('row').innerHTML = LEVELS[1].figures.slice(0, 5).map(x => `<img src="${pictureOf(x)}" alt="">`).join('');
$('levels').innerHTML = LEVELS.map(l => `<button type="button" class="btn btn-primary" data-level="${l.id}" disabled>${l.name}<small></small></button>`).join('');

const openSheet = () => { $('sheet').showModal(); $('sheet').focus(); }; // the sheet takes focus, or the browser puts its ring on the way back
const room = () => $('area').getBoundingClientRect();
// A level with a card count draws that many at random, or fewer if this screen can't fit them; the others play all their figures.
const cardsOf = l => l.cards ? fitCards(l.cards / 2, room().width, room().height) : l.figures.length * 2;
const labelLevels = () => { for (const b of $('levels').children) b.querySelector('small').textContent = `${cardsOf(LEVELS.find(l => l.id === b.dataset.level))} cartes`; };
labelLevels();

function paint() {
  $('pairs').textContent = `${game.pairs}/${game.total}`;
  $('moves').textContent = game.moves;
  game.cards.forEach((c, i) => {
    buttons[i].setAttribute('aria-label', c.up ? c.figure.name : `Carta ${i + 1}, tapada`);
    buttons[i].setAttribute('aria-disabled', c.up);
  });
}

function layout() {
  if (!level) return;
  board.layout($('area').getBoundingClientRect()).forEach((r, i) => {
    Object.assign(buttons[i].style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.right - r.left}px`, height: `${r.bottom - r.top}px` });
  });
}

async function turn(i) {
  const res = game.flip(i);
  if (!res) return;
  board.hover(i, false);
  unlockSound(); // after a reload a card can be the first gesture
  sfx.flip();
  paint();
  $('live').textContent = res.card.figure.name;
  await board.flip(i, true);
  if (res.type === 'match') {
    $('live').textContent = `Parella: ${res.card.figure.name}`;
    sfx.match();
    await board.match(res.a, res.b);
    if (res.won) win();
  } else if (res.type === 'miss') {
    sfx.miss();
    await Promise.all([board.miss(res.a), board.miss(res.b)]);
    await board.wait(500);
    const { a, b } = res;
    game.hide();
    paint();
    await Promise.all([board.flip(a, false), board.flip(b, false)]);
  }
}

async function win() {
  board.finale();
  sfx.win();
  await board.wait(1300);
  $('msg').textContent = `${level.name} complet en ${game.moves} moviments!`;
  openSheet();
}

async function start(next) {
  level = next;
  const figures = shuffled(level.figures).slice(0, cardsOf(level) / 2);
  game = createGame(figures);
  for (const b of buttons) b.remove();
  buttons = game.cards.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'card-btn';
    b.addEventListener('click', () => turn(i));
    const glow = on => board.hover(i, on && !game.cards[i].up);
    b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') glow(true); });
    b.addEventListener('pointerleave', () => glow(false));
    b.addEventListener('focus', () => { if (b.matches(':focus-visible')) glow(true); });
    b.addEventListener('blur', () => glow(false));
    $('page').append(b);
    return b;
  });
  await board.setLevel(figures, game.cards.length);
  layout();
  paint();
  board.deal(game);
}

$('sheet').addEventListener('cancel', e => e.preventDefault()); // Esc can't leave the player on a board that isn't dealt
$('levels').addEventListener('click', async e => {
  const b = e.target.closest('[data-level]');
  if (!b) return;
  unlockSound();
  const all = [...$('levels').children];
  for (const x of all) x.disabled = true;
  try {
    await start(LEVELS.find(l => l.id === b.dataset.level));
    $('sheet').close();
  } catch (err) {
    console.error(err);
    $('msg').textContent = "No s'ha pogut carregar aquest nivell.";
  }
  for (const x of all) x.disabled = false;
});
$('menu').addEventListener('click', () => { labelLevels(); $('msg').textContent = 'Tria un nivell i troba les parelles.'; openSheet(); }); // i18n-ok: provisional, Memory is Catalan-only until Codex writes its texts (docs/jocs/memory-textos.md)
const paintSound = () => { $('sound').setAttribute('aria-pressed', soundOn); $('sound').classList.toggle('off', !soundOn); };
$('sound').addEventListener('click', () => { setSound(!soundOn); unlockSound(); paintSound(); });
paintSound();

openSheet();
try {
  board = await createBoard($('scene'));
  addEventListener('resize', () => { layout(); labelLevels(); });
  for (const x of $('levels').children) x.disabled = false;
} catch (err) {
  console.error(err);
  $('msg').textContent = "No s'ha pogut carregar el joc en aquest navegador."; // i18n-ok: provisional, Memory is Catalan-only until Codex writes its texts (docs/jocs/memory-textos.md)
}
