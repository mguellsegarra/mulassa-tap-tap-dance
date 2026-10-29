// Cloudflare Turnstile, only when a token is needed: a new profile publishing, or a Bústia message (tokens are single-use and expire after ~300 s). Usually nothing shows. When
// Cloudflare wants a tick, #captcha-menu (index.html) opens centred: not dismissable (no Cancel·la, Escape and the backdrop
// do nothing), never during a song (canShow), and it closes by itself when the token comes. A failure never blocks the
// game: it is remembered (code in the console and errors.report, never anything personal), retried once later, and
// explained when the player presses Publica. No Supabase session is made here: that happens only on publishing.
import { errors } from './errors.js';
import { tr } from '../i18n/messages.js';
import { lang } from '../i18n/locale.js';

// Turnstile's `language` for each UI language (docs/i18n/research.md §1): lower case, and the ones it does not support
// (eu, gl, oc) get an explicit neighbour rather than `auto`, which follows the browser, not the game. `ca` stays as it
// always was (Cloudflare does not list it; changing what Catalan players see is not part of the i18n work).
export const TURNSTILE_LANG = {
  ca: 'ca', es: 'es', en: 'en', fr: 'fr', it: 'it', ro: 'ro', pt: 'pt-br', eu: 'es', gl: 'es', oc: 'fr', de: 'de',
  'zh-Hans': 'zh-cn', ja: 'ja', uk: 'uk', ru: 'ru', ko: 'ko',
};
export const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let turnstileLoad = null;
export function loadTurnstile() { // the widget script; a failed load may be retried
  turnstileLoad ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TURNSTILE_SRC; s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
    s.onerror = () => { turnstileLoad = null; s.remove(); reject(new Error('turnstile')); };
    document.head.appendChild(s);
  });
  return turnstileLoad;
}
const FRESH_MS = 270e3; // a token is good for 300 s: a little margin

// Turnstile's error codes (developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes) in words
export function turnstileMessage(code) {
  const c = String(code ?? ''), n = Number(c);
  const why = c === 'load' || c === '200500' ? tr('services.captcha.load')
    : c === '110200' ? tr('services.captcha.unauthorized')
    : /^1101/.test(c) || /^4000/.test(c) ? tr('services.captcha.misconfigured')
    : /^1106/.test(c) ? tr('services.captcha.timeout')
    : c === '110500' || c === '110510' ? tr('services.captcha.unsupported')
    : c === '200100' ? tr('services.captcha.clock')
    : (n >= 300000 && n < 400000) || (n >= 600000 && n < 700000) ? tr('services.captcha.notHuman')
    : tr('services.captcha.failed');
  return tr('services.captcha.retry', { why, code: c || '?' });
}

export function setupVerify({ doc = document, siteKey, load, canShow = () => true, report = errors.report, log = console,
  schedule = (f, ms) => setTimeout(f, ms), now = () => Date.now(), retryDelay = 30e3, host = () => globalThis.location?.hostname ?? '' }) {
  const menu = doc.getElementById('captcha-menu'), box = doc.getElementById('captcha-box');
  let ts = null, widget = null, loading = null, token = null, tokenAt = 0, running = false, failure = null, retried = false;
  let wantShow = false, polling = false, waiters = [];
  menu.addEventListener('cancel', e => e.preventDefault()); // Escape and the backdrop (main.js light dismiss) do nothing

  function show() { // only over a screen that allows it (title / results): a song is never interrupted
    polling = false;
    if (!wantShow || menu.open) return;
    if (!canShow()) { polling = true; schedule(show, 500); return; }
    menu.showModal();
    menu.focus?.();
  }
  function hide() { wantShow = false; if (menu.open) menu.close(); }
  function settle(fn) { const w = waiters; waiters = []; for (const x of w) fn(x); }
  function failed(code) {
    running = false; token = null; failure = { code: String(code) };
    hide();
    log.warn?.(`[turnstile] error ${code} on ${host()}`); // the host tells a 110200 apart (Cloudflare: Hostname management)
    report('turnstile-failed', { code: String(code) });
    if (waiters.length) settle(x => x.reject(failure));
    else if (!retried) { retried = true; schedule(() => { if (!waiters.length && !token) run().catch(() => {}); }, retryDelay); } // once, later
  }
  async function run() { // render the widget (once), or re-execute it for a new token
    running = true; failure = null;
    if (widget == null) {
      loading ??= load().finally(() => { loading = null; });
      try { ts = await loading; } catch { failed('load'); throw failure; }
      if (widget != null) return;
      widget = ts.render(box, {
        sitekey: siteKey, theme: 'dark', appearance: 'interaction-only', language: TURNSTILE_LANG[lang()] ?? TURNSTILE_LANG.ca,
        // an unused token is not renewed every ~300 s (Turnstile's default 'auto' ran a new challenge, and sometimes the
        // tick box, every 5 minutes on an idle title); token() resets the widget when one is actually needed
        'refresh-expired': 'never',
        callback: t => {
          running = false; failure = null; hide();
          if (waiters.length) { const [x, ...rest] = waiters; waiters = rest; x.resolve(t); } // single use: straight to the publish
          else { token = t; tokenAt = now(); }
        },
        'before-interactive-callback': () => { wantShow = true; if (!polling) show(); },
        'expired-callback': () => { token = null; }, // the next token() asks again
        'error-callback': code => { failed(code); return true; }, // handled: no console noise from the widget
      });
    } else { token = null; try { ts.reset(widget); } catch { /* it reloads itself */ } }
  }
  return {
    get open() { return menu.open; },
    get failure() { return failure; },
    start() { if (widget == null && !loading) run().catch(() => {}); },
    // a token for one publication: the startup one if still fresh, else the widget runs again (silently, usually)
    token() {
      if (token && now() - tokenAt < FRESH_MS) { const t = token; token = null; return Promise.resolve(t); }
      return new Promise((resolve, reject) => {
        waiters.push({ resolve, reject });
        if (!running || failure) run().catch(() => {});
      });
    },
    cancel() { settle(x => x.reject({ code: 'cancel' })); }, // the publish sheet went away: nobody waits for it any more
  };
}
