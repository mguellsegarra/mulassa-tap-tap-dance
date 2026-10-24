// The Bou's pending board (supabase/pending/202610230001_bou_board.sql), applied ONLY to the in-memory PGlite fixture:
// before it, the server refuses a Bou result and its statistics; after it, both pass, on the Bou's own board, with
// the ceilings of its real chart. Nothing here touches a real database.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fixture } from '../supabase/tests/fixture.mjs';
import { VERSION_RULES } from '../src/services/leaderboard-rules.js';
import { perfectMax, ceilingOf } from '../tools/score-ceiling.mjs';
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { newStats, endRun } = await import('../src/game/stats.js');
const song = JSON.parse(readFileSync(new URL('../src/song-bou.json', import.meta.url)));
const pending = readFileSync(new URL('../supabase/pending/202610230001_bou_board.sql', import.meta.url), 'utf8');
assert(/^[\x00-\x7f]*$/.test(pending), 'ASCII, as the migrations');
const { db, q, as, player, unlock, migrate } = await fixture();
const submit = (d, score) => q('select * from public.submit_result($1,$2,$3,0,$4,$5,$3,$6)', ['bou-v1', d, VERSION_RULES['bou-v1'].judgments[d], 0, score, 'BouFan']);
const board = () => q('select * from public.get_leaderboard_all($1,$2,$3,$4,$5::smallint)', ['bou-v1', 'all', 0, 50, null]);
const bucket = d => ({ runs: 1, completed: 1, collapsed: 0, seconds: Math.floor(song.end), perfect: VERSION_RULES['bou-v1'].judgments[d], good: 0, miss: 0,
  guapa: 9, guapaTotal: 9, balloons: 0, holds: d ? 10 : 0, bestCombo: VERSION_RULES['bou-v1'].judgments[d], bestStars: 3,
  errors: { early: 0, late: 0, silent: 0, both: 0, hold: 0, move: 0 }, best: { score: 1000, perfect: VERSION_RULES['bou-v1'].judgments[d], good: 0, miss: 0, maxCombo: VERSION_RULES['bou-v1'].judgments[d] } });
const merge = (device, buckets) => q('select public.merge_stats($1,$2::jsonb,$3::date[],auth.uid())', [device, JSON.stringify(buckets), ['2026-10-23']]);
try {
  await migrate();
  await db.exec("update leaderboard_private.seasons set starts_at='2026-09-21 00:00 Europe/Madrid' where id=1");
  const me = await player('BouFan'); await as(me);
  await assert.rejects(() => submit(1, 1000), /leaderboard/, 'today\'s server has no Bou board');
  await assert.rejects(() => merge('00000000-0000-4000-8000-000000000001', { 'bou-tradicional-valls/bou-v1/1': bucket(1) }), /leaderboard_invalid_bucket/, 'nor its statistics');
  await db.exec('reset role'); await db.exec(pending); await db.exec(pending); // idempotent, as every migration
  const rules = await q("select difficulty,judgments,max_score,extras_max,figure_id,duration_seconds,guapa_count,balloon_count,hold_count from leaderboard_private.versions where version='bou-v1' order by difficulty");
  assert.deepEqual(rules.map(r => r.judgments), [0, 1, 2].map(d => perfectMax(song, d).judgments));
  assert.deepEqual(rules.map(r => r.max_score), [0, 1, 2].map(d => ceilingOf(perfectMax(song, d).max)));
  assert.deepEqual(rules.map(r => r.extras_max), [0, 1, 2].map(d => ceilingOf(perfectMax(song, d).extras)));
  assert.deepEqual(rules.map(r => r.judgments), VERSION_RULES['bou-v1'].judgments, 'the client mirror (leaderboard-rules.js)');
  assert.deepEqual(rules.map(r => r.max_score), VERSION_RULES['bou-v1'].ceilings);
  assert.deepEqual(rules.map(r => r.extras_max), VERSION_RULES['bou-v1'].extras);
  assert(rules.every(r => r.figure_id === 'bou-tradicional-valls' && Number(r.duration_seconds) === song.end && r.guapa_count === 9 && r.balloon_count === 1));
  await unlock(); await as(me); await submit(1, 120000);
  const rows = await board();
  assert.equal(rows.length, 1); assert.equal(rows[0].score, 120000);
  assert.equal((await q('select * from public.get_leaderboard_all($1,$2,$3,$4,$5::smallint)', ['drac-v1', 'all', 0, 50, null])).length, 0, 'never on another figure\'s board');
  await unlock(); await as(me);
  await assert.rejects(() => submit(1, VERSION_RULES['bou-v1'].ceilings[1] + 1), /leaderboard/, 'the ceiling holds');
  // the real client's statistics of a whole run on every level
  const stats = newStats();
  for (const d of [0, 1, 2]) endRun(stats, 'u', { kind: 'end', date: '2026-10-23', figureId: 'bou-tradicional-valls', version: 'bou-v1', level: d, seconds: song.end,
    counts: { perfect: rules[d].judgments, good: 0, miss: 0 }, errors: {}, guapa: 9, guapaTotal: 9, balloons: 0, holds: rules[d].hold_count, maxCombo: rules[d].judgments, stars: 3, score: rules[d].max_score, quality: 100 });
  // payload()'s shape (it leaves the Bou out until its board is switched on: tests/bou-chart.mjs), quality stays local
  const buckets = Object.fromEntries(Object.entries(stats.owners.u.counters).map(([k, c]) => { const { quality, ...best } = c.best; return [k, { ...c, best }]; })); // eslint-disable-line no-unused-vars
  await merge('00000000-0000-4000-8000-000000000002', buckets);
  const own = (await q('select * from public.my_stats()'))[0];
  assert.equal(Object.keys(own.buckets).filter(k => k.startsWith('bou-tradicional-valls/bou-v1/')).length, 3, 'its statistics are accepted once its board exists');
  console.log('bou pending board: refused before, accepted after (results, ceilings, statistics), only in PGlite ok');
} finally { await db.close(); }
