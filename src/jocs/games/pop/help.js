// «Com es juga»: what to tap and what never to tap, two columns of the figures with their one line (fig.*, tiny.*). The first
// time a player taps «Juga» it comes on the way to the game, once on this device; after that it only opens from «Com es juga?»
// on the home. One big button, no cross.
import { store } from '#plassa/storage.js';
import { COMBO_MAX } from './rules.js';

const SEEN = 'pop-howto-seen';
const TAP = ['mula', 'petard', 'calcot', 'campanar', 'carretilla'], NEVER = ['drac', 'dracFals', 'mulaFalsa'], EXTRA = new Set(['calcot', 'campanar', 'carretilla']);
export const KINDS = [...TAP, ...NEVER]; // every figure with a portrait (public/jocs/pop/cards)

export function setupHelp({ t }) {
  const $ = id => document.getElementById(id), menu = $('help-menu');
  const row = k => `<div class="r"><span class="face"><img alt="" src="/jocs/pop/cards/${k}.png">${EXTRA.has(k) ? '<i class="star" aria-hidden="true">★</i>' : ''}</span><span><b class="${EXTRA.has(k) ? 'extra' : ''}">${t(`fig.${k}`)}</b><span>${t(`tiny.${k}`)}</span></span></div>`;
  const col = (cls, hd, kinds) => `<div class="col ${cls}"><p class="hd">${t(hd)}</p><div class="rows">${kinds.map(row).join('')}</div></div>`;
  // the chord combo (rules.js CHORD): one line, then ×2 … ×COMBO_MAX growing, in the in-game combo's lettering
  const combo = () => `<div class="combo"><p>${t('help.combo')}</p><p class="x">${Array.from({ length: COMBO_MAX - 1 }, (_, i) => `<span style="font-size: ${18 + i * 4.5}px">×${i + 2}</span>`).join('')}</p></div>`;
  $('help-legend').innerHTML = col('tap', 'help.tap', TAP) + col('no', 'help.never', NEVER) + combo(); // our own words and paths
  let then = null; // the first time: what «Juga» goes on to
  function open(next = null) {
    then = next;
    $('help-go').hidden = !then;
    $('help-ok').hidden = !!then;
    menu.hidden = false;
    $(then ? 'help-go' : 'help-ok').focus({ focusVisible: false });
  }
  const close = () => { menu.hidden = true; then = null; };
  $('help').addEventListener('click', () => open());
  $('help-ok').addEventListener('click', () => { close(); $('help').focus({ focusVisible: false }); });
  $('help-go').addEventListener('click', () => { const next = then; store.set(SEEN, '1'); close(); next(); }); // the first time: on to the game
  return {
    // «Juga»: the first time through «Com es juga»; then straight on
    play(next) { if (store.get(SEEN)) next(); else open(next); },
    isOpen: () => !menu.hidden,
    close: () => { if (!then) close(); }, // the first time it waits for its «Juga»
  };
}
