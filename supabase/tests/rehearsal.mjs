// Migration rehearsal on a real, throwaway PostgreSQL (Supabase image) with several connections.
// Usage: node supabase/tests/rehearsal.mjs [--keep]
// It starts its OWN containers (mulassa-rehearsal-<stamp>, -auth, -net), talks to them only through
// `docker exec <that name>`, and removes exactly those at the end (--keep leaves them for inspection).
// Never reads environment credentials and never connects to any other database. Data is synthetic.
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';

const IMAGE = 'public.ecr.aws/supabase/postgres:17.11.0.004'; // production's major version
const AUTH_IMAGE = 'public.ecr.aws/supabase/gotrue:v2.197.0'; // real Auth schema (is_anonymous, sessions...)
const NAME = `mulassa-rehearsal-${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}`;
const NET = `${NAME}-net`, AUTH = `${NAME}-auth`;
const KEEP = process.argv.includes('--keep');
const NEW = '202610200001';
const dir = new URL('../migrations/', import.meta.url);
const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
const read = f => readFileSync(new URL(f, dir), 'utf8');
const results = [];
const ok = (name, detail = '') => { results.push({ name, ok: true }); console.log(`PASS ${name}${detail ? `: ${detail}` : ''}`); };
const fail = (name, e) => { results.push({ name, ok: false }); console.log(`FAIL ${name}: ${e.message ?? e}`); };
const check = async (name, fn) => { try { const d = await fn(); ok(name, d); } catch (e) { fail(name, e); } };

const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const psqlArgs = user => ['exec', '-i', NAME, 'psql', '-U', user, '-d', 'postgres', '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1'];
// One synchronous session. Every helper below targets NAME only.
const sql = (text, user = 'postgres') => execFileSync('docker', psqlArgs(user), { input: text, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const json = (query, user) => JSON.parse(sql(`select coalesce((${query})::text, 'null')`, user));
// One asynchronous session (its own connection) for concurrency tests: resolves with stdout/stderr, never rejects.
const session = text => new Promise(resolve => {
  const t0 = Date.now(), p = spawn('docker', psqlArgs('postgres'));
  let out = '', err = '';
  p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { err += d; });
  p.on('close', code => resolve({ code, out: out.trim(), err: err.trim(), ms: Date.now() - t0 }));
  p.stdin.end(text);
});
const claims = uid => `set local role authenticated; select set_config('request.jwt.claim.sub','${uid}',true),
  set_config('request.jwt.claims','{"sub":"${uid}","role":"authenticated"}',true);`;
const asUser = (uid, body) => `begin; ${claims(uid)} ${body}; commit;`;
// Elapsed time measured inside the database (docker exec start-up would hide a lock wait); last output line.
const timed = text => `select clock_timestamp() as t0 \\gset\n${text}\nselect round(extract(epoch from clock_timestamp() - :'t0'::timestamptz) * 1000);`;
const msOf = r => Number(r.out.split('\n').at(-1));
const asAnon = body => `begin; set local role anon; ${body}; commit;`;
// Start every worker behind one exclusive advisory lock, released together: real simultaneous calls.
const race = async (bodies, hold = 1500) => {
  const gate = session(`select pg_advisory_lock(4242); select pg_sleep(${hold / 1000});`);
  await new Promise(r => setTimeout(r, 400));
  const runs = bodies.map(b => session(`select pg_advisory_lock_shared(4242); select pg_advisory_unlock_shared(4242);\n${b}`));
  await gate;
  return Promise.all(runs);
};
const errorOf = r => (r.err.match(/ERROR:\s+(\S+)/) ?? [])[1] ?? null;
const tally = rs => rs.reduce((m, r) => { const k = r.code === 0 ? 'ok' : errorOf(r) ?? 'error'; m[k] = (m[k] ?? 0) + 1; return m; }, {});
const deadlocks = () => Number(sql("select deadlocks from pg_stat_database where datname='postgres'"));
const uid = (prefix, n) => `${prefix}000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function start() {
  if (docker('ps', '-a', '--filter', `name=^${NAME}`, '--format', '{{.Names}}')) throw new Error(`${NAME} already exists`);
  const pw = randomBytes(18).toString('hex'); // lives only inside the throwaway container
  docker('network', 'create', '--label', 'mulassa.rehearsal=1', NET);
  docker('run', '-d', '--name', NAME, '--label', 'mulassa.rehearsal=1', '--network', NET, '-e', `POSTGRES_PASSWORD=${pw}`, IMAGE);
  for (let i = 0; ; i++) {
    try { if (sql('select 1', 'supabase_admin') === '1') break; } catch { /* still booting */ }
    if (i > 90) throw new Error('database did not start');
    execFileSync('sleep', ['1']);
  }
  execFileSync('sleep', ['3']); // the image's init scripts restart the server once
  sql(`alter role supabase_auth_admin password '${pw}'`, 'supabase_admin');
  docker('run', '-d', '--name', AUTH, '--label', 'mulassa.rehearsal=1', '--network', NET,
    '-e', 'GOTRUE_DB_DRIVER=postgres', '-e', `GOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:${pw}@${NAME}:5432/postgres`,
    '-e', 'DB_NAMESPACE=auth', '-e', 'GOTRUE_JWT_SECRET=rehearsal-only-not-a-secret-0123456789abcdef',
    '-e', 'GOTRUE_SITE_URL=http://localhost', '-e', 'API_EXTERNAL_URL=http://localhost', '-e', 'GOTRUE_API_HOST=0.0.0.0', '-e', 'PORT=9999', AUTH_IMAGE);
  let last = -1, stable = 0;
  for (let i = 0; stable < 3; i++) {
    let n = -1; try { n = Number(sql('select count(*) from auth.schema_migrations', 'supabase_admin')); } catch { /* not yet */ }
    stable = n > 50 && n === last ? stable + 1 : 0; last = n;
    if (i > 90) throw new Error('auth migrations did not finish');
    execFileSync('sleep', ['1']);
  }
  docker('rm', '-f', AUTH); // the schema is all we need
  console.log(`container ${NAME} (${IMAGE}), auth schema from ${AUTH_IMAGE}: ${last} auth migrations`);
}
function stop() {
  if (KEEP) { console.log(`kept ${NAME} (docker rm -f ${NAME} && docker network rm ${NET})`); return; }
  for (const args of [['rm', '-f', AUTH], ['rm', '-f', NAME], ['network', 'rm', NET]]) { try { docker(...args); } catch { /* gone */ } }
}

// Production state today: master's migrations, in order. The new ones are applied later, separately.
// Recorded in supabase_migrations.schema_migrations as `supabase db push` does (the rollout's read-only checks read it).
const migrate = list => {
  sql('create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations(version text primary key, statements text[], name text);');
  for (const f of list) {
    const t0 = Date.now(); sql(read(f));
    sql(`insert into supabase_migrations.schema_migrations(version, name) values ('${f.slice(0, 12)}', '${f.slice(13, -4)}')`);
    if (f >= NEW) console.log(`applied ${f} in ${Date.now() - t0} ms`);
  }
};
// The read-only SQL blocks of docs/rankings-rollout.md (steps 2 and 5), run as written: key|value lines.
const ROLLOUT = readFileSync(new URL('../../docs/rankings-rollout.md', import.meta.url), 'utf8');
const rolloutSql = i => Object.fromEntries(sql([...ROLLOUT.matchAll(/```sql\n([\s\S]*?)```/g)][i][1]
  .replace('<T0>', '2026-01-01 00:00+00')).split('\n').filter(l => l.includes('|')).map(l => [l.slice(0, l.indexOf('|')), l.slice(l.indexOf('|') + 1)]));

// Production-like synthetic data: anonymous guests, confirmed e-mail players, pending e-mails, Auth-only sign-ins,
// the real seed fixture, and (marked) 13-month-old accounts for the purge dry count. Rows only on v1/v2:
// mulassa-v3 and drac-v1 do not exist in production before the migration (versions FK).
const SEED = `
insert into auth.users(instance_id,id,aud,role,is_anonymous,email,email_confirmed_at,email_change,created_at,updated_at,last_sign_in_at)
select '00000000-0000-0000-0000-000000000000', u.id::uuid, 'authenticated','authenticated', u.anon, u.email, u.confirmed, u.change,
  u.created, u.created, u.signin
from (
  select '0a000000-0000-4000-8000-'||lpad(g::text,12,'0') id, true anon, null email, null::timestamptz confirmed, null change,
    now()-(g%24)*interval '1 day'-interval '2 hours' created, now()-(g%9)*interval '1 day' signin from generate_series(1,400) g
  union all select '0b000000-0000-4000-8000-'||lpad(g::text,12,'0'), false, 'verified'||g||'@example.invalid',
    now()-interval '10 days', null, now()-interval '20 days', now()-interval '1 day' from generate_series(1,30) g
  union all select '0c000000-0000-4000-8000-'||lpad(g::text,12,'0'), true, null, null, 'pending'||g||'@example.invalid',
    now()-interval '15 days', now()-interval '3 days' from generate_series(1,15) g
  union all select '0d000000-0000-4000-8000-'||lpad(g::text,12,'0'), true, null, null, null,
    now()-(g%20)*interval '1 day', now()-(g%20)*interval '1 day' from generate_series(1,60) g
  union all select '0e000000-0000-4000-8000-'||lpad(g::text,12,'0'), true, null, null, null,
    now()-interval '13 months', now()-interval '13 months' from generate_series(1,7) g
  union all select '0f000000-0000-4000-8000-000000000001', false, 'oldverified@example.invalid', now()-interval '13 months', null,
    now()-interval '13 months', now()-interval '13 months'
) u;
insert into auth.sessions(id,user_id,created_at,updated_at)
  select gen_random_uuid(), id, created_at, created_at from auth.users where id::text like '0e%' or id::text like '0a%';
insert into leaderboard_private.profiles(user_id,alias,created_at,last_active_at,last_write_at)
select u.id, leaderboard_private.normalized_alias((array['Timbaler','Bastoner','Pubilla','Gegantera','Mulasser','Dracaire','Castellera','Grallera'])
    [1+abs(hashtext(u.id::text))%8] || row_number() over (order by u.id)),
  u.created_at, case when u.id::text like '0e%' or u.id::text like '0f%' then u.created_at else u.last_sign_in_at end, u.created_at
from auth.users u where (u.id::text like '0a%' or u.id::text like '0b%' or u.id::text like '0c%' or u.id::text like '0f%'
  or (u.id::text like '0e%' and right(u.id::text,1)::int <= 5));
insert into leaderboard_private.entries(user_id,version,difficulty,perfect,good,miss,score,max_combo,achieved_at)
select x.user_id, x.version, x.difficulty, x.perfect, x.good, x.j-x.perfect-x.good, x.score, (x.perfect+x.good)/2, x.done_at
from (
  select p.user_id, v.version, v.difficulty, v.judgments j, v.created + v.offs done_at,
    floor(v.judgments*(0.3+0.6*v.f))::int perfect,
    floor((v.judgments-floor(v.judgments*(0.3+0.6*v.f)))*0.6)::int good,
    floor((v.max_score-v.extras_max)::numeric*(floor(v.judgments*(0.3+0.6*v.f))
      +floor((v.judgments-floor(v.judgments*(0.3+0.6*v.f)))*0.6))/v.judgments*0.9 + v.extras_max*0.3*v.f)::int score
  from leaderboard_private.profiles p cross join lateral (
    select r.*, (abs(hashtext(p.user_id::text||r.version||r.difficulty))%1000)/1000.0 f, p.created_at created,
      least(now()-p.created_at, interval '1 day') offs
    from leaderboard_private.versions r) v
  where not p.is_seed and abs(hashtext(p.user_id::text||v.version||v.difficulty||'x'))%100 < case v.version when 'mulassa-v2-short' then 55 else 20 end
) x;
`;

// Read-only counts and checksums over the columns that exist before the migration.
const COUNTS = `json_build_object(
  'auth_users', (select count(*) from auth.users),
  'auth_anonymous', (select count(*) from auth.users where is_anonymous),
  'auth_confirmed', (select count(*) from auth.users where email_confirmed_at is not null),
  'auth_sessions', (select count(*) from auth.sessions),
  'profiles', (select count(*) from leaderboard_private.profiles),
  'profiles_seed', (select count(*) from leaderboard_private.profiles where is_seed),
  'entries', (select count(*) from leaderboard_private.entries),
  'entries_by_version', (select json_object_agg(k,n) from (select version||'/'||difficulty k, count(*) n
    from leaderboard_private.entries group by 1 order by 1) t),
  'entries_md5', (select md5(string_agg(concat_ws('|',id,user_id,version,difficulty,perfect,good,miss,score,max_combo,quality_units,achieved_at),',' order by id)) from leaderboard_private.entries),
  'profiles_md5', (select md5(string_agg(concat_ws('|',user_id,alias,created_at,last_active_at,last_write_at,is_seed),',' order by user_id)) from leaderboard_private.profiles)
)`;
const legacyBoard = version => json(`select json_agg(r) from (select position,alias,difficulty,quality,score,max_combo,is_self,total
  from public.get_leaderboard_all(p_version => '${version}', p_period => 'all', p_offset => 0, p_limit => 50)) r`);
const strip = rows => rows.map(r => ({ ...r, alias: r.alias.replace(/#[0-9]{4}$/, '') }));
const v2 = { 0: 108, 1: 133, 2: 240 }, v3 = v2, drac = { 0: 106, 1: 200, 2: 277 };
const submit = (version, d, perfect, score, alias, j) =>
  `select * from public.submit_result('${version}',${d},${perfect},${j[d] - perfect},0,${score},${perfect},'${alias}')`;
// player_devices too: merge_stats charges each run 1 s of real time since the device's last upload
const unlock = id => sql(`update leaderboard_private.profiles set last_write_at = now()-interval '11 seconds', last_stats_at = null where user_id = '${id}';
  update leaderboard_private.player_devices set updated_at = now()-interval '1 minute' where user_id = '${id}'`);

async function main() {
  const before = { containers: docker('ps', '-a', '--format', '{{.ID}} {{.Names}} {{.Status}}').split('\n').filter(l => !l.includes('mulassa-rehearsal-')) };
  start();
  try {
    const old = files.filter(f => f < NEW), next = files.filter(f => f >= NEW);
    migrate(old);
    sql(SEED);
    sql(readFileSync(new URL('../../tests/fixtures/seed-leaderboard-2026.sql', import.meta.url), 'utf8'));
    let preRead;
    await check('rollout step 2 SQL (before)', () => {
      preRead = rolloutSql(0);
      assert.equal(preRead.last_migration, '202610170001');
      assert.equal(preRead.entries_unique_constraint, 'entries_user_id_version_difficulty_key');
      assert.deepEqual([preRead.postgres_can_delete_auth_users, preRead.postgres_can_update_auth_users], ['true', 'true']);
    });
    const c0 = json(COUNTS);
    const board0 = { v2: legacyBoard('mulassa-v2-short'), v1: legacyBoard('mulassa-v1') };
    console.log('BEFORE', JSON.stringify(c0));

    // db push commits file by file: if a later one fails, production stays in between, with the old client.
    // Each intermediate state gets the old client's calls, rolled back so the counts below stay comparable.
    const smokeId = uid('0a', 40), smokeAlias = sql(`select alias from leaderboard_private.profiles where user_id='${smokeId}'`);
    let t0 = Date.now();
    for (const f of next) {
      migrate([f]);
      await check(`old client works after ${f}`, () => {
        const out = sql(`begin; update leaderboard_private.profiles set last_write_at = now()-interval '11 seconds' where user_id = '${smokeId}';
          ${claims(smokeId)} select public.my_alias(); ${submit('mulassa-v2-short', 0, 100, 40000, smokeAlias, v2)};
          select count(*) from public.get_leaderboard_all(p_version => 'mulassa-v2-short', p_period => 'all', p_offset => 0, p_limit => 50); rollback;`).split('\n');
        assert.equal(out.at(-3), smokeAlias, JSON.stringify(out)); assert.match(out.at(-2), /^[tf]\|[0-9.]+\|[0-9]+$/); assert(Number(out.at(-1)) >= 50, out.at(-1)); // top 50 + the caller's neighbours
      });
    }
    console.log(`all new migrations: ${Date.now() - t0} ms`);
    const c1 = json(COUNTS);
    await check('rollout step 2 and 5 SQL (after)', () => {
      const again = rolloutSql(0), post = rolloutSql(1);
      for (const k of Object.keys(preRead).filter(k => k.startsWith('entries') && k !== 'entries_unique_constraint' || k.startsWith('profiles') || k.startsWith('auth')))
        assert.equal(again[k], preRead[k], k);
      assert.equal(again.last_migration, '202610210001');
      assert.deepEqual([post.guests_without_tag, post.verified_with_tag, post.functions_without_search_path], ['0', '0', '0']);
      assert.equal(post.anon_functions, 'get_leaderboard_all,get_level_podium,get_player_card,get_seasons');
      assert.equal(post.entries_unique_constraint, 'entries_user_season_version_difficulty_key');
      assert.equal(post.entries_by_season, `0=${c0.entries}`);
      assert.match(post.seasons, /^0:Estrena 2026:.*:- \| 1:Tardor 2026:.*$/);
    });
    const after = json(`json_build_object(
      'seasons', (select json_agg(json_build_object('id',id,'name',name,'starts',starts_at,'ends',ends_at) order by id) from leaderboard_private.seasons),
      'entries_by_season', (select json_object_agg(season_id,n) from (select season_id,count(*) n from leaderboard_private.entries group by 1) t),
      'versions', (select json_agg(json_build_object('v',version,'d',difficulty,'figure',figure_id,'retired',retired_at is not null,'season',retired_season_id) order by version,difficulty) from leaderboard_private.versions),
      'tags', (select json_build_object('guests_tagged', count(*) filter (where tag is not null),
        'guests_untagged', count(*) filter (where tag is null and not leaderboard_private.verified(user_id)),
        'verified_tagged', count(*) filter (where tag is not null and leaderboard_private.verified(user_id)),
        'verified_clean', count(*) filter (where tag is null and leaderboard_private.verified(user_id))) from leaderboard_private.profiles),
      'unique_key', (select string_agg(conname,',') from pg_constraint where conrelid='leaderboard_private.entries'::regclass and contype='u'))`);
    console.log('AFTER', JSON.stringify(c1));
    console.log('AFTER (new state)', JSON.stringify(after));

    await check('row counts and checksums unchanged', () => { assert.deepEqual(c1, c0); return `${c1.entries} entries, ${c1.profiles} profiles, ${c1.auth_users} auth users`; });
    await check('Temporada 0 and 1', () => {
      assert.deepEqual(after.seasons.map(s => [s.id, s.name]), [[0, 'Estrena 2026'], [1, 'Tardor 2026']]);
      assert.equal(sql("select bool_and(ends_at = '2027-01-01 00:00 Europe/Madrid' and starts_at <= now()) from leaderboard_private.seasons where id = 1"), 't');
      assert.deepEqual(after.entries_by_season, { 0: c0.entries });
    });
    await check('retired versions point to season 0, new ones active', () => {
      for (const v of after.versions) {
        const legacy = v.v.startsWith('mulassa-v1') || v.v === 'mulassa-v2-short';
        assert.deepEqual([v.retired, v.season], legacy ? [true, 0] : [false, null], JSON.stringify(v));
        assert.equal(v.figure, v.v.startsWith('drac') ? 'drac-valls' : 'mulassa-valls');
      }
      assert.equal(after.versions.length, 12);
    });
    await check('tags: every existing guest tagged, verified clean', () => {
      assert.equal(after.tags.guests_untagged, 0); assert.equal(after.tags.verified_tagged, 0);
      return JSON.stringify(after.tags);
    });
    await check('unique key includes season', () => assert.equal(after.unique_key, 'entries_user_season_version_difficulty_key'));
    await check('old client board (4 named args) unchanged apart from #tag', () => {
      const v2a = legacyBoard('mulassa-v2-short'), v1a = legacyBoard('mulassa-v1');
      assert.deepEqual(strip(v2a), board0.v2); assert.deepEqual(strip(v1a), board0.v1);
      assert(v2a.some(r => /#[0-9]{4}$/.test(r.alias)));
      return `${v2a.length} rows, total ${v2a[0]?.total}`;
    });
    await check('one signature per RPC (no PGRST203)', () => {
      const sigs = json(`select json_object_agg(proname, n) from (select proname, count(*) n from pg_proc
        where pronamespace='public'::regnamespace and proname in ('submit_result','get_leaderboard_all','update_alias','my_alias',
        'my_profile','choose_verified_alias','merge_stats','my_stats','get_seasons','get_player_card','leaderboard_expired_players','get_level_podium') group by 1) t`);
      assert(Object.values(sigs).every(n => n === 1), JSON.stringify(sigs)); assert.equal(Object.keys(sigs).length, 12);
    });

    // Old client (master) and new client against the migrated database.
    const guest = uid('0a', 7), guestAlias = sql(`select alias from leaderboard_private.profiles where user_id='${guest}'`);
    await check('old client: my_alias raw, 8-arg submit to season 0, update_alias keeps tag', () => {
      unlock(guest);
      const tag = sql(`select tag from leaderboard_private.profiles where user_id='${guest}'`);
      assert.equal(sql(asUser(guest, 'select public.my_alias()')).split('\n').at(-1), guestAlias);
      const r = sql(asUser(guest, submit('mulassa-v2-short', 2, 239, 190000, guestAlias, v2))).split('\n').at(-1);
      assert.match(r, /^t\|/);
      assert.equal(sql(`select string_agg(distinct season_id::text,',') from leaderboard_private.entries where user_id='${guest}' and version='mulassa-v2-short'`), '0');
      unlock(guest);
      sql(asUser(guest, `select public.update_alias('${guestAlias}')`));
      assert.equal(sql(`select tag from leaderboard_private.profiles where user_id='${guest}'`), tag);
    });
    await check('new client: v3 and drac-v1 go to season 1, never mixed', () => {
      unlock(guest); sql(asUser(guest, submit('mulassa-v3', 1, 133, 100000, guestAlias, v3)));
      unlock(guest); sql(asUser(guest, submit('drac-v1', 0, 106, 120000, guestAlias, drac)));
      const rows = json(`select json_agg(json_build_object('v',version,'s',season_id) order by version) from leaderboard_private.entries where user_id='${guest}' and version in ('mulassa-v3','drac-v1')`);
      assert.deepEqual(rows, [{ v: 'drac-v1', s: 1 }, { v: 'mulassa-v3', s: 1 }]);
      const m = json(`select json_agg(r) from public.get_leaderboard_all('mulassa-v3') r`), d = json(`select json_agg(r) from public.get_leaderboard_all('drac-v1') r`);
      assert.deepEqual([m.length, m[0].score, m[0].season_id, d.length, d[0].score], [1, 100000, 1, 1, 120000]);
      const seasons = json(`select json_agg(json_build_object('s',season_id,'v',version,'players',players)) from public.get_seasons('mulassa-valls')`);
      assert(seasons.some(s => s.s === 0) && seasons.some(s => s.s === 1 && s.v === 'mulassa-v3'), JSON.stringify(seasons));
    });

    // Concurrency: separate connections, released together.
    const d0 = deadlocks();
    await check('parallel submit_result, same profile and board', async () => {
      const p = uid('0a', 11), a = sql(`select alias from leaderboard_private.profiles where user_id='${p}'`); unlock(p);
      const rs = await race([0, 1, 2, 3, 4, 5, 6, 7].map(i => asUser(p, submit('mulassa-v3', 0, 100, 60000 + i * 1000, a, v3))));
      const t = tally(rs), rows = sql(`select count(*) from leaderboard_private.entries where user_id='${p}' and version='mulassa-v3'`);
      assert.deepEqual([t.ok, t.leaderboard_rate_limit, rows], [1, 7, '1'], JSON.stringify(t));
      return JSON.stringify(t);
    });
    await check('parallel submit_result, 24 profiles on one board', async () => {
      const ids = Array.from({ length: 24 }, (_, i) => uid('0a', 100 + i)); ids.forEach(unlock);
      const aliases = ids.map(id => sql(`select alias from leaderboard_private.profiles where user_id='${id}'`));
      const rs = await race(ids.map((id, i) => timed(asUser(id, submit('drac-v1', 1, 150 + i, 100000 + i, aliases[i], drac)))));
      const n = sql(`select count(*) from leaderboard_private.entries where version='drac-v1' and difficulty=1 and season_id=1`);
      assert.deepEqual([tally(rs).ok, n], [24, '24'], JSON.stringify(tally(rs)));
      return `slowest call ${Math.max(...rs.map(msOf))} ms in the database`;
    });
    await check('parallel new guests choosing the same name get distinct tags', async () => {
      const ids = Array.from({ length: 8 }, (_, i) => uid('0d', 1 + i));
      const rs = await race(ids.map(id => asUser(id, "select public.update_alias('Bessona')")));
      const tags = sql("select count(distinct tag) from leaderboard_private.profiles where alias='Bessona'");
      assert.deepEqual([tally(rs).ok, tags], [8, '8'], JSON.stringify(tally(rs)));
    });
    await check('parallel verified players claiming one clean name: one wins', async () => {
      const ids = [uid('0b', 21), uid('0b', 22), uid('0b', 23)]; ids.forEach(unlock);
      const rs = await race(ids.map(id => asUser(id, "select public.choose_verified_alias('Neta')")));
      assert.deepEqual(tally(rs), { ok: 1, leaderboard_alias_taken: 2 });
    });
    const stats = (runs, seconds) => JSON.stringify({ practice: { runs, seconds } });
    const merge = (id, device, buckets, owner = id) => asUser(id, `select public.merge_stats('${device}','${buckets}'::jsonb,array[current_date]::date[],'${owner}')`);
    await check('parallel merge_stats, same owner and device: one wins, no lost update', async () => {
      const p = uid('0a', 12), dev = '1ead0000-0000-4000-8000-000000000001';
      for (let round = 1; round <= 3; round++) {
        unlock(p);
        // seconds stay at 1: real time growth is bounded by the wall clock since the device's last upload
        const rs = await race([1, 2, 3, 4, 5, 6].map(i => merge(p, dev, stats(round * 10 + i, 1))));
        const t = tally(rs);
        assert.deepEqual([t.ok, t.leaderboard_rate_limit], [1, 5], `round ${round}: ${JSON.stringify(t)}`);
        const stored = json(`select counters from leaderboard_private.player_stats where user_id='${p}' and device_id='${dev}' and bucket='practice'`);
        assert(stored.runs > round * 10 && stored.runs <= round * 10 + 6 && stored.seconds === 1, JSON.stringify(stored));
      }
    });
    await check('merge_stats: lower values rejected, equal values idempotent (greatest)', async () => {
      const p = uid('0a', 12), dev = '1ead0000-0000-4000-8000-000000000001';
      const cur = json(`select counters from leaderboard_private.player_stats where user_id='${p}' and device_id='${dev}' and bucket='practice'`);
      unlock(p); const r = await session(merge(p, dev, stats(cur.runs - 1, cur.seconds)));
      assert.equal(errorOf(r), 'leaderboard_stats_decreased');
      unlock(p); const s = await session(merge(p, dev, stats(cur.runs, cur.seconds)));
      assert.equal(s.code, 0, s.err);
      assert.deepEqual(json(`select counters from leaderboard_private.player_stats where user_id='${p}' and device_id='${dev}' and bucket='practice'`), cur);
    });
    await check('parallel merge_stats from new devices: device limit holds', async () => {
      const p = uid('0a', 13);
      for (let i = 1; i <= 7; i++) { unlock(p); sql(merge(p, uid('de', i), stats(1, 1))); }
      unlock(p);
      const rs = await race([8, 9, 10, 11].map(i => merge(p, uid('de', i), stats(1, 1))));
      const n = sql(`select count(*) from leaderboard_private.player_devices where user_id='${p}'`);
      assert.deepEqual([tally(rs).ok, n], [1, '8'], JSON.stringify(tally(rs)));
      unlock(p); assert.equal(errorOf(await session(merge(p, uid('de', 12), stats(1, 1)))), 'leaderboard_device_limit');
    });
    await check('merge_stats racing an account deletion (both orders)', async () => {
      const del = id => `begin; delete from auth.users where id='${id}'; select pg_sleep(1); commit;`;
      const a = uid('0a', 14); unlock(a);
      const [m1, d1] = await Promise.all([session(merge(a, uid('df', 1), stats(2, 2)).replace('commit;', 'select pg_sleep(1); commit;')),
        new Promise(r => setTimeout(r, 300)).then(() => session(del(a)))]);
      const b = uid('0a', 15); unlock(b);
      const [d2, m2] = await Promise.all([session(del(b)), new Promise(r => setTimeout(r, 300)).then(() => session(merge(b, uid('df', 2), stats(2, 2))))]);
      assert.deepEqual([m1.code, d1.code, d2.code], [0, 0, 0], [m1.err, d1.err, d2.err].join(' '));
      assert.equal(errorOf(m2), 'leaderboard_auth_required', m2.err);
      assert.equal(sql(`select count(*) from leaderboard_private.player_stats where user_id in ('${a}','${b}')`), '0');
      return `merge then delete: ${m1.ms}/${d1.ms} ms; delete then merge: ${errorOf(m2)}`;
    });
    await check('ensure_season racing at the 2027 boundary', async () => {
      const ats = ['2027-01-01 00:00:00 Europe/Madrid', '2026-12-31 23:59:59.999 Europe/Madrid'];
      const rs = await race(Array.from({ length: 12 }, (_, i) => `select leaderboard_private.ensure_season('${ats[i % 2]}')`));
      assert.deepEqual(tally(rs), { ok: 12 });
      assert.deepEqual([...new Set(rs.filter((_, i) => i % 2 === 0).map(r => r.out.split('\n').at(-1)))], ['2']);
      assert.deepEqual([...new Set(rs.filter((_, i) => i % 2 === 1).map(r => r.out.split('\n').at(-1)))], ['1']);
      assert.equal(sql(`select count(*) filter (where name = 'Hivern 2027' and starts_at = '2027-01-01 00:00 Europe/Madrid'
        and ends_at = '2027-04-01 00:00 Europe/Madrid') || '/' || count(*) from leaderboard_private.seasons where id = 2`), '1/1');
    });
    await check('readers do not hold the season lock (no global serialization)', async () => {
      const reader = session(asAnon("select count(*) from public.get_leaderboard_all('mulassa-v3'); select pg_sleep(2)"));
      await new Promise(r => setTimeout(r, 500));
      const p = uid('0a', 16), a = sql(`select alias from leaderboard_private.profiles where user_id='${p}'`); unlock(p);
      const w = await session(timed(asUser(p, submit('mulassa-v3', 0, 100, 50000, a, v3))));
      await reader;
      assert.equal(w.code, 0, w.err); assert(msOf(w) < 500, `a submit waited ${msOf(w)} ms behind an open board read`);
      return `submit took ${msOf(w)} ms in the database while a board read was open`;
    });
    await check('no deadlocks', () => { assert.equal(deadlocks(), d0); });

    // Grants and function settings, as Supabase's default privileges really apply them.
    await check('every function: search_path pinned; public RPCs security definer', () => {
      const bad = json(`select json_agg(p.oid::regprocedure::text) from pg_proc p where p.pronamespace in
        ('public'::regnamespace,'leaderboard_private'::regnamespace) and p.prokind='f'
        and not coalesce('search_path=""' = any(p.proconfig), false)`);
      const invoker = json(`select json_agg(p.oid::regprocedure::text) from pg_proc p where p.pronamespace='public'::regnamespace and not p.prosecdef`);
      assert.equal(bad, null, JSON.stringify(bad)); assert.equal(invoker, null, JSON.stringify(invoker));
    });
    const EXPECTED = {
      anon: ['get_leaderboard_all', 'get_level_podium', 'get_player_card', 'get_seasons'],
      authenticated: ['choose_verified_alias', 'get_leaderboard_all', 'get_level_podium', 'get_player_card', 'get_seasons', 'merge_stats', 'my_alias', 'my_profile', 'my_stats', 'submit_result', 'update_alias'],
    };
    for (const role of ['anon', 'authenticated']) {
      await check(`${role}: exactly the expected functions are executable`, () => {
        const got = json(`select json_agg(distinct p.proname order by p.proname) from pg_proc p
          where p.pronamespace in ('public'::regnamespace,'leaderboard_private'::regnamespace)
          and has_function_privilege('${role}', p.oid, 'execute')
          and (p.pronamespace='public'::regnamespace or has_schema_privilege('${role}','leaderboard_private','usage'))`);
        assert.deepEqual(got, EXPECTED[role]);
      });
    }
    await check('anon/authenticated cannot read private tables or call private functions', async () => {
      const tables = ['seasons', 'player_stats', 'player_days', 'player_devices', 'entries', 'profiles'].map(t => `select * from leaderboard_private.${t}`);
      const anon = [...tables, 'select leaderboard_private.purge_inactive_guests(1)', "select * from public.leaderboard_expired_players(1)",
        `select public.merge_stats('${uid('de', 1)}','{}'::jsonb,null,'${guest}')`, `select * from public.my_stats()`,
        submit('mulassa-v3', 0, 108, 1000, 'Anon', v3)];
      const user = [...tables, 'select leaderboard_private.purge_inactive_guests(1)', "select * from public.leaderboard_expired_players(1)",
        `select leaderboard_private.stats_totals('${guest}')`, 'select leaderboard_private.ensure_season(now())'];
      for (const body of anon) assert.equal(errorOf(await session(asAnon(body))), 'permission', `anon: ${body}`);
      for (const body of user) assert.equal(errorOf(await session(asUser(guest, body))), 'permission', `authenticated: ${body}`);
      return `${anon.length} anon and ${user.length} authenticated attempts denied`;
    });
    await check('a player cannot merge stats into another owner', async () => {
      const me = uid('0a', 20), other = uid('0a', 21); unlock(me); unlock(other);
      const r = await session(merge(me, uid('dd', 1), stats(5, 5), other));
      assert.equal(errorOf(r), 'leaderboard_owner_mismatch');
      assert.equal(sql(`select count(*) from leaderboard_private.player_stats where user_id in ('${me}','${other}')`), '0');
    });
    await check('public card and seasons never expose ids, days or e-mail', () => {
      const tag = sql(`select tag from leaderboard_private.profiles where user_id='${guest}'`);
      const card = sql(asAnon(`select row_to_json(c)::text from public.get_player_card('${guestAlias}',${tag}::smallint) c`)).split('\n').at(-1);
      const seasons = sql(asAnon(`select json_agg(s)::text from public.get_seasons('mulassa-valls') s`)).split('\n').at(-1);
      for (const text of [card, seasons]) assert.doesNotMatch(text, /user_id|device|@example|0a000000|"days"/);
      assert.match(card, new RegExp(guestAlias));
    });

    // Retention: dry count (supabase/ops/guest-retention-cron.sql step 1) vs. what the purge would delete, rolled back.
    await check('purge_inactive_guests: dry count matches, verified kept, rolled back', () => {
      const ops = readFileSync(new URL('../ops/guest-retention-cron.sql', import.meta.url), 'utf8');
      const dry = sql(ops.split('\n').filter(l => !l.startsWith('--')).join('\n'));
      const out = sql(`begin; select leaderboard_private.purge_inactive_guests(500);
        select count(*) from auth.users where id::text like '0e%'; select count(*) from auth.users where id::text like '0f%';
        select count(*) from auth.sessions s where s.user_id::text like '0e%'; rollback;`).split('\n');
      assert.deepEqual(out, [dry, '0', '1', '0'], `dry ${dry}, purge ${out}`);
      assert.equal(sql("select count(*) from auth.users where id::text like '0e%'"), '7');
      return `dry count ${dry} = purged ${out[0]} (7 old guests incl. 2 without profile; old verified kept)`;
    });
  } finally {
    stop();
    const now = docker('ps', '-a', '--format', '{{.ID}} {{.Names}} {{.Status}}').split('\n').filter(l => !l.includes('mulassa-rehearsal-'));
    const ids = l => l.split(' ').slice(0, 2).join(' ');
    console.log(now.map(ids).join() === before.containers.map(ids).join() ? 'other containers: same IDs as at start' : `other containers CHANGED:\n${now.join('\n')}`);
  }
  const failed = results.filter(r => !r.ok);
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exit(1);
}
main().catch(e => { console.error(e); process.exit(1); });
