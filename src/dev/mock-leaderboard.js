// The in-memory leaderboard behind ?final, ?mock and ?demo (dev hosts only, gated by src/dev/final-test.js): the real
// service (src/services/leaderboard.js) over a fake Supabase client. The client and its seeded world (mock-client.js,
// demo-data.js) load on the service's first call, in their own chunk, so the published game never downloads them.
import { createLeaderboardService } from '../services/leaderboard.js';

// the demo account: none | guest with no result | guest | confirmed address, still «nom#tag» | confirmed, clean name
export const ACCOUNTS = ['new', 'reserved', 'guest', 'verified-unnamed', 'verified'];
export const OTHER_MAIL = 'ocupat@exemple.cat', MOCK_CODE = '123456';
export const DEMO_SELF = Object.freeze({ alias: 'Prova123', tag: 4821 }); // the signed-in demo account (ALIAS_KEY / TAG_KEY of the mock)

// Options: see mockLeaderboardClient (src/dev/mock-client.js).
export function mockLeaderboard(options = {}) {
  let client = null;
  const getClient = () => (client ??= import('./mock-client.js').then(m => m.mockLeaderboardClient(options)));
  return createLeaderboardService({ configured: true, publishingEnabled: true, captchaRequired: false, getClient });
}
