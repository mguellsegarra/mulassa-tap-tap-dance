// The project's test suite (npm run check): every *.mjs under tests/ that no other test imports (an imported one is part of
// its importer, e.g. render-quality.mjs's `import './fps.mjs'`), plus check.mjs and the Python tests below, so a new test
// only needs its file. FIRST runs first (quick, broad); the rest in path order. Every test runs even after a failure, and
// the failures are listed at the end. Arguments filter by path: `node tests/run.mjs drac` (any path containing "drac"),
// `node tests/run.mjs db/ ui/`; `--group=leaderboard` runs the leaderboard set; `--bail` stops at the first failure.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const FIRST = ['check.mjs', 'tests/build/modules.mjs'];
// Python tests run through uv with these packages (the generators' own environment); tests/db/db_backup_test.py runs from db-backup.mjs.
const PYTHON = [
  { py: 'tests/figures/drac/drac-audio.py', uv: '--python 3.11 --with numpy --with scipy --with soundfile --with mido' },
];
const files = [];
const walk = dir => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.mjs')) files.push(p); } };
walk(join(root, 'tests'));
const imported = new Set([fileURLToPath(import.meta.url)]);
for (const f of files) for (const [, spec] of readFileSync(f, 'utf8').matchAll(/(?:^import\s+|\sfrom\s+|import\(\s*)'(\.{1,2}\/[^']+\.mjs)'/gm)) imported.add(resolve(dirname(f), spec));
const found = files.filter(f => !imported.has(f)).map(f => relative(root, f)).filter(f => !FIRST.includes(f)).sort();
const TESTS = [...FIRST, ...found, ...PYTHON];
const GROUPS = { leaderboard: ["tests/services/leaderboard.mjs", "tests/db/leaderboard-db.mjs", "tests/services/leaderboard-delete.mjs", "tests/services/alias-rules.mjs", "tests/services/leaderboard-all.mjs", "tests/services/seed-phaseout.mjs", "tests/game/score-ceiling.mjs", "tests/ui/board-ui.mjs", "tests/ui/profile-ui.mjs", "tests/services/captcha.mjs", "tests/db/short-ranking-db.mjs", "tests/db/record-by-score-db.mjs", "tests/game/score-scale.mjs", "tests/db/seasons-db.mjs", "tests/db/player-stats-db.mjs"] };

const args = process.argv.slice(2), bail = args.includes('--bail');
const group = args.find(a => a.startsWith('--group='))?.slice(8);
const filters = args.filter(a => !a.startsWith('--'));
if (group && !GROUPS[group]) { console.error(`unknown group: ${group} (${Object.keys(GROUPS).join(', ')})`); process.exit(2); }
const pathOf = t => typeof t === 'string' ? t : t.py;
const chosen = TESTS.filter(t => (!group || GROUPS[group].includes(pathOf(t))) && (!filters.length || filters.some(f => pathOf(t).includes(f))));
if (!chosen.length) { console.error('no test matches'); process.exit(2); }

const failed = [];
for (const t of chosen) {
  const [cmd, argv] = typeof t === 'string' ? [process.execPath, [t]] : ['uv', ['run', ...t.uv.split(/\s+/), 'python', t.py]];
  const r = spawnSync(cmd, argv, { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) { failed.push(pathOf(t)); if (bail) break; }
}
console.log(`\n${chosen.length - failed.length}/${chosen.length} tests passed${failed.length ? `; failed:\n  ${failed.join('\n  ')}` : ''}`);
process.exit(failed.length ? 1 : 0);
