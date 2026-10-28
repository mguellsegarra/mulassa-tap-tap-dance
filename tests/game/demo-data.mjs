// The mock leaderboard's demo data (src/dev/demo-data.js, mock-client.js): shaped like the server's answers
// (columns read from supabase/migrations), consistent with its rules, deterministic, and never on a public host.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { mockLeaderboard } from '../../src/dev/mock-leaderboard.js';
import { mockLeaderboardClient } from '../../src/dev/mock-client.js';
import { finalMode, demoOptions, leaderboardPreviewMode } from '../../src/dev/final-test.js';
import { buildWorld, demoCards, bucketProblem, STAT_RULES, PREVIOUS_VERSION } from '../../src/dev/demo-data.js';
import { normalizeAlias, VERSION_RULES } from '../../src/services/leaderboard-rules.js';

const dir = new URL('../../supabase/migrations/', import.meta.url);
const migrations = readdirSync(dir).filter(f => /^(20261020000[1-4]|202610210001)_/.test(f)).sort().map(f => readFileSync(new URL(f, dir), 'utf8')).join('\n');
// the columns of the LAST definition of a public function, in order
const columns = fn => {
  const defs = [...migrations.matchAll(new RegExp(`function public\\.${fn}\\([^)]*\\)\\s*returns table\\(([^)]*)\\)`, 'g'))];
  assert(defs.length, `${fn} is in the migrations`);
  return defs.at(-1)[1].split(',').map(c => c.trim().split(/\s+/)[0].replace(/"/g, ''));
};
const rpc = async (c, name, args) => { const r = await c.rpc(name, args); assert.equal(r.error, null, `${name}: ${r.error?.message}`); return r.data; };
const NOW = Date.parse('2026-11-10T10:00:00Z'), now = () => NOW;
const opts = o => ({ delay: 0, now, ...o });

// the cast: every name passes the game's own nickname rules; guests share names (their tags differ); 20-letter names and #0007 are there
{ const w = buildWorld({ now: NOW }), seen = new Set();
  for (const p of w.people) {
    assert.equal(normalizeAlias(p.alias), p.alias, `${p.alias} is a valid nickname`);
    assert(p.verified === (p.tag === null) && (p.tag === null || (p.tag >= 0 && p.tag <= 9999)));
    const k = `${p.alias.toLowerCase()}#${p.tag}`; assert(!seen.has(k), `unique ${k}`); seen.add(k);
  }
  assert(w.people.some(p => [...p.alias].length === 16 && p.verified) && w.people.some(p => [...p.alias].length === 16 && !p.verified), 'long names, clean and tagged');
  const shared = w.people.filter(p => !p.verified && w.people.filter(q => q.alias === p.alias).length > 2);
  assert(shared.length >= 3, 'several guests with the same name');
  assert(w.people.some(p => !p.verified && w.people.some(q => q.verified && q.alias === p.alias)), 'a guest named like a verified player');
  assert(w.people.some(p => p.tag === 7), '#0007');
}

// the seasons
for (const [world, expected] of [['launch', [[0, 'mulassa-v2-short', 60], [1, 'mulassa-v3', 45], [1, 'drac-v1', 12], [1, 'bou-v1', 10]]],
  ['later', [[0, 'mulassa-v2-short', 60], [1, PREVIOUS_VERSION, 47], [1, 'mulassa-v3', 20], [1, 'drac-v1', 14], [2, 'mulassa-v3', 15], [2, 'drac-v1', 6], [2, 'bou-v1', 8]]]]) {
  const w = buildWorld({ world, now: NOW });
  assert.deepEqual(w.boards.map(b => [b.seasonId, b.version, b.rows.length]), expected, world);
}

// shapes: exactly the SQL return columns (names and order), for every read and write
for (const account of ['guest', 'verified']) {
  const c = mockLeaderboardClient(opts({ account, seasons: 'later' }));
  const board = await rpc(c, 'get_leaderboard_all', { p_version: PREVIOUS_VERSION, p_period: 'all', p_offset: 0, p_limit: 50, p_season: 1 });
  assert(board.length >= 40 && board.every(r => JSON.stringify(Object.keys(r)) === JSON.stringify(columns('get_leaderboard_all'))), 'get_leaderboard_all');
  const row = board.find(r => r.tag !== null && !r.verified);
  assert(row.alias.endsWith(`#${String(row.tag).padStart(4, '0')}`) && row.is_self !== undefined, 'guests are composed «nom#0000»; verified ones are clean');
  assert(board.filter(r => r.verified).every(r => !r.alias.includes('#')));
  for (const d of [0, 1, 2]) { // one level's own ranking: 1, 2, 3 of the players with a result on it
    const lvl = await rpc(c, 'get_level_podium', { p_version: 'mulassa-v3', p_difficulty: d });
    assert(lvl.length === 3 && lvl.every((r, i) => JSON.stringify(Object.keys(r)) === JSON.stringify(columns('get_level_podium')) && r.position === i + 1), `get_level_podium ${d}`);
    assert(lvl[0].score >= lvl[1].score && lvl[1].score >= lvl[2].score && lvl[0].total >= 3);
  }
  const seasons = await rpc(c, 'get_seasons', { p_figure: 'mulassa-valls' });
  assert(seasons.length && seasons.every(r => JSON.stringify(Object.keys(r)) === JSON.stringify(columns('get_seasons'))), 'get_seasons');
  const podium = seasons[0].podium[0]; assert.deepEqual(Object.keys(podium), ['position', 'alias', 'tag', 'score', 'difficulty', 'verified']);
  assert(!podium.alias.includes('#'), 'the podium carries the raw name and its tag');
  const mine = (await rpc(c, 'my_profile', {}))[0]; assert.deepEqual(Object.keys(mine), columns('my_profile'));
  const st = (await rpc(c, 'my_stats', {}))[0]; assert.deepEqual(Object.keys(st), columns('my_stats'));
  const who = demoCards().plain, card = (await rpc(c, 'get_player_card', { p_alias: who.alias, p_tag: who.tag }))[0];
  assert.deepEqual(Object.keys(card), columns('get_player_card')); assert.deepEqual(Object.keys(card.podiums[0] ?? { season_id: 1, version: 1, position: 1 }), ['season_id', 'version', 'position']);
  const sub = await rpc(c, 'submit_result', { p_version: 'mulassa-v3', p_difficulty: 1, p_perfect: 100, p_good: 20, p_miss: 13, p_score: 60000, p_max_combo: 80, p_alias: 'Prova123' });
  assert.deepEqual(Object.keys(sub[0]), columns('submit_result'));
}

// seasons and ranking: the launch world and the later one
{ const s = mockLeaderboard(opts({ account: 'guest' }));
  const list = await s.seasons('mulassa-valls');
  assert.deepEqual(list.map(x => [x.seasonId, x.name, x.version, x.players]), [[1, 'Tardor 2026', 'mulassa-v3', 46], [0, 'Estrena 2026', 'mulassa-v2-short', 60]]);
  assert.equal(list[0].endsAt, Date.parse('2027-01-01T00:00:00+01:00'), 'the open season ends with the calendar quarter (the line\'s days left match)'); assert.equal(list[1].endsAt, null);
  assert.equal(list[0].myPosition, 18, 'the demo guest is #18'); assert.equal(list[1].myPosition, null);
  assert.equal(list[0].podium.length, 3); assert(list[0].podium.every((p, i) => p.position === i + 1 && p.name));
  assert.deepEqual((await s.seasons('drac-valls')).map(x => [x.seasonId, x.players]), [[1, 12]], 'Mulassa and Drac boards are never mixed');
  const old = await s.listAll({ version: list[1].version, season: 0, limit: 5 }); assert.equal(old.length, 5); assert(old.every(r => r.season_id === 0));
  assert.equal((await s.listAll({ version: 'mulassa-v2-short' })).at(0).season_id, 0, 'an old dance still reads season 0');
  await assert.rejects(s.listAll({ season: 9 }), { code: 'board' }); await assert.rejects(s.listAll({ version: 'nope' }), { code: 'board' });
}
{ const s = mockLeaderboard(opts({ account: 'guest', seasons: 'later' }));
  const mulassa = await s.seasons('mulassa-valls');
  assert.deepEqual(mulassa.map(x => [x.seasonId, x.version, x.previousDance, x.players, x.myPosition]),
    [[2, 'mulassa-v3', false, 16, 6], [1, 'mulassa-v3', false, 20, null], [1, PREVIOUS_VERSION, true, 48, 12], [0, 'mulassa-v2-short', false, 60, null]], 'two Mulassa boards in Tardor: the old dance is marked');
  const drac = await s.seasons('drac-valls'); assert.deepEqual(drac.map(x => [x.seasonId, x.players, x.myPosition]), [[2, 6, null], [1, 15, 3]], 'a podium for the demo account');
  assert((await s.listAll()).every(r => r.season_id === 2), 'the open season is Hivern 2027');
  assert(Date.now() > 0 && mulassa[0].startsAt < NOW && mulassa[0].endsAt > NOW && mulassa[1].endsAt < NOW, 'Hivern open, Tardor closed');
  const card = await s.playerCard('Prova123', 4821); assert.deepEqual(card.podiums, [{ seasonId: 1, version: 'drac-v1', position: 3 }]);
}
// empty boards
{ const s = mockLeaderboard(opts({ board: 'empty', account: 'guest' }));
  assert.deepEqual(await s.listAll(), []); assert.deepEqual(await s.listAll({ figure: 'drac-valls' }), []);
  assert.deepEqual((await s.seasons('mulassa-valls')).map(x => x.seasonId), [0], 'no row for a season without results');
  const d = mockLeaderboard(opts({ drac: 'empty' })); assert.deepEqual(await d.listAll({ figure: 'drac-valls' }), []); assert.equal((await d.listAll()).length, 45);
}
{ const s = mockLeaderboard(opts({ board: 'me' })); const rows = await s.listAll(); assert.equal(rows.find(r => r.is_self).position, 48); assert.equal(rows[0].total, 119); }

// cards: totals, podiums, a guest with a shared name, the 20-letter names, a player with no statistics
{ const s = mockLeaderboard(opts({ account: 'guest' })), cards = demoCards();
  const plain = await s.playerCard(cards.plain.alias);
  assert(plain.verified && plain.tag === null && plain.name === plain.alias && Object.keys(plain.totals).length);
  const total = Object.values(plain.totals)[0];
  assert.deepEqual(Object.keys(total).sort(), ['balloons', 'best', 'bestCombo', 'bestStars', 'collapsed', 'completed', 'errors', 'good', 'guapa', 'guapaTotal', 'holds', 'miss', 'perfect', 'runs', 'seconds'].sort());
  assert(!('practice' in plain.totals), 'the public card never has the practice');
  const guest = await s.playerCard(cards.guest.alias, cards.guest.tag); assert(!guest.verified && guest.name === `${guest.alias}#${String(guest.tag).padStart(4, '0')}`);
  assert.notEqual((await s.playerCard(cards.guest.alias, null))?.tag ?? null, cards.guest.tag, 'the clean name and the tagged one are different players');
  for (const k of ['long', 'longGuest', 'padded']) assert((await s.playerCard(cards[k].alias, cards[k].tag)).podiums, k);
  assert.equal([...cards.long.alias].length, 16); assert.equal(cards.padded.tag, 7);
  const bare = await s.playerCard(cards.empty.alias, cards.empty.tag); assert.deepEqual(bare.totals, {}, 'a history-only player has no statistics');
  assert.equal(await s.playerCard('NoExisteix', null), null);
  assert(Object.keys((await s.playerCard('Prova123', 4821)).totals).some(k => k.startsWith('mulassa-valls/mulassa-v3/')), 'the demo account has a card too');
  assert.deepEqual(await mockLeaderboard(opts({ account: 'reserved' })).playerCard('Prova123', 4821), null, 'a profile with no result has no card');
}

// no demo result is above what a perfect run scores (for its counts), on any board
{ const w = buildWorld({ world: 'later', now: NOW });
  for (const b of w.boards) for (const r of b.rows) {
    const rule = VERSION_RULES[b.version] ?? VERSION_RULES['mulassa-v3'], J = rule.judgments[r.difficulty];
    assert(r.perfect + r.good + r.miss === J && r.score <= rule.ceilings[r.difficulty] && r.max_combo <= r.perfect + r.good && r.quality >= 0 && r.quality <= 100, `${b.version} ${r.alias}`);
  } }

// the statistics: every bucket obeys the server's rules; the account has days and streaks; uploads add up
{ const w = buildWorld({ now: NOW }); let n = 0;
  for (const mine of w.stats.values()) for (const [key, c] of Object.entries(mine)) { n++; assert.equal(bucketProblem(key, c), null, key); }
  assert(n > 40);
  assert.equal(bucketProblem('mulassa-valls/mulassa-v2-short/1', {}), 'invalid_bucket', 'the old dance has no statistics');
  assert.equal(bucketProblem('mulassa-valls/mulassa-v3/1', { runs: 1, completed: 2 }), 'invalid_stats');
  // the constants the checks use are the migration's
  assert(migrations.includes(`duration_seconds = ${STAT_RULES['mulassa-v3'].seconds}`) && migrations.includes(`duration_seconds = ${STAT_RULES['drac-v1'].seconds}`));
  assert(migrations.includes(`guapa_count = ${STAT_RULES['mulassa-v3'].guapa[0]}, `) && migrations.includes('(array[12,12,16])'));
  for (const v of ['mulassa-v3', 'drac-v1']) for (const d of [0, 1, 2]) assert(VERSION_RULES[v].judgments[d] > 0);
  const s = mockLeaderboard(opts({ account: 'guest' })), mine = await s.myStats();
  assert.equal(mine.daysPlayed, 12); assert.equal(mine.currentStreak, 4); assert.equal(mine.longestStreak, 6); assert.equal(mine.days.length, 12);
  assert(mine.buckets.practice.runs === 2 && Object.values(mine.buckets).some(b => b.best?.score > 0));
  assert.equal(await mockLeaderboard(opts()).myStats(), null, 'no session, no statistics');
  const key = Object.keys(mine.buckets).find(k => k.startsWith('mulassa-valls/mulassa-v3/')), before = mine.buckets[key], J = VERSION_RULES['mulassa-v3'].judgments[+key.slice(-1)];
  await s.syncStats({ owner: 'prova', device: 'dev-2', buckets: { [key]: { runs: 2, completed: 2, collapsed: 0, seconds: 100, perfect: 2 * J - 66, good: 40, miss: 26, guapa: 3, guapaTotal: 20, balloons: 0, holds: 0, bestCombo: 30, bestStars: 1, best: null } }, days: ['2026-11-10', '2026-11-09'] });
  const sum = (await s.myStats()).buckets[key];
  assert.equal(sum.runs, before.runs + 2); assert.equal(sum.bestCombo, Math.max(before.bestCombo, 30)); assert.deepEqual(sum.best, before.best, 'the better whole run stays');
  await assert.rejects(s.syncStats({ owner: 'prova', device: 'dev-2', buckets: {}, days: [] }), { code: 'rate_limit' });
  const t = { n: NOW }, later = mockLeaderboard(opts({ account: 'guest', now: () => t.n }));
  await later.syncStats({ owner: 'prova', device: 'a', buckets: { practice: { runs: 2, seconds: 50 } }, days: [] }); t.n += 61000;
  await assert.rejects(later.syncStats({ owner: 'prova', device: 'a', buckets: { practice: { runs: 1, seconds: 50 } }, days: [] }), { code: 'stats' }, 'numbers never go down');
  await assert.rejects(later.syncStats({ owner: 'prova', device: 'a', buckets: {}, days: ['2025-01-01'] }), { code: 'stats' }, 'a day before the launch');
  for (let i = 0; i < 8; i++) { t.n += 61000; await later.syncStats({ owner: 'prova', device: `d${i}`, buckets: {}, days: [] }).catch(e => assert.equal(e.code, 'device')); }
  t.n += 61000; await assert.rejects(later.syncStats({ owner: 'prova', device: 'one-more', buckets: {}, days: [] }), { code: 'device' }, 'at most 8 devices');
}

// deterministic, offline, and never on a public host
{ const a = JSON.stringify(buildWorld({ now: NOW, world: 'later' }).boards), b = JSON.stringify(buildWorld({ now: NOW, world: 'later' }).boards); assert.equal(a, b);
  globalThis.fetch = () => { throw new Error('the mock must never fetch'); };
  await mockLeaderboard(opts({ account: 'verified' })).seasons('drac-valls');
  for (const hostname of ['mulassa.cat', 'www.mulassa.cat', 'mulassa-tap-tap-dance.pages.dev', 'abc.pages.dev', '8.8.8.8', '']) {
    for (const search of ['?final&seasons=later&account=guest&board=empty&drac=empty&card=Timbaler', '?final&review=season-end', '?mock&seasons=later'])
      assert.equal(finalMode({ hostname, search }), null, `${hostname} ${search}`);
    assert.equal(leaderboardPreviewMode({ hostname, search: '?mock&seasons=later', configured: false }), false, hostname);
  }
  assert.equal(leaderboardPreviewMode({ hostname: 'localhost', search: '?mock&seasons=later', configured: true }), true);
  assert.deepEqual(demoOptions('?mock&seasons=later&account=verified'), { account: 'verified', seasons: 'later' });
}
// the Perfil statistics read as one player's: a missed GUAPA is an ERROR, a streak is of hits, every run's % is its own counts',
// and the same URL on the same day shows the same numbers (QA: «240 PERFECTE · 0 ERROR» next to «7 de 10 cops dobles» at 88%)
{ const sane = (where, key, c) => {
    assert.equal(bucketProblem(key, c), null, `${where} ${key}`);
    assert(c.guapaTotal - c.guapa <= c.miss, `${where} ${key}: ${c.guapaTotal - c.guapa} GUAPA missed, ${c.miss} ERROR`);
    assert(c.bestCombo <= c.perfect + c.good, `${where} ${key}: streak ${c.bestCombo} over ${c.perfect + c.good} hits`);
  };
  const quality = (where, r) => { const J = r.perfect + r.good + r.miss; assert(J > 0 && Math.abs(r.quality - 100 * (r.perfect + 0.8 * r.good) / J) < 0.06, `${where}: ${r.quality}% from its counts`); };
  for (const seasons of ['launch', 'later', 'many']) for (const board of [null, 'me']) {
    const w = buildWorld({ world: seasons, board, now: NOW });
    for (const b of w.boards) for (const r of b.rows) quality(`${seasons}/${board} ${b.version} ${r.alias}`, r);
    for (const mine of w.stats.values()) for (const [key, c] of Object.entries(mine)) sane(`${seasons}/${board} cast`, key, c);
    for (const account of ['guest', 'verified']) {
      const read = async () => (await mockLeaderboard(opts({ seasons, board, account })).myStats()).buckets, a = await read();
      for (const [key, c] of Object.entries(a)) if (key !== 'practice') sane(`${seasons}/${board} ${account}`, key, c);
      assert.deepEqual(await read(), a, `${seasons}/${board} ${account}: deterministic`);
    }
  }
}
console.log('demo-data: ok');
