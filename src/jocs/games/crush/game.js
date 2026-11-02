import { blip, isMuted, setMuted } from './sound.js';
import { startAudio, stopAudio, setProgress } from './audio.js';
import { newGame, swap, adjacent, findMoves, starsFor, assistFor } from './rules.js';
import { LEVELS, levelFor, MIN_ROWS, MAX_ROWS } from './levels.js';
import { createView, paintIcon } from './view.js';
import { T } from './copy.js';

const LOSSES_KEY = 'minijocs.crush.losses'; // times each level was lost since last won: stays on this device
const STARS_KEY = 'minijocs.crush.stars'; // best stars per level; a level opens once the previous has any
const HINT_AFTER = 3; // seconds idle
const COLS = 7, INSET = 4; // the board's frame around its cells, as view.js draws it
const HUD_TOP = 6, MIN_GAP = 8, MAX_CELL = 88;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function loadStars() {
  try {
    const saved = JSON.parse(localStorage.getItem(STARS_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}

export function start(root, leave) {
  root.innerHTML = `<div class="stage crush"><canvas></canvas>
    <div class="crush-hud">
      <div class="crush-side"><button class="back" aria-label="${T.back}">‹</button><button class="back crush-sound" aria-label="${T.sound}">♪</button></div>
      <div class="crush-moves" data-movechip><b data-moves></b><small>${T.moves}</small></div>
      <div class="crush-goal"><canvas width="240" height="240"></canvas><div><small>${T.level} <span data-level></span></small><b data-count></b><span class="crush-track"><span class="crush-bar"></span></span></div></div>
    </div>
    <div class="overlay"></div></div>`;
  const stage = root.firstChild;
  const canvas = stage.querySelector('canvas');
  const overlay = stage.querySelector('.overlay');
  const hud = stage.querySelector('.crush-hud');
  const icon = hud.querySelector('canvas');
  const field = name => hud.querySelector(`[data-${name}]`);
  const bar = hud.querySelector('.crush-bar');

  const losses = JSON.parse(localStorage.getItem(LOSSES_KEY) ?? '{}');
  let stars = loadStars(), game = null, levelIdx = 0, ended = false, raf = 0, last = 0, armTimer = 0, W = 0, H = 0;
  let rows = MIN_ROWS, selected = null, press = null, idle = 0, hint = null, iconVersion = -1;

  const view = createView(canvas, e => {
    if (e.moves !== undefined) showMoves(e.moves);
    if (e.collected !== undefined) showCount(e.collected);
  });

  function showMoves(n) {
    field('moves').textContent = n;
    field('movechip').classList.toggle('low', n <= 3);
  }
  function showCount(n) {
    const goal = game.level.n, shown = Math.min(n, goal);
    field('count').textContent = `${shown}/${goal}`;
    setProgress(shown / goal);
    bar.style.transform = `scaleX(${shown / goal})`;
  }

  const inset = name => parseFloat(getComputedStyle(stage).getPropertyValue(name)) || 0;
  // Height left for the cells once the HUD, the frame and the smallest breathing room are out.
  const roomH = () => H - inset('--crush-safe-top') - inset('--crush-safe-bottom') - HUD_TOP - hud.offsetHeight - INSET * 2 - MIN_GAP * 2;

  // Only a portrait screen has height to spare; a wide window keeps the square board.
  function chooseRows() {
    if (H <= W) return MIN_ROWS;
    const cell = Math.min(MAX_CELL, Math.floor(W / COLS));
    return Math.max(MIN_ROWS, Math.min(MAX_ROWS, Math.floor(roomH() / cell)));
  }

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 3); // iPhones are 3x: a lower cap upscales the whole canvas and blurs it
    W = stage.clientWidth;
    H = stage.clientHeight;
    view.resize(W, H, dpr);
    place();
  }

  function place() {
    const safeTop = inset('--crush-safe-top'), safeBottom = inset('--crush-safe-bottom');
    const cell = Math.min(MAX_CELL, Math.floor(W / COLS), Math.floor(roomH() / rows));
    const boardW = cell * COLS, boardH = cell * rows, hudH = hud.offsetHeight;
    const free = H - safeTop - safeBottom - HUD_TOP - hudH - boardH - INSET * 2;
    const y = safeTop + HUD_TOP + hudH + Math.round(free / 2) + INSET;
    Object.assign(hud.style, { top: `${safeTop + HUD_TOP}px`, width: `${Math.min(W, boardW + INSET * 2)}px` });
    Object.assign(view.box, { x: Math.floor((W - boardW) / 2), y, cell, cols: COLS, rows });
  }

  function deal(i) {
    rows = chooseRows();
    place();
    return newGame(levelFor(i, rows), Math.random, COLS, rows, assistFor(losses[i] ?? 0));
  }

  function panel(title, body, buttons, compact) {
    overlay.style.display = '';
    // a player still tapping must not hit a button that has just appeared
    overlay.style.pointerEvents = 'none';
    clearTimeout(armTimer);
    armTimer = setTimeout(() => { overlay.style.pointerEvents = ''; }, 500);
    overlay.innerHTML = `<div class="panel${compact ? ' compact' : ''}"><h2>${title}</h2>${body}</div>`;
    for (const [name, fn, alt] of buttons) {
      const b = document.createElement('button');
      b.className = alt ? 'btn alt' : 'btn';
      b.textContent = name;
      b.onclick = fn;
      overlay.firstChild.append(b);
    }
  }

  const nextIndex = () => Math.min(stars.filter(Boolean).length, LEVELS.length - 1);
  const isOpen = i => i === 0 || stars[i - 1] > 0;

  function home() {
    game = null;
    ended = true;
    hud.style.visibility = 'hidden';
    const next = nextIndex();
    view.reset(deal(next).board, false);
    panel(T.title, `<p>${T.how}</p><div class="crush-grid"></div>`, [[T.play(next + 1), () => play(next)], [T.menu, leave, true]], true);
    const grid = overlay.querySelector('.crush-grid');
    LEVELS.forEach((_, i) => {
      const b = document.createElement('button');
      b.className = `crush-level${i === next ? ' now' : ''}`;
      b.disabled = !isOpen(i);
      b.innerHTML = `${i + 1}<i>${'★'.repeat(stars[i] ?? 0)}</i>`;
      b.onclick = () => play(i);
      grid.append(b);
    });
  }

  function play(i) {
    levelIdx = i;
    game = deal(i);
    ended = false;
    selected = press = hint = null;
    idle = 0;
    overlay.style.display = 'none';
    hud.style.visibility = '';
    field('level').textContent = i + 1;
    showMoves(game.moves);
    showCount(0);
    iconVersion = -1;
    view.reset(game.board, true);
    view.text(T.goal(game.level.n, T.names[game.level.goal]));
  }

  function finish() {
    const { status, level } = game;
    losses[levelIdx] = status === 'won' ? 0 : (losses[levelIdx] ?? 0) + 1;
    localStorage.setItem(LOSSES_KEY, JSON.stringify(losses));
    if (status === 'won') {
      const got = starsFor(game);
      stars[levelIdx] = Math.max(stars[levelIdx] ?? 0, got);
      localStorage.setItem(STARS_KEY, JSON.stringify(stars));
      [523, 659, 784, 1047].forEach((n, i) => view.later(i * .11, () => blip(n, 180), true));
      const row = [1, 2, 3].map(n => `<span class="${n <= got ? 'on' : ''}">★</span>`).join('');
      const last = levelIdx === LEVELS.length - 1;
      panel(T.won, `<div class="crush-stars" role="img" aria-label="${got}/3">${row}</div><p>${last ? T.done : T.movesLeft(game.moves)}</p>`, [
        ...(last ? [] : [[T.next, () => play(levelIdx + 1)]]),
        [T.retry, () => play(levelIdx), !last],
        [T.levels, home, true],
      ]);
    } else {
      blip(196, 400, 'sine');
      panel(T.lost, `<p>${T.progress(game.collected, level.n, T.names[level.goal])}</p>`, [
        [T.retry, () => play(levelIdx)],
        [T.levels, home, true],
      ]);
    }
  }

  function attempt(a, b) {
    selected = hint = null;
    idle = 0;
    view.play(swap(game, a, b));
  }

  const playable = () => game && !ended && !view.busy && game.status === 'playing';
  function cellAt(e) {
    const rect = canvas.getBoundingClientRect(), { x, y, cell } = view.box;
    const c = Math.floor((e.clientX - rect.left - x) / cell), r = Math.floor((e.clientY - rect.top - y) / cell);
    return r >= 0 && r < rows && c >= 0 && c < COLS ? { r, c } : null;
  }

  const onDown = e => {
    if (!playable()) return;
    const cell = cellAt(e);
    if (!cell) { selected = null; return; }
    idle = 0;
    hint = null;
    press = { cell, x: e.clientX, y: e.clientY, id: game.board[cell.r][cell.c].id };
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = e => {
    if (!press) return;
    const dx = e.clientX - press.x, dy = e.clientY - press.y, cell = view.box.cell;
    const along = Math.abs(dx) > Math.abs(dy);
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    if (dist > cell * .4) {
      const { r, c } = press.cell;
      const to = along ? { r, c: c + Math.sign(dx) } : { r: r + Math.sign(dy), c };
      press = null;
      if (to.r >= 0 && to.r < rows && to.c >= 0 && to.c < COLS) attempt({ r, c }, to);
      else view.settle(game.board[r][c].id, c, r);
      return;
    }
    // the piece follows the finger a little, so the drag feels held before it commits
    if (!reduced && dist > 2) {
      const { r, c } = press.cell;
      view.nudge(press.id, c + (along ? dx / cell * .5 : 0), r + (along ? 0 : dy / cell * .5));
    }
  };
  const onUp = () => {
    if (!press) return;
    const { cell, id } = press;
    press = null;
    if (selected && adjacent(selected, cell)) return attempt(selected, cell);
    view.settle(id, cell.c, cell.r);
    if (selected && selected.r === cell.r && selected.c === cell.c) selected = null;
    else { selected = cell; blip(440, 50, 'triangle', .05); }
  };
  const onCancel = () => {
    if (!press) return;
    view.settle(press.id, press.cell.c, press.cell.r);
    press = null;
  };

  function marks(time) {
    const m = new Map();
    if (!game) return m;
    if (selected) m.set(game.board[selected.r][selected.c].id, { ring: 1 });
    if (hint) {
      const a = game.board[hint.a.r][hint.a.c], b = game.board[hint.b.r][hint.b.c];
      // as Candy Crush and Royal Match do: three slow pulses and a pause, only the two pieces of the move
      const t = time % 3;
      const pulse = reduced ? .6 : t < 1.8 ? Math.sin(t / .6 * Math.PI) ** 2 : 0;
      const push = reduced ? 0 : pulse * .1;
      const dx = (hint.b.c - hint.a.c) * push, dy = (hint.b.r - hint.a.r) * push;
      m.set(a.id, { pulse, dx, dy });
      m.set(b.id, { pulse, dx: -dx, dy: -dy });
    }
    return m;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000 || 0), time = now / 1000;
    last = now;
    if (game && iconVersion !== view.version) {
      iconVersion = view.version;
      paintIcon(icon, game.level.goal);
    }
    if (game && !ended && !view.busy) {
      if (game.status !== 'playing') {
        ended = true;
        view.later(.45, finish, true); // let the last pieces land before the panel covers them
      } else if (!hint && !press && !selected) {
        idle += dt;
        if (idle > HINT_AFTER) {
          const moves = findMoves(game.board);
          hint = moves[Math.floor(Math.random() * moves.length)];
        }
      }
    }
    view.frame(dt, time, marks(time));
  }

  const listeners = new AbortController();
  const { signal } = listeners;
  stage.querySelector('.back').onclick = home;
  addEventListener('resize', size, { signal });
  canvas.addEventListener('pointerdown', onDown, { signal });
  stage.addEventListener('pointerdown', startAudio, { signal, once: true });
  const soundBtn = stage.querySelector('.crush-sound');
  const showSound = () => { soundBtn.classList.toggle('off', isMuted()); soundBtn.setAttribute('aria-pressed', String(!isMuted())); };
  soundBtn.onclick = () => { setMuted(!isMuted()); showSound(); };
  showSound();
  canvas.addEventListener('pointermove', onMove, { signal });
  canvas.addEventListener('pointerup', onUp, { signal });
  canvas.addEventListener('pointercancel', onCancel, { signal });
  size();
  home();
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(armTimer);
    listeners.abort();
    stopAudio();
  };
}
