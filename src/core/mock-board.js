// The in-memory leaderboard is on (sheets-setup.js `mockBoard`: ?final, ?mock/?demo, or a dev host with no Supabase): its
// boards carry the figures the server has none for yet (the Bou), so figures.js / leaderboard.js show and publish them.
// Its own module: the vm tests (tests/load-main.mjs) cannot inline import.meta, they supply MOCK_BOARD.
import { DEV_HOST, Q } from './flags.js';
const env = import.meta.env ?? {};
export const MOCK_BOARD = DEV_HOST.test(globalThis.location?.hostname ?? '') && (['final', 'mock', 'demo'].some(k => Q.has(k)) || !(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY));
