// The Drac form feeds the generator through the compiler (tools/build_drac.py): the layout rules it relies on, on EDITED forms.
// Pure: no audio. The Python half (chords, hold taps, tempo map on edited forms) is in tests/drac-audio.py.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileForm } from '../src/music-form/compile.js';

const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const form = read('../music/drac-form.json'), score = read('../music/drac-score.json');
const edit = fn => { const f = structuredClone(form); fn(f); return compileForm(f, score); };
const base = compileForm(form, score);
assert.deepEqual(base.unresolved, []);
const item = (tl, id) => tl.itemSpans.filter(s => s[0] === id);

{ // a removed phrase shortens the song by its length; the label vanishes from the arrangement, later items move up
  const tl = edit(f => { f.sequence = f.sequence.filter(s => !['s09', 's10', 's11', 's12'].includes(s.id)); });
  assert.deepEqual(tl.unresolved, []);
  assert.equal(tl.end, base.end - 32);
  assert.equal(tl.finale, base.finale - 32);
  assert(!tl.arrangement.some(([, l]) => l === 'D'));
  assert.equal(item(tl, 's13')[0][2], item(base, 's13')[0][2] - 32);
  assert.deepEqual(tl.tempo.beatUs.length, Math.floor(tl.end) + 8, 'the tempo map covers the shorter song');
  assert.deepEqual(tl.tempo.knots.at(-1), [base.tempo.knots.at(-1)[0] - 32, 135], 'knots anchored to items move with them');
}

{ // a repeated phrase plays its bars again: the same source bars (the generator's chords follow the source bar), 8 beats later
  const tl = edit(f => { f.sequence.find(s => s.id === 's05').repeat = 2; });
  const once = tl.occurrences.filter(o => o.item === 's05' && o.iteration === 0), twice = tl.occurrences.filter(o => o.item === 's05' && o.iteration === 1);
  assert.equal(twice.length, 4);
  assert.deepEqual(twice.map(o => o.bar), once.map(o => o.bar));
  assert.deepEqual(twice.map(o => o.start), once.map(o => o.start + 8));
  assert.equal(tl.end, base.end + 8);
}

{ // ties only across adjacent occurrences: bar 21 -> 22 stays a 3-beat note, but not with a bar between or swapped
  const longAt = tl => tl.melody.find(n => n[0] === tl.occurrences.find(o => o.bar === 21).start);
  assert.equal(longAt(base)[1], 3);
  const skipped = edit(f => { f.sequence.find(s => s.id === 's08').bars = ['u029', 'u031']; });
  assert.equal(longAt(skipped)[1], 2, 'bar 22 does not follow: no tie');
  const swapped = edit(f => { f.sequence.find(s => s.id === 's08').bars = ['u030', 'u029']; });
  assert.equal(longAt(swapped)[1], 2, 'bar 22 BEFORE bar 21: no tie');
}

{ // the tempo knots decide beatUs; beats follow them exactly (the MIDI map is the same beatUs)
  const flat = edit(f => { f.tempo.knots = [{ at: { beat: 0 }, bpm: 120 }]; });
  assert(flat.tempo.beatUs.every(u => u === 500000));
  assert.equal(flat.beats[10], 0.1 + 5);
  const slower = edit(f => { f.tempo.knots.at(-1).bpm = 120; });
  const first = slower.tempo.beatUs.findIndex((u, k) => u !== base.tempo.beatUs[k]);
  assert(first >= 152, `only the coda's rit. changes (first different beat ${first})`);
  for (const tl of [base, slower, flat]) tl.beats.forEach((t, b) => b && assert(Math.abs(t - tl.beats[b - 1] - tl.tempo.beatUs[b - 1] / 1e6) < 1e-12, `beat ${b}`));
}

{ // a hold follows its note when the phrase moves; a hold whose bar is gone is an error, never moved
  const moved = edit(f => { f.sequence.find(s => s.id === 's05').repeat = 2; });
  assert.deepEqual(moved.holds.map(h => h.slice(0, 2)), [[74, 77]]);
  const gone = edit(f => { f.sequence = f.sequence.filter(s => s.id !== 's08'); });
  assert(gone.unresolved.some(u => u.path.startsWith('events.holds')), 'the hold of a removed item is unresolved');
}
console.log('drac form layout ok');
