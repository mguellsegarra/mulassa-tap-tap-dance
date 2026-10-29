// The project's test suite (npm run check): every *.mjs under tests/ that no other test imports (an imported one is part of
// its importer, e.g. render-quality.mjs's `import './finale-effects.mjs'`), plus check.mjs and the Python tests below, so a new test
// only needs its file. Tests run in parallel (`--jobs=N`, default half the idle cores; each test's output is printed whole when it
// ends), FIRST first; ALONE ones (a real browser, or they time themselves) run one by one afterwards. Every test runs even
// after a failure, and the failures are listed at the end. Arguments filter by path: `node tests/run.mjs drac` (any path
// containing "drac"), `node tests/run.mjs db/ ui/`; `--group=leaderboard` runs the leaderboard set; `--bail` stops at the
// first failure.
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { availableParallelism, loadavg } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
// Quick and broad, then the longest, so they don't start last and leave the run waiting on them.
const FIRST = ['check.mjs', 'tests/build/modules.mjs', 'tests/render/render-quality.mjs', 'tests/figures/drac/drac-compare-comic.mjs', 'tests/db/short-ranking-db.mjs', 'tests/figures/drac/drac-compare.mjs'];
// The mocked-DOM render tests fake performance.now, so they share the machine; these drive a real browser or time themselves.
const ALONE = t => ['tests/render/gl-budget.mjs', 'tests/render/prod-play.mjs', 'tests/build/audio.mjs'].includes(t);
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
// Default: half the cores, fewer when other work (another agent's check, browsers) already loads the machine.
const cores = availableParallelism(), idle = Math.floor(cores - loadavg()[0]);
const jobs = Math.max(1, Number(args.find(a => a.startsWith('--jobs='))?.slice(7)) || Math.min(Math.floor(cores / 2), idle));
const group = args.find(a => a.startsWith('--group='))?.slice(8);
const filters = args.filter(a => !a.startsWith('--'));
if (group && !GROUPS[group]) { console.error(`unknown group: ${group} (${Object.keys(GROUPS).join(', ')})`); process.exit(2); }
const pathOf = t => typeof t === 'string' ? t : t.py;
const chosen = TESTS.filter(t => (!group || GROUPS[group].includes(pathOf(t))) && (!filters.length || filters.some(f => pathOf(t).includes(f))));
if (!chosen.length) { console.error('no test matches'); process.exit(2); }

const failed = [], running = new Set();
let ran = 0, stop = false;
const run = t => new Promise(done => {
  const [cmd, argv] = typeof t === 'string' ? [process.execPath, [t]] : ['uv', ['run', ...t.uv.split(/\s+/), 'python', t.py]];
  const start = Date.now(), out = [], child = spawn(cmd, argv, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  running.add(child);
  child.stdout.on('data', d => out.push(d));
  child.stderr.on('data', d => out.push(d));
  child.on('error', e => out.push(Buffer.from(`${e.message}\n`)));
  child.on('close', code => {
    running.delete(child);
    if (stop) return done(); // killed by --bail
    ran++;
    process.stdout.write(`\n── ${pathOf(t)} ${code === 0 ? 'ok' : 'FAILED'} (${((Date.now() - start) / 1000).toFixed(1)} s)\n${Buffer.concat(out)}`);
    if (code !== 0) { failed.push(pathOf(t)); if (bail) { stop = true; for (const c of running) c.kill(); } }
    done();
  });
});
const queue = chosen.filter(t => !ALONE(pathOf(t)));
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => { while (queue.length && !stop) await run(queue.shift()); }));
for (const t of chosen.filter(t => ALONE(pathOf(t)))) if (!stop) await run(t);
console.log(`\n${ran - failed.length}/${chosen.length} tests passed${failed.length ? `; failed:\n  ${failed.join('\n  ')}` : ''}`);
process.exit(failed.length ? 1 : 0);
