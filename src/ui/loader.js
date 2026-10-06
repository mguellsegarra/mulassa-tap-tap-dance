// Loading indicators: a spinning calçot (Valls' grilled spring onion). index.html paints #loader before any JS runs
// (the page's first wait, a cover with "Avisant a la brigada…"); setupLoader() takes it over from main.js, and the same
// element shows later waits as a small flat card over the game (pointer-events: none: it never blocks input).
// The spin is a CSS transform (compositor only); prefers-reduced-motion gets a gentle pulse instead (index.html).

// The calçot: a vector calçot inside a ring of drops of salsa de calçots (in Valls it is not called romesco) that turns continuously (crisp at any size, ~2 KB). index.html carries this very markup (it has to paint before the bundle loads); tests/loader.mjs keeps the two identical.
export const CALCOT_SVG = '<svg class="calcot-ring" viewBox="0 0 100 100" aria-hidden="true"><g class="ring"><path class="d" style="opacity:0.22" transform="translate(50.00 7.00) rotate(90)" d="M0-6.4C-2.8-3-4.4-.6-4.4 1.5a4.4 4.4 0 0 0 8.8 0C4.4-.6 2.8-3 0-6.4z"/><path class="d" style="opacity:0.33" transform="translate(80.41 19.59) rotate(135)" d="M0-6.4C-2.8-3-4.4-.6-4.4 1.5a4.4 4.4 0 0 0 8.8 0C4.4-.6 2.8-3 0-6.4z"/><path class="d" style="opacity:0.44" transform="translate(93.00 50.00) rotate(180)" d="M0-6.4C-2.8-3-4.4-.6-4.4 1.5a4.4 4.4 0 0 0 8.8 0C4.4-.6 2.8-3 0-6.4z"/><path class="d" style="opacity:0.55" transform="translate(80.41 80.41) rotate(225)" d="M0-6.4C-2.8-3-4.4-.6-4.4 1.5a4.4 4.4 0 0 0 8.8 0C4.4-.6 2.8-3 0-6.4z"/><path class="d" style="opacity:0.67" transform="translate(50.00 93.00) rotate(270)" d="M0-6.4C-2.8-3-4.4-.6-4.4 1.5a4.4 4.4 0 0 0 8.8 0C4.4-.6 2.8-3 0-6.4z"/><path class="d" style="opacity:0.78" transform="translate(19.59 80.41) rotate(315)" d="M0-6.4C-2.8-3-4.4-.6-4.4 1.5a4.4 4.4 0 0 0 8.8 0C4.4-.6 2.8-3 0-6.4z"/><path class="d" style="opacity:0.89" transform="translate(7.00 50.00) rotate(360)" d="M0-6.4C-2.8-3-4.4-.6-4.4 1.5a4.4 4.4 0 0 0 8.8 0C4.4-.6 2.8-3 0-6.4z"/><path class="d" style="opacity:1.00" transform="translate(19.59 19.59) rotate(405)" d="M0-6.4C-2.8-3-4.4-.6-4.4 1.5a4.4 4.4 0 0 0 8.8 0C4.4-.6 2.8-3 0-6.4z"/></g><g class="c"><g transform="translate(50 50) scale(1.08) translate(-50 -45.80)"> <g fill="#5fb84a" stroke="#2a1a10" stroke-width="1.6" stroke-linejoin="round"> <path d="M46.2 41C43 34 40 27 38.6 19.6c-.2-1.2 1.1-1.8 1.9-.9 3.6 4.8 6.6 11 8.6 20.3z"/> <path d="M53.8 41c3.2-7 6.2-14 7.6-21.4.2-1.2-1.1-1.8-1.9-.9-3.6 4.8-6.6 11-8.6 20.3z"/> <path d="M47.6 40.5C47 31 47.6 22 49.2 13.6c.2-1.1 1.4-1.1 1.6 0 1.6 8.4 2.2 17.4 1.6 26.9z" fill="#79cc5c"/> </g> <path d="M45 44q0-6 5-6t5 6v25q0 5-5 5t-5-5z" fill="#fff3d6"/> <path d="M45 44q0-6 5-6t5 6v4h-10z" fill="#b9e08a"/> <path d="M45 66.5h10v2.5q0 5-5 5t-5-5z" fill="#6b4330"/> <path d="M47.4 66.8l1.4 2.2M52.6 66.6l-1.2 2.4" stroke="#8a5a3c" stroke-width="1.1" stroke-linecap="round"/> <path d="M45 44q0-6 5-6t5 6v25q0 5-5 5t-5-5z" fill="none" stroke="#2a1a10" stroke-width="1.6"/> <path d="M48.6 74.6l-.9 3.2M50 75l0 3.4M51.4 74.6l.9 3.2" stroke="#b08a60" stroke-width="1.1" stroke-linecap="round"/> <circle cx="48.2" cy="53" r="1.1" fill="#2a1a10"/><circle cx="51.8" cy="53" r="1.1" fill="#2a1a10"/> <path d="M48.4 56.1q1.6 1.3 3.2 0" fill="none" stroke="#2a1a10" stroke-width="1.1" stroke-linecap="round"/> </g></g></svg>'; // vector: a calçot in a ring of romesco drops (CSS in index.html)

// A calçot spinner for any other wait (a sheet's "Carregant…" line): <span class="calcot-spin"> + the artwork.
// Size it with CSS (width/height on .calcot-spin, 1em by default); it spins by itself.
// Funny lines for the first load, shown in turn under the calçot (Valls, festa major and plaça life).
export const LOADING_JOKES = [
  'Avisant a la brigada…', 'Esperant que obri el Maitanca…', 'Trucant a la grua…', 'Validant el tiquet de la zona blava…', 'Encenent el foc amb redoltes…',
  'Remenant la salsa de calçots…', 'Pentinant la Mulassa…',
  'Pujant al campanar a mirar la plaça…', 'Esquivant les caques de gos…',
  'Planxant les estelades…', 'Posant una espelmeta a la Mare de Déu de la Candela…',
  'Posant-li les arracades a l’Alcaldessa…', 'Apartant les paneroles…',
];
export function calcotSpinner(doc = document) {
  const s = doc.createElement('span');
  s.className = 'calcot-spin';
  s.innerHTML = CALCOT_SVG;
  return s;
}

// Drives #loader: ready() fades the page cover out once the first frame is on screen; wait(text) shows a card only if
// the wait outlasts `delay` (short waits never flash a spinner) and returns a handle for done(handle); cancel() hides
// whatever is showing. A newer wait replaces an older one (its done() then does nothing). The cover also lifts by
// itself after `giveUp` ms, whatever happens to the first frame: it must never hide the game for good.
// minShow: the page cover (the dancing calçot) stays at least this long from navigation, even when everything is
// already loaded — a race between the real load and the timer, whichever finishes last lifts it.
const JOKES_KEY = 'loader-jokes-seen';
const localStore = () => { try { return globalThis.localStorage; } catch { return null; } };
export function setupLoader(doc = document, { delay = 300, fade = 250, giveUp = 12000, minShow = 0, timers = globalThis, now = () => globalThis.performance?.now?.() ?? 0, storage = localStore(), random = Math.random } = {}) {
  const el = doc.getElementById('loader'), label = doc.getElementById('loader-text');
  let current = null, timer = 0, fadeTimer = 0, cover = !!el && !el.hidden;
  let jokeEvery = 0, lineAt = 0, lastLine = false; // the funny line on screen: when it came, and whether it's the last one
  const show = on => {
    if (!el) return;
    timers.clearTimeout(fadeTimer);
    if (on) { el.hidden = false; el.classList.toggle('out', false); }
    else {
      el.classList.toggle('out', true); // quick fade, then gone for good (hidden: display none, no layout)
      fadeTimer = timers.setTimeout(() => { el.hidden = true; el.classList.toggle('page', false); }, fade); // the cover fades whole
    }
    el.setAttribute('aria-busy', on ? 'true' : 'false');
  };
  const set = text => { if (label && text != null && label.textContent !== text) label.textContent = text; }; // cheap to call every frame
  const api = {
    get showing() { return !!el && !el.hidden && !el.classList?.contains?.('out'); },
    get covering() { return cover; }, // the page cover is still up (the first load): nothing under it is seen
    get text() { return label?.textContent; },
    status(text) { if (current) current.text = text; set(text); }, // a new line for what's waiting (a stage, a %)
    // While the page cover is up, cycle funny lines. The lines already seen on this device (localStorage) go last, so
    // every visit opens with new ones; once all are seen the memory starts over. Never the same line twice in a row.
    jokes(lines = LOADING_JOKES, every = 1600) {
      if (!cover || !lines.length) return;
      const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      let seen = [];
      try { seen = JSON.parse(storage?.getItem(JOKES_KEY) || '[]').filter(l => lines.includes(l)); } catch { /* private mode: no memory */ }
      if (seen.length >= lines.length) seen = seen.slice(-1); // all seen: start over, but not with the very last one
      let order = [...shuffle(lines.filter(l => !seen.includes(l))), ...shuffle([...seen])], i = -1;
      // index.html's inline script already showed a line (picked the same way, before the first paint): it stays a
      // full turn and goes last, so the next ones are new too
      const cur = label?.textContent;
      if (lines.includes(cur)) order = [...order.filter(l => l !== cur), cur];
      jokeEvery = every; lineAt = now(); // the inline script's line has been up since navigation (now() counts from it)
      const show = () => {
        set(order[i]); lineAt = now();
        seen = [...seen.filter(l => l !== order[i]), order[i]];
        if (seen.length >= lines.length) seen = [order[i]];
        try { storage?.setItem(JOKES_KEY, JSON.stringify(seen)); } catch { /* ignore */ }
      };
      const tick = () => {
        if (!cover || lastLine) return;
        if (++i >= order.length) { const last = order[order.length - 1]; order = shuffle([...lines]); i = 0; if (order[0] === last) order.push(order.shift()); }
        show();
        timers.setTimeout(tick, every);
      };
      timers.setTimeout(tick, every);
    },
    ready() { // the first frame is drawn: lift the page cover (not before minShow has passed)
      if (!cover) return;
      const left = minShow - now();
      if (left > 0) { if (!api.pending) api.pending = timers.setTimeout(() => { api.pending = 0; api.ready(); }, left); return; }
      // the line on screen gets its full turn (it's the last one: no new line starts), then the cover lifts
      const line = jokeEvery ? lineAt + jokeEvery - now() : 0;
      if (line > 20) { lastLine = true; if (!api.pending) api.pending = timers.setTimeout(() => { api.pending = 0; jokeEvery = 0; api.ready(); }, line); return; }
      cover = false;
      doc.body?.removeAttribute?.('aria-busy');
      if (current) el?.classList.toggle('page', false); // a wait is still on: it carries on as a card
      else show(false);
    },
    wait(text) {
      const h = (current = { text });
      timers.clearTimeout(timer);
      if (cover) { set(text); return h; } // still under the page cover: just its line
      timer = timers.setTimeout(() => { if (current === h) { set(h.text); show(true); } }, delay);
      return h;
    },
    done(h) { if (h && h === current) api.cancel(); },
    cancel() {
      current = null;
      timers.clearTimeout(timer);
      if (!cover && el && !el.hidden) show(false);
    },
  };
  if (cover) timers.setTimeout(() => api.ready(), giveUp);
  return api;
}
