// The in-memory leaderboard behind ?final, ?mock and ?demo (dev hosts only, gated by src/dev/final-test.js): the real
// service (src/services/leaderboard.js) over a fake Supabase client. The client and its seeded world (mock-client.js,
// demo-data.js) load on the service's first call, in their own chunk, so the published game never downloads them.
import { createLeaderboardService } from '../services/leaderboard.js';

// the demo account: none | guest with no result | guest | released guest (its name went to somebody else) | confirmed address
export const ACCOUNTS = ['new', 'reserved', 'guest', 'released', 'verified'];
export const OTHER_MAIL = 'ocupat@exemple.cat', MOCK_CODE = '123456';
export const DEMO_SELF = Object.freeze({ alias: 'Prova123' }); // the signed-in demo account (ALIAS_KEY of the mock)
// A made-up public_id, stable per name (the mock's cast has one profile per name): ?card=<Name> opens a card without the world
export function demoPublicId(alias) {
  let h = 0x811c9dc5, hex = '';
  for (let round = 0; hex.length < 32; round++) {
    for (const c of `${round}${String(alias).toLowerCase()}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    hex += (h >>> 0).toString(16).padStart(8, '0');
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// Options: see mockLeaderboardClient (src/dev/mock-client.js).
export function mockLeaderboard(options = {}) {
  let client = null;
  const getClient = () => (client ??= import('./mock-client.js').then(m => m.mockLeaderboardClient(options)));
  return createLeaderboardService({ configured: true, publishingEnabled: true, captchaRequired: false, getClient });
}
