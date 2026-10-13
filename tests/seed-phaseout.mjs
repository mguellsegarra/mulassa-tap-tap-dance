// Seed phase-out (supabase/migrations/202609280014_seed_phaseout.sql) on PGlite, with the real seed file: each real
// player with a result on a level hides the lowest remaining seed result on that level; hidden seeds stay in the DB.
// Position, total, the caller's ±5 and the pages all come from the same visible set.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
    create table auth.users(instance_id uuid, id uuid primary key, aud text, role text, is_anonymous boolean not null default false,
      created_at timestamptz default now(), updated_at timestamptz, last_sign_in_at timestamptz, raw_app_meta_data jsonb,
      raw_user_meta_data jsonb, confirmation_token text, recovery_token text, email_change_token_new text, email_change text);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
  for (const f of ['202609270001_leaderboards', '202609270002_retention', '202609280001_leaderboard_all', '202609280002_leaderboard_me',
    '202609280003_unique_alias', '202609280004_drop_weekly', '202609280005_board_pages', '202609280006_feedback',
    '202609280007_drop_feedback_tables', '202609280008_drop_per_level_board', '202609280009_alias_hardening',
    '202609280010_alias_mulassa_allowed', '202609280011_restore_unique_alias', '202609280012_alias_no_spaces',
    '202609280013_alias_severe_substrings']) await db.exec(sql(`supabase/migrations/${f}.sql`));

  // production order: the seed went in before 0014, whose backfill marks it (twice is fine)
  await db.exec(sql('tests/fixtures/seed-leaderboard-2026.sql'));
  const J = [150, 181, 318];
  const as = uid => db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? '']);
  const board = async (offset = 0, limit = 50) => (await db.query('select * from public.get_leaderboard_all($1, $2, $3, $4)',
    ['mulassa-v1', 'all', offset, limit])).rows.map(r => ({ pos: Number(r.position), alias: r.alias, d: r.difficulty, score: r.score, self: r.is_self, total: Number(r.total) }));
  const visible = async () => (await db.query(`select p.alias, e.difficulty d, e.score from leaderboard_private.visible_entries('mulassa-v1') e
    join leaderboard_private.profiles p using (user_id)`)).rows;

  // before 0014 nothing is hidden and there is no flag
  assert.equal((await board()).length, 16);
  await db.exec(sql('supabase/migrations/202609280014_seed_phaseout.sql'));
  await db.exec(sql('supabase/migrations/202609280014_seed_phaseout.sql')); // idempotent
  const flagged = (await db.query(`select count(*) filter (where is_seed)::int s, count(*) filter (where not is_seed)::int r,
    count(*) filter (where is_seed <> (user_id::text like '5eed2026-%'))::int wrong from leaderboard_private.profiles`)).rows[0];
  assert.deepEqual(flagged, { s: 16, r: 0, wrong: 0 }, 'the backfill marks exactly the 16 seed players');
  const fn = (await db.query(`select p.prosecdef, p.proconfig, has_function_privilege('anon', p.oid, 'execute') anon
    from pg_proc p where p.proname = 'get_leaderboard_all'`)).rows;
  assert.equal(fn.length, 1, 'one get_leaderboard_all');
  assert(fn[0].prosecdef && fn[0].anon && String(fn[0].proconfig).includes('search_path='), 'security definer, anon grant, empty search_path');
  assert.equal((await db.query(`select has_function_privilege('anon', 'leaderboard_private.visible_entries(text)', 'execute') a`)).rows[0].a, false);

  // 0 real players: every seed shows (22 results, 16 players)
  assert.equal((await visible()).length, 22);
  assert.deepEqual((await board()).map(r => r.total), Array(16).fill(16));

  // the reference rule, from the raw rows: per level, hide the k lowest seeds (reverse board order)
  const raw = async () => (await db.query(`select e.id, e.user_id, p.alias, p.is_seed, e.difficulty d, e.score, e.quality_units q,
    extract(epoch from e.achieved_at)::float8 t from leaderboard_private.entries e join leaderboard_private.profiles p using (user_id)`)).rows;
  const boardOrder = (a, b) => b.score - a.score || b.q - a.q || a.t - b.t || a.id - b.id;
  const expected = rows => {
    const hidden = new Set();
    for (let d = 0; d < 3; d++) {
      const k = rows.filter(r => r.d === d && !r.is_seed).length;
      rows.filter(r => r.d === d && r.is_seed).sort(boardOrder).reverse().slice(0, k).forEach(r => hidden.add(r.id));
    }
    const seen = new Map();
    for (const r of rows.filter(r => !hidden.has(r.id)).sort((a, b) => b.score - a.score || b.q - a.q || a.t - b.t || a.id - b.id))
      if (!seen.has(r.user_id)) seen.set(r.user_id, r);
    return { hidden, ranked: [...seen.values()].sort(boardOrder) };
  };
  const full = async () => { // every page, as the client loads them
    const out = [];
    for (let off = 0; ; off += 7) { const p = (await board(off, 7)).filter(r => r.pos > off && r.pos <= off + 7); out.push(...p); if (p.length < 7) break; }
    return out;
  };
  const consistent = async (label, me) => {
    const rows = await raw(), { ranked } = expected(rows), all = await full();
    assert.deepEqual(all.map(r => [r.pos, r.alias, r.d, r.score]), ranked.map((r, i) => [i + 1, r.alias, r.d, r.score]), `${label}: pages = the rule`);
    assert(all.every(r => r.total === ranked.length), `${label}: every total = the ranked players`);
    for (const r of rows.filter(r => !r.is_seed)) assert(ranked.some(x => x.user_id === r.user_id), `${label}: real ${r.alias} is never hidden`);
    if (me) {
      await as(me);
      const first = await board(0, 10), self = first.filter(r => r.self);
      const at = ranked.findIndex(r => r.user_id === me) + 1;
      assert.equal(self.length, 1); assert.equal(self[0].pos, at, `${label}: my position`);
      assert.equal(self[0].total, ranked.length, `${label}: my total (top X%)`);
      const want = [...new Set([...Array.from({ length: Math.min(10, ranked.length) }, (_, i) => i + 1),
        ...Array.from({ length: 11 }, (_, i) => at - 5 + i).filter(p => p >= 1 && p <= ranked.length)])].sort((a, b) => a - b);
      assert.deepEqual(first.map(r => r.pos), want, `${label}: top 10 + me ±5`);
      await as(null);
    }
    return ranked;
  };
  await consistent('no real players');

  // real players: level 0 only at first, one through submit_result (the real write path)
  let n = 0;
  const real = async (d, score, alias) => {
    const id = `0f0f0f0f-0000-4000-8000-${String(++n).padStart(12, '0')}`;
    alias ??= `Real${n}`;
    await db.query('insert into auth.users(id, is_anonymous) values ($1, true)', [id]);
    await db.query('insert into leaderboard_private.profiles(user_id, alias) values ($1, $2)', [id, alias]);
    await db.query(`insert into leaderboard_private.entries(user_id, version, difficulty, perfect, good, miss, score, max_combo)
      values ($1, 'mulassa-v1', $2, 60, 20, $3, $4, 10)`, [id, d, J[d] - 80, score]);
    return id;
  };
  const levelCounts = async () => { const v = await visible(); return [0, 1, 2].map(d => v.filter(r => r.d === d).length); };
  const seedsLeft = async d => (await visible()).filter(r => r.d === d && !r.alias.startsWith('Real') && r.alias !== 'Publicat')
    .map(r => r.score).sort((a, b) => a - b);

  const low = await real(0, 1000); // below every seed: still shown, and it hides the lowest FÀCIL seed (bertitaa 10530)
  assert.deepEqual(await levelCounts(), [10, 9, 3], '1 real on FÀCIL: 10 - 1 seeds + the real one; other levels unaffected');
  assert.deepEqual(await seedsLeft(0), [10768, 11010, 13152, 15216, 16752, 17680, 18596, 21162, 21542], 'the lowest seed goes first');
  assert(!(await board()).some(r => r.alias === 'bertitaa'), 'bertitaa (FACIL only) is off the board');
  assert.equal((await db.query("select count(*)::int n from leaderboard_private.entries where user_id::text like '5eed2026-%'")).rows[0].n, 22, 'hidden, never deleted');
  await consistent('1 real, below every seed', low);

  const top = await real(0, 90000); // a strong one: still the lowest seed goes, the top stays
  assert.deepEqual(await seedsLeft(0), [11010, 13152, 15216, 16752, 17680, 18596, 21162, 21542]);
  await consistent('2 real on FACIL', top);

  // NORMAL through submit_result: arnau99's NORMAL is its best result, it keeps showing it
  const pub = '0f0f0f0f-0000-4000-8000-0000000000aa';
  await db.query('insert into auth.users(id, is_anonymous) values ($1, true)', [pub]);
  await as(pub);
  await db.query("select * from public.submit_result('mulassa-v1', 1, 100, 40, $1, 16000, 20, 'Publicat')", [J[1] - 140]);
  assert.deepEqual(await levelCounts(), [10, 9, 3]);
  assert.deepEqual(await seedsLeft(1), [17030, 17096, 17162, 17296, 17364, 17836, 18450, 22530], 'xavi43800 NORMAL 16964 hidden');
  assert((await board()).some(r => r.alias === 'xavi43800' && r.d === 0 && r.score === 11010), 'xavi43800 still shows its FACIL result');
  await consistent('real on NORMAL via submit_result', pub);

  // more real players than seeds on DIFICIL: all 3 go, never "negative"; the other levels keep theirs
  for (let i = 0; i < 6; i++) await real(2, 20000 + i * 1000);
  assert.deepEqual(await seedsLeft(2), [], 'no DIFICIL seeds left');
  assert.deepEqual(await levelCounts(), [10, 9, 6], '6 real on DIFICIL, 0 seeds');
  assert((await board()).some(r => r.alias === 'arnau99' && r.d === 1), 'arnau99 still shows its NORMAL');
  await consistent('DIFICIL full of real players', low);

  // a player with two levels counts on both
  const both = await real(1, 15000, 'RealBoth');
  await db.query(`insert into leaderboard_private.entries(user_id, version, difficulty, perfect, good, miss, score, max_combo)
    values ($1, 'mulassa-v1', 0, 60, 20, $2, 12000, 10)`, [both, J[0] - 80]);
  assert.deepEqual(await seedsLeft(0), [13152, 15216, 16752, 17680, 18596, 21162, 21542]);
  assert.deepEqual(await seedsLeft(1), [17096, 17162, 17296, 17364, 17836, 18450, 22530]);
  await consistent('a player on two levels', both);

  // a real player leaving brings a seed back (computed, not destructive)
  await db.query('delete from auth.users where id = $1', [top]);
  assert.deepEqual(await seedsLeft(0), [11010, 13152, 15216, 16752, 17680, 18596, 21162, 21542]);
  await consistent('after a deletion', low);

  // re-running 0014 changes nothing; the seed file run on a 0014 schema sets the flag itself
  await db.exec(sql('supabase/migrations/202609280014_seed_phaseout.sql'));
  await consistent('0014 re-run', low);
  await db.exec(sql('tests/fixtures/seed-leaderboard-2026-cleanup.sql'));
  assert.equal((await db.query('select count(*)::int n from leaderboard_private.profiles where is_seed')).rows[0].n, 0);
  await db.exec(sql('tests/fixtures/seed-leaderboard-2026.sql'));
  assert.equal((await db.query('select count(*)::int n from leaderboard_private.profiles where is_seed')).rows[0].n, 16, 'a re-run seed is flagged');
  await consistent('re-seeded', low);
  console.log('seed phase-out: flag, one seed per real player per level (lowest first), ranks/totals/pages consistent ok');
} catch (error) { console.error(error); process.exitCode = 1; }
finally { await db.close(); }
