// «Jocs», the corner gamepad's sheet over the selector. Free play is inside this page, so it starts and comes back at once;
// a mini-game is its own page: replace, so bfcache does not keep the game frozen in memory (docs/jocs/README.md).
export function setupGamesMenu({ focusIn, enterFree, doc = document, go = url => location.replace(url) }) {
  const menu = doc.getElementById('games-menu');
  let backToMenu = false;
  const open = () => { menu.showModal(); focusIn(menu, 'games-x'); };
  doc.getElementById('games-x').addEventListener('click', () => menu.close());
  doc.getElementById('games-grid').addEventListener('click', e => {
    const card = e.target.closest?.('[data-game]');
    if (!card) return;
    if (card.dataset.game !== 'lliure') { go(`/jocs/${card.dataset.game}/`); return; }
    menu.close(); backToMenu = true; enterFree();
  });
  return {
    get isOpen() { return menu.open; },
    open,
    // leaving free play returns here, where the player came from
    afterFree(canOpen) { if (backToMenu && canOpen) { backToMenu = false; open(); } },
  };
}
