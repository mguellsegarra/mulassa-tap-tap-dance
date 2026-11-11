// Mulassa Games, mulassa.cat/jocs/ (jocs/index.html): the games' selector, a page of its own on Plassa, so nothing of a game
// loads behind it. A game is its own page too: replace, so bfcache keeps neither frozen in memory (docs/jocs/README.md).
import '#plassa/focus.js'; // keyboard vs pointer: <html data-keys> while keys drive the page
import { focusIn } from '#plassa/focus.js';
import { t, applyWords } from './i18n.js';
import { setupGamesCarousel } from './carousel.js';
import { setupMusic } from './music.js';
import { setUiSound, soundOnPress } from '#plassa/ui-sound.js';
import { setupOrientation } from '#plassa/orientation.js';
import { stopDoubleTapZoom } from '#plassa/double-tap.js';
import { errors } from '#plassa/errors.js';
import { watchUpdates } from '#plassa/update-watch.js';

const $ = id => document.getElementById(id);
errors.context(() => ({ game: 'jocs' }));
applyWords(); // before the carousel: the hero shows its card's words
const carousel = setupGamesCarousel();

$('games-grid').addEventListener('click', e => {
  const card = e.target.closest?.('[data-game]');
  if (!card || carousel.take(card, e) === false) return;
  if ('soon' in card.dataset) return; // a surprise card holds the place of next week's game: nothing to open yet
  // the rhythm game is the site's home; Pop is the one game with its own short address
  location.replace({ tap: '/', pop: '/pop/' }[card.dataset.game] ?? `/jocs/${card.dataset.game}/`);
});

const music = setupMusic(), speaker = $('games-music');
function showMusic() {
  speaker.dataset.state = music.on() ? 'on' : 'off';
  speaker.setAttribute('aria-label', t(music.on() ? 'music.mute' : 'music.unmute'));
}
showMusic();
speaker.addEventListener('click', () => { music.set(!music.on()); showMusic(); });
setUiSound(music.blip);
soundOnPress();

stopDoubleTapZoom();
setupOrientation(() => {});
watchUpdates(() => true); // nothing here to interrupt
focusIn($('games-menu'), 'games-hero-play');
document.documentElement.classList.add('ready');
errors.start(); // the SDK loads when the browser is idle (nothing at all without a DSN)
