// The Mulassa runs on eight articulated portador legs over a scrolling ground line; head and ears react with inline CSS in index.html.
// Each moving part is an HTML layer holding its own static SVG (same 220x168 coordinates): Safari animates those on the
// compositor, so she keeps running while startup holds the main thread (parts inside one SVG froze with it).
// The cover paints without the bundle; later waits use a flat card that never blocks input.
// Keep this artwork identical to index.html (tests/loader.mjs). Reduced motion holds the rest pose.
import { tr } from '../i18n/messages.js';
import { JOKE_IDS } from '../i18n/boot-jokes.js';

export const MULASSA_SVG = '<div class="mula-load" aria-hidden="true"><div class="ml-fig"><div class="ml-ground"><svg viewBox="0 0 202 18"><path d="M0 4H202" fill="none" stroke="#866846" stroke-width="1.2" opacity=".6"/></svg><div class="ml-road"><svg viewBox="0 0 202 18"><g fill="none" stroke="#a78355" stroke-width="1.2" stroke-linecap="round" opacity=".45"><path d="M0 10H270" stroke-dasharray="18 12 4 12 6 12"/><path d="M30 4l3-3h4l3 3m54 0l3-3h4l3 3m54 0l3-3h4l3 3m54 0l3-3h4l3 3"/></g></svg></div></div><div class="ml-dust" style="animation-delay:0s"><svg viewBox="0 0 220 168"><g transform="translate(43 145)"><path d="M-3 0c-5 0-8-3-7-6 1-3 4-4 6-3 0-6 7-7 9-3 5-2 9 1 8 5 3 0 4 3 2 5C10 1 3 1-3 0z" fill="#9b7951"/><path d="M-7-6q2-5 6-2m3-5q4-2 6 2" fill="none" stroke="#c6a16b" stroke-width="1.2" stroke-linecap="round" opacity=".5"/><path d="M-13-2l-2-1m-1-5-1-1" fill="none" stroke="#a78355" stroke-width="1.6" stroke-linecap="round"/></g></svg></div><div class="ml-dust" style="animation-delay:-0.24s"><svg viewBox="0 0 220 168"><g transform="translate(43 145)"><path d="M-3 0c-5 0-8-3-7-6 1-3 4-4 6-3 0-6 7-7 9-3 5-2 9 1 8 5 3 0 4 3 2 5C10 1 3 1-3 0z" fill="#9b7951"/><path d="M-7-6q2-5 6-2m3-5q4-2 6 2" fill="none" stroke="#c6a16b" stroke-width="1.2" stroke-linecap="round" opacity=".5"/><path d="M-13-2l-2-1m-1-5-1-1" fill="none" stroke="#a78355" stroke-width="1.6" stroke-linecap="round"/></g></svg></div><svg viewBox="0 0 220 168"><ellipse cx="100" cy="147" rx="72" ry="4.5" fill="#000" opacity=".35"/></svg><div class="ml-leg" style="--step:0s;transform-origin:27.273% 67.262%"><svg viewBox="0 0 220 168"><g transform="translate(60 113)"><rect x="-3.5" y="0" width="7" height="18" rx="3" fill="#36303a"/></g></svg><div class="ml-shin" style="transform-origin:27.273% 76.786%"><svg viewBox="0 0 220 168"><g transform="translate(60 129)"><rect x="-3.5" y="-2" width="7" height="17" rx="2" fill="#36303a"/><rect x="-3.5" y="10" width="7" height="4" fill="#aaa18d"/><path d="M-4 13h7l6 2q2 1 1 4H-4z" fill="#241b1c"/><path d="M-4 18h14" stroke="#aaa18d" stroke-width="1.5" stroke-linecap="round"/></g></svg></div></div><div class="ml-leg" style="--step:-0.24s;transform-origin:31.818% 67.262%"><svg viewBox="0 0 220 168"><g transform="translate(70 113)"><rect x="-3.5" y="0" width="7" height="18" rx="3" fill="#36303a"/></g></svg><div class="ml-shin" style="transform-origin:31.818% 76.786%"><svg viewBox="0 0 220 168"><g transform="translate(70 129)"><rect x="-3.5" y="-2" width="7" height="17" rx="2" fill="#36303a"/><rect x="-3.5" y="10" width="7" height="4" fill="#aaa18d"/><path d="M-4 13h7l6 2q2 1 1 4H-4z" fill="#241b1c"/><path d="M-4 18h14" stroke="#aaa18d" stroke-width="1.5" stroke-linecap="round"/></g></svg></div></div><div class="ml-leg" style="--step:-0.04s;transform-origin:61.818% 67.262%"><svg viewBox="0 0 220 168"><g transform="translate(136 113)"><rect x="-3.5" y="0" width="7" height="18" rx="3" fill="#36303a"/></g></svg><div class="ml-shin" style="transform-origin:61.818% 76.786%"><svg viewBox="0 0 220 168"><g transform="translate(136 129)"><rect x="-3.5" y="-2" width="7" height="17" rx="2" fill="#36303a"/><rect x="-3.5" y="10" width="7" height="4" fill="#aaa18d"/><path d="M-4 13h7l6 2q2 1 1 4H-4z" fill="#241b1c"/><path d="M-4 18h14" stroke="#aaa18d" stroke-width="1.5" stroke-linecap="round"/></g></svg></div></div><div class="ml-leg" style="--step:-0.28s;transform-origin:66.364% 67.262%"><svg viewBox="0 0 220 168"><g transform="translate(146 113)"><rect x="-3.5" y="0" width="7" height="18" rx="3" fill="#36303a"/></g></svg><div class="ml-shin" style="transform-origin:66.364% 76.786%"><svg viewBox="0 0 220 168"><g transform="translate(146 129)"><rect x="-3.5" y="-2" width="7" height="17" rx="2" fill="#36303a"/><rect x="-3.5" y="10" width="7" height="4" fill="#aaa18d"/><path d="M-4 13h7l6 2q2 1 1 4H-4z" fill="#241b1c"/><path d="M-4 18h14" stroke="#aaa18d" stroke-width="1.5" stroke-linecap="round"/></g></svg></div></div><div class="ml-leg" style="--step:-0.02s;transform-origin:24.091% 67.262%"><svg viewBox="0 0 220 168"><g transform="translate(53 113)"><rect x="-3.5" y="0" width="7" height="18" rx="3" fill="#51454e"/></g></svg><div class="ml-shin" style="transform-origin:24.091% 76.786%"><svg viewBox="0 0 220 168"><g transform="translate(53 129)"><rect x="-3.5" y="-2" width="7" height="17" rx="2" fill="#51454e"/><rect x="-3.5" y="10" width="7" height="4" fill="#f4efe4"/><path d="M-4 13h7l6 2q2 1 1 4H-4z" fill="#241b1c"/><path d="M-4 18h14" stroke="#f4efe4" stroke-width="1.5" stroke-linecap="round"/></g></svg></div></div><div class="ml-leg" style="--step:-0.26s;transform-origin:29.545% 67.262%"><svg viewBox="0 0 220 168"><g transform="translate(65 113)"><rect x="-3.5" y="0" width="7" height="18" rx="3" fill="#51454e"/></g></svg><div class="ml-shin" style="transform-origin:29.545% 76.786%"><svg viewBox="0 0 220 168"><g transform="translate(65 129)"><rect x="-3.5" y="-2" width="7" height="17" rx="2" fill="#51454e"/><rect x="-3.5" y="10" width="7" height="4" fill="#f4efe4"/><path d="M-4 13h7l6 2q2 1 1 4H-4z" fill="#241b1c"/><path d="M-4 18h14" stroke="#f4efe4" stroke-width="1.5" stroke-linecap="round"/></g></svg></div></div><div class="ml-leg" style="--step:-0.06s;transform-origin:58.182% 67.262%"><svg viewBox="0 0 220 168"><g transform="translate(128 113)"><rect x="-3.5" y="0" width="7" height="18" rx="3" fill="#51454e"/></g></svg><div class="ml-shin" style="transform-origin:58.182% 76.786%"><svg viewBox="0 0 220 168"><g transform="translate(128 129)"><rect x="-3.5" y="-2" width="7" height="17" rx="2" fill="#51454e"/><rect x="-3.5" y="10" width="7" height="4" fill="#f4efe4"/><path d="M-4 13h7l6 2q2 1 1 4H-4z" fill="#241b1c"/><path d="M-4 18h14" stroke="#f4efe4" stroke-width="1.5" stroke-linecap="round"/></g></svg></div></div><div class="ml-leg" style="--step:-0.3s;transform-origin:63.636% 67.262%"><svg viewBox="0 0 220 168"><g transform="translate(140 113)"><rect x="-3.5" y="0" width="7" height="18" rx="3" fill="#51454e"/></g></svg><div class="ml-shin" style="transform-origin:63.636% 76.786%"><svg viewBox="0 0 220 168"><g transform="translate(140 129)"><rect x="-3.5" y="-2" width="7" height="17" rx="2" fill="#51454e"/><rect x="-3.5" y="10" width="7" height="4" fill="#f4efe4"/><path d="M-4 13h7l6 2q2 1 1 4H-4z" fill="#241b1c"/><path d="M-4 18h14" stroke="#f4efe4" stroke-width="1.5" stroke-linecap="round"/></g></svg></div></div><div class="ml-bob"><div class="ml-tail"><svg viewBox="0 0 220 168"><path d="M41 74q-9 12-7 36l7 1q-1-20 6-34z" fill="#4e2e1a"/><path d="M33 86h10M33 99h10" stroke="#f4efe4" stroke-width="3"/><path d="M33 92.5h10" stroke="#ffb3c7" stroke-width="3"/></svg></div><div class="ml-neck"><div class="ml-nod"><svg viewBox="0 0 220 168"><path d="M139 74 150 33q3-8 12-6l3 3-7 44z" fill="#7a4a2b"/><path d="M145 68 152 34" stroke="#4e2e1a" stroke-width="4" stroke-linecap="round"/></svg><div class="ml-sweat"><svg viewBox="0 0 220 168"><g fill="#fff3d6"><path d="M133 28q-7-3-7 1t7-1z"/><path d="M132 19q-5-5-7-2t7 2z"/></g></svg></div><div class="ml-ear ml-e2"><svg viewBox="0 0 220 168"><path d="M156 18.5Q154.6 5 161.4-1.6 165 5.5 161.2 18z" fill="#4e2e1a"/></svg></div><svg viewBox="0 0 220 168"><path d="M159 38 187 42.5 160 43.5z" fill="#5a1010"/><path d="M164 43.2Q172 41.2 182 42.3L181 42.9Q172 43 164 43.4z" fill="#e58aa6"/></svg><div class="ml-jaw"><svg viewBox="0 0 220 168"><path d="M158 37.5 186 42q2 5-3 6.5l-24-4z" fill="#7a4a2b"/><path d="M178 42.5l8 1.2q1 3.6-3 4.6l-5-.8z" fill="#5d3a24"/><path d="M178.5 42.6l7 1" stroke="#f4efe4" stroke-width="1.4"/></svg></div><svg viewBox="0 0 220 168"><circle cx="158" cy="26" r="11" fill="#7a4a2b"/><path d="M152 19 183 28q7 2 6.5 9l-1 4-31-4z" fill="#7a4a2b"/><path d="M178 29.5q10 2 10.5 7.5l-1 4-9.5-1.5z" fill="#5d3a24"/><path d="M178 40.4l9 1.4" stroke="#f4efe4" stroke-width="1.4"/><circle cx="185" cy="33" r="1.3" fill="#2a1a10"/><circle cx="160" cy="24.5" r="4.2" fill="#f4efe4"/><circle cx="162" cy="25" r="2.2" fill="#2a1a10"/><g fill="none" stroke="#c0912e" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M151.5 19.5C156 15.8 162 15.6 165.6 18.9M151.5 19.5 154.6 35.8 169.8 37.8 175.8 27.2"/></g><circle cx="151.5" cy="19.5" r="2.3" fill="#c8283a"/><circle cx="151.5" cy="19.5" r="0.8" fill="#f2c14e"/><circle cx="175.8" cy="27.2" r="1.3" fill="#c8283a"/><g class="ml-sad"><path d="M156.3 25a3.7 3.7 0 0 1 7.4 0z" fill="#7a4a2b"/><path d="M156 23.6l7.5-1.4" stroke="#2a1a10" stroke-width="1.1" stroke-linecap="round"/><path class="ml-tear" d="M161 28.5q-8 7 0 11 8-4 0-11z" fill="#9bdcff"/><path class="ml-tear ml-tear-late" d="M161 28.5q-8 7 0 11 8-4 0-11z" fill="#9bdcff"/></g></svg><div class="ml-ear"><svg viewBox="0 0 220 168"><path d="M148.5 18.5Q140 8 142.6-2.2 150 2 153.5 16z" fill="#7a4a2b"/><path d="M148.6 14.6Q144.2 8 144.6 1.6 148.6 5 150.6 13z" fill="#b07a5a"/></svg></div><div class="ml-clac"><svg viewBox="0 0 220 168"><g stroke="#f5c518" stroke-width="2" stroke-linecap="round"><path d="M192 38l5-3M193 45h6M191 51l4 3"/></g></svg></div></div></div><svg viewBox="0 0 220 168"><rect x="40" y="66" width="118" height="52" rx="7" fill="#a3182f"/><path d="M40 103h118v8q0 7-7 7H47q-7 0-7-7z" fill="#7c1024"/><path d="M46 68.5h106" stroke="#c43752" stroke-width="2" stroke-linecap="round"/><path d="M137 64h25v10q0 3-3 3h-19q-3 0-3-3z" fill="#a3182f"/><rect x="136" y="61" width="27" height="4" rx="1.5" fill="#d9a521"/><path d="M155 72q-10 26-24 2" fill="none" stroke="#d9a521" stroke-width="2.4" stroke-dasharray=".1 3.6" stroke-linecap="round"/><rect x="76" y="61" width="52" height="45" rx="3" fill="#1f5c33" stroke="#d9a521" stroke-width="2.5"/><path d="M83 97h38" stroke="#d9a521" stroke-width="1.5"/><path d="M96 70.5h16v3H96zM96 70.5v-3h3v3M102.5 70.5v-3h3v3M109 70.5v-3h3v3" fill="#d9a521" stroke="#d9a521" stroke-width=".6"/><path d="M104 75 113 83 104 91 95 83z" fill="#a3182f" stroke="#2a1a10" stroke-width=".8"/><path d="M97.3 81h13.4l2.2 2-2.2 2H97.3l-2.2-2z" fill="#f4efe4"/><rect x="38" y="116" width="122" height="5" rx="2" fill="#d9a521"/><path d="M41 123.5h117" stroke="#d9a521" stroke-width="5" stroke-dasharray="2 2.4"/></svg></div></div></div>';
// Head-only artwork for small inline status lines. Larger waits use the full figure.
export const MULASSA_MINI_SVG = '<svg class="mula-load mini" viewBox="124 -4 84 84" aria-hidden="true"><g class="ml-neck"><g class="ml-nod"><path d="M139 74 150 33q3-8 12-6l3 3-7 44z" fill="#7a4a2b"/><path d="M145 68 152 34" stroke="#4e2e1a" stroke-width="4" stroke-linecap="round"/><g class="ml-head"><g class="ml-sweat" fill="#fff3d6"><path d="M133 28q-7-3-7 1t7-1z"/><path d="M132 19q-5-5-7-2t7 2z"/></g><g class="ml-ear ml-e2"><path d="M156 18.5Q154.6 5 161.4-1.6 165 5.5 161.2 18z" fill="#4e2e1a"/></g><path d="M159 38 187 42.5 160 43.5z" fill="#5a1010"/><path d="M164 43.2Q172 41.2 182 42.3L181 42.9Q172 43 164 43.4z" fill="#e58aa6"/><g class="ml-jaw"><path d="M158 37.5 186 42q2 5-3 6.5l-24-4z" fill="#7a4a2b"/><path d="M178 42.5l8 1.2q1 3.6-3 4.6l-5-.8z" fill="#5d3a24"/><path d="M178.5 42.6l7 1" stroke="#f4efe4" stroke-width="1.4"/></g><circle cx="158" cy="26" r="11" fill="#7a4a2b"/><path d="M152 19 183 28q7 2 6.5 9l-1 4-31-4z" fill="#7a4a2b"/><path d="M178 29.5q10 2 10.5 7.5l-1 4-9.5-1.5z" fill="#5d3a24"/><path d="M178 40.4l9 1.4" stroke="#f4efe4" stroke-width="1.4"/><circle cx="185" cy="33" r="1.3" fill="#2a1a10"/><circle cx="160" cy="24.5" r="4.2" fill="#f4efe4"/><circle cx="162" cy="25" r="2.2" fill="#2a1a10"/><g fill="none" stroke="#c0912e" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M151.5 19.5C156 15.8 162 15.6 165.6 18.9M151.5 19.5 154.6 35.8 169.8 37.8 175.8 27.2"/></g><circle cx="151.5" cy="19.5" r="2.3" fill="#c8283a"/><circle cx="151.5" cy="19.5" r="0.8" fill="#f2c14e"/><circle cx="175.8" cy="27.2" r="1.3" fill="#c8283a"/><g class="ml-sad"><path d="M156.3 25a3.7 3.7 0 0 1 7.4 0z" fill="#7a4a2b"/><path d="M156 23.6l7.5-1.4" stroke="#2a1a10" stroke-width="1.1" stroke-linecap="round"/><path class="ml-tear" d="M161 28.5q-8 7 0 11 8-4 0-11z" fill="#9bdcff"/><path class="ml-tear ml-tear-late" d="M161 28.5q-8 7 0 11 8-4 0-11z" fill="#9bdcff"/></g><g class="ml-ear"><path d="M148.5 18.5Q140 8 142.6-2.2 150 2 153.5 16z" fill="#7a4a2b"/><path d="M148.6 14.6Q144.2 8 144.6 1.6 148.6 5 150.6 13z" fill="#b07a5a"/></g><g class="ml-clac" stroke="#f5c518" stroke-width="2" stroke-linecap="round"><path d="M192 38l5-3M193 45h6M191 51l4 3"/></g></g></g></g><path d="M137 64h25v10q0 3-3 3h-19q-3 0-3-3z" fill="#a3182f"/><rect x="136" y="61" width="27" height="4" rx="1.5" fill="#d9a521"/></svg>';

// Funny lines for the first load (Valls, festa major and plaça life): the boot catalogue, which tools/gen-boot.mjs also writes into index.html.
export const LOADING_JOKES = JOKE_IDS.map(id => tr(`boot.joke.${id}`));
export function mulaSpinner(doc = document, { mini = false } = {}) {
  const s = doc.createElement('span');
  s.className = 'mula-spinner';
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = mini ? MULASSA_MINI_SVG : MULASSA_SVG;
  return s;
}

// Drives #loader: ready() marks the game ready; the cover finishes at least three full joke turns before fading.
// Without a joke cycle it releases immediately. wait(text) shows a card only if
// the wait outlasts `delay` (short waits never flash a spinner) and returns a handle for done(handle); cancel() hides
// whatever is showing. A newer wait replaces an older one (its done() then does nothing). After `giveUp` ms the
// pre-bundle watchdog checks that a frame exists before lifting; a failed boot keeps its recoverable error card.
const JOKES_KEY = 'loader-jokes-seen';
const localStore = () => { try { return globalThis.localStorage; } catch { return null; } };
export function setupLoader(doc = document, { delay = 300, fade = 250, giveUp = 20000, minJokes = 3, timers = globalThis, storage = localStore(), random = Math.random } = {}) {
  const el = doc.getElementById('loader'), label = doc.getElementById('loader-text');
  let current = null, timer = 0, fadeTimer = 0, cover = !!el && !el.hidden;
  let jokeTimer = 0, jokesActive = false, gameReady = false;
  const show = on => {
    if (!el) return;
    timers.clearTimeout(fadeTimer);
    if (on) { el.hidden = false; el.classList.toggle('out', false); }
    else {
      el.classList.toggle('out', true); // quick fade, then gone for good (hidden: display none, no layout)
      fadeTimer = timers.setTimeout(() => {
        if (el.classList?.contains?.('fail')) return; // a failure may have replaced the cover during its fade
        el.hidden = true; el.classList.toggle('page', false);
      }, fade); // the cover fades whole
    }
    el.setAttribute('aria-busy', on ? 'true' : 'false');
  };
  const set = text => { if (label && text != null && label.textContent !== text) label.textContent = text; }; // cheap to call every frame
  const liftCover = () => {
    if (!cover) return;
    cover = false; jokesActive = false;
    timers.clearTimeout(jokeTimer);
    if (el?.classList?.contains?.('fail')) return; // a boot failure stays until the player retries
    doc.body?.removeAttribute?.('aria-busy');
    if (current) el?.classList.toggle('page', false); // an ongoing wait continues as a card
    else show(false);
  };
  const api = {
    get showing() { return !!el && !el.hidden && !el.classList?.contains?.('out'); },
    get covering() { return cover; }, // the page cover is still up (the first load): nothing under it is seen
    get text() { return label?.textContent; },
    status(text) { if (current) current.text = text; set(text); }, // a new line for what's waiting (a stage, a %)
    // While the page cover is up, cycle funny lines. The lines already seen on this device (localStorage) go last, so
    // every visit opens with new ones; once all are seen the memory starts over. Never the same line twice in a row.
    jokes(lines = LOADING_JOKES, every = 1600) {
      if (!cover || !lines.length || jokesActive) return;
      jokesActive = true;
      let shown = 1; // the inline first-paint line gets a full turn too, even after a slow module load
      const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      let seen = [];
      try { seen = JSON.parse(storage?.getItem(JOKES_KEY) || '[]').filter(l => lines.includes(l)); } catch { /* private mode: no memory */ }
      if (seen.length >= lines.length) seen = seen.slice(-1); // all seen: start over, but not with the very last one
      let order = [...shuffle(lines.filter(l => !seen.includes(l))), ...shuffle([...seen])], i = -1;
      // index.html's inline script already showed a line (picked the same way, before the first paint): it stays
      // until the next tick and goes last, so the next ones are new too
      const cur = label?.textContent;
      if (lines.includes(cur)) order = [...order.filter(l => l !== cur), cur];
      const show = () => {
        set(order[i]);
        seen = [...seen.filter(l => l !== order[i]), order[i]];
        if (seen.length >= lines.length) seen = [order[i]];
        try { storage?.setItem(JOKES_KEY, JSON.stringify(seen)); } catch { /* ignore */ }
      };
      const tick = () => {
        if (!cover) return;
        if (el?.classList?.contains?.('fail')) { liftCover(); return; }
        if (gameReady && shown >= minJokes) { liftCover(); return; }
        if (++i >= order.length) { const last = order[order.length - 1]; order = shuffle([...lines]); i = 0; if (order[0] === last) order.push(order.shift()); }
        show();
        shown++;
        jokeTimer = timers.setTimeout(tick, every);
      };
      jokeTimer = timers.setTimeout(tick, every);
    },
    ready() { // joke ticks release only at a complete line boundary, once the minimum is met
      if (!cover) return;
      gameReady = true;
      if (!jokesActive) liftCover();
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
  if (cover) timers.setTimeout(() => {
    if (!cover) return;
    const checkBoot = doc.defaultView?.__mulassaCheckBoot;
    if (!checkBoot || checkBoot()) liftCover(); // a hidden tab or failed first frame belongs to the watchdog
  }, giveUp);
  return api;
}
