// MANUAL tool, never scheduled: profiles are kept until the player deletes them (the privacy sheet says so), so there is
// no automatic retention cleanup. Run it only if the owner decides to prune anonymous accounts inactive for 12 months (e.g.
// orphan sessions that never published), from a trusted admin environment, after telling players. Dry-run is the
// default; no IDs/tokens are logged.
import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the admin environment.'); process.exit(1); }
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const execute = process.argv.includes('--execute');
try {
  let deleted = 0, batches = 0;
  do {
    batches++;
    const { data, error } = await admin.rpc('leaderboard_expired_players', { p_limit: 100 });
    if (error) throw new Error('Could not enumerate expired profiles.');
    if (!execute) { console.log(`Dry-run: ${data.length} expired anonymous accounts in the first batch (maximum 100). No deletions.`); break; }
    if (!data.length) { console.log(`Deleted ${deleted} expired anonymous accounts.`); break; }
    for (const player of data) {
      // Re-check after enumeration in case the account just became active or permanent.
      const { data: verified, error: verifyError } = await admin.auth.admin.getUserById(player.user_id);
      if (verifyError) throw new Error('Could not verify an expired account.');
      const cutoff = new Date(); cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
      if (!verified.user.is_anonymous || new Date(verified.user.last_sign_in_at || verified.user.created_at) >= cutoff) continue;
      const current = await admin.rpc('leaderboard_expired_players', { p_limit: 1000 });
      if (current.error) throw new Error('Could not re-check retention eligibility.');
      if (!current.data.some(p => p.user_id === player.user_id)) continue;
      const removed = await admin.auth.admin.deleteUser(player.user_id);
      if (removed.error) throw new Error('Could not delete an expired account.');
      deleted++;
    }
    // Bound one maintenance run; run it again for the rest.
  } while (deleted < 1000 && batches < 10);
  if (deleted >= 1000) console.log('Deleted 1000 expired accounts; run again for remaining accounts.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
