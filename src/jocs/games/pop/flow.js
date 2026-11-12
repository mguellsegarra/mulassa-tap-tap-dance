// The game's flow: home → run → (pause) → blast → end sheet, and the run's clock. It owns the run, its rules' events
// (rules.js) turned into what is seen and heard, and which screen is up. main.js builds it and drives step() every frame.
import { newGame, tick } from './rules.js';
import { createRun, TICKS_PER_S } from './run.js';
import { startMusic, stopMusic, pauseMusic, resumeMusic, followGame, startHomeMusic, armAudio, SFX } from './audio.js';
import { BOT_FROM, botTap, botChord } from './autoplay.js';
import { haptic } from '#plassa/haptics.js';
import { END_SHEET_MS } from './results.js';
import { best } from './best.js';
import { level } from './level.js';
import { RANKING } from './ranking-ui.js';
import { createCountdown } from '#plassa/countdown.js';
import { store } from '#plassa/storage.js';
import { SONGS, SONG_IDS } from './songs.js';

const COLORS = { hit: ['#c0283c', '#d9a521', '#fff3d6', '#1f5c33'], goodie: ['#f5c518', '#fff3d6', '#ffe066'], gold: ['#f5c518', '#ffe066', '#fff3d6', '#ffb321'] };
const layout = () => (innerWidth > innerHeight ? { cols: 6, rows: 4 } : { cols: 4, rows: 6 });
const params = new URLSearchParams(location.search);
// dev only: ?autoplay taps for you from BOT_FROM points (?autoplay=publica: its run goes to the dev mock board, to reach the
// end sheet's board line and name step); ?campanar (or ?campanar=points) starts that far on (150 by default,
// the tune at full speed after its glide) and pops a campanar up 8 s in, then 3 to 6 s after each slow time ends
const BOT = import.meta.env.DEV && params.has('autoplay'), BOT_CHORDS = BOT && params.get('autoplay') === 'combo', BOT_SENDS = BOT && params.get('autoplay') === 'publica';
const BELL = import.meta.env.DEV && params.has('campanar');
const BELL_FROM = +(params.get('campanar') || 150);
// dev only (?carretilla): a carretilla 3 s in once two Mulassas are out, then every 6 s, to see her correfoc
const CARR = import.meta.env.DEV && params.has('carretilla');
// A run starts on a 3, 2, 1, .6 s each (the owner's pace: a beat and a half at the tune's opening 150 BPM). The run's clock
// only starts after it: the server's replay (pop-score) never sees the count.
const EACH = .6;
// each run plays one tune, looped, and the next run the next one (songs.js), remembered across visits; ?song=drac forces one (dev)
const SONG_KEY = 'pop-song-last', FORCED = import.meta.env.DEV && SONGS[params.get('song')] ? params.get('song') : null;
const nextSong = () => { const id = FORCED ?? SONG_IDS[(SONG_IDS.indexOf(store.get(SONG_KEY)) + 1) % SONG_IDS.length]; store.set(SONG_KEY, id); return id; };

// booted(): the boot screen is gone, so the home may ask the board for the player's place
export function createFlow({ board, hero, hud, results, rankingUI, t, booted }) {
  const $ = id => document.getElementById(id);
  let run = null, game = null, mode = 'menu', endTimer = 0, clock = 0, bellAt = 0; // clock: the run's play time, in seconds
  let carrAt = 3, burnt = [], labels = [], chordPts = 0, chord = []; // carrAt: the dev carretilla's next time; burnt: the Mulassas the carretilla is taking; labels: their «+N», each due at its game time; chord: this chord's cells
  let begun = false, song = 'mulassa'; // the run's music has started; its tune
  const count = createCountdown($('count'), { each: EACH, beat: SFX.count, done: () => {
    mode = 'play';
    if (begun) resumeMusic(); else startMusic(run.tune, song); // after a pause the tune goes on where it stopped
    begun = true;
  } });
  function countFrom3() { count.start(); mode = 'count'; armAudio(); }
  // a goodie's word over its cell: the calçot's are its points (rules.js: ×5 the level's)
  const word = (kind, gained) => (kind === 'calcot' ? `+${gained}` : t(`word.${kind}`));

  // rules.js's events: hit (cell, { combo, gained }), chord (cell, { combo, gained }: after any good tap's own), burn (cell, { gained }), goodie (cell, kind, { gained })
  function on(event, cell, kind, extra) {
    if (event === 'hit') {
      SFX.hit(kind.combo);
      board.burst(cell.i, COLORS.hit);
      if (kind.combo === 1) haptic('hit'); // one buzz a chord: a buzz per finger blurs into a hum
      board.shake(.12);
    } else if (event === 'chord') { // any good tap: a Mulassa, a petard put out, a goodie
      const k = kind.combo;
      if (k === 1) chord = [];
      chord.push(cell.i);
      // a chord bursts gold over each of its cells (the first one's too, once it is one), bigger as it grows
      if (k >= 2) {
        for (const i of k === 2 ? chord : [cell.i]) { board.burst(i, COLORS.gold, 40 + 10 * k, 1.3 + .1 * k, .5); board.fountain(i, 30 + 10 * k); }
        board.punch(.6 + .1 * k);
        SFX.combo(k);
      }
      if (k === 5) { // the jackpot, once a chord: every cell of it bursts gold, its own double pulse (big is the goodies')
        haptic('combo');
        for (const i of chord) board.burst(i, COLORS.gold, 30, 1.3, .6);
      }
      chordPts = k > 1 ? chordPts + kind.gained : kind.gained; // the chord's whole, for the HUD
      if (k > 1) hud.combo(k, chordPts);
      if (k > 1) board.shake(.03 * Math.min(k, 5)); // a chord's taps add up to a jolt
    } else if (event === 'burn') {
      board.burn(cell);
      burnt.push([cell.i, kind.gained]); // her points come with her pop (below)
    } else if (event === 'goodie') {
      SFX.goodie();
      haptic('big');
      board.burst(cell.i, COLORS.goodie, 40, 1.2);
      hud.floatText(cell.i, word(kind, extra?.gained));
      if (kind === 'carretilla') {
        const pops = board.dragonFire(cell.i); // when each one goes up (board-carretilla.js)
        for (const [i, gained] of burnt.splice(0)) labels.push({ at: clock + (pops.get(i) ?? 0), i, gained }); // on the run's clock: a pause holds them, a quit drops them
        SFX.fire();
      }
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
      endTimer = setTimeout(() => { mode = 'over'; results.show(run, { practice: (BOT && !BOT_SENDS) || BELL }); }, END_SHEET_MS);
    }
  }

  function start() {
    clearTimeout(endTimer);
    song = nextSong();
    run = createRun({ ...layout(), seed: crypto.getRandomValues(new Uint32Array(1))[0], level: level(), on, form: SONGS[song].form });
    clock = 0;
    begun = false;
    carrAt = 3;
    burnt = []; labels = [];
    game = run.game;
    if (BOT) game.progress = BOT_FROM; // dev only: such a run is never published
    if (BELL) { game.progress = BELL_FROM; bellAt = 8; }
    for (const id of ['menu', 'end-menu', 'pause-menu']) $(id).hidden = true;
    $('hud').hidden = false;
    $('hud-best-num').textContent = best() || '';
    $('hud-best').hidden = !best();
    $('pause').style.visibility = '';
    countFrom3();
    hud.sync(game, true); // the HUD is up and measured (hud.js owns the board's top inset) before the board fits to it
    board.setGame(game);
  }

  function showMenu() {
    clearTimeout(endTimer);
    stopMusic();
    burnt = []; labels = [];
    game = newGame({ ...layout(), on });
    game.state = 'menu';
    hud.setSlow(false, false);
    board.setGame(game);
    for (const id of ['end-menu', 'pause-menu', 'hud', 'count']) $(id).hidden = true;
    $('menu').hidden = false;
    hero.back(); // the end sheet had it; its box is read in the shown home (hero.js measure)
    $('menu-best').disabled = !RANKING;
    mode = 'menu';
    if (booted()) { rankingUI.sync(); startHomeMusic(); } // at boot, main.js starts it once the home is up
  }

  function pause() {
    if (mode !== 'play' && mode !== 'count') return;
    count.stop();
    mode = 'paused';
    pauseMusic();
    $('pause-menu').hidden = false;
    $('resume').focus({ focusVisible: false });
  }
  function resume() {
    if (mode !== 'paused') return;
    $('pause-menu').hidden = true;
    countFrom3(); // back to the board on a 3, 2, 1, whether the run had begun or not
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
    if (mode !== 'play') return; // a fuse ended the run: on() has the blast going, and hud.sync would frost the end sheet again
    if (labels.length) labels = labels.filter(l => l.at > clock || (hud.floatText(l.i, `+${l.gained}`), false));
    followGame(clock); // the music keeps to this clock, whatever a stall took from it
    if (BOT_CHORDS && game.state === 'play') for (const i of botChord(game, dt)) run.tap(i);
    else if (BOT && game.state === 'play') { const i = botTap(game); if (i >= 0) run.tap(i); }
    if (CARR && game.state === 'play' && clock >= carrAt && game.cells.filter(c => c.kind === 'mula').length >= 2) {
      const free = game.cells.filter(c => c.kind === 'drac' && c.age >= 0), c = free[Math.floor(Math.random() * free.length)];
      if (c) { Object.assign(c, { prev: c.kind, kind: 'carretilla', age: 0, left: 9 }); carrAt = clock + 6; }
    }
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

  hud.watchInset(resized); // the HUD changed size: the board fits to it again

  return {
    start, showMenu, pause, resume, tap, step, resized,
    get mode() { return mode; }, get game() { return game; }, get run() { return run; },
  };
}
