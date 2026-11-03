// Composition root: the game's flow and DOM. The rules are rules.js, the 3D board.js, the sound audio.js.
import { createBoard } from './board.js';
import { createHero } from './hero.js';
import { newGame, tick } from './rules.js';
import { createRun, TICKS_PER_S } from './run.js';
import { setupRankingUI, RANKING } from './ranking-ui.js';
import { setupOrientation } from './orientation.js';
import { t, applyWords } from './i18n.js';
import { store } from '../../../platform/storage.js';
import { startMusic, stopMusic, pauseMusic, resumeMusic, setMusicOn, musicOn, slowMusic, SFX } from './audio.js';
import { BOT_FROM, botTap } from './autoplay.js';
import { haptic } from '../../../platform/haptics.js';

const BOT = import.meta.env.DEV && new URLSearchParams(location.search).has('autoplay');
// dev only (?campanar or ?campanar=points): the run starts that far on (150 by default, the tune at full speed after its
// glide), and a campanar pops up out of the blue 8 s in, then 3 to 6 s after each slow time ends
const BELL = import.meta.env.DEV && new URLSearchParams(location.search).has('campanar');
const BELL_FROM = +(new URLSearchParams(location.search).get('campanar') || 150);
let bellAt = 0;
const $ = id => document.getElementById(id);
const board = createBoard($('game'));
const hero = createHero($('menu-hero'));
const BEST = 'pica-best'; // the game's first name: kept, so a best score survives the rename
let booted = false; // the boot screen is up: nothing is drawn under it (see the end of this file)
// The public board (ranking-ui.js). The dev bot's runs start at BOT_FROM points: they are not the game's and never go.
const rankingUI = setupRankingUI({ t, focusBack: () => $('menu-best').focus({ focusVisible: false }) });

applyWords();
// From the games sheet (mulassa.cat, location.replace keeps the referrer) the corner's bubble says «Torna als jocs»; a shared
// link, a typed address or a reload (which keeps the first referrer, the games sheet no longer behind) gets an invitation (style.css)
if (!document.referrer.startsWith(`${location.origin}/`) || performance.getEntriesByType('navigation')[0]?.type === 'reload') {
  $('back').classList.add('more');
  $('back').querySelector('.exit-tip').textContent = t('more');
}
$('end-art').innerHTML = $('boot-art').innerHTML.replace('class="mula-load"', 'class="mula-load sad"');

let run = null, game = null, mode = 'menu', endTimer = 0, clock = 0; // clock: the run's play time, in seconds // game: the run's, or the menu's backdrop board
const layout = () => (innerWidth > innerHeight ? { cols: 6, rows: 4 } : { cols: 4, rows: 6 });

function floatText(i, text) {
  const s = board.screenOf(i), el = document.createElement('div');
  el.className = 'float';
  el.textContent = text;
  el.style.left = `${s.x}px`;
  el.style.top = `${s.y}px`;
  el.addEventListener('animationend', () => el.remove());
  document.body.append(el);
  const half = el.offsetWidth / 2 + 8; // a long word on an edge cell stays on screen (ЗАТИШЬЕ! is about 200 px)
  el.style.left = `${Math.min(innerWidth - half, Math.max(half, s.x))}px`;
}

const COLORS = { hit: ['#c0283c', '#d9a521', '#fff3d6', '#1f5c33'], goodie: ['#f5c518', '#fff3d6', '#ffe066'] };
const word = kind => (kind === 'calcot' ? '+5' : t(`word.${kind}`));

function on(event, cell, kind) {
  if (event === 'hit') {
    SFX.hit();
    haptic('hit');
    board.burst(cell.i, COLORS.hit);
    floatText(cell.i, '+1');
    board.shake(.12);
  } else if (event === 'burn') {
    board.burn(cell);
    floatText(cell.i, '+1');
  } else if (event === 'goodie') {
    SFX.goodie();
    haptic('big');
    board.burst(cell.i, COLORS.goodie, 40, 1.2);
    floatText(cell.i, word(kind));
    if (kind === 'carretilla') { board.dragonFire(); SFX.fire(); }
    if (kind === 'campanar') SFX.bell();
  } else if (event === 'defuse') {
    SFX.goodie();
    haptic('hit');
    board.burst(cell.i, COLORS.goodie, 30);
  } else if (event === 'spawn') {
    SFX.sprout();
  } else if (event === 'over') {
    gameOver(cell);
  }
}

function gameOver(cell) {
  // a Mulassa or a bomb ends the run by running out; the rest by being tapped: the kind alone says which
  $('end-why').querySelector('img').src = document.querySelector(`.c-card[data-kind="${cell.kind}"] img`).src;
  $('end-why').querySelector('span').textContent = t(`end.why.${cell.kind}`);
  SFX.wrong();
  SFX.boom();
  haptic('boom'); // a tapped Drac's inside the tap (iPhone too); a fuse running out vibrates on Android only
  board.explodeAll(cell.i);
  stopMusic();
  mode = 'ending';
  setSlow(false);
  $('pause').style.visibility = 'hidden'; // hidden would close its grid column and move the score
  endTimer = setTimeout(showEnd, 1200);
}


function showEnd() {
  const best = +store.get(BEST) || 0, record = game.score > best;
  if (record && !BOT && !BELL) store.set(BEST, game.score);
  $('end-title').textContent = t(record ? 'end.record' : 'end.over');
  $('end-score').textContent = game.score;
  $('end-best').textContent = record ? t('end.recordSub') : t('end.best', { best });
  $('end-best').classList.toggle('record', record);
  rankingUI.endScreen();
  if (RANKING && !BOT && !BELL && game.score > 0) rankingUI.publish(run);
  $('end-menu').hidden = false;
  $('hud').hidden = true;
  mode = 'over';
  $('again').focus({ focusVisible: false });
}

function start() {
  clearTimeout(endTimer);
  run = createRun({ ...layout(), seed: crypto.getRandomValues(new Uint32Array(1))[0], on });
  clock = 0;
  game = run.game;
  if (BOT) game.score = BOT_FROM; // dev only: such a run is never published
  if (BELL) { game.score = BELL_FROM; bellAt = 8; }
  board.setGame(game);
  for (const id of ['menu', 'end-menu', 'pause-menu']) $(id).hidden = true;
  $('hud').hidden = false;
  $('hud-best-num').textContent = +store.get(BEST) || '';
  $('hud-best').hidden = !(+store.get(BEST));
  $('pause').style.visibility = '';
  mode = 'play';
  startMusic(run.tune);
  syncHud(true);
  board.fit(); // now the HUD has a height
}

function showMenu() {
  clearTimeout(endTimer);
  stopMusic();
  game = newGame({ ...layout(), on });
  game.state = 'menu';
  setSlow(false);
  board.setGame(game);
  for (const id of ['end-menu', 'pause-menu', 'hud']) $(id).hidden = true;
  $('menu').hidden = false;
  const best = +store.get(BEST) || 0;
  $('menu-best').classList.toggle('empty', !best);
  $('menu-best-num').textContent = best;
  $('menu-best').disabled = !RANKING;
  if (booted) rankingUI.sync();
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

let shownScore = -1, shownChips = '', shownSlow = false;
// the bell's slow time, seen and heard: a cold tint over the board, the music muffled; its end lifts back
function setSlow(v) {
  if (v === shownSlow) return;
  shownSlow = v;
  document.body.classList.toggle('slow', v);
  slowMusic(v);
  if (!v && mode === 'play') SFX.unbell();
}
function syncHud(force) {
  board.insets.top = $('hud').hidden ? 0 : $('hud').getBoundingClientRect().bottom;
  if (force || game.score !== shownScore) $('score').textContent = shownScore = game.score;
  // the campanar's own portrait (the home's card, drawn at boot), its name for the effect, and the seconds left
  const chips = (game.slow > 0 ? `<span class="chip"><img src="${document.querySelector('.c-card[data-kind="campanar"] img').src}" alt=""><span>${t('chip.slow')}</span><b>${Math.ceil(game.slow)}</b></span>` : '');
  if (chips !== shownChips) $('chips').innerHTML = shownChips = chips;
  setSlow(game.slow > 0);
}

$('game').addEventListener('pointerdown', e => {
  if (mode !== 'play') return;
  const i = board.pick(e.clientX, e.clientY);
  if (i >= 0) run.tap(i);
});
$('play').addEventListener('click', start);
$('again').addEventListener('click', start);
$('to-menu').addEventListener('click', showMenu);
$('quit').addEventListener('click', showMenu);
$('pause').addEventListener('click', pause);
$('resume').addEventListener('click', resume);
const musicBtns = document.querySelectorAll('.music-btn'); // the HUD's and the home's
const syncMusicBtn = () => { for (const b of musicBtns) { b.setAttribute('aria-pressed', musicOn()); b.querySelector('.music-off').toggleAttribute('hidden', musicOn()); } };
for (const b of musicBtns) b.addEventListener('click', () => { setMusicOn(!musicOn()); syncMusicBtn(); });
syncMusicBtn();
addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (rankingUI.escape()) return; if (mode === 'play') pause(); else resume(); });
addEventListener('resize', () => {
  // the menu's backdrop board follows the screen; a game keeps its grid, and a wrong turn pauses it until it's back
  if (mode === 'menu' && layout().cols !== game.cols) showMenu();
  else board.fit();
  if (mode === 'paused') board.frame(0); // fit() clears the canvas, and a paused board is not redrawn
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

let last = performance.now();
function frame(now) {
  const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); // a stalled tab must not burn the fuses; the first frame's stamp can predate `last`
  last = now;
  if (mode === 'play') {
    clock += dt;
    run.until(Math.floor(clock * TICKS_PER_S)); // the rules' fixed steps this frame has reached
    if (BOT && game.state === 'play') { const i = botTap(game); if (i >= 0) run.tap(i); }
    if (BELL && game.state === 'play') {
      if (game.slow > 0 || game.cells.some(c => c.kind === 'campanar')) bellAt = Math.max(bellAt, clock + 3 + Math.random() * 3);
      else if (clock >= bellAt) {
        const free = game.cells.filter(c => c.kind === 'drac' && c.age >= 0), c = free[Math.floor(Math.random() * free.length)];
        if (c) Object.assign(c, { prev: c.kind, kind: 'campanar', age: 0, left: 99 });
      }
    }
    syncHud();
  } else if (mode === 'ending') tick(game, dt);
  if (mode !== 'paused' && booted) board.frame(dt);
  if (mode === 'menu' && booted) hero.frame(dt);
  requestAnimationFrame(frame);
}

showMenu();
setupOrientation(pause);
requestAnimationFrame(frame);
if (import.meta.env.DEV) window.__pop = { board, get game() { return game; }, get run() { return run; }, get mode() { return mode; } };

// The boot, while the boot screen's Mulassa runs: shaders, then the home's portraits, then the fonts. Each step leaves the main
// thread between tasks; the menu shows whole, on the board's first frame (this rAF runs after frame's).
await board.warm();
const cards = [...document.querySelectorAll('.c-card')];
const pics = await board.portraits(cards.map(c => c.dataset.kind), 320, { tight: true });
for (const c of cards) c.querySelector('img').src = pics[c.dataset.kind];
await hero.warm();
await document.fonts.ready;
// the record's place on the board comes with the menu, not after it (the pill would widen under the player's eyes); a slow
// network waits 1.5 s at most, and the place then joins late
await Promise.race([rankingUI.sync().catch(() => {}), new Promise(go => setTimeout(go, 1500))]);
booted = true;
requestAnimationFrame(() => {
  document.documentElement.classList.add('ready');
  setTimeout(() => $('boot').remove(), 400);
});
