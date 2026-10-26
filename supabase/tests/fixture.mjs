// In-memory, synthetic fixtures only. No environment credentials or network clients.
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const dir = new URL('../migrations/', import.meta.url);
export const migrations = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
export const sql = f => readFileSync(new URL(f, dir), 'utf8');
export async function fixture() {
  const db = new PGlite();
  const q = async (s, p = []) => (await db.query(s, p)).rows;
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key,is_anonymous boolean,email text,
      email_confirmed_at timestamptz,created_at timestamptz default now(),last_sign_in_at timestamptz);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
    -- Test-only clock replacement in this disposable database, not a production hook.
    select set_config('test.now','2026-10-20 10:00:00+02',false);
    create or replace function pg_catalog.now() returns timestamptz language sql stable as
      $$select current_setting('test.now')::timestamptz$$;`);
  for (const f of migrations.filter(f => f < '202610200001')) await db.exec(sql(f));
  let seq = 0;
  const uid = () => `01000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
  const as = async (id, role = 'authenticated') => {
    await db.exec('reset role');
    await q("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']);
    await db.exec(`set role ${role}`);
  };
  const player = async (alias, { verified = false, seed = false } = {}) => {
    await db.exec('reset role'); const id = uid();
    await q('insert into auth.users(id,is_anonymous,email,email_confirmed_at) values($1,$2,$3,$4)',
      [id,!verified,verified?'synthetic@example.invalid':null,verified?'2026-10-01':null]);
    if (alias) await q('insert into leaderboard_private.profiles(user_id,alias,is_seed) values($1,$2,$3)',[id,alias,seed]);
    return id;
  };
  const unlock = async () => {
    await db.exec("reset role; update leaderboard_private.profiles set last_write_at=clock_timestamp()-interval '11 seconds'");
  };
  const migrate = async () => {
    await db.exec('reset role');
    for (const f of migrations.filter(f => f >= '202610200001')) {
      if (!/^[\x00-\x7f]*$/.test(sql(f))) throw new Error(`${f}: must be ASCII`);
      await db.exec(sql(f)); await db.exec(sql(f));
    }
  };
  const at = async t => { await db.exec('reset role'); await q("select set_config('test.now',$1,false)",[t]); };
  return { db, q, uid, as, player, unlock, migrate, at };
}
