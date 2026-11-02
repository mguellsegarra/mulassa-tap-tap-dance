// The rules of the game, without a screen: the board and main.js only read what flip() answers.
export function shuffled(items, rng = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function createGame(figures, rng) {
  const cards = shuffled([...figures, ...figures], rng).map(figure => ({ figure, up: false, matched: false }));
  const game = { cards, moves: 0, pairs: 0, total: figures.length, open: [],
    // null: this card can't be turned now. A miss stays open until hide(), so the player can see both.
    flip(i) {
      const card = cards[i];
      if (!card || card.up || game.open.length === 2) return null;
      card.up = true;
      game.open.push(i);
      if (game.open.length === 1) return { type: 'open', card };
      game.moves++;
      const [a, b] = game.open;
      if (cards[a].figure !== cards[b].figure) return { type: 'miss', card, a, b };
      cards[a].matched = cards[b].matched = true;
      game.open = [];
      game.pairs++;
      return { type: 'match', card, a, b, won: game.pairs === game.total };
    },
    hide() { for (const i of game.open) cards[i].up = false; game.open = []; },
  };
  return game;
}

export const CARD = { w: 3, h: 4, gap: .3 };

// How many cards fit with each one still wide enough to tap (minPx: a bit over 44, perspective narrows the far rows).
export function fitCards(figures, width, height, minPx = 48) {
  for (let n = figures; n > 1; n--) {
    if (bestGrid(n * 2, width, height, CARD.w, CARD.h, CARD.gap).size * CARD.w >= minPx) return n * 2;
  }
  return 2;
}

// The rows × columns that give the biggest cards in the room available.
export function bestGrid(count, width, height, cardW, cardH, gap) {
  let best = null;
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols); // a short last row is fine: the board centres it
    const size = Math.min(width / (cols * cardW + (cols - 1) * gap), height / (rows * cardH + (rows - 1) * gap));
    if (!best || size > best.size) best = { cols, rows, size };
  }
  return best;
}
