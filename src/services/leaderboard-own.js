// What only the signed-in profile reads and writes about itself: its statistics and the one-time sheets it has seen. Spread into
// the leaderboard service (leaderboard.js), which lends its session helpers: client, signedIn (an existing session only), rpc and
// player (a call as the player, that notices a vanished account).
import { fail, translated } from './leaderboard-errors.js';

export function ownRecords({ publishingEnabled, client, signedIn, rpc, player }) {
  return {
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
    // The one-time sheets (src/services/seen-notices.js). owner: the user id they are read or marked for; another session
    // now (a tab switched accounts) and the server refuses (leaderboard_owner_mismatch → 'session'). Plain rpc(), not
    // player(): a refused background mark must never sign out or forget whoever owns the session now.
    async seenNotices(owner) {
      try { return (await rpc(await client(), 'my_seen_notices', { p_owner: owner })) ?? []; } catch (error) { throw translated(error); }
    },
    async markNoticeSeen(id, owner) {
      if (!publishingEnabled) throw fail('disabled');
      try { await rpc(await client(), 'mark_notice_seen', { p_notice: id, p_owner: owner }); } catch (error) { throw translated(error); }
    },
  };
}
