// Local client contracts: no remote SDK/session is used.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLeaderboardService, FIGURE_VERSIONS } from '../../src/services/leaderboard.js';
import { buildWorld, bucketProblem } from '../../src/dev/demo-data.js';
import { createStatsSync } from '../../src/services/stats-sync.js';
import { newStats, endRun, payload } from '../../src/game/stats.js';
import { snapshotResult } from '../../src/services/leaderboard-rules.js';

test('Bou routes board and podium reads to bou-v1; unknown figures stay empty', async () => {
  const calls = [];
  const service = createLeaderboardService({ configured: true, getClient: async () => ({ rpc: async (name, args) => { calls.push([name,args]); return { data: [] }; } }) });
  assert.equal(FIGURE_VERSIONS['bou-tradicional-valls'], 'bou-v1');
  await service.listAll({ figure: 'bou-tradicional-valls' });
  await service.levelPodium({ figure: 'bou-tradicional-valls', level: 2 });
  assert.equal(calls.length, 2);
  assert(calls.every(([,args]) => args.p_version === 'bou-v1'));
  assert.deepEqual(await service.listAll({ figure: 'unknown' }), []);
  assert.equal(calls.length, 2);
});
test('Bou publishes only eligible whole runs', () => {
  const game = { figureId: 'bou-tradicional-valls', figureVersion: 'bou-v1', diff: 1, practice: false,
    counts: { perfect: 227, good: 0, miss: 0 }, score: 1000, maxCombo: 227 };
  const options = { reason: 'end', query: new URLSearchParams() };
  assert(snapshotResult(game, options));
  for (const query of ['autoplay','from=10','view=side']) assert.equal(snapshotResult(game, { ...options, query: new URLSearchParams(query) }), null);
  assert.equal(snapshotResult({ ...game, practice: true }, options), null);
  assert.equal(snapshotResult(game, { ...options, reason: 'collapse' }), null);
});
test('mock Bou buckets obey current duration, BRAMA, balloon and hold bounds', () => {
  for (const world of ['launch','later','many']) {
    const w = buildWorld({ world });
    assert(w.boards.some(b => b.version === 'bou-v1' && b.rows.length));
    for (const buckets of w.stats.values()) for (const [key,c] of Object.entries(buckets)) {
      assert.equal(bucketProblem(key,c), null, key);
      if (!key.includes('/bou-v1/')) continue;
      assert.equal(bucketProblem(key,{ ...c, balloons: (c.completed+c.collapsed)+1 }), 'invalid_stats');
      assert.equal(bucketProblem(key,{ ...c, holds: (c.completed+c.collapsed)*27+1 }), 'invalid_stats');
    }
  }
});
test('pre-migration refusal preserves Bou locally, uploads others, and reload retries Bou', async () => {
  let doc = newStats(), migrated = false;
  for (const [figureId,version] of [['bou-tradicional-valls','bou-v1'],['mulassa-valls','mulassa-v3']])
    endRun(doc, 'none', { kind: 'end', figureId, version, level: 1, seconds: 10, counts: { perfect: 1, good: 0, miss: 0 } });
  const uploads = [], service = { ownerId: async () => 'owner', profile: async () => ({}),
    syncStats: async p => {
      if (!migrated && Object.keys(p.buckets).some(k => k.includes('/bou-v1/'))) throw { code: 'stats' };
      uploads.push(structuredClone(p));
    } };
  const options = { service, notices: { seen: () => true, load: async () => {} },
    io: { load: () => doc, save: s => { doc = s; } }, timer: () => 1, clear() {} };
  const sync = createStatsSync(options); await sync.init();
  const counters = structuredClone(doc.owners.owner.counters);
  assert.equal(await sync.send(), 'partial');
  assert.deepEqual(Object.keys(uploads[0].buckets), ['mulassa-valls/mulassa-v3/1']);
  assert.equal(await sync.send(), 'sent');
  assert.deepEqual(doc.owners.owner.counters,counters);
  assert.equal(Object.keys(payload(doc,'owner').buckets).length,2);
  migrated = true;
  const reload = createStatsSync(options); await reload.init();
  assert.equal(await reload.send(), 'sent');
  assert.equal(Object.keys(uploads.at(-1).buckets).length,2);
  assert.deepEqual(doc.owners.owner.counters,counters);
  assert.equal(await reload.send(), 'unchanged');
  sync.cancel(); reload.cancel();
});
