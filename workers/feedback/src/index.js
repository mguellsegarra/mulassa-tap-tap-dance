import { EmailMessage } from 'cloudflare:email';

// «Bústia de la plaça» (src/services/feedback.js): POST { kind, figure?, options?, entity?, message, turnstileToken, version } with a Supabase bearer → 200 { ok: true } or 4xx/5xx
// { error: code } (src/services/feedback.js maps the codes to Catalan). The session, Turnstile, then the message goes straight to the owner's
// inbox as one plain-text e-mail through Email Routing's send_email binding (env.MAIL, wrangler.toml). Nothing is stored
//: if sending fails, the player sees «Torna-ho a provar».
// Vars: ALLOWED_ORIGINS, FEEDBACK_FROM, DAILY_MAX, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY. Secrets: TURNSTILE_SECRET_KEY, FEEDBACK_TO (a verified Email Routing
// destination of the account; a secret so no personal address lives in the repo). Bindings: MAIL, PER_IP + ALL (rate
// limits), DAILY (KV: the day's e-mail count). Tests: tests/services/feedback.mjs.
// Abuse, cheapest first: Turnstile (single use, its hostname must be one of ours), then 3/min per IP (binding) + 3/10 min
// per IP (isolate memory), 10/min in total, and at most DAILY_MAX e-mails a day: even a Turnstile bypass can't flood the inbox.
const MIN = 5, FIGURE_MIN = 20, MAX = 1000, EMAIL_MAX = 254, ENTITY_MAX = 80, USER_DAILY_MAX = 3;
// what each kind may carry, and the words the e-mail uses: nothing the client sends reaches the subject unchecked
const KINDS = {
  general: { tag: 'BÚSTIA', min: MIN },
  material: { tag: 'MATERIAL', min: FIGURE_MIN, options: { photos: 'fotos o vídeos', music: 'partitura', dance: 'sap el ball' } },
  entity: { tag: 'COLLA', min: FIGURE_MIN, options: { colla: 'colla', institution: 'ajuntament o entitat', business: 'empresa o comerç' } },
};
const oneLine = (v, max) => [...(typeof v === 'string' ? v : '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim()].slice(0, max).join('');
// Supabase Auth says who holds this token. A guest's session is valid too: only a confirmed address counts.
async function confirmedUser(env, bearer) {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${bearer}` } });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`auth ${res.status}`);
  const user = await res.json();
  return user?.id && !user.is_anonymous && user.email_confirmed_at && EMAIL.test(user.email ?? '') ? user : null;
}
const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/; // = src/services/feedback.js
const chars = s => [...s].length;
// per-isolate memory (3 messages per IP per 10 min): the rate-limit bindings only count per minute
const recent = new Map();
const limited = (ip, now = Date.now()) => {
  const hits = (recent.get(ip) || []).filter(t => now - t < 600_000);
  if (hits.length >= 3) return true;
  hits.push(now); recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return false;
};

// --- MIME by hand: UTF-8 → base64 (body wrapped at 76), RFC 2047 encoded-words for non-ASCII headers
const base64 = s => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
// RFC 2047: each encoded-word at most 75 characters, so a long subject becomes several words on folded lines
// (chunks of whole characters, <= 45 UTF-8 bytes → 60 base64 + 12). FOLD is the only line break a header may carry.
const FOLD = '\r\n ';
const word = s => {
  if (/^[\x20-\x7e]*$/.test(s)) return s;
  const words = []; let chunk = '';
  for (const ch of s) {
    if (new TextEncoder().encode(chunk + ch).length > 45) { words.push(chunk); chunk = ''; }
    chunk += ch;
  }
  if (chunk) words.push(chunk);
  return words.map(w => `=?UTF-8?B?${base64(w)}?=`).join(FOLD);
};
function mime({ from, to, replyTo, subject, text, date = new Date(), id = crypto.randomUUID() }) {
  const headers = [
    `From: Mulassa Tap Tap Dance <${from}>`, `To: ${from}`, ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
    `Subject: ${word(subject)}`, `Date: ${date.toUTCString().replace(/GMT$/, '+0000')}`, `Message-ID: <${id}@mulassa.cat>`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64',
  ];
  if ([...headers, to].some(h => /[\r\n]/.test(h.split(FOLD).join(' ')))) throw new Error('line break in a header'); // only our own folds
  const body = base64(text.replace(/\r?\n/g, '\r\n')).replace(/.{76}(?=.)/g, '$&\r\n');
  return `${headers.join('\r\n')}\r\n\r\n${body}\r\n`;
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('origin');
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const cors = { 'Access-Control-Allow-Headers': 'content-type, authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400', 'Vary': 'Origin' };
    if (origin && allowed.includes(origin)) cors['Access-Control-Allow-Origin'] = origin;
    const reply = (status, body) => Response.json(body, { status, headers: cors });
    if (origin && !allowed.includes(origin)) return reply(403, { error: 'origin_not_allowed' });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

    const turnstileSecret = env.TURNSTILE_SECRET_KEY, from = env.FEEDBACK_FROM, to = env.FEEDBACK_TO?.trim();
    const dailyMax = Number(env.DAILY_MAX);
    if (!turnstileSecret || !from || !to || !env.MAIL || !env.PER_IP || !env.ALL || !env.DAILY || !(dailyMax > 0) || !env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY)
      return reply(503, { error: 'not_configured' });
    // Cloudflare sets CF-Connecting-IP itself (X-Forwarded-For is whatever the client sent)
    const ip = req.headers.get('cf-connecting-ip') || 'unknown';

    // --- the body: small JSON, lengths checked before anything costs a request
    let body;
    try {
      // at most 8000 bytes off the stream: Content-Length can lie and req.text() would buffer whatever comes
      const reader = req.body?.getReader(), chunks = [];
      let size = 0;
      for (let r = reader && await reader.read(); r && !r.done; r = await reader.read()) {
        size += r.value.length;
        if (size > 8000) { reader.cancel().catch(() => {}); return reply(413, { error: 'invalid' }); }
        chunks.push(r.value);
      }
      const all = new Uint8Array(size);
      chunks.reduce((at, c) => (all.set(c, at), at + c.length), 0);
      body = JSON.parse(await new Response(all).text());
    } catch { return reply(400, { error: 'invalid' }); }
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const token = typeof body?.turnstileToken === 'string' ? body.turnstileToken : '';
    const version = typeof body?.version === 'string' ? body.version.slice(0, 64) : '';
    const kind = KINDS[body?.kind] && Object.hasOwn(KINDS, body.kind) ? body.kind : null, rules = KINDS[kind];
    if (!rules) return reply(400, { error: 'invalid' });
    if (chars(message) < rules.min || chars(message) > MAX) return reply(400, { error: 'invalid_message' });
    const options = Array.isArray(body.options) ? [...new Set(body.options)] : [];
    if (options.some(o => !rules.options || !Object.hasOwn(rules.options, o))) return reply(400, { error: 'invalid' });
    if (kind === 'material' && !options.length) return reply(400, { error: 'invalid' });
    if (kind === 'entity' && options.length !== 1) return reply(400, { error: 'invalid' });
    const entity = kind === 'entity' ? oneLine(body.entity, ENTITY_MAX) : '';
    if (kind === 'entity' && !entity) return reply(400, { error: 'invalid' });
    const figure = kind === 'general' ? '' : oneLine(body.figure?.name, 80);
    if (kind === 'material' && !figure) return reply(400, { error: 'invalid' });

    // --- who writes: no session, no message (a 1.2.6 client never gets here: without `kind` it stopped above, so it keeps its own Worker, wrangler.toml). The address is the confirmed one.
    const bearer = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
    if (!bearer || bearer.length > 4096) return reply(401, { error: 'auth_required' });
    let user;
    try { user = await confirmedUser(env, bearer); } catch (err) {
      console.error('[mulassa-feedback] auth failed', String(err?.message || err).slice(0, 200));
      return reply(503, { error: 'unavailable' });
    }
    if (!user) return reply(401, { error: 'auth_required' });
    const email = user.email;
    const userDay = `user:${user.id}:${new Date().toISOString().slice(0, 10)}`;
    let sent;
    try { sent = Number(await env.DAILY.get(userDay)) || 0; } catch { return reply(503, { error: 'unavailable' }); }
    if (sent >= USER_DAILY_MAX) return reply(429, { error: 'daily_limit' });
    if (!token || token.length > 2048) return reply(403, { error: 'captcha' });

    // --- Turnstile (server side: the token is single use). A urlencoded form, as Cloudflare documents it.
    let verdict = null;
    try {
      const check = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: turnstileSecret, response: token, ...(ip !== 'unknown' ? { remoteip: ip } : {}) }),
      });
      // Cloudflare answers a refused token with 200 or 400, both with a JSON verdict: read it either way
      verdict = await check.json().catch(() => null);
      if (!verdict || !verdict.success) console.error('[mulassa-feedback] siteverify', check.status, JSON.stringify(verdict?.['error-codes'] ?? null));
      if (verdict && typeof verdict.success !== 'boolean') verdict = null;
    } catch (err) { console.error('[mulassa-feedback] siteverify failed', String(err)); }
    if (!verdict) return reply(503, { error: 'unavailable' });
    if (!verdict.success) return reply(403, { error: 'captcha' });
    // a token solved on someone else's page (our site key copied elsewhere) is no proof of a player here
    const hosts = allowed.map(o => { try { return new URL(o).hostname; } catch { return ''; } });
    if (!hosts.includes(verdict.hostname)) {
      console.error('[mulassa-feedback] siteverify hostname', String(verdict.hostname).slice(0, 100));
      return reply(403, { error: 'captcha' });
    }

    // --- rate limits, after Turnstile (a refused captcha costs nothing). Binding outages fail closed.
    try {
      if (limited(ip) || !(await env.PER_IP.limit({ key: ip })).success) return reply(429, { error: 'rate_limit' });
      if (!(await env.ALL.limit({ key: 'all' })).success) return reply(429, { error: 'rate_limit' });
      const day = `mails:${new Date().toISOString().slice(0, 10)}`, count = Number(await env.DAILY.get(day)) || 0;
      if (count >= dailyMax) { console.error('[mulassa-feedback] daily cap reached', count); return reply(429, { error: 'rate_limit' }); }
      await env.DAILY.put(day, String(count + 1), { expirationTtl: 172800 }); // counted before sending: fail towards fewer mails
      await env.DAILY.put(userDay, String(sent + 1), { expirationTtl: 172800 }); // KV is not atomic: two at once can overshoot by one
    } catch (err) {
      console.error('[mulassa-feedback] limits failed', String(err?.message || err).slice(0, 200));
      return reply(503, { error: 'unavailable' });
    }

    // --- the e-mail: plain text only (nothing the player wrote is ever rendered as HTML, nor put in a header)
    const when = new Date().toLocaleString('ca-ES', { timeZone: 'Europe/Madrid' });
    const detail = rules.options ? options.map(o => rules.options[o]).join(', ') : '';
    const text = [...(figure ? [`Figura: ${figure}`] : []), ...(detail ? [`Marca: ${detail}`] : []), ...(entity ? [`Entitat: ${entity}`] : []),
      ...(figure || detail || entity ? [''] : []), message, '', '—', `Correu confirmat: ${email}`, `Quan: ${when}`,
      `Versió: ${version || '?'}`, `Navegador: ${(req.headers.get('user-agent') || '?').slice(0, 160)}`].join('\n');
    try {
      // one subject per message (Gmail threads equal subjects): the time and the message's first words
      const short = new Date().toLocaleString('ca-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
      const words = message.replace(/\s+/g, ' ').trim(), gist = [...words].length > 40 ? [...words].slice(0, 40).join('').trimEnd() + '…' : words;
      const raw = mime({ from, to, replyTo: email, subject: `[${rules.tag}] ${figure ? `${figure} · ` : ''}${detail ? `${detail} · ` : ''}${short} · ${gist}`, text });
      await env.MAIL.send(new EmailMessage(from, to, raw));
    } catch (err) {
      console.error('[mulassa-feedback] send failed', String(err?.message || err).slice(0, 200));
      await env.DAILY.put(userDay, String(sent), { expirationTtl: 172800 }).catch(() => {}); // a mail that never left costs nothing
      return reply(503, { error: 'unavailable' });
    }
    return reply(200, { ok: true });
  },
};
