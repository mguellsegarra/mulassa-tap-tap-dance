// The boot screen's funny lines under the running Mulassa: mulassa.cat's loading jokes (src/i18n/locales/<lang>/boot.json,
// written by Codex) and its memory of the lines seen on this device (ui/loader.js jokes(), same key), so a game opens
// with lines the player has not read yet. The lines already seen go last; never the same line twice in a row. No extra
// wait: the boot screen leaves when the game is ready, whatever line is up.
import { lang } from './locale.js';
import { store } from './storage.js';

const chunks = import.meta.glob('../../../src/i18n/locales/*/boot.json');
const KEY = 'loader-jokes-seen';
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// el: the line's element; done(): true once the boot screen is gone (the cycle stops)
export async function bootLines(el, done, every = 2000) {
  const load = chunks[`../../i18n/locales/${lang()}/boot.json`] ?? chunks['../../../src/i18n/locales/ca/boot.json'];
  const words = await load().then(m => m.default, () => ({}));
  const lines = Object.entries(words).filter(([k]) => k.startsWith('boot.joke.')).map(([, v]) => v);
  if (!lines.length || done()) return;
  let seen = [];
  try { seen = JSON.parse(store.get(KEY) || '[]').filter(l => lines.includes(l)); } catch { /* a broken memory starts over */ }
  if (seen.length >= lines.length) seen = seen.slice(-1); // all seen: start over, but not with the very last one
  let order = [...shuffle(lines.filter(l => !seen.includes(l))), ...shuffle([...seen])], i = 0;
  const show = () => {
    if (done()) return;
    if (i >= order.length) { const last = order.at(-1); order = shuffle([...lines]); i = 0; if (order[0] === last) order.push(order.shift()); }
    const line = order[i++];
    el.textContent = line;
    seen = [...seen.filter(l => l !== line), line];
    if (seen.length >= lines.length) seen = [line];
    store.set(KEY, JSON.stringify(seen));
    setTimeout(show, Math.min(3500, Math.max(every, 50 * line.length))); // long lines stay longer, to be read whole
  };
  show();
}
