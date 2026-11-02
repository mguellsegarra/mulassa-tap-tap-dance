// Composition root: the game's flow and DOM. The rules are rules.js, the 3D board.js, the sound audio.js.
import { createBoard } from './board.js';
import { newGame, tick, tap, noteSounded, GOODIES } from './rules.js';
import { MULASSA_SVG } from './mula-art.js';
import { setupOrientation } from './orientation.js';
import { t, applyWords } from './i18n.js';
import { store } from '../../../platform/storage.js';
import { dueNotes, startMusic, stopMusic, pauseMusic, resumeMusic, setMusicLevel, setMusicOn, musicOn, SFX } from './audio.js';

const $ = id => document.getElementById(id);
const board = createBoard($('game'));
const BEST = 'pica-best';
const portraits = board.thumbs();

applyWords();
const row = (kind, text, cls = '') => `<li class="${cls}"><img src="${portraits[kind]}" alt=""><span>${text}</span></li>`;
$('how-rules').innerHTML = ['mula', 'drac', 'mulaFalsa', 'petard'].map(k => row(k, t(`rule.${k}`))).join('');
$('how-goodies').innerHTML = GOODIES.map(k => row(k, t(`goodie.${k}`))).join('');
$('menu-art').innerHTML = MULASSA_SVG;
$('end-art').innerHTML = MULASSA_SVG.replace('class="mula-load"', 'class="mula-load sad"');

let game = null, mode = 'menu', endTimer = 0;
const layout = () => (innerWidth > innerHeight ? { cols: 6, rows: 4 } : { cols: 4, rows: 6 });

function floatText(i, text) {
  const s = board.screenOf(i), el = document.createElement('div');
  el.className = 'float';
  el.textContent = text;
  el.style.left = `${s.x}px`;
  el.style.top = `${s.y}px`;
  el.addEventListener('animationend', () => el.remove());
  document.body.append(el);
}

const COLORS = { hit: ['#c0283c', '#d9a521', '#fff3d6', '#1f5c33'], goodie: ['#f5c518', '#fff3d6', '#ffe066'] };
const word = kind => (kind === 'calcot' ? '+5' : t(`word.${kind}`));

function on(event, cell, kind) {
  if (event === 'hit') {
    SFX.hit();
    board.burst(cell.i, COLORS.hit);
    floatText(cell.i, '+1');
    board.shake(.12);
  } else if (event === 'burn') {
    board.burn(cell);
    floatText(cell.i, '+1');
  } else if (event === 'goodie') {
    SFX.goodie();
    board.burst(cell.i, COLORS.goodie, 40, 1.2);
    floatText(cell.i, word(kind));
    if (kind === 'carretilla') { board.dragonFire(); SFX.fire(); }
  } else if (event === 'over') {
    gameOver(cell);
  }
}

function gameOver(cell) {
  SFX.wrong();
  stopMusic();
  mode = 'ending';
  $('pause').style.visibility = 'hidden'; // hidden would close its grid column and move the score
  setTimeout(() => SFX.boom(), 500);
  setTimeout(() => board.explodeAll(cell.i), 500);
  endTimer = setTimeout(showEnd, 1900);
}

function showEnd() {
  const best = +store.get(BEST) || 0, record = game.score > best;
  if (record) store.set(BEST, game.score);
  $('end-title').textContent = t(record ? 'end.record' : 'end.over');
  $('end-score').textContent = game.score;
  $('end-best').textContent = record ? t('end.recordSub') : t('end.best', { best });
  $('end-best').classList.toggle('record', record);
  $('end-menu').hidden = false;
  $('hud').hidden = true;
  mode = 'over';
  $('again').focus({ focusVisible: false });
}

function start() {
  clearTimeout(endTimer);
  game = newGame({ ...layout(), on });
  board.setGame(game);
  for (const id of ['menu', 'end-menu', 'pause-menu']) $(id).hidden = true;
  $('hud').hidden = false;
  $('pause').style.visibility = '';
  mode = 'play';
  startMusic();
  syncHud(true);
  board.fit(); // now the HUD has a height
}

function showMenu() {
  clearTimeout(endTimer);
  stopMusic();
  game = newGame({ ...layout(), on });
  game.state = 'menu';
  board.setGame(game);
  for (const id of ['end-menu', 'pause-menu', 'hud']) $(id).hidden = true;
  $('menu').hidden = false;
  mode = 'menu';
}

function pause() {
  if (mode !== 'play') return;
  mode = 'paused';
  pauseMusic();
  $('pause-menu').hidden = false;
  $('resume').focus({ focusVisible: false });
}
function resume() {
  if (mode !== 'paused') return;
  mode = 'play';
  resumeMusic();
  $('pause-menu').hidden = true;
}

let shownScore = -1, shownChips = '';
function syncHud(force) {
  board.insets.top = $('hud').hidden ? 0 : $('hud').getBoundingClientRect().bottom;
  if (force || game.score !== shownScore) $('score').textContent = shownScore = game.score;
  const chips = (game.slow > 0 ? `<span class="chip">${t('chip.slow', { s: Math.ceil(game.slow) })}</span>` : '');
  if (chips !== shownChips) $('chips').innerHTML = shownChips = chips;
}

$('game').addEventListener('pointerdown', e => {
  if (mode !== 'play') return;
  const i = board.pick(e.clientX, e.clientY);
  if (i >= 0) tap(game, i);
});
$('play').addEventListener('click', start);
$('again').addEventListener('click', start);
$('to-menu').addEventListener('click', showMenu);
$('quit').addEventListener('click', showMenu);
$('pause').addEventListener('click', pause);
$('resume').addEventListener('click', resume);
const syncMusicBtn = () => { $('music').setAttribute('aria-pressed', musicOn()); $('music-off').toggleAttribute('hidden', musicOn()); };
$('music').addEventListener('click', () => { setMusicOn(!musicOn()); syncMusicBtn(); });
syncMusicBtn();
addEventListener('keydown', e => { if (e.key === 'Escape') { if (mode === 'play') pause(); else resume(); } });
addEventListener('resize', () => {
  // the menu's backdrop board follows the screen; a game keeps its grid, and a wrong turn pauses it until it's back
  if (mode === 'menu' && layout().cols !== game.cols) showMenu();
  else board.fit();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

let last = performance.now();
function frame(now) {
  const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); // a stalled tab must not burn the fuses; the first frame's stamp can predate `last`
  last = now;
  if (mode === 'play') {
    tick(game, dt);
    // .1: a new figure takes that long to pop up, so it lands on the note
    for (let n = dueNotes(.1); n > 0; n--) noteSounded(game);
    if (game.state === 'play') setMusicLevel(game.score, game.slow > 0);
    syncHud();
  } else if (mode === 'ending') tick(game, dt);
  if (mode !== 'paused') board.frame(dt);
  requestAnimationFrame(frame);
}

showMenu();
setupOrientation(pause);
requestAnimationFrame(frame);
if (import.meta.env.DEV) window.__pica = { board, get game() { return game; }, get mode() { return mode; } };
