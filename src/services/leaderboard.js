import { LEADERBOARD_VERSION, normalizeAlias, validResult } from './leaderboard-rules.js';
import { ALIAS_MESSAGES } from './alias-rules.js';
import { cleanEmail } from './feedback.js';
export { LEADERBOARD_VERSION, normalizeAlias } from './leaderboard-rules.js';
export { getLeaderboardResult, subscribeLeaderboardResult } from './leaderboard-result.js';

export class LeaderboardError extends Error {
  // detail: what the server said, as codes only (e.g. 'rpc:42883:404', 'auth:captcha_failed:400'), for crash reports
  constructor(code, message, detail = '') { super(message); this.name = 'LeaderboardError'; this.code = code; this.detail = detail; }
}
const messages = {
  disabled: 'La classificació no està disponible.', invalid: 'Revisa el sobrenom i el resultat.',
  captcha: 'Completa la verificació per publicar el resultat.', busy: 'Espera que acabi l’enviament.',
  rate_limit: 'Espera uns segons abans de tornar-ho a provar.', session: 'La sessió ha caducat. Torna-ho a provar.',
  unavailable: 'No s’ha pogut connectar amb la classificació. Revisa la connexió i torna-ho a provar.',
  // the server answered, and refused: never «connectar» (the connection was fine)
  server: 'La classificació ha fallat per un error nostre. Torna-ho a provar més tard.',
  captcha_failed: 'Cloudflare no ha confirmat la verificació. Torna-ho a provar.',
  closed: 'Ara mateix no es poden crear perfils nous. Torna-ho a provar més tard.',
  taken: 'Aquest sobrenom ja és d’algú. Prova’n un altre.',
  // 0015: more points than a perfect run can make (a tampered or buggy client); nothing to fix on the player's side
  ceiling: 'Aquesta puntuació supera el màxim possible del nivell i no es pot publicar.',
  // the server refused a nickname the client's rules let through (its lists drifted): it doesn't say which part
  blocked: ALIAS_MESSAGES.blocked,
  spaces: ALIAS_MESSAGES.spaces,
  email: 'Revisa l’adreça de correu.',
  code: 'El codi no és correcte o ha caducat. Demana’n un de nou.',
  noprofile: 'No hi ha cap perfil amb aquest correu.',
};
const fail = (code, detail) => new LeaderboardError(code, messages[code], detail);
export const PAGE = 50; // rows per page of the joint board (the server's cap too)
// Codes only, never the provider's text (it may quote the alias): where it failed, its code, its HTTP status.
function detailOf(error) {
  const name = String(error?.name ?? '');
  const where = /^Auth/.test(name) ? 'auth' : /^Functions/.test(name) ? 'fn' : error?.status !== undefined || error?.code !== undefined ? 'rpc' : 'js';
  const code = String(error?.code ?? '').replace(/[^\w.-]/g, '').slice(0, 40);
  const status = error?.status ?? error?.context?.status;
  return [where, code || name.replace(/[^\w]/g, '').slice(0, 40) || 'Error', status ?? ''].join(':').replace(/:$/, '');
}
// A network failure (no answer at all): fetch threw, supabase-js reports status 0 or a retryable fetch error.
function unreachable(error) {
  const name = String(error?.name ?? '');
  if (name === 'AuthRetryableFetchError' || name === 'FunctionsFetchError') return true;
  const status = error?.status ?? error?.context?.status;
  if (status === 0) return true;
  if (status === undefined && !error?.code) return true; // a plain exception (fetch TypeError, the SDK failing to load)
  return false;
}
function translated(error) {
  if (error instanceof LeaderboardError) return error;
  const text = String(error?.message ?? ''), code = String(error?.code ?? ''), detail = detailOf(error);
  const f = c => fail(c, detail);
  if (text.includes('leaderboard_alias_taken') || code === '23505') return f('taken'); // one player per nickname
  if (text.includes('leaderboard_rate_limit') || error?.status === 429 || /^over_.*rate_limit$/.test(code)) return f('rate_limit');
  if (text.includes('leaderboard_score_ceiling')) return f('ceiling');
  if (text.includes('leaderboard_invalid_alias_spaces')) return f('spaces'); // 0012: an older client sent spaces
  if (text.includes('leaderboard_invalid_alias')) return f('blocked'); // _blocked, or its shape: pick another
  if (text.includes('leaderboard_invalid')) return f('invalid');
  if (text.includes('leaderboard_auth') || error?.status === 401 || /^(session_|refresh_token_|bad_jwt$|PGRST30[123]$)/.test(code)) return f('session');
  if (code === 'otp_expired') return f('code'); // a wrong or old code (GoTrue says the same for both)
  if (code === 'otp_disabled' || code === 'user_not_found') return f('noprofile'); // sign-in by code never creates a profile
  if (code === 'email_address_invalid' || code === 'validation_failed') return f('email');
  if (code === 'captcha_failed' || /captcha/i.test(text)) return f('captcha_failed'); // Supabase refused the token
  if (code === 'anonymous_provider_disabled' || code === 'signup_disabled') return f('closed');
  return f(unreachable(error) ? 'unavailable' : 'server');
}

// Dependency injection keeps network and auth contracts testable without a browser or credentials.
export function createLeaderboardService({ configured, publishingEnabled, captchaRequired, getClient }) {
  let writing = false;
  async function client() {
    if (!configured) throw fail('disabled');
    return getClient();
  }
  async function write(action) {
    if (!publishingEnabled) throw fail('disabled');
    if (writing) throw fail('busy');
    writing = true;
    try { return await action(await client()); } catch (error) { throw translated(error); }
    finally { writing = false; }
  }
  async function session(c, captchaToken) {
    const { data, error } = await c.auth.getSession();
    if (error) throw error;
    if (data.session) return data.session;
    if (captchaRequired && !captchaToken) throw fail('captcha');
    const signed = await c.auth.signInAnonymously({ options: { captchaToken } });
    if (signed.error) throw signed.error;
    if (!signed.data.session) throw fail('session');
    return signed.data.session;
  }
  async function rpc(c, name, args) {
    const { data, error, status } = await c.rpc(name, args);
    if (error) { if (error.status === undefined) try { error.status = status; } catch { /* frozen: no status */ } throw error; }
    return data;
  }
  return Object.freeze({
    configured, publishingEnabled, captchaRequired,
    // One all-time board for every level, by score, each player's best, in pages: ranks offset+1 .. offset+limit (at most
    // 50 a call, so a crowded board never loads at once), plus on the first page the caller's row with 5 neighbours each
    // side; every row with `difficulty` (0-2) and `total` (ranked players). No weekly board (202609280004): p_period is
    // always 'all'.
    async listAll({ offset = 0, limit = PAGE } = {}) {
      offset = Math.max(0, Math.floor(Number(offset) || 0)); limit = Math.min(PAGE, Math.max(1, Math.floor(Number(limit) || PAGE)));
      try {
        return await rpc(await client(), 'get_leaderboard_all', { p_version: LEADERBOARD_VERSION, p_period: 'all', p_offset: offset, p_limit: limit });
      } catch (error) { throw translated(error); }
    },
    async identity() {
      try {
        const c = await client(), { data, error } = await c.auth.getSession();
        if (error) throw error;
        return { hasSession: !!data.session, persistent: c.mulassaPersistentStorage !== false, email: data.session?.user?.email || '' };
      } catch (error) { throw translated(error); }
    },
    async publish(result, alias, { captchaToken } = {}) {
      const normalized = normalizeAlias(alias);
      if (!normalized || !validResult(result)) throw fail('invalid');
      return write(async c => {
        await session(c, captchaToken);
        const data = await rpc(c, 'submit_result', { p_version: result.version, p_difficulty: result.difficulty,
          p_perfect: result.counts.perfect, p_good: result.counts.good, p_miss: result.counts.miss,
          p_score: result.score, p_max_combo: result.maxCombo, p_alias: normalized });
        return data[0];
      });
    },
    // A profile before the first result («Crea», src/ui/profile-ui.js): the guest session and its nickname, on no board yet
    // (update_alias creates the row since 202609300002). Returns the nickname as the server stored it.
    async createProfile(alias, { captchaToken } = {}) {
      const normalized = normalizeAlias(alias);
      if (!normalized) throw fail('invalid');
      return write(async c => { await session(c, captchaToken); return rpc(c, 'update_alias', { p_alias: normalized }); });
    },
    // The signed-in profile's own nickname, or null (my_alias, 202609300002): on the board or not.
    async myAlias() {
      try { return (await rpc(await client(), 'my_alias')) || null; } catch (error) { throw translated(error); }
    },
    // Profile recovery, no password: an e-mail address on the guest profile, then a 6-digit code sent to it. sendCode()
    // attaches the address to this browser's profile (or, if that address already owns one, signs in to it instead) and
    // returns the `type` verifyCode() needs; verifyCode() finishes it. The address stays in Supabase Auth, never on the board.
    async sendCode(email, { captchaToken } = {}) {
      const mail = cleanEmail(email);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) throw fail('email');
      return write(async c => {
        const { data, error } = await c.auth.getSession();
        if (error) throw error;
        if (data.session) {
          const up = await c.auth.updateUser({ email: mail });
          if (!up.error) return { type: 'email_change' };
          if (up.error.code !== 'email_exists') throw up.error;
        }
        if (captchaRequired && !captchaToken) throw fail('captcha');
        const { error: otpError } = await c.auth.signInWithOtp({ email: mail, options: { shouldCreateUser: false, captchaToken } });
        if (otpError) throw otpError;
        return { type: 'email' };
      });
    },
    async verifyCode(email, code, type) {
      const mail = cleanEmail(email), token = String(code ?? '').replace(/\D/g, '');
      if (token.length !== 6 || !['email', 'email_change'].includes(type)) throw fail('code');
      return write(async c => {
        const { error } = await c.auth.verifyOtp({ email: mail, token, type });
        if (error) throw error;
        return { email: mail };
      });
    },
    // Leave this browser's profile; it stays on the server (only sensible once an e-mail is on it: sendCode/verifyCode bring it back).
    async signOut() {
      if (writing) throw fail('busy');
      writing = true;
      try {
        const { error } = await (await client()).auth.signOut({ scope: 'local' });
        if (error) throw error;
        return { signedOut: true };
      } catch (error) { throw translated(error); }
      finally { writing = false; }
    },
    async deleteProfile() {
      // Deletion must remain available even when publication has been switched off.
      if (writing) throw fail('busy');
      writing = true;
      try {
        const c = await client(), { data, error } = await c.auth.getSession();
        if (error) throw error;
        if (!data.session) throw fail('session');
        const deleted = await c.functions.invoke('delete-player', { body: {} });
        if (deleted.error || !deleted.data?.deleted) throw deleted.error ?? fail('unavailable');
        await c.auth.signOut({ scope: 'local' });
        return { deleted: true };
      } catch (error) { throw translated(error); }
      finally { writing = false; }
    },
  });
}

const env = import.meta.env ?? {};
let clientPromise;
async function getClient() {
  if (!clientPromise) clientPromise = import('@supabase/supabase-js').then(({ createClient }) => {
    let storage, persistent = false;
    try {
      storage = globalThis.localStorage;
      const key = 'mulassa-storage-probe'; storage.setItem(key, '1'); storage.removeItem(key);
      persistent = true;
    } catch { storage = undefined; }
    const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: persistent, storage, storageKey: 'mulassa-leaderboard-session', detectSessionInUrl: false },
    });
    c.mulassaPersistentStorage = persistent;
    return c;
  }).catch(error => { clientPromise = null; throw error; });
  return clientPromise;
}
export const leaderboard = createLeaderboardService({
  configured: !!(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY),
  publishingEnabled: env.VITE_LEADERBOARD_PUBLISHING_ENABLED === 'true',
  captchaRequired: env.VITE_LEADERBOARD_CAPTCHA_REQUIRED !== 'false', getClient,
});
export const turnstileSiteKey = env.VITE_TURNSTILE_SITE_KEY || '';
