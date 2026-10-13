// Nickname rules: src/services/alias-rules.js checkAlias (shape, Unicode abuse, insults, Scunthorpe), its SQL mirror in
// supabase/migrations/202609280009_alias_hardening.sql + 0010_alias_mulassa_allowed + 0012_alias_no_spaces +
// 0013_alias_severe_substrings (same answers on PGlite),
// the refusal messages (which part is the problem, and what to do), and the seed + cleanup SQL.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { checkAlias, ALIAS_TERMS, ALIAS_ALLOW, ALIAS_MESSAGES, SERVER_ACCEPTS_EXTRAS, termMessage } from '../src/services/alias-rules.js';
import { normalizeAlias } from '../src/services/leaderboard-rules.js';

const sql = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
// [typed, expected alias | reason]; extras: '_' and l·l (server proposal applied)
const OK = [
  ['Marc', 'Marc'], ['Marta', 'Marta'], ['  Ànec   ', 'Ànec'], ['\tDrac101\u00A0', 'Drac101'], [' d’Òdena ', 'd’Òdena'], ['A\u0300nec', 'Ànec'], ['Núria', 'Núria'],
  ['Calçotaire', 'Calçotaire'], ['GrallerDeValls', 'GrallerDeValls'], ['Portador-3', 'Portador-3'], ['Iñaki', 'Iñaki'],
  ['Pol', 'Pol'], ['Xavi2026', 'Xavi2026'], ["L'Arnau", "L'Arnau"], ['Marc--Valls', 'Marc-Valls'], ['Marc–Valls', 'Marc-Valls'],
  ['-Pau-', 'Pau'], ['- Pau -', 'Pau'], ['LaiaPuig', 'LaiaPuig'], ['Ma\u200Brc', 'Marc'], ['\u202EcraM', 'craM'],
  ['Marc\u2066\u2069', 'Marc'], ['Mar\u00ADta', 'Marta'], ['\uFEFFJordi', 'Jordi'], ['Timbaler100', 'Timbaler100'], ['Mulasser999', 'Mulasser999'],
  ['Castellera555', 'Castellera555'], ['Capgròs314', 'Capgròs314'], ['Aaa', 'Aaa'], ['PereAnna', 'PereAnna'], ['CollaVella', 'CollaVella'],
  // Scunthorpe: names and words that contain a blocked piece
  ['Anna', 'Anna'], ['Pere', 'Pere'], ['Gemma', 'Gemma'], ['Montse', 'Montse'], ['Glòria', 'Glòria'], ['Sergi', 'Sergi'],
  ['Bernat', 'Bernat'], ['Cugat', 'Cugat'], ['Cunit', 'Cunit'], ['Pollastre', 'Pollastre'], ['Pollença', 'Pollença'], ['Pola', 'Pola'],
  ['Diputat', 'Diputat'], ['LaDisputa', 'LaDisputa'], ['Badminton', 'Badminton'], ['Culla', 'Culla'], ['Hércules', 'Hércules'],
  ['Pascual', 'Pascual'], ['Maricarmen', 'Maricarmen'], ['Maricel', 'Maricel'], ['Nazim', 'Nazim'], ['Yoshito', 'Yoshito'],
  ['Scunthorpe', 'Scunthorpe'], ['Vergara', 'Vergara'], ['Cabrera', 'Cabrera'], ['Dickens', 'Dickens'], ['Retard', 'Retard'],
  // "mulassa" is not reserved (0010): fans may use it
  ['Mulassa', 'Mulassa'], ['mulassafan', 'mulassafan'], ['LaMulassa', 'LaMulassa'], ['MULASSA', 'MULASSA'],
  ['Mul4ssa', 'Mul4ssa'], ['Mulasa', 'Mulasa'],
  // severe terms match glued (0013), but not inside these real names and words (allowlist), nor "sieg" / "88" alone
  ['Nazira', 'Nazira'], ['Nazir', 'Nazir'], ['Ignazio', 'Ignazio'], ['Ashkenazi', 'Ashkenazi'], ['Nazaret', 'Nazaret'],
  ['Sheila', 'Sheila'], ['SheilaPuig', 'SheilaPuig'], ['Heilbronn', 'Heilbronn'], ['Heidi', 'Heidi'], ['Siegfried', 'Siegfried'],
  ['Sosiego', 'Sosiego'], ['Siega', 'Siega'], ['Therapist', 'Therapist'], ['Terapista', 'Terapista'], ['Trappist', 'Trappist'],
  ['Pau88', 'Pau88'], ['Neus88', 'Neus88'], ['Anna1988', 'Anna1988'], ['Laia1448', 'Laia1448'], ['Violeta', 'Violeta'],
  ['ViolaCasals', 'ViolaCasals'], ['Ignasi', 'Ignasi'], ['Holanda', 'Holanda'], ['Kika', 'Kika'], ['Fuster', 'Fuster'],
  ['Incés', 'Incés'], ['Drac101', 'Drac101'], ['Hilari', 'Hilari'], ['Heura', 'Heura'], ['Sílvia', 'Sílvia'],
];
const BAD = [
  ['', 'length'], ['   ', 'length'], ['x', 'length'], ['Ma', 'length'], ['a'.repeat(17), 'length'], ['Supercalifragilistic', 'length'],
  ['<script>', 'chars'], ['<img onerror=alert(1)>', 'chars'], ["'; DROP TABLE entries--", 'chars'], ['Robert"); --', 'chars'],
  ['a@example.com', 'chars'], ['🎮🎮🎮', 'chars'], ['Marc😀', 'chars'], ['Marc\u200D😀', 'chars'], ['Маrc', 'chars'], ['Mαrc', 'chars'],
  ['Ｍａｒｃ', 'chars'], ['𝐌𝐚𝐫𝐜', 'chars'], ['a\u0301\u0301\u0301b', 'chars'], ['Z\u0336a\u0336l\u0336g\u0336o', 'chars'], ['Marc!', 'chars'],
  ['p.u.t.a', 'chars'], ['50%', 'chars'], ['123', 'letters'], ['2026-09', 'letters'],
  ['Aaaa', 'repeat'], ['Mooooolt', 'repeat'], ['10000Pol', 'repeat'],
  // no spaces (0012): any whitespace inside is refused, never removed; the ends are trimmed
  ['Drac 101', 'spaces'], ['Timbaler 100', 'spaces'], ['  Ànec   d’Òdena ', 'spaces'], ['Xavi 2026', 'spaces'], ["L' Arnau", 'spaces'],
  ['Marc - Valls', 'spaces'], ['Laia\u00A0\u00A0Puig', 'spaces'], ['Laia\tPuig', 'spaces'], ['Laia\u3000Puig', 'spaces'],
  ['Laia\u200B Puig', 'spaces'], ['La Mulassa', 'spaces'], ['Colla Vella', 'spaces'], ['a b', 'spaces'], ['Marc!  Pau', 'chars'],
  ['p u t a', 'spaces'], ['Fill de puta', 'spaces'], ['Nazi 88', 'spaces'], ['c u l', 'spaces'], ['Marc Cul', 'spaces'], ['10000 Pol', 'spaces'],
  // insults and slurs, with case, accents, leetspeak, repeats, separators and glued words
  ['Puta', 'blocked'], ['PUTA', 'blocked'], ['put4', 'blocked'], ['Pvta', null], ['p-u-t-a', 'blocked'], ["p'u-t'a", 'blocked'],
  ['Puuuta', 'blocked'], ['ElPutaAmo', 'blocked'], ['disputaputa', 'blocked'], ['FillDePuta', 'blocked'], ['Hijoputa', 'blocked'],
  ['Merda', 'blocked'], ['M3rd4', 'blocked'], ['Mierda', 'blocked'], ['Cabró', 'blocked'], ['Cabron', 'blocked'], ['Cabrona', 'blocked'],
  ['Malparit', 'blocked'], ['Gilipolles', 'blocked'], ['Gilipollas', 'blocked'], ['Imbècil', 'blocked'], ['Idiota', 'blocked'],
  ['Subnormal', 'blocked'], ['Polla', 'blocked'], ['Po11a', 'blocked'], ['Chupapollas', 'blocked'], ['Maricón', 'blocked'],
  ['Marica', 'blocked'], ['Bollera', 'blocked'], ['Sudaca', 'blocked'], ['Negrata', 'blocked'], ['Xarnego', 'blocked'],
  ['Catalufo', 'blocked'], ['Hitler', 'blocked'], ['Nazi', 'blocked'], ['Nazi-88', 'blocked'], ['N4zi', 'blocked'],
  ['Cul', 'blocked'], ['c-u-l', 'blocked'], ['MarcCul', 'blocked'], ['Cul0', 'blocked'], ['Fuck', 'blocked'], ['fuuuck', 'blocked'],
  ['f-u-c-k', 'blocked'], ['Sh1t', 'blocked'], ['Bitch', 'blocked'], ['N1gga', 'blocked'], ['Nigger', 'blocked'], ['Cunt', 'blocked'],
  // severe (0013): glued to digits or other words, leetspeak, the digits themselves
  ['Nazi88', 'blocked'], ['Nazi1488', 'blocked'], ['xHitlerx', 'blocked'], ['SiegHeil', 'blocked'], ['siegheil', 'blocked'],
  ['h1tl3r', 'blocked'], ['HitlerFan', 'blocked'], ['N4zi88', 'blocked'], ['NaziFan', 'blocked'], ['LaNazi', 'blocked'],
  ['Pau1488', 'blocked'], ['14-88x', 'blocked'], ['KKKlan', 'blocked'], ['Führer', 'blocked'], ['WaffenSS', 'blocked'],
  ['Holocausto', 'blocked'], ['Gestapo', 'blocked'], ['WhitePower', 'blocked'], ['Violador', 'blocked'], ['Rapist99', 'blocked'],
  ['xNiggerx', 'blocked'], ['Pedophile', 'blocked'],
  ['Dick', 'blocked'], ['Joder', 'blocked'], ['Cojones', 'blocked'], ['Collons', 'blocked'], ['Zorra', 'blocked'], ['KKK', 'blocked'],
  // brand, organisers and staff
  ['Admin', 'reserved'], ['admin1', 'reserved'], ['Adm1n', 'reserved'], ['Administrador', 'reserved'], ['Moderador', 'reserved'],
  ['Ajuntament', 'reserved'], ['AjuntamentValls', 'reserved'], ['Ayuntamiento', 'reserved'], ['Oficial', 'reserved'], ['Staff', 'reserved'],
  ['Suport', 'reserved'], ['null', 'reserved'],
];
const DEFAULT_ONLY = [['Pol·lo', 'chars'], ['Portador_3', 'chars'], ['Col.la', 'chars']];
const EXTRAS = [ // only once the server accepts them
  ['Portador_3', 'Portador_3'], ['Col·laVella', 'Col·laVella'], ['Col.laVella', 'Col·laVella'], ['Col·la Vella', 'spaces'], ['Coŀla', 'Col·la'],
  ['Pol•lo', 'Pol·lo'], ['a__b__c', 'a_b_c'], ['Marc _ Pau', 'spaces'], ['Marc_-Pau', 'Marc_Pau'], ['_Pau_ ', 'Pau'], ['Pau·', 'Pau'], ['Pa·u', 'chars'], ['·Al·la·', 'Al·la'],
  ['f_u_c_k', 'blocked'], ['P_U_T_A', 'blocked'], ['Admin_', 'reserved'], ['___', 'length'],
];

const expect = ([typed, want], extras) => {
  const got = checkAlias(typed, { extras });
  if (want === null) return assert(got.ok, `${JSON.stringify(typed)} should be accepted`);
  if (ALIAS_MESSAGES[want]) {
    assert.equal(got.reason, want, `${JSON.stringify(typed)} → ${want}`);
    assert.equal(got.message, termMessage(want, got.match), 'blocked/reserved name the matched piece');
    if (want === 'blocked' || want === 'reserved') assert(got.term && got.match, `${JSON.stringify(typed)} says which part`);
    else assert.equal(got.message, ALIAS_MESSAGES[want]);
    assert.equal(got.alias, null);
  } else assert.deepEqual([got.ok, got.alias], [true, want], `${JSON.stringify(typed)} → ${want}`);
};
assert.equal(SERVER_ACCEPTS_EXTRAS, true, 'the server rules (202609280009) are live: _ and l·l accepted');
for (const c of [...OK, ...BAD]) { expect(c, false); expect(c, true); }
for (const c of DEFAULT_ONLY) expect(c, false);
for (const c of EXTRAS) expect(c, true);
assert.equal(checkAlias(null).reason, 'length');
// the refusal names the part of the nickname that is the problem, as typed, and says what to do next
const MESSAGES = [
  ['p-u-t-a', 'puta', 'Aquest sobrenom conté «p-u-t-a», que no es pot fer servir. Tria’n un altre.'],
  ['P_U_T_A', 'puta', 'Aquest sobrenom conté «P_U_T_A», que no es pot fer servir. Tria’n un altre.'],
  ['Put4', 'puta', 'Aquest sobrenom conté «Put4», que no es pot fer servir. Tria’n un altre.'],
  ['ElPutaAmo', 'puta', 'Aquest sobrenom conté «Puta», que no es pot fer servir. Tria’n un altre.'],
  ['Puuuta', 'puta', 'Aquest sobrenom conté «Puuuta», que no es pot fer servir. Tria’n un altre.'],
  ['FillDePuta', 'puta', 'Aquest sobrenom conté «Puta», que no es pot fer servir. Tria’n un altre.'],
  ['M3rd4', 'merda', 'Aquest sobrenom conté «M3rd4», que no es pot fer servir. Tria’n un altre.'],
  ['Chupapollas', 'polla', 'Aquest sobrenom conté «polla», que no es pot fer servir. Tria’n un altre.'],
  ['c-u-l', 'cul', 'Aquest sobrenom conté «c-u-l», que no es pot fer servir. Tria’n un altre.'],
  ['MarcCul', 'cul', 'Aquest sobrenom conté «Cul», que no es pot fer servir. Tria’n un altre.'],
  ['Nazi-88', 'nazi', 'Aquest sobrenom conté «Nazi», que no es pot fer servir. Tria’n un altre.'],
  ['Nazi88', 'nazi', 'Aquest sobrenom conté «Nazi», que no es pot fer servir. Tria’n un altre.'],
  ['SiegHeil', 'heil', 'Aquest sobrenom conté «Heil», que no es pot fer servir. Tria’n un altre.'],
  ['h1tl3r', 'hitler', 'Aquest sobrenom conté «h1tl3r», que no es pot fer servir. Tria’n un altre.'],
  ['Pau1488', '1488', 'Aquest sobrenom conté «1488», que no es pot fer servir. Tria’n un altre.'],
  ['Drac De Valls', null, 'No pot tenir espais. Ajunta les paraules, per exemple DracDeValls.'],
  ['Admin', 'admin', '«Admin» està reservat. Tria’n un altre.'],
  ['admin1', 'admin', '«admin» està reservat. Tria’n un altre.'],
  ['Adm1n', 'admin', '«Adm1n» està reservat. Tria’n un altre.'],
  ['Administrador', 'admin', '«Admin» està reservat. Tria’n un altre.'],
  ['AjuntamentValls', 'ajuntament', '«Ajuntament» està reservat. Tria’n un altre.'],
  ['Staff', 'staff', '«Staff» està reservat. Tria’n un altre.'],
];
for (const [typed, term, message] of MESSAGES) {
  const got = checkAlias(typed);
  assert.deepEqual([got.ok, got.term, got.message], [false, term, message], `message for ${JSON.stringify(typed)}`);
}
assert.equal(termMessage('blocked'), 'Aquest sobrenom no es pot fer servir. Tria’n un altre.', 'no piece: the generic message');
for (const m of Object.values(ALIAS_MESSAGES)) assert.match(m, /\. [A-ZÀ-Ú][^.]*\.$/u, `«${m}» ends with what to do next`);
assert.equal(checkAlias('Col·la').alias, 'Col·la', 'l·l accepted now that the server rules are live');
// Accepted by default ⇒ accepted by the live client/server contract, unchanged
for (const [typed] of [...OK, ...BAD]) {
  const got = checkAlias(typed);
  if (got.ok) assert.equal(normalizeAlias(got.alias), got.alias, `${got.alias} passes the live normalizeAlias`);
}
for (const [term, mode, reason, severe] of ALIAS_TERMS) {
  assert(['sub', 'word'].includes(mode) && ['blocked', 'reserved'].includes(reason) && typeof severe === 'boolean');
  assert(severe ? mode === 'sub' && reason === 'blocked' && /^[a-z0-9]+$/.test(term) : /^[a-z]+$/.test(term), term);
}
// the 16 seed players (tests/fixtures/seed-leaderboard-2026.sql, live in production) keep their nicknames
const SEED_ALIASES = ['laiaxx', 'paquet07', 'MartaaVLS', 'jordi2003', 'claraaa', 'emiliu', 'POL2011', 'mireia-vls', 'arnau99',
  'OriolCastells', 'bertitaa', 'medinet', 'dolors66', 'ainaa04', 'nuriaPB', 'xavi43800'];
for (const a of SEED_ALIASES) assert.equal(checkAlias(a).alias, a, `seed alias ${a} passes checkAlias`);

const SEED_AUTH = `create role anon; create role authenticated; create role service_role; create schema auth;
  create table auth.users(instance_id uuid, id uuid primary key, aud text, role text, is_anonymous boolean not null default false,
    created_at timestamptz default now(), updated_at timestamptz, last_sign_in_at timestamptz, raw_app_meta_data jsonb,
    raw_user_meta_data jsonb, confirmation_token text, recovery_token text, email_change_token_new text, email_change text);
  create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`;
const live = ['supabase/migrations/202609270001_leaderboards.sql', 'supabase/migrations/202609270002_retention.sql'];
const db = new PGlite();
try {
  await db.exec(SEED_AUTH);
  for (const f of live) await db.exec(sql(f));
  const server = async typed => {
    try { return { ok: true, alias: (await db.query('select leaderboard_private.normalized_alias($1) a', [typed])).rows[0].a }; }
    catch (e) { return { ok: false, blocked: /leaderboard_invalid_alias_blocked/.test(e.message), spaces: /leaderboard_invalid_alias_spaces/.test(e.message) }; }
  };
  for (const [typed] of [...OK, ...BAD]) { // today's server accepts whatever the client lets through, unchanged
    const got = checkAlias(typed);
    if (got.ok) assert.deepEqual(await server(got.alias), { ok: true, alias: got.alias }, `live server takes ${got.alias}`);
  }

  // --- the seed, on the live schema: 10/9/3 believable rows per level, all removable (raw rows: from 0014 the board
  // hides one seed per real player per level, never deletes them; tests/seed-phaseout.mjs)
  await db.query("insert into auth.users(id, is_anonymous) values ('0f0f0f0f-0000-4000-8000-000000000001', true)"); // a real player
  await db.query(`insert into leaderboard_private.profiles(user_id, alias) values ('0f0f0f0f-0000-4000-8000-000000000001', 'Real')`);
  await db.query(`insert into leaderboard_private.entries(user_id, version, difficulty, perfect, good, miss, score, max_combo)
    values ('0f0f0f0f-0000-4000-8000-000000000001', 'mulassa-v1', 0, 100, 30, 20, 50000, 40)`);
  await db.exec(sql('tests/fixtures/seed-leaderboard-2026.sql'));
  const judgments = [150, 181, 318];
  for (let d = 0; d < 3; d++) {
    const rows = (await db.query(`select p.alias, 20::numeric * e.quality_units / v.judgments as quality from leaderboard_private.entries e
      join leaderboard_private.profiles p using (user_id) join leaderboard_private.versions v using (version, difficulty)
      where e.version = 'mulassa-v1' and e.difficulty = $1`, [d])).rows; // each level's rows (the per-level board is gone)
    assert.equal(rows.length, [11, 9, 3][d]);
    assert(rows.every(r => Number(r.quality) < 100));
    for (const r of rows) if (r.alias !== 'Real') assert.equal(checkAlias(r.alias).alias, r.alias, `seed alias ${r.alias} passes checkAlias`);
    const raw = (await db.query(`select perfect, good, miss, max_combo, achieved_at from leaderboard_private.entries
      where difficulty = $1 and user_id::text like '5eed2026-%'`, [d])).rows;
    assert(raw.every(r => r.perfect + r.good + r.miss === judgments[d] && r.max_combo <= r.perfect + r.good && r.achieved_at < new Date()));
  }
  const aliases = (await db.query("select alias from leaderboard_private.profiles where user_id::text like '5eed2026-%'")).rows.map(r => r.alias);
  assert(!aliases.includes('marcgs') && aliases.includes('MartaaVLS') && aliases.length === 16);
  await assert.rejects(db.exec(sql('tests/fixtures/seed-leaderboard-2026.sql')), /seed already present/);
  await db.exec('rollback');
  await db.exec(sql('tests/fixtures/seed-leaderboard-2026-cleanup.sql'));
  assert.equal((await db.query("select count(*)::int n from auth.users where id::text like '5eed2026-%'")).rows[0].n, 0);
  assert.equal((await db.query('select count(*)::int n from leaderboard_private.entries')).rows[0].n, 1, 'cleanup keeps real players');

  // --- the migrations (0009, then 0010: "mulassa" allowed) give the same answers as checkAlias with extras
  await db.exec(sql('supabase/migrations/202609280009_alias_hardening.sql'));
  await db.exec(sql('supabase/migrations/202609280010_alias_mulassa_allowed.sql'));
  await db.exec(sql('supabase/migrations/202609280010_alias_mulassa_allowed.sql')); // idempotent
  await db.exec(sql('supabase/migrations/202609280011_restore_unique_alias.sql'));
  { // 0012 joins the words of the existing aliases with spaces; every new one passes the rules and stays unique
    const old = [['Colla Vella', 'CollaVella'], ['Drac  De Valls', 'DracDeValls'], ['Cu lo Fan', 'Cu-lo-Fan'], // glued: «CuloFan» is blocked
      ['Aa aa', 'Aa-aa'], ['Маrc Pau', 'Jugador'], ['Мarc Pol', 'Jugador2'], ['Pau', 'Pau']]; // non-Latin (old rules): a fresh one
    for (const [i, [alias]] of old.entries()) {
      const id = `0f0f0f0f-0000-4000-8000-00000000010${i}`;
      await db.query('insert into auth.users(id, is_anonymous) values ($1, true)', [id]);
      await db.query('insert into leaderboard_private.profiles(user_id, alias, created_at) values ($1, $2, now() + $3 * interval \'1 second\')', [id, alias, i]);
    }
    await db.exec(sql('supabase/migrations/202609280012_alias_no_spaces.sql'));
    await db.exec(sql('supabase/migrations/202609280012_alias_no_spaces.sql')); // idempotent: nothing left to rename
    const got = (await db.query("select alias from leaderboard_private.profiles where user_id::text like '0f0f0f0f-0000-4000-8000-0000000001%' order by created_at")).rows.map(r => r.alias);
    assert.deepEqual(got, old.map(o => o[1]), 'aliases with spaces joined, deterministically');
    for (const a of got) assert.equal(checkAlias(a).alias, a, `renamed ${a} passes checkAlias`);
    await assert.rejects(db.query("select leaderboard_private.check_alias_free('Drac 101', gen_random_uuid())"), /leaderboard_invalid_alias_spaces/);
    await db.query("select leaderboard_private.check_alias_free('Drac101', gen_random_uuid())");
    await db.query("delete from auth.users where id::text like '0f0f0f0f-0000-4000-8000-0000000001%'");
  }
  await db.exec(sql('supabase/migrations/202609280013_alias_severe_substrings.sql'));
  await db.exec(sql('supabase/migrations/202609280013_alias_severe_substrings.sql')); // idempotent
  assert.equal((await db.query("select count(*)::int n from leaderboard_private.alias_terms where term like 'mulas%'")).rows[0].n, 0);
  const terms = (await db.query('select term, mode, reason, severe from leaderboard_private.alias_terms order by term')).rows.map(r => [r.term, r.mode, r.reason, r.severe]);
  assert.deepEqual(terms, ALIAS_TERMS.map(t => [...t]).sort((a, b) => (a[0] < b[0] ? -1 : 1)), 'SQL blocklist = JS blocklist');
  const allow = (await db.query('select word from leaderboard_private.alias_allow order by word')).rows.map(r => r.word);
  assert.deepEqual(allow, [...ALIAS_ALLOW].sort(), 'SQL allowlist = JS allowlist');
  for (const [typed] of [...OK, ...BAD, ...EXTRAS]) {
    const js = checkAlias(typed, { extras: true }), got = await server(typed);
    assert.equal(got.ok, js.ok, `server and client agree on ${JSON.stringify(typed)}`);
    if (js.ok) assert.equal(got.alias, js.alias, `same normalisation of ${JSON.stringify(typed)}`);
    else {
      assert.equal(got.blocked, js.reason === 'blocked' || js.reason === 'reserved', `same kind of refusal for ${JSON.stringify(typed)}`);
      assert.equal(got.spaces, js.reason === 'spaces', `same refusal for the spaces in ${JSON.stringify(typed)}`);
    }
  }
  await db.exec(sql('tests/fixtures/seed-leaderboard-2026.sql')); // the seed also fits the hardened schema
  const seeded = (await db.query("select alias from leaderboard_private.profiles where user_id::text like '5eed2026-%' order by alias")).rows.map(r => r.alias);
  assert.deepEqual(seeded, [...SEED_ALIASES].sort((a, b) => (a < b ? -1 : 1)), 'the seed list above is the real seed');
  for (const a of seeded) {
    assert.deepEqual(await server(a), { ok: true, alias: a }, `seed alias ${a} passes the server`);
    assert.equal((await db.query('select leaderboard_private.alias_rejection($1) r', [a])).rows[0].r, null, `seed alias ${a} not refused`);
  }
  await db.exec(sql('tests/fixtures/seed-leaderboard-2026-cleanup.sql'));
  
{ // every seeded result is one a player could have finished: the ÀNIM (src/game/energy.js) never empties along the way
  const { ENERGY } = await import('../src/game/energy.js');
  const seed = readFileSync(new URL('../tests/fixtures/seed-leaderboard-2026.sql', import.meta.url), 'utf8');
  const rows = [...seed.matchAll(/'5eed2026-[0-9a-f-]+', (\d), +(\d+), +(\d+), +(\d+),/g)].map(m => m.slice(1).map(Number));
  assert(rows.length >= 20);
  for (const [d, p, g, m] of rows) {
    const k = ENERGY[d], margin = 1 + p * k.perfect + g * k.good - m * k.miss;
    assert(margin >= 2.9, `a seeded ${['FÀCIL', 'NORMAL', 'DIFÍCIL'][d]} run ${p}/${g}/${m} would have collapsed`);
  }
}
console.log('alias rules, SQL mirror, seed and cleanup ok');
} catch (error) { console.error(error); process.exitCode = 1; }
finally { await db.close(); }
