import { tr } from '../i18n/messages.js';
import { LEADERBOARD_VERSION, normalizeAlias, validResult } from './leaderboard-rules.js';
import { DRAC_SCORE_VERSION, BOU_SCORE_VERSION } from '../game/score-scale.js';
import { MOCK_BOARD } from '../core/mock-board.js';
import { ALIAS_MESSAGES } from './alias-rules.js';
import { cleanEmail } from './feedback.js';
export { LEADERBOARD_VERSION, normalizeAlias } from './leaderboard-rules.js';
export { getLeaderboardResult, subscribeLeaderboardResult } from './leaderboard-result.js';

export class LeaderboardError extends Error {
  // detail: what the server said, as codes only (e.g. 'rpc:42883:404', 'auth:captcha_failed:400'), for crash reports
  constructor(code, message, detail = '') { super(message); this.name = 'LeaderboardError'; this.code = code; this.detail = detail; }
}
const messages = {
  disabled: tr('services.board.disabled'), invalid: tr('services.board.invalid'),
  captcha: tr('services.board.captcha'), busy: tr('services.board.busy'),
  rate_limit: tr('services.board.rate_limit'), session: tr('services.board.session'),
  unavailable: tr('services.board.unavailable'),
  // the server answered, and refused: never «connectar» (the connection was fine)
  server: tr('services.board.server'),
  captcha_failed: tr('services.board.captcha_failed'),
  closed: tr('services.board.closed'),
  taken: tr('services.board.taken'),
  // 0015: more points than a perfect run can make (a tampered or buggy client); nothing to fix on the player's side
  ceiling: tr('services.board.ceiling'),
  // the server refused a nickname the client's rules let through (its lists drifted): it doesn't say which part
  blocked: ALIAS_MESSAGES.blocked,
  spaces: ALIAS_MESSAGES.spaces,
  email: tr('services.board.email'),
  code: tr('services.board.code'),
  noprofile: tr('services.board.noprofile'),
  // 202610200001: «Tria el teu nom» (choose_verified_alias) needs the confirmed address; the clean name may be someone's
  verification: tr('services.board.verification'),
  name_taken: tr('services.board.name_taken'),
  season: tr('services.board.season'),
  board: tr('services.board.board'),
  // merge_stats: nothing here is the player's to fix; the sync stays silent and tries again with the next run
  stats: tr('services.board.stats'),
  stats_time: tr('services.board.stats'), // more time than has passed since the last upload: it fits later
  device: tr('services.board.device'),
  gone: tr('services.board.gone'),
};
const fail = (code, detail) => new LeaderboardError(code, messages[code], detail);
export const PAGE = 50; // rows per page of the joint board (the server's cap too)
// The version each figure publishes to now (the board of its current dance); get_seasons takes the figure itself.
export const FIGURE_VERSIONS = Object.freeze({ 'mulassa-valls': LEADERBOARD_VERSION, 'drac-valls': DRAC_SCORE_VERSION, ...(MOCK_BOARD && { 'bou-tradicional-valls': BOU_SCORE_VERSION }) });
export const TAG_KEY = 'leaderboard-tag'; // beside 'leaderboard-alias', which keeps the name WITHOUT the tag (an old tab reads and sends it)
const pad4 = n => String(n).padStart(4, '0');
// «Timbaler#3821» for a guest (a tag), «Timbaler» for a verified profile (no tag); never what is stored under the alias key.
export const displayName = (alias, tag) => (Number.isInteger(tag) && tag >= 0 && tag <= 9999 ? `${alias}#${pad4(tag)}` : String(alias ?? ''));
// The name of a board row without its «#1234» (get_leaderboard_all composes it for old clients; `tag` is the extra column).
export const baseName = (composed, tag) => (Number.isInteger(tag) && String(composed).endsWith(`#${pad4(tag)}`) ? String(composed).slice(0, -5) : String(composed ?? ''));
// This browser's own profile name: the raw alias under ALIAS_KEY ('leaderboard-alias'), the tag under TAG_KEY. Never «name#1234» in the alias.
export function rememberIdentity(kv, aliasKey, { alias, tag = null }) {
  kv.set(aliasKey, baseName(alias, tag));
  if (Number.isInteger(tag)) kv.set(TAG_KEY, String(tag)); else kv.remove?.(TAG_KEY);
}
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
  if (text.includes('leaderboard_alias_taken') || code === '23505') return f('taken'); // one player per nickname (per tag, for guests)
  if (text.includes('leaderboard_rate_limit') || error?.status === 429 || /^over_.*rate_limit$/.test(code)) return f('rate_limit');
  if (text.includes('leaderboard_score_ceiling')) return f('ceiling');
  if (text.includes('leaderboard_verification_required')) return f('verification');
  if (text.includes('leaderboard_season_closed')) return f('season');
  if (text.includes('leaderboard_device_limit')) return f('device');
  if (text.includes('leaderboard_stats_time_limit')) return f('stats_time'); // not bad data: retried once the clock has caught up
  if (/leaderboard_(invalid_stats|invalid_bucket|stats_decreased|invalid_day)/.test(text)) return f('stats');
  if (/leaderboard_invalid_(period|version|season)/.test(text)) return f('board');
  if (text.includes('leaderboard_invalid_alias_spaces')) return f('spaces'); // 0012: an older client sent spaces
  if (text.includes('leaderboard_invalid_alias')) return f('blocked'); // _blocked, or its shape: pick another
  if (text.includes('leaderboard_invalid')) return f('invalid');
  if (text.includes('leaderboard_owner_mismatch')) return f('session'); // the session changed under the request: not this owner's
  if (text.includes('leaderboard_auth_profile_missing')) return f('gone'); // before the generic auth check below
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
  const listeners = new Set();
  // 'changed': this browser's profile (or its absence) may be another one now; 'gone': the server no longer has userId's account
  const emit = event => { for (const f of listeners) try { f(event); } catch { /* a listener never breaks the call */ } };
  let watching = false;
  async function client() {
    if (!configured) throw fail('disabled');
    const c = await getClient();
    // Another tab (or an expiry) may switch this browser's session at any time: supabase-js tells every tab. Deferred: a
    // listener that calls back into auth inside this callback would deadlock the SDK.
    if (!watching && c?.auth?.onAuthStateChange) {
      watching = true;
      c.auth.onAuthStateChange(event => { if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setTimeout(() => emit({ type: 'changed' }), 0); });
    }
    return c;
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
  // an existing session only (reads and the stats sync never create a player)
  async function signedIn(c) {
    const { data, error } = await c.auth.getSession();
    if (error) throw error;
    return data.session;
  }
  async function rpc(c, name, args) {
    const { data, error, status } = await c.rpc(name, args);
    if (error) { if (error.status === undefined) try { error.status = status; } catch { /* frozen: no status */ } throw error; }
    return data;
  }
  // A call as the signed-in player. «No such player» (the account is gone: purged as inactive, or deleted elsewhere) while its
  // token still reads valid for up to an hour: this browser leaves it, so the next try signs in to a new profile.
  async function player(c, name, args) {
    try { return await rpc(c, name, args); } catch (error) {
      const text = String(error?.message ?? '');
      if (text.includes('leaderboard_auth')) {
        let userId = null;
        try { userId = (await c.auth.getSession()).data?.session?.user?.id ?? null; } catch { /* the id is only for the stats layer */ }
        if (text.includes('leaderboard_auth_required')) try { await c.auth.signOut({ scope: 'local' }); } catch { /* the retry reports it */ }
        if (userId) emit({ type: 'gone', userId });
      }
      throw error;
    }
  }
  // the raw rows of get_leaderboard_all, one board per (season, version); p_season only when asked (null = the open one)
  const season = value => (value == null ? {} : { p_season: Math.floor(Number(value)) });
  return Object.freeze({
    configured, publishingEnabled, captchaRequired,
    // Subscribe to account changes (src/services/stats-sync.js): listener({ type: 'changed' | 'gone', userId? }). Returns the unsubscribe.
    onAccount(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    // One all-time board per figure and season, for every level, by score, each player's best, in pages: ranks
    // offset+1 .. offset+limit (at most 50 a call, so a crowded board never loads at once), plus on the first page the caller's
    // row with 5 neighbours each side. `version` (or `figure`: 'mulassa-valls' | 'drac-valls', its current dance) picks the
    // board; `season` a season id (null = the open one; a closed one for the Saló de la fama, the version from seasons()).
    // Rows: { position, alias (guests already «nom#1234»), difficulty (0-2), quality, score, max_combo, is_self, total,
    // verified, tag (null for verified), season_id }. No weekly board (202609280004): p_period is always 'all'.
    async listAll({ version, figure, season: seasonId = null, offset = 0, limit = PAGE } = {}) {
      offset = Math.max(0, Math.floor(Number(offset) || 0)); limit = Math.min(PAGE, Math.max(1, Math.floor(Number(limit) || PAGE)));
      const v = version ?? (figure ? FIGURE_VERSIONS[figure] : LEADERBOARD_VERSION);
      if (!v) return []; // a figure with no board (the Bou): never another figure's
      try {
        return await rpc(await client(), 'get_leaderboard_all', { p_version: v,
          p_period: 'all', p_offset: offset, p_limit: limit, ...season(seasonId) });
      } catch (error) { throw translated(error); }
    },
    // One level's best three on a figure's open board (get_level_podium, 202610210001; the selector's step 2): [{ position
    // (within the level), alias (guests already «nom#1234»), score, quality, is_self, total (players on that level), verified, tag }].
    async levelPodium({ figure, level }) {
      const v = figure ? FIGURE_VERSIONS[figure] : LEADERBOARD_VERSION;
      if (!v) return [];
      try {
        return (await rpc(await client(), 'get_level_podium', { p_version: v, p_difficulty: level })) ?? [];
      } catch (error) { throw translated(error); }
    },
    // The Saló de la fama of a figure (get_seasons): one entry per (season, dance) with results, newest first, season 0 included.
    // { seasonId, name, startsAt (ms), endsAt (ms | null: the open-ended season 0), version (open its board with
    // listAll({ version, season: seasonId })), previousDance (a newer dance of this figure shares the season: «ball anterior»),
    // players, podium: [{ position, alias, tag, name (displayName), score, difficulty, verified }], myPosition, myScore, myDifficulty
    // (the caller's place, points and level there; null if not on it) }.
    async seasons(figure = 'mulassa-valls') {
      try {
        const rows = (await rpc(await client(), 'get_seasons', { p_figure: figure })) ?? [];
        return rows.map(r => ({ seasonId: r.season_id, name: r.name, startsAt: Date.parse(r.starts_at), endsAt: r.ends_at ? Date.parse(r.ends_at) : null,
          version: r.version, previousDance: r.previous_dance === true, players: Number(r.players), myPosition: r.my_position == null ? null : Number(r.my_position),
          myScore: r.my_score == null ? null : Number(r.my_score), myDifficulty: r.my_difficulty == null ? null : Number(r.my_difficulty),
          podium: (r.podium ?? []).map(p => ({ ...p, name: displayName(p.alias, p.tag ?? null) })) }));
      } catch (error) { throw translated(error); }
    },
    // The public card of a player (get_player_card; also for guests: pass the tag). null = no such player with results.
    // { alias, tag, name, verified, totals: { '<figure>/<version>/<level>': { runs, completed, collapsed, seconds, perfect,
    // good, miss, guapa, guapaTotal, balloons, holds, bestCombo, bestStars, best } }, podiums: [{ seasonId, version, position }] }.
    async playerCard(alias, tag = null) {
      const raw = String(alias ?? '');
      if (!raw || (tag != null && !(Number.isInteger(tag) && tag >= 0 && tag <= 9999))) throw fail('invalid');
      try {
        const r = (await rpc(await client(), 'get_player_card', { p_alias: raw, p_tag: tag }))?.[0];
        return r ? { alias: r.alias, tag: r.tag ?? null, name: displayName(r.alias, r.tag ?? null), verified: r.verified === true, totals: r.totals ?? {},
          podiums: (r.podiums ?? []).map(p => ({ seasonId: p.season_id, version: p.version, position: p.position })) } : null;
      } catch (error) { throw translated(error); }
    },
    async identity() {
      try {
        const c = await client(), { data, error } = await c.auth.getSession();
        if (error) throw error;
        // the address only once Supabase Auth confirmed it (a pending change is not the profile's)
        const user = data.session?.user;
        return { hasSession: !!data.session, persistent: c.mulassaPersistentStorage !== false, email: (user?.email_confirmed_at && user.email) || '' };
      } catch (error) { throw translated(error); }
    },
    // The session's user id: the owner of this device's stats (src/services/stats-sync.js). Never shown, never sent anywhere else.
    async ownerId() {
      try { return (await signedIn(await client()))?.user?.id ?? null; } catch (error) { throw translated(error); }
    },
    // Publish a result. No notice any more (the 7-day profiles never shipped). The nickname is the raw alias; a guest's tag
    // stays the one the server gave it. Resolves { improved, quality, score } of the season the result went to.
    async publish(result, alias, { captchaToken } = {}) {
      const normalized = normalizeAlias(alias);
      if (!normalized || !validResult(result)) throw fail('invalid');
      const row = await write(async c => {
        await session(c, captchaToken);
        const data = await player(c, 'submit_result', { p_version: result.version, p_difficulty: result.difficulty,
          p_perfect: result.counts.perfect, p_good: result.counts.good, p_miss: result.counts.miss,
          p_score: result.score, p_max_combo: result.maxCombo, p_alias: normalized });
        return data[0];
      });
      emit({ type: 'changed' });
      return row;
    },
    // A profile before the first result («Crea», src/ui/profile-ui.js): the guest session and its nickname, on no board yet
    // (update_alias creates the row). Resolves the nickname as the server stored it, WITHOUT the tag: read profile() for it.
    async createProfile(alias, { captchaToken } = {}) {
      const normalized = normalizeAlias(alias);
      if (!normalized) throw fail('invalid');
      const stored = await write(async c => { await session(c, captchaToken); return player(c, 'update_alias', { p_alias: normalized }); });
      emit({ type: 'changed' });
      return stored;
    },
    // «Tria el teu nom» (decision 33): a verified profile takes a clean name, no tag. Resolves the stored name. Errors:
    // verification (address not confirmed), name_taken (somebody has that clean name), plus the nickname ones.
    async chooseVerifiedAlias(alias) {
      const normalized = normalizeAlias(alias);
      if (!normalized) throw fail('invalid');
      try {
        return await write(async c => {
          if (!(await signedIn(c))) throw fail('session');
          return player(c, 'choose_verified_alias', { p_alias: normalized });
        });
      } catch (error) { throw error.code === 'taken' ? fail('name_taken', error.detail) : error; }
    },
    // The signed-in profile's own nickname WITHOUT its tag, or null (my_alias): on the board or not.
    async myAlias() {
      try { return (await rpc(await client(), 'my_alias')) || null; } catch (error) { throw translated(error); }
    },
    // The signed-in profile as the server sees it (my_profile), or null (no session or no profile row).
    // { alias (no tag), tag (guests, 0-9999; null for a clean name), verified (an address Supabase Auth confirmed), published }.
    // Show it with displayName(alias, tag); store the alias and tag apart (rememberIdentity).
    async profile() {
      try {
        const c = await client();
        if (!(await signedIn(c))) return null;
        const p = (await rpc(c, 'my_profile'))?.[0];
        return p ? { alias: p.alias, tag: p.tag ?? null, verified: p.verified === true, published: p.published === true } : null;
      } catch (error) { throw translated(error); }
    },
    // Statistics (docs/rankings-strategy.md §7), through src/services/stats-sync.js. syncStats({ device, buckets, days }) is
    // merge_stats: cumulative counters of this device per bucket, and the played days (YYYY-MM-DD); at most once a minute
    // per profile (rate_limit). myStats() is my_stats, the sum over all devices:
    // { buckets (as playerCard totals, plus 'practice': { runs, seconds }), days, daysPlayed, currentStreak, longestStreak } or null.
    // owner: the user id these counters belong to, required: another session (an account switched in another tab) means nothing is
    // sent. The check here can pass and the SDK still sign the request with a newer session, so the server gets the owner too
    // (p_owner) and refuses a mismatch (leaderboard_owner_mismatch → 'session').
    async syncStats({ device, buckets, days, owner }) {
      if (!publishingEnabled) throw fail('disabled');
      try {
        const c = await client(), now = await signedIn(c);
        if (!now || !owner || now.user?.id !== owner) throw fail('session');
        await player(c, 'merge_stats', { p_device: device, p_buckets: buckets, p_days: days, p_owner: owner });
        return { synced: true };
      } catch (error) { throw translated(error); }
    },
    async myStats() {
      try {
        const c = await client();
        if (!(await signedIn(c))) return null;
        const r = (await rpc(c, 'my_stats'))?.[0]; // not player(): a session with no profile yet is no reason to forget anything
        return r ? { buckets: r.buckets ?? {}, days: r.days ?? [], daysPlayed: Number(r.days_played), currentStreak: r.current_streak, longestStreak: r.longest_streak } : null;
      } catch (error) { const t = translated(error); if (t.code === 'gone') return null; throw t; }
    },
    // Profile recovery, no password: an e-mail address on the guest profile, then a 6-digit code sent to it. sendCode()
    // attaches the address to this browser's profile (or, if that address already owns one, signs in to it instead) and
    // returns the `type` verifyCode() needs; verifyCode() finishes it. The address stays in Supabase Auth, never on the board.
    // After a verifyCode that confirmed THIS profile, ask for «Tria el teu nom» (profile().tag is still set until chooseVerifiedAlias).
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
      const out = await write(async c => {
        const { error } = await c.auth.verifyOtp({ email: mail, token, type });
        if (error) throw error;
        return { email: mail };
      });
      emit({ type: 'changed' }); // type 'email' may have switched this browser to another profile
      return out;
    },
    // Leave this browser's profile; it stays on the server (only sensible once an e-mail is on it: sendCode/verifyCode bring it back).
    async signOut() {
      if (writing) throw fail('busy');
      writing = true;
      try {
        const { error } = await (await client()).auth.signOut({ scope: 'local' });
        if (error) throw error;
      } catch (error) { throw translated(error); }
      finally { writing = false; }
      emit({ type: 'changed' });
      return { signedOut: true };
    },
    async deleteProfile() {
      // Deletion must remain available even when publication has been switched off.
      if (writing) throw fail('busy');
      writing = true;
      let userId;
      try {
        const c = await client(), { data, error } = await c.auth.getSession();
        if (error) throw error;
        if (!data.session) throw fail('session');
        userId = data.session.user?.id;
        const deleted = await c.functions.invoke('delete-player', { body: {} });
        if (deleted.error || !deleted.data?.deleted) throw deleted.error ?? fail('unavailable');
        await c.auth.signOut({ scope: 'local' });
      } catch (error) { throw translated(error); }
      finally { writing = false; }
      if (userId) emit({ type: 'gone', userId }); // decision 31: its statistics go too
      emit({ type: 'changed' });
      return { deleted: true };
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
