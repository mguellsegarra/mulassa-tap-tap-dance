// «Bústia de la plaça»: a message (and an optional e-mail for the answer) to the mulassa-feedback Worker (workers/feedback,
// VITE_FEEDBACK_URL), which checks the Turnstile token and e-mails it to the project (nothing stored). The same limits as the
// server; its error codes in Catalan. The sheet is src/ui/feedback-ui.js.
import { tr } from '../i18n/messages.js';
import { fmtNum } from '../i18n/format.js';
export const MESSAGE_MIN = 5, FIGURE_MESSAGE_MIN = 20, MESSAGE_MAX = 1000, EMAIL_MAX = 254, ENTITY_MAX = 80;
// A practical address: the usual local-part characters, one @, a domain of dot-separated labels (letters, digits,
// inner hyphens) ending in a 2+ letter TLD. The Worker checks the same (and no spaces or line breaks can ever
// reach an e-mail header).
export const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
// while typing: drop what an address can't contain (spaces, accents, quotes…), keep the rest for the check
export const cleanEmail = v => String(v ?? '').replace(/[^A-Za-z0-9.!#$%&'*+/=?^_`{|}~@-]/g, '').slice(0, EMAIL_MAX);
export const chars = s => [...s].length; // code points, like the server (an emoji is one)

export class FeedbackError extends Error {
  constructor(code, message) { super(message); this.name = 'FeedbackError'; this.code = code; }
}
const messages = {
  invalid_message: tr('services.feedback.invalid_message', { min: MESSAGE_MIN, max: fmtNum(MESSAGE_MAX) }),
  captcha: tr('services.feedback.captcha'),
  rate_limit: tr('services.feedback.rate_limit'),
  auth_required: tr('ui.confirm.expired'),
  offline: tr('services.feedback.offline'),
  unavailable: tr('ui.feedback.sendFailed'),
};
const fail = code => new FeedbackError(code, messages[code] ?? messages.unavailable);

// { ok } or { field: 'message' | 'email', message }; trims both
export function checkFeedback(message, min = MESSAGE_MIN) {
  const m = String(message ?? '').trim();
  if (chars(m) < min || chars(m) > MESSAGE_MAX) return { field: 'message', message: messages.invalid_message };
  return { ok: true, message: m };
}

import { APP_BUILD } from '../core/version.js';
const env = import.meta.env ?? {};

// enabled: VITE_FEEDBACK_ENABLED=true once the Worker can deliver (secrets set, destination verified); until then (or
// without VITE_FEEDBACK_URL) no button, no bubble (a box that can't deliver would lose messages).
export function createFeedback({ url = env.VITE_FEEDBACK_URL, enabled = env.VITE_FEEDBACK_ENABLED === 'true',
  fetchFn = (...a) => fetch(...a), online = () => globalThis.navigator?.onLine !== false, version = APP_BUILD } = {}) {
  return Object.freeze({
    configured: Boolean(url && enabled),
    async send({ kind = 'general', game = '', figure = null, options = [], entity = '', message, token, accessToken }) {
      const ok = checkFeedback(message, kind === 'general' ? MESSAGE_MIN : FIGURE_MESSAGE_MIN);
      if (!ok.ok) throw fail('invalid_message');
      if (!online()) throw fail('offline');
      let res;
      try {
        // the Worker asks Supabase Auth who this is: the reply address comes from there, never from the client
        res = await fetchFn(url, {
          method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ kind, ...(game && { game }), figure, options, entity, message: ok.message, turnstileToken: token, version }),
        });
      } catch { throw fail('offline'); } // no answer at all: the connection (or a blocker)
      if (res.ok) return true;
      let code = null;
      try { code = (await res.json())?.error; } catch { /* not JSON: a gateway page */ }
      if (code === 'invalid') code = 'invalid_message';
      throw fail(messages[code] || code === 'daily_limit' ? code : res.status === 429 ? 'rate_limit' : 'unavailable');
    },
  });
}
export const feedback = createFeedback();
