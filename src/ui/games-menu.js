// «Jocs», the corner gamepad's sheet over the selector (free play left it for the help sheet, sheets-setup.js). A mini-game
// is its own page: replace, so bfcache does not keep the game frozen in memory (docs/jocs/README.md).
export function setupGamesMenu({ focusIn, carousel, doc = document, go = url => location.replace(url) }) {
  const menu = doc.getElementById('games-menu');
  const open = () => { menu.showModal(); carousel?.opened(); focusIn(menu, 'games-hero-play'); };
  doc.getElementById('games-grid').addEventListener('click', e => {
    const card = e.target.closest?.('[data-game]');
    if (!card || carousel?.take(card, e) === false) return;
    if (card.dataset.game === 'tap') { menu.close(); return; } // the rhythm game is the selector behind this sheet
    if ('soon' in card.dataset) return; // a surprise card holds the place of next week's game: nothing to open yet
    if (card.dataset.game === 'pop') { go('/pop/'); return; } // mulassa.cat/pop: the one game with its own short address
    go(`/jocs/${card.dataset.game}/`);
  });
  return {
    get isOpen() { return menu.open; },
    open,
  };
}
