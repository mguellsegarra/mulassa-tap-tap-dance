// The game's flow: home → run → (pause) → blast → end sheet, and the run's clock. It owns the run, its rules' events
// (rules.js) turned into what is seen and heard, and which screen is up. main.js builds it and drives step() every frame.
import { newGame, tick } from './rules.js';
import { createRun, TICKS_PER_S } from './run.js';
import { startMusic, stopMusic, pauseMusic, resumeMusic, followGame, startHomeMusic, armAudio, SFX } from './audio.js';
import { BOT_FROM, botTap } from './autoplay.js';
import { haptic } from '#plassa/haptics.js';
import { END_SHEET_MS } from './results.js';
import { best } from './best.js';
import { RANKING } from './ranking-ui.js';
import { createCountdown } from '#plassa/countdown.js';

const COLORS = { hit: ['#c0283c', '#d9a521', '#fff3d6', '#1f5c33'], goodie: ['#f5c518', '#fff3d6', '#ffe066'] };
const layout = () => (innerWidth > innerHeight ? { cols: 6, rows: 4 } : { cols: 4, rows: 6 });
const params = new URLSearchParams(location.search);
// dev only: ?autoplay taps for you from BOT_FROM points; ?campanar (or ?campanar=points) starts that far on (150 by default,
// the tune at full speed after its glide) and pops a campanar up 8 s in, then 3 to 6 s after each slow time ends
const BOT = import.meta.env.DEV && params.has('autoplay');
const BELL = import.meta.env.DEV && params.has('campanar');
const BELL_FROM = +(params.get('campanar') || 150);
// A run starts on a 3, 2, 1, .6 s each (the owner's pace: a beat and a half at the tune's opening 150 BPM). The run's clock
// only starts after it: the server's replay (pop-score) never sees the count.
const EACH = .6;

// booted(): the boot screen is gone, so the home may ask the board for the player's place
export function createFlow({ board, hud, results, rankingUI, t, booted }) {
  const $ = id => document.getElementById(id);
  let run = null, game = null, mode = 'menu', endTimer = 0, clock = 0, bellAt = 0; // clock: the run's play time, in seconds
  let pausedCount = false; // a pause during the 3, 2, 1 starts it over
  const count = createCountdown($('count'), { each: EACH, beat: SFX.count, done: () => { mode = 'play'; startMusic(run.tune); } });
  function countFrom3() { count.start(); mode = 'count'; armAudio(); }
  const word = kind => (kind === 'calcot' ? '+5' : t(`word.${kind}`));

  function on(event, cell, kind) {
    if (event === 'hit') {
      SFX.hit();
      haptic('hit');
      board.burst(cell.i, COLORS.hit);
      hud.floatText(cell.i, '+1');
      board.shake(.12);
    } else if (event === 'burn') {
      board.burn(cell);
      hud.floatText(cell.i, '+1');
    } else if (event === 'goodie') {
      SFX.goodie();
      haptic('big');
      board.burst(cell.i, COLORS.goodie, 40, 1.2);
      hud.floatText(cell.i, word(kind));
      if (kind === 'carretilla') { board.dragonFire(); SFX.fire(); }
      if (kind === 'campanar') SFX.bell();
    } else if (event === 'defuse') {
      SFX.goodie();
      haptic('hit');
      board.burst(cell.i, COLORS.goodie, 30);
    } else if (event === 'spawn') {
      SFX.sprout();
    } else if (event === 'over') {
      results.blast(cell);
      mode = 'ending';
      hud.setSlow(false, false);
      endTimer = setTimeout(() => { mode = 'over'; results.show(run, { practice: BOT || BELL }); }, END_SHEET_MS);
    }
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
    $('hud-best-num').textContent = best() || '';
    $('hud-best').hidden = !best();
    $('pause').style.visibility = '';
    countFrom3();
    hud.sync(game, true);
    board.fit(); // now the HUD has a height
  }

  function showMenu() {
    clearTimeout(endTimer);
    stopMusic();
    game = newGame({ ...layout(), on });
    game.state = 'menu';
    hud.setSlow(false, false);
    board.setGame(game);
    for (const id of ['end-menu', 'pause-menu', 'hud', 'count']) $(id).hidden = true;
    $('menu').hidden = false;
    $('menu-best').disabled = !RANKING;
    mode = 'menu';
    if (booted()) { rankingUI.sync(); startHomeMusic(); } // at boot, main.js starts it once the home is up
  }

  function pause() {
    if (mode !== 'play' && mode !== 'count') return;
    pausedCount = mode === 'count';
    count.stop();
    mode = 'paused';
    pauseMusic();
    $('pause-menu').hidden = false;
    $('resume').focus({ focusVisible: false });
  }
  function resume() {
    if (mode !== 'paused') return;
    $('pause-menu').hidden = true;
    if (pausedCount) return countFrom3(); // the run had not begun: the count again, from 3
    mode = 'play';
    resumeMusic();
  }

  function tap(x, y) {
    if (mode !== 'play') return;
    const i = board.pick(x, y);
    if (i >= 0) run.tap(i);
  }

  // dt: this frame's seconds, already capped by main.js so a stalled tab does not burn the fuses
  function step(dt) {
    if (mode === 'ending') tick(game, dt);
    if (mode === 'count') count.step(dt);
    if (mode !== 'play') return;
    clock += dt;
    run.until(Math.floor(clock * TICKS_PER_S)); // the rules' fixed steps this frame has reached
    followGame(clock); // the music keeps to this clock, whatever a stall took from it
    if (BOT && game.state === 'play') { const i = botTap(game); if (i >= 0) run.tap(i); }
    if (BELL && game.state === 'play') {
      if (game.slow > 0 || game.cells.some(c => c.kind === 'campanar')) bellAt = Math.max(bellAt, clock + 3 + Math.random() * 3);
      else if (clock >= bellAt) {
        const free = game.cells.filter(c => c.kind === 'drac' && c.age >= 0), c = free[Math.floor(Math.random() * free.length)];
        if (c) Object.assign(c, { prev: c.kind, kind: 'campanar', age: 0, left: 99 });
      }
    }
    hud.sync(game);
  }

  // the home's backdrop board follows the screen; a run keeps its grid (a wrong turn pauses it, orientation.js)
  function resized() {
    if (mode === 'menu' && layout().cols !== game.cols) showMenu();
    else board.fit();
    if (mode === 'paused' || mode === 'over') board.frame(0); // fit() clears the canvas; a paused or settled board is not redrawn
  }

  return {
    start, showMenu, pause, resume, tap, step, resized,
    get mode() { return mode; }, get game() { return game; }, get run() { return run; },
  };
}
