import { LEADERBOARD_VERSION, normalizeAlias, validResult } from './leaderboard-rules.js';
import { DRAC_SCORE_VERSION, BOU_SCORE_VERSION } from '../game/score-scale.js';
import { MOCK_BOARD } from '../core/mock-board.js';
import { fail, translated } from './leaderboard-errors.js';
import { displayName } from './leaderboard-identity.js';
import { getClient } from './supabase-client.js';
import { cleanEmail } from './feedback.js';
export { LEADERBOARD_VERSION, normalizeAlias } from './leaderboard-rules.js';
export { getLeaderboardResult, subscribeLeaderboardResult } from './leaderboard-result.js';

const env = import.meta.env ?? {};
export const PAGE = 50; // rows per page of the joint board (the server's cap too)
// The version each figure publishes to now (the board of its current dance); get_seasons takes the figure itself.
export const FIGURE_VERSIONS = Object.freeze({ 'mulassa-valls': LEADERBOARD_VERSION, 'drac-valls': DRAC_SCORE_VERSION, ...(MOCK_BOARD && { 'bou-tradicional-valls': BOU_SCORE_VERSION }) });

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
    // Statistics (docs/rankings/strategy.md §7), through src/services/stats-sync.js. syncStats({ device, buckets, days }) is
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

export const leaderboard = createLeaderboardService({
  configured: !!(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY),
  publishingEnabled: env.VITE_LEADERBOARD_PUBLISHING_ENABLED === 'true',
  captchaRequired: env.VITE_LEADERBOARD_CAPTCHA_REQUIRED !== 'false', getClient,
});
export const turnstileSiteKey = env.VITE_TURNSTILE_SITE_KEY || '';
