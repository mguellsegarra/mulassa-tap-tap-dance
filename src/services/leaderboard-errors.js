// The leaderboard's errors: a code the sheets turn into Catalan copy (tr), from whatever the SDK or the server threw.
import { tr } from '../i18n/messages.js';
import { ALIAS_MESSAGES } from './alias-rules.js';
import { errors } from './errors.js';

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
  season: tr('services.board.season'),
  board: tr('services.board.board'),
  // merge_stats: nothing here is the player's to fix; the sync stays silent and tries again with the next run
  stats: tr('services.board.stats'),
  stats_time: tr('services.board.stats'), // more time than has passed since the last upload: it fits later
  device: tr('services.board.device'),
  gone: tr('services.board.gone'),
};
export const fail = (code, detail) => new LeaderboardError(code, messages[code], detail);
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
export function translated(error) {
  if (error instanceof LeaderboardError) return error;
  const text = String(error?.message ?? ''), code = String(error?.code ?? ''), detail = detailOf(error);
  const f = c => fail(c, detail);
  if (text.includes('leaderboard_alias_taken') || code === '23505') return f('taken'); // one active profile per nickname
  if (text.includes('leaderboard_rate_limit') || error?.status === 429 || /^over_.*rate_limit$/.test(code)) return f('rate_limit');
  if (text.includes('leaderboard_score_ceiling')) return f('ceiling');
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
// Crash reports get service failures only (a code, never the alias): the player's own mistakes and limits are expected.
// `server`: the provider's own codes and HTTP status (LeaderboardError.detail, e.g. 'rpc:42883:404'), no text.
export const boardIssue = (kind, e) => {
  if (['invalid', 'blocked', 'taken', 'busy', 'rate_limit'].includes(e?.code)) return;
  errors.report(kind, { code: e?.code || e?.name || 'Error', ...(e?.detail && { server: String(e.detail).slice(0, 64) }) });
};
