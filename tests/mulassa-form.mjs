// Exercise the actual Python layout with compiler output; importing it must not render audio.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileForm } from '../src/music-form/compile.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url)));
const form = read('../music/mulassa-form.json'), score = read('../music/score.json');
const compile = f => { const t = compileForm(f, score); assert.deepEqual(t.unresolved, []); return t; };
const python = `
import json, sys
from tools.build_taiko import build_layout
assert 'numpy' not in sys.modules, 'import must not initialize the synth'
try:
    layout = build_layout(json.load(sys.stdin))
    print(json.dumps(layout, default=lambda x: sorted(x) if isinstance(x, set) else x))
except ValueError as err:
    print(str(err), file=sys.stderr)
    sys.exit(1)
`;
const run = timeline => spawnSync('python3', ['-B', '-c', python], { cwd: root, input: JSON.stringify(timeline), encoding: 'utf8' });
const layout = f => { const r = run(compile(f)); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
const base = layout(form);
assert.equal(base.end, 228);
assert.deepEqual(base.fills, [43, 47, 51]);
assert.deepEqual(base.a_ranges, [[16, 144]]);
assert.deepEqual(base.progress.filter((_, i) => base.plan[i] === 'X'), [0, 1, 2, 3]);
assert.deepEqual(base.balloons, [[140, 143], [224, 228]]);
assert.deepEqual(base.crashes.map(c => c.beat), [16, 48, 80, 112, 144, 160, 176, 192, 208, 216, 228, 208.02]);
{
  const f = structuredClone(form);
  f.sequence.find(s => s.id === 's10').repeat = 2;
  const l = layout(f), bars = l.occurrence_chords.filter(o => o.bar === 50);
  assert.equal(bars.length, 2, 'both copies retain their own harmony span');
  assert.deepEqual(bars.map(o => o.id), ['s10#0:u051', 's10#1:u051']);
  assert.deepEqual(bars.map(o => o.chords), [[[176, 178, 'C']], [[184, 186, 'C']]]);
  assert(l.chords.some(([a, b, c]) => a === 176 && b === 178 && c === 'C'));
  assert(l.chords.some(([a, b, c]) => a === 184 && b === 186 && c === 'C'));
}
{
  const f = structuredClone(form);
  [f.sequence[9], f.sequence[10]] = [f.sequence[10], f.sequence[9]];
  delete f.reference; // (a reordering may leave the dance's reference anchors falling: the compiler's error, music-form.mjs)
  const l = layout(f), bars = l.occurrence_chords.filter(o => o.start >= 176 && o.start < 192);
  assert.deepEqual(bars.map(o => o.bar), [54, 55, 56, 57, 50, 51, 52, 53]);
  for (const o of bars) {
    const old = base.occurrence_chords.find(x => x.bar === o.bar);
    assert.deepEqual(o.chords.map(([a, b, c]) => [a - o.start, b - o.start, c]), old.chords.map(([a, b, c]) => [a - old.start, b - old.start, c]), 'harmony travels with its source bar');
  }
  assert(l.chords.every((c, i) => !i || c[0] >= l.chords[i - 1][0]), 'harmony follows play order, not source-bar order');
}
{
  const f = structuredClone(form);
  f.sequence.find(s => s.id === 's14').repeat = 2;
  const l = layout(f);
  assert.deepEqual(l.progress.filter((_, i) => l.plan[i] === 'X'), [0, 1, 0, 1, 2, 3], 'a repeated X starts its own build; the following X phrase continues that occurrence');
  f.sequence.find(s => s.id === 's14').repeat = 1;
  f.sequence.find(s => s.id === 's15').repeat = 2;
  const r = layout(f);
  assert.deepEqual(r.progress.filter((_, i) => r.plan[i] === 'X'), [0, 1, 2, 3, 0, 1], 'repeating the last X phrase resets instead of continuing a global plan.index build');
}
{
  const f = structuredClone(form);
  f.intro.beats = 20;
  const l = layout(f);
  assert.equal(l.occurrences[0].start, 16);
  assert.equal(l.end, base.end + 4);
  assert.deepEqual(l.balloons, base.balloons.map(w => w.map(b => b + 4)));
  assert.equal(l.chords[3][1], 20, 'the fanfare follows the editable intro');
  assert.deepEqual(l.a_ranges, [[20, 148]]);
}
{
  assert.equal(compile(form).tempo.clock, 'drac-midpoint-us', 'the layout does not depend on the tempo map (the generator renders it)');
  const invalid = compile(form); invalid.unresolved.push({ path: 'ending', message: 'missing' });
  assert.match(run(invalid).stderr, /unresolved anchors/);
}
const temp = mkdtempSync(join(tmpdir(), 'mulassa-form-test-'));
try {
  const path = join(temp, 'edited form.json'), f = structuredClone(form);
  f.sequence.find(s => s.id === 's10').repeat = 2;
  writeFileSync(path, JSON.stringify(f));
  const cli = (...args) => spawnSync(process.execPath, ['tools/compile-music-form.mjs', 'mulassa', ...args], { cwd: root, encoding: 'utf8' });
  const r = cli('--form', path);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), compile(f));
  assert.equal(cli('--form').status, 2);
  assert.equal(cli('--form', path, '--form', path).status, 2);
  const load = spawnSync('python3', ['-B', '-c', 'import json, sys; from tools.build_taiko import load_timeline; print(json.dumps(load_timeline(sys.argv[1])))', path], { cwd: root, encoding: 'utf8' });
  assert.equal(load.status, 0, load.stderr);
  assert.deepEqual(JSON.parse(load.stdout), compile(f), 'Python passes the override path to the shared CLI');
  f.sequence = f.sequence.filter(s => s.id !== 's4');
  writeFileSync(path, JSON.stringify(f));
  const invalid = spawnSync('python3', ['-B', '-c', 'import sys; from tools.build_taiko import load_timeline; load_timeline(sys.argv[1])', path], { cwd: root, encoding: 'utf8' });
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /Mulassa form compilation failed/);
  assert.match(invalid.stderr, /s4/);
  assert.match(invalid.stderr, /events.balloons/, 'the CLI diagnostic reaches the generator unchanged');
} finally { rmSync(temp, { recursive: true }); }
console.log('mulassa-form ok');
