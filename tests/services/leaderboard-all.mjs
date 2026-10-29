// get_leaderboard_all on PGlite with every migration in supabase/migrations/: one board for all levels, by score, best
// result per player (202609280001); then pages, the caller's row ±5 and the number of ranked players (202609280005).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = f => readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
  create table auth.users(id uuid primary key, is_anonymous boolean not null default false, created_at timestamptz default now(), updated_at timestamptz default now(), last_sign_in_at timestamptz default now());
  create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
for (const f of ['202609270001_leaderboards.sql', '202609270002_retention.sql', '202609280001_leaderboard_all.sql', '202609280002_leaderboard_me.sql', '202609280003_unique_alias.sql', '202609280004_drop_weekly.sql', '202609280005_board_pages.sql',
  '202609280006_feedback.sql', '202609280007_drop_feedback_tables.sql', '202609280008_drop_per_level_board.sql', '202609280009_alias_hardening.sql', '202609280010_alias_mulassa_allowed.sql', '202609280011_restore_unique_alias.sql', '202609280014_seed_phaseout.sql', '202609300004_board_streak.sql'])
  await db.exec(sql(`supabase/migrations/${f}`));

const u = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const player = async (n, alias) => {
  await db.query('insert into auth.users(id, is_anonymous) values ($1, true)', [u(n)]);
  await db.query('insert into leaderboard_private.profiles(user_id, alias) values ($1, $2)', [u(n), alias]);
};
const as = n => db.query("select set_config('request.jwt.claim.sub', $1, false)", [n ? u(n) : '']);
const board = async (period = 'all', limit = 10) => (await db.query('select * from public.get_leaderboard_all($1, $2, 0, $3)', ['mulassa-v1', period, limit])).rows
  .map(r => ({ pos: Number(r.position), alias: r.alias, d: r.difficulty, score: r.score, self: r.is_self, total: Number(r.total) }));
const J = (await db.query("select difficulty, judgments from leaderboard_private.versions where version = 'mulassa-v1' order by difficulty")).rows.map(r => r.judgments);
const entry = (n, d, perfect, score, table = 'entries', extra = '') => db.query(`insert into leaderboard_private.${table}(user_id, version, difficulty, perfect, good, miss, score, max_combo${extra ? ', week_start' : ''})
  values ($1, 'mulassa-v1', $2, $3, 0, $4, $5, 1${extra ? `, ${extra}` : ''})`, [u(n), d, perfect, J[d] - perfect, score]);

// by points, the best level of each player
await player(1, 'Easy'); await player(2, 'Hard'); await player(3, 'Both');
await entry(1, 0, J[0] - 1, 90000);  // near-perfect FÀCIL
await entry(2, 2, 100, 120000);      // mediocre DIFÍCIL, more points
await entry(3, 0, 50, 20000);
await entry(3, 1, 60, 60000);        // Both: only the best (NORMAL) counts
assert.deepEqual((await board()).map(r => [r.pos, r.alias, r.d, r.score, r.total]),
  [[1, 'Hard', 2, 120000, 3], [2, 'Easy', 0, 90000, 3], [3, 'Both', 1, 60000, 3]]);
assert.deepEqual((await db.query("select max_combo from public.get_leaderboard_all('mulassa-v1', 'all', 0, 1)")).rows, [{ max_combo: 1 }], 'the row carries the streak');
assert.deepEqual((await db.query("select * from public.get_leaderboard_all('mulassa-v1')")).rows.length, 3, 'the one-argument call still works');

// 30 players: the top 10, then «On sóc» = the caller's row with 5 above and 5 below
for (let n = 4; n <= 30; n++) { await player(n, `p${n}`); await entry(n, 0, 40, 50000 - n * 1000); } // p4 = 46000 … p30 = 20000
const p20 = (await board()).find(r => r.alias === 'p20');
assert.equal(p20, undefined, 'a stranger sees only the top 10');
assert.equal((await board()).length, 10);
const self = (await board()).filter(r => r.alias === 'p20'); // not yet: nobody is signed in
assert.equal(self.length, 0);
await as(20);
const mine = await board();
const at = mine.find(r => r.self);
assert.equal(at.alias, 'p20');
assert.deepEqual(mine.map(r => r.pos), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...Array.from({ length: 11 }, (_, i) => at.pos - 5 + i)], 'top 10 + me ±5');
assert(mine.every(r => r.total === 30), 'every row carries the number of ranked players');
await as(5); // inside the top 10: no duplicates
const top = await board();
assert.equal(new Set(top.map(r => r.pos)).size, top.length);
assert.equal(top.filter(r => r.self).length, 1);

// pages of at most 50 (202609280005): top page = 1..50 (+ me ±5 on the first page), the next page from the offset
await as(0);
const page = async (off, lim) => (await db.query('select * from public.get_leaderboard_all($1, $2, $3, $4)', ['mulassa-v1', 'all', off, lim])).rows.map(r => Number(r.position));
assert.deepEqual(await page(0, 5), [1, 2, 3, 4, 5]);
assert.deepEqual(await page(5, 5), [6, 7, 8, 9, 10], 'the next page');
assert.equal((await page(0, 500)).length, 30, 'never more than 50 (30 players here)');
assert.deepEqual(await page(28, 50), [29, 30], 'the last page is short');
assert.deepEqual(await page(-3, 0), [1], 'bad offsets and limits are clamped');
await as(20);
assert.deepEqual(await page(0, 3), [1, 2, 3, ...Array.from({ length: 11 }, (_, i) => 15 + i)], 'the first page carries me ±5');
assert.deepEqual(await page(3, 3), [4, 5, 6], 'later pages do not');
// no weekly board (202609280004): 'week' is refused, submit_result writes the all-time board
await as(0);
await assert.rejects(db.query("select * from public.get_leaderboard_all('mulassa-v1', 'week')"), /leaderboard_invalid_period/);
assert.equal((await db.query("select to_regclass('leaderboard_private.weekly_entries') t")).rows[0].t, null, 'the weekly table is gone');
await db.query('insert into auth.users(id, is_anonymous) values ($1, true)', [u(31)]);
await as(31);
await db.query("select * from public.submit_result('mulassa-v1', 1, 100, 40, $1, 30000, 20, 'Setmana')", [J[1] - 140]);
assert((await board()).some(r => r.alias === 'Setmana' && r.self), 'a published result is on the board');
await assert.rejects(db.query("select * from public.get_leaderboard_all('mulassa-v1', 'month')"), /leaderboard_invalid_period/);
await assert.rejects(db.query("select * from public.get_leaderboard_all('nope')"), /leaderboard_invalid_version/);
// one player per nickname: capitals, accents, spaces, hyphens and apostrophes don't make a new one
await db.query('insert into auth.users(id, is_anonymous) values ($1, true)', [u(32)]);
await as(32);
for (const clash of ['setmana', 'SETMANA', 'Set-mana', 'Sètmana', 'set mana'])
  await assert.rejects(db.query("select * from public.submit_result('mulassa-v1', 0, 100, 40, $1, 30000, 20, $2)", [J[0] - 140, clash]), /leaderboard_alias_taken/, clash);
await db.query("select * from public.submit_result('mulassa-v1', 0, 100, 40, $1, 30000, 20, 'Setmanes')", [J[0] - 140]);
await assert.rejects(db.query("select public.update_alias('p20')"), /leaderboard_alias_taken|leaderboard_rate_limit/);
await db.query("update leaderboard_private.profiles set last_write_at = now() - interval '1 minute' where user_id = $1", [u(32)]);
await assert.rejects(db.query("select public.update_alias('P20')"), /leaderboard_alias_taken/, 'renaming onto someone else is refused too');
assert.equal((await db.query("select public.update_alias('setmanes') a")).rows[0].a, 'setmanes', 'your own nickname in other capitals is fine');
await as(31);
await db.query("update leaderboard_private.profiles set last_write_at = now() - interval '1 minute' where user_id = $1", [u(31)]);
await db.query("select * from public.submit_result('mulassa-v1', 1, 100, 40, $1, 31000, 20, 'Setmana')", [J[1] - 140]); // the owner keeps it
await assert.rejects(db.query("insert into leaderboard_private.profiles(user_id, alias) values ($1, 'P-20')", [u(1)]), /duplicate key|unique/, 'the index backs it up');
console.log('leaderboard all, on sóc, no week and unique nicknames ok');
