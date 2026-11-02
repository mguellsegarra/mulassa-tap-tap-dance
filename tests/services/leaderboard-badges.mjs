// Badge reads: the *_v2 first; only a missing function (an older server) falls back, once; any other failure stays that read's.
import assert from 'node:assert/strict';
import { badgeReads } from '../../src/services/leaderboard-badges.js';
const missing = Object.assign(new Error('no function'), { code: 'PGRST202' });
{
  const calls = [], read = badgeReads(async (_, name) => { calls.push(name); if (name.endsWith('_v2')) throw missing; return name; });
  assert.equal(await read(null, 'get_player_card'), 'get_player_card', 'an older server answers the plain read');
  assert.equal(await read(null, 'my_profile'), 'my_profile');
  assert.deepEqual(calls, ['get_player_card_v2', 'get_player_card', 'my_profile'], 'it asks once');
}
{
  const calls = [], down = new TypeError('Failed to fetch');
  const read = badgeReads(async (_, name) => { calls.push(name); throw down; });
  await assert.rejects(read(null, 'get_player_card'), down);
  assert.deepEqual(calls, ['get_player_card_v2'], 'a network failure is no older server');
}
console.log('badge reads ok');
