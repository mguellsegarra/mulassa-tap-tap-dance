// The dance's demo: «Mira el ball» on the selector's song row (Marc, 2026-10-23: out of Com es juga, where nobody found it), the DEMOSTRACIÓ label while the song plays and the end
// sheet that offers to play it. The run is game/flow.js's (startWatch): the same song, plaça and camera as a game, played by itself, never scored.
import { G, clock, setSelectedFigure } from '../game/state.js';
import { startWatch, toTitle } from '../game/flow.js';
import { hide } from './handles.js';
import { focusIn } from './focus.js';
import { tr } from '../i18n/messages.js';

// select: the selector's api (figure, pending, visible, toLevels); busy(): another sheet or «mode foto» is up
export function setupWatch({ select, busy }) {
  const $ = id => document.getElementById(id);
  const menu = $('watch-menu'), tag = $('watch-tag');
  let offered = false; // this demo's end sheet has opened (once: closing it always leaves the results)
  function start() { // from the song row, which only a playable figure's panel shows
    const figure = select.figure;
    if (G.state !== 'select' || busy() || !figure || select.pending || !setSelectedFigure(figure)) return;
    $('watch-song').textContent = figure.song;
    $('watch-text').textContent = tr('ui.watch.text', { song: figure.song });
    startWatch();
  }
  function leave(levels) { // back to the selector: its figure step, or straight to the levels with the remembered one
    if (menu.open) menu.close();
    toTitle();
    if (!levels) return;
    select.visible(true); // (this frame, so the level step opens on a shown selector)
    select.toLevels();
  }
  $('select-watch').addEventListener('click', start);
  $('watch-play').addEventListener('click', () => leave(true));
  $('watch-again').addEventListener('click', () => { menu.close(); startWatch(); });
  $('watch-figures').addEventListener('click', () => leave(false));
  $('watch-close').addEventListener('click', () => leave(false));
  menu.addEventListener('cancel', e => { e.preventDefault(); leave(false); }); // Escape: back to the menu, as the ×
  return {
    get open() { return menu.open; },
    frame() { // every frame (ui/controls.js): the label while it plays; the sheet once the plaça has cheered a moment
      hide(tag, !(G.state === 'play' && G.watch));
      const end = G.state === 'results' && G.watch && clock - G.resT > 1;
      if (!end) { offered = false; return; }
      if (offered || document.hidden) return;
      offered = true;
      menu.showModal();
      focusIn(menu, 'watch-figures');
    },
  };
}
