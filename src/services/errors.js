// Crash reports (Sentry, errors only: no replay, tracing, sessions or feedback). Off unless VITE_SENTRY_DSN is set
// and this is a real visit: never in tests (no window), webdriver/headless, ?autoplay/?from/?view or on a dev host.
// `?sentry-test` on localhost only turns it on (environment 'development') and adds window.__sentryTest() to throw
// one test error. The SDK loads when idle after the first frame; errors before that are buffered and forwarded.

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;
export const DEV_HOST = /^(localhost|127(\.\d+){3}|\[::1\]|0\.0\.0\.0|.+\.(localhost|local|test)|10(\.\d+){3}|192\.168(\.\d+){2}|172\.(1[6-9]|2\d|3[01])(\.\d+){2})$/;
const DEBUG_PARAMS = ['autoplay', 'from', 'view']; // self-playing or debug-camera runs are not players
const PROD_HOST = 'mulassa-tap-tap-dance.pages.dev';
const MAX_EVENTS = 10; // per page: a bug in the frame loop must not send one report per frame
const BUFFER = { exception: 10, report: 10, breadcrumb: 20 };
const KNOWN_ERROR_NAMES = new Set(['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'SecurityError', 'InvalidStateError', 'NotSupportedError', 'AbortError',
  'NetworkError', 'EncodingError', 'OperationError', 'UnknownError', 'NotAllowedError', 'DataCloneError']);
export const errorName = e => (KNOWN_ERROR_NAMES.has(e?.name) ? e.name : 'Other');

// 'production' | 'preview' | 'development', or null when nothing may be sent.
export function errorsMode({ dsn, hostname = '', search = '', webdriver = false }) {
  if (!dsn) return null;
  const q = new URLSearchParams(search);
  if (q.has('sentry-test') && LOOPBACK.test(hostname)) return 'development';
  if (webdriver || DEBUG_PARAMS.some(k => q.has(k)) || DEV_HOST.test(hostname)) return null;
  return hostname === PROD_HOST ? 'production' : hostname.endsWith('.pages.dev') ? 'preview' : 'production';
}

// Query strings and fragments go (?repte=…, tokens a provider might put there); the path stays.
export const scrubUrl = url => (typeof url === 'string' ? url.replace(/[?#].*$/s, '') : url);
export const scrubText = text => (typeof text === 'string' ? text.replace(/(\b(?:https?|blob):\/\/[^\s?#"'<>]*)[?#][^\s"'<>]*/g, '$1') : text);

export function scrubBreadcrumb(b) {
  if (b.category === 'console' && b.level !== 'warning' && b.level !== 'error') return null;
  if (b.message) b.message = scrubText(b.message);
  if (b.data) for (const k of ['url', 'from', 'to']) if (b.data[k]) b.data[k] = scrubUrl(b.data[k]);
  return b;
}

export function scrubEvent(event, tags = {}) {
  delete event.user; // no id, no IP (the SDK also tells Sentry never to infer one: dataCollection.userInfo false)
  if (event.request) {
    const ua = event.request.headers?.['User-Agent'];
    event.request = { url: scrubUrl(event.request.url), ...(ua && { headers: { 'User-Agent': ua } }) }; // no Referer, cookies, query
  }
  if (event.message) event.message = scrubText(event.message);
  for (const ex of event.exception?.values || []) {
    ex.value = scrubText(ex.value);
    for (const f of ex.stacktrace?.frames || []) { f.filename = scrubUrl(f.filename); f.abs_path = scrubUrl(f.abs_path); }
  }
  event.breadcrumbs = event.breadcrumbs?.map(scrubBreadcrumb).filter(Boolean);
  event.tags = { ...event.tags, ...tags };
  return event;
}

// Plain options for Sentry.init (integrations are added by the loader); pure, so the tests read the privacy knobs.
export function sentryOptions({ dsn, environment, release, tags = () => ({}) }) {
  let sent = 0;
  return {
    dsn, environment, release,
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, stackFrameVariables: false },
    sendDefaultPii: false, // pre-v11 name of userInfo: false
    sendClientReports: false,
    enhanceFetchErrorMessages: 'report-only', // never rewrite the game's own error messages
    maxBreadcrumbs: 30,
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend(event, hint) {
      if (hint?.originalException?.mulassaReported) return null; // e.g. no WebGL: already a warning, not a crash
      if (++sent > MAX_EVENTS) return null;
      let t = {};
      try { t = tags(); } catch { /* a report must never fail on its own context */ }
      return scrubEvent(event, t);
    },
  };
}


// win: the window (null = off); load(): resolves to the Sentry module, already initialised.
export function createErrors({ mode, win, load, idle }) {
  const off = { on: false, context() {}, report() {}, breadcrumb() {}, capture() {}, start() {} };
  if (!mode || !win) return off;
  let sentry = null, loading = false, getTags = () => ({});
  const pending = [];
  let pointer = '';
  const hold = (kind, send) => pending.filter(p => p.kind === kind).length < BUFFER[kind] && pending.push({ kind, send });
  const early = e => {
    if ((e.error ?? e.reason)?.mulassaReported) return; // shown to the player and reported already
    const mechanism = type => ({ mechanism: { type, handled: false } });
    if (e.type === 'unhandledrejection') hold('exception', S => S.captureException(e.reason, mechanism('onunhandledrejection')));
    else if (e.error || (e.message && e.message !== 'Script error.')) hold('exception', S => S.captureException(e.error ?? e.message, mechanism('onerror')));
  };
  const onPointer = e => { pointer = e.pointerType || pointer; };
  win.addEventListener('error', early);
  win.addEventListener('unhandledrejection', early);
  win.addEventListener('pointerdown', onPointer, { capture: true, passive: true });
  const run = (f, kind = 'report') => (sentry ? f(sentry) : hold(kind, f));
  const api = {
    on: true, mode,
    tags() {
      let t = {};
      try { t = getTags() || {}; } catch { /* keep the report */ }
      return { ...t, pointer: pointer || 'none' };
    },
    context(fn) { getTags = fn; },
    // known failures shown to the player (not crashes): one warning each, no personal data, `data` = small tags
    report(kind, data = {}) {
      run(S => S.captureMessage(kind, { level: 'warning', fingerprint: ['mulassa', kind], tags: { issue: kind, ...data } }));
    },
    breadcrumb(kind, data = {}) {
      const timestamp = Date.now() / 1000;
      run(S => S.addBreadcrumb({ category: 'game', message: kind, level: 'info', data, timestamp }), 'breadcrumb');
    },
    capture(error, data = {}) { run(S => S.captureException(error, { tags: data }), 'exception'); },
    start() {
      if (loading) return;
      loading = true;
      (idle || (f => (win.requestIdleCallback ? win.requestIdleCallback(f, { timeout: 4000 }) : win.setTimeout(f, 1000))))(() => {
        Promise.resolve().then(() => load(api)).then(S => {
          win.removeEventListener('error', early); // the SDK's own global handlers take over from here
          win.removeEventListener('unhandledrejection', early);
          sentry = S;
          for (const p of pending.splice(0)) p.send(S);
        }).catch(() => { // blocked or offline: stop listening, keep nothing
          win.removeEventListener('error', early);
          win.removeEventListener('unhandledrejection', early);
          win.removeEventListener('pointerdown', onPointer, { capture: true });
          pending.length = 0;
        });
      });
    },
  };
  win.setTimeout?.(() => api.start(), 12000); // the first frame never came (a crash while starting): send anyway
  return api;
}

import { APP_BUILD } from '../core/version.js';
const env = import.meta.env ?? {};
const w = typeof window === 'undefined' ? null : window;
const DSN = env.VITE_SENTRY_DSN || '';
const MODE = w && errorsMode({ dsn: DSN, hostname: w.location?.hostname, search: w.location?.search, webdriver: w.navigator?.webdriver });

export const errors = createErrors({
  mode: MODE, win: w,
  load: api => import('./sentry-load.js').then(m => m.start(sentryOptions({ dsn: DSN, environment: MODE, tags: api.tags,
    release: `mulassa-tap-tap-dance@${APP_BUILD}` }))),
});
if (MODE === 'development' && w) w.__sentryTest = (msg = 'sentry-test: deliberate test error') => w.setTimeout(() => { throw new Error(msg); });
