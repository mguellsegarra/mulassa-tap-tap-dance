// Mulassa Games, mulassa.cat/jocs/ (jocs/index.html): the games' selector, a page of its own on Plassa, so nothing of a game
// loads behind it. A game is its own page too: replace, so bfcache keeps neither frozen in memory (docs/jocs/README.md).
import { focusIn } from '#plassa/focus.js'; // keyboard vs pointer: <html data-keys> while keys drive the page
import { t, applyWords } from './i18n.js';
import { setupGamesCarousel } from './carousel.js';
import { setupMusic } from './music.js';
import { setUiSound, soundOnPress } from '#plassa/ui-sound.js';
import { setupOrientation } from '#plassa/orientation.js';
import { onNativeBack, leaveApp, CAP_APP, hideSplash } from '#plassa/native.js';
import { stopDoubleTapZoom } from '#plassa/double-tap.js';
import { errors } from '#plassa/errors.js';
import { watchUpdates } from '#plassa/update-watch.js';

const $ = id => document.getElementById(id);
// the error card's words in the player's language, for the shared boot watchdog; a word the catalogue lacks stays the watchdog's Catalan
const word = key => { const v = t(key); return v === key ? undefined : v; };
window.__gameBootWords = { title: word('fail.title'), text: word('fail.text'), retry: word('fail.retry') };
errors.context(() => ({ game: 'jocs' }));
applyWords(); // before the carousel: the hero shows its card's words
const carousel = setupGamesCarousel();

function open(card) {
  if (!card || 'soon' in card.dataset) return; // a surprise card holds the place of next week's game: nothing to open yet
  // the rhythm game is the site's home; Pop is the one game with its own short address. The app names the game's file:
  // its bare root is a start (index.html), told apart by a referrer that iOS's capacitor:// never sends.
  // the page fades at once: on a phone the next one can take seconds to show, and the old one stood still meanwhile (owner, 11 Nov 2026)
  document.documentElement.classList.add('leaving');
  location.replace({ tap: CAP_APP ? '/index.html' : '/', pop: '/pop/' }[card.dataset.game] ?? `/jocs/${card.dataset.game}/`);
}
$('games-grid').addEventListener('click', e => {
  const card = e.target.closest?.('[data-game]');
  if (card && carousel.take(card, e)) open(card);
});
$('games-hero-play').addEventListener('click', () => open(carousel.chosen())); // its own way in: a touch on a card only chooses

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
onNativeBack(leaveApp); // Android's back button on the app's first page: home, the app kept as it is
focusIn($('games-menu'), 'games-hero-play');
document.documentElement.classList.add('ready');
hideSplash(); // the app's launch screen, held until now (plassa/native.js)
// «Instal·la l'app» (install.js): mulassa.cat's words and steps sheet in a chunk of their own, after the page shows
import('./install.js').catch(e => errors.capture(e, { where: 'install' }));
setTimeout(() => { $('boot').hidden = true; }, 400); // kept, hidden: the error card comes up in it (the watchdog)
errors.start(); // the SDK loads when the browser is idle (nothing at all without a DSN)
