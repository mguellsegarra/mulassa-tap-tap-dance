// The music-form compiler (src/music-form): both baseline forms reproduce what the generators produce today, and the
// editing rules hold (exact rationals, adjacency-only ties, scale/overrides, anchors that never silently move).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { compileForm, compileOriginal, formRevision } from '../src/music-form/compile.js';
import { SONGS, isSong } from '../src/music-form/songs.js';

const here = p => new URL(p, import.meta.url);
const read = p => JSON.parse(readFileSync(here(p), 'utf8'));
const clone = x => structuredClone(x);
const r3 = x => Math.round(x * 1000) / 1000, r4 = x => Number(x.toFixed(4));

// ------------------------------------------------------------------ baseline forms == today's generated files
const BASE = {
  mulassa: { arr: '../music/taiko-arrangement.json', song: '../src/song.json' },
  drac: { arr: '../music/drac-arrangement.json', song: '../src/song-drac.json' },
};
const forms = {}, scores = {}, timelines = {};
for (const [id, files] of Object.entries(BASE)) {
  const form = forms[id] = read(`../music/${SONGS[id].form}`), score = scores[id] = read(`../music/${SONGS[id].score}`);
  const tl = timelines[id] = compileForm(form, score), arr = read(files.arr), song = read(files.song);
  assert.deepEqual(tl.unresolved, [], `${id}: the baseline form resolves everything`);
  assert.deepEqual(tl.melody.map(([s, d, m]) => [r3(s), r3(d), m]), arr.melody, `${id}: melody is today's`);
  assert.deepEqual(tl.arrangement, arr.sections ?? arr.arrangement, `${id}: sections`);
  assert.deepEqual(tl.balloons, arr.drum_rolls ?? arr.balloons, `${id}: balloons`);
  assert.equal(tl.end, arr.end_beat, `${id}: end`);
  assert.equal(tl.bpm, arr.bpm);
  // song.json stores the beats rounded to 4 decimals, so that is the exact comparison available here
  assert.deepEqual(tl.beats.map(r4), song.beats, `${id}: beats`);
  assert.equal(r4(tl.beats[tl.finale]), song.finale, `${id}: finale`);
  assert.equal(Number(tl.beats[tl.end].toFixed(3)), song.end, `${id}: end time (song.json keeps 3 decimals)`);
  const holds = song.notes.filter(n => n[4]).map(n => [n[0], n[4], n[1]]);
  assert.deepEqual(tl.holds.map(([a, b, k]) => [r4(tl.beats[a]), r4(tl.beats[b]), k]), holds, `${id}: holds`);
  if (arr.tempo_us) {
    const us = tl.tempo.beatUs;
    assert.deepEqual(us.map((u, k) => [k, u]).filter(([k, u]) => k === 0 || u !== us[k - 1]), arr.tempo_us, `${id}: tempo map in whole µs`);
  }
  // the occurrences tile the song without gaps from the pickup to the last bar
  tl.occurrences.forEach((o, i) => i && assert.equal(o.start, tl.occurrences[i - 1].start + tl.occurrences[i - 1].dur, `${id}: ${o.id} follows its bar`));
  assert.equal(new Set(tl.occurrences.map(o => o.id)).size, tl.occurrences.length, `${id}: occurrence ids are unique`);
  assert.equal(tl.melodyRef.length, tl.melody.length);
  for (const ref of tl.melodyRef) {
    const [oid, n] = ref.split('/'), o = tl.occurrences.find(x => x.id === oid);
    assert(o?.notes[Number(n)], `${id}: ${ref} points at a note`);
  }
  assert.equal(tl.revision, formRevision(form));
  assert.deepEqual(compileForm(clone(form), score), tl, `${id}: deterministic`);
}
assert.deepEqual(timelines.mulassa.holds.map(h => h.slice(0, 2)), [[32, 34], [64, 67], [96, 98], [128, 131], [136, 139]]);
assert.deepEqual(timelines.drac.holds.map(h => h.slice(0, 2)), [[66, 69]]);
assert.equal(timelines.mulassa.finale, 208);
assert.equal(timelines.drac.finale, 157);
// constant-exact is the generator's own grid, to the last bit
assert.deepEqual(timelines.mulassa.beats, Array.from({ length: 229 }, (_, b) => 0.1 + b * (60 / 152)));
// bars are whole beats however many 1/6 triplets they hold: nothing drifts off the grid
assert(timelines.drac.occurrences.every(o => Number.isInteger(o.start) && o.dur === (o.item === 'pickup' ? 1 : 2)), 'drac bars are whole beats');

// ------------------------------------------------------------------ the ending note rings; ties; scale and overrides
assert.deepEqual(timelines.mulassa.melody.at(-1), [222, 6, 84]);
assert.deepEqual(timelines.drac.melody.at(-1), [156, 7, 67]);
assert.deepEqual(timelines.mulassa.occurrences.find(o => o.unfolded === 'u017').notes, [[136, 4, 72], [143, 0.5, 76], [143.5, 0.5, 76]], 'bar 16: override notes at scale 1');
assert.equal(timelines.mulassa.occurrences.find(o => o.unfolded === 'u002').beatScale, 2);
const bar21 = id => timelines.drac.occurrences.filter(o => o.bar === 21)[id];
assert.deepEqual(timelines.drac.melody.find(n => n[0] === bar21(0).start), [66, 3, 67], 'bar 21 is tied into bar 22 (3 beats)');

const dracForm = forms.drac, dracScore = scores.drac;
{ // a tie needs the two bars adjacent in the order played
  const f = clone(dracForm), s6 = f.sequence.find(s => s.id === 's08'), ids = f.phrases.find(p => p.id === s6.phrase).bars;
  s6.bars = [ids[0], ids[1], ids[3], ids[2]];       // 20 21 23 22: 22 no longer follows 21
  const tl = compileForm(f, dracScore), o = tl.occurrences.find(x => x.item === 's08' && x.bar === 21);
  assert.deepEqual(tl.melody.find(n => n[0] === o.start), [o.start, 2, 67], 'not adjacent: no tie');
  assert.equal(tl.occurrences.find(x => x.item === 's08' && x.bar === 22).notes[0][1], 1);
  assert(tl.melody.some(n => n[0] === tl.occurrences.find(x => x.item === 's08' && x.bar === 22).start), 'the second bar keeps its own note');
}

// ------------------------------------------------------------------ a small synthetic song for the editing rules
const score = { bars: [[1, 'C5:1 D5:1'], [2, 'E5:1/6 E5:1/6 E5:1/6 E5:1/6 E5:1/6 E5:1/6 G5:1'], [3, 'A5:1 R:1']] };
const mini = () => ({
  version: 1, song: 'x', labels: ['intro', 'pickup', 'a', 'roll'],
  source: { score: 'x.json', transpose: 2, beatsPerBar: 2, unfolded: [{ id: 'u1', bar: 1, section: 'A' }, { id: 'u2', bar: 2, section: 'A' }, { id: 'u3', bar: 3, section: 'B' }], ties: [] },
  phrases: [{ id: 'p', name: 'p', bars: ['u1', 'u2', 'u3'] }],
  sequence: [{ id: 's', phrase: 'p', label: 'a', repeat: 2, beatScale: 1, bars: null, barOverrides: {} }],
  intro: { beats: 4, pickup: { bar: 'u1', beatScale: 1, label: 'pickup' } },
  tempo: { clock: 'constant-exact', interpolation: 'smoothstep', leadIn: 0, knots: [{ at: { beat: 0 }, bpm: 120 }] },
  events: { balloons: [], holds: [], fills: [], noteDurations: [] },
  ending: { finale: { item: 's', edge: 'start' }, roll: { item: 's', edge: 'end' }, hit: { item: 's', edge: 'end', offset: 1 } },
});
{
  const tl = compileForm(mini(), score), at = (it, bar) => tl.occurrences.find(o => o.item === 's' && o.iteration === it && o.unfolded === bar);
  assert.deepEqual(tl.unresolved, []);
  assert.deepEqual(tl.arrangement, [[0, 'intro'], [2, 'pickup'], [4, 'a'], [16, 'roll']]);
  assert.deepEqual(tl.itemSpans, [['pickup', 0, 2, 4], ['s', 0, 4, 10], ['s', 1, 10, 16]]);
  assert.equal(at(1, 'u2').id, 's#1:u2', 'repeats get an iteration in their ids');
  assert.deepEqual(at(0, 'u1').notes, [[4, 1, 74], [5, 1, 76]], 'transposed');
  const o = at(1, 'u2');
  assert.equal(o.dur, 2, 'six 1/6 + 1 sum to 2 exactly');
  assert.equal(o.notes[6][0], 13, 'the note after the triplets starts on the beat, not 12.999999999999998');
  assert.equal(at(1, 'u3').start, 14);
  assert.equal(tl.end, 17);
  assert.equal(tl.tempo.beatUs[0], 500000);
  assert.equal(tl.beats[2], 1);

  const f = mini();
  f.sequence[0].beatScale = 0.5;
  f.sequence[0].barOverrides = { u3: { notes: 'A5:2', beatScale: 1 } };
  const half = compileForm(f, score);
  assert.deepEqual(half.occurrences.filter(o => o.item === 's' && o.iteration === 0).map(o => [o.unfolded, o.dur, o.beatScale]), [['u1', 1, 0.5], ['u2', 1, 0.5], ['u3', 2, 1]]);
  assert.deepEqual(half.occurrences.find(o => o.unfolded === 'u3').notes, [[6, 2, 83]], 'override replaces the notes, its own scale');
}
{ // every anchor form
  const f = mini();
  f.events = {
    balloons: [{ id: 'g', start: { item: 's', edge: 'start', offset: 2 }, end: { item: 's', iteration: 0, edge: 'end' } }],
    holds: [{ id: 'h', start: { item: 's', iteration: 1, bar: 'u2', note: -1 }, end: { beat: 14 }, kind: 'ka' }],
    fills: [{ id: 'f', at: { item: 'pickup', bar: 'u1' }, kind: 'x' }],
    noteDurations: [{ at: { item: 's', iteration: 1, bar: 'u3' }, beats: 1 / 2 }],
  };
  const tl = compileForm(f, score);
  assert.deepEqual(tl.unresolved, []);
  assert.deepEqual(tl.balloons, [[6, 10]]);
  assert.deepEqual(tl.holds, [[13, 14, 'ka']]);
  assert.deepEqual(tl.fills, [{ id: 'f', kind: 'x', beat: 2 }]);
  assert.equal(tl.melody.find(n => n[0] === 14)[1], 0.5, 'noteDurations by bar occurrence');
}

// ------------------------------------------------------------------ deleting what is anchored: an error, never a moved event
{
  const f = mini();
  f.events.holds = [{ id: 'h', start: { item: 's', iteration: 0, bar: 'u2', note: 0 }, end: { item: 's', iteration: 0, bar: 'u2', note: 0, offset: 1 }, kind: 'don' }];
  assert.deepEqual(compileForm(f, score).holds, [[6, 7, 'don']]);
  f.phrases[0].bars = ['u1', 'u3'];                  // bar u2 is gone
  const tl = compileForm(f, score);
  assert.deepEqual(tl.holds, []);
  assert.deepEqual(tl.unresolved.map(u => u.path), ['events.holds[0].start', 'events.holds[0].end']);
  const g = mini();
  g.sequence = [];                                   // no item: ending, tempo-free events and the clock cannot resolve
  const none = compileForm(g, score);
  assert.deepEqual(none.unresolved.map(u => u.path), ['ending.finale', 'ending.roll', 'ending.hit']);
  assert.equal(none.end, null);
  const bad = mini();
  bad.events.holds = [{ id: 'h', start: { beat: 9 }, end: { beat: 8 }, kind: 'don' }, { id: 'k', start: { beat: 1 }, end: { beat: 2 }, kind: 'tom' }];
  assert.deepEqual(compileForm(bad, score).unresolved.map(u => u.path), ['events.holds[0]', 'events.holds[1].kind']);
  const lab = mini();
  lab.sequence[0].label = 'zzz';
  assert(compileForm(lab, score).unresolved.some(u => u.path === 'sequence[0].label'));
  assert.throws(() => compileForm({ ...mini(), version: 2 }, score));
  // the real forms: deleting bar 21 from the C phrase unresolves its hold, the other events stay put
  const d = clone(dracForm), c2 = d.phrases.find(p => p.id === 'p-c2');
  c2.bars = c2.bars.filter(u => u !== bar21(0).unfolded);
  const dt = compileForm(d, dracScore);
  assert.deepEqual(dt.holds, []);
  assert.deepEqual(dt.unresolved.map(u => u.path), ['events.holds[0].start', 'events.holds[0].end']);
}

// ------------------------------------------------------------------ the revision
{
  const f = mini(), canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
  assert.equal(formRevision(f), createHash('sha1').update(JSON.stringify(canon(f))).digest('hex'), 'sha-1 of the canonical JSON');
  assert.equal(formRevision(Object.fromEntries(Object.entries(f).reverse())), formRevision(f), 'key order does not matter');
  const g = mini(); g.sequence[0].repeat = 3;
  assert.notEqual(formRevision(g), formRevision(f));
  assert.equal(formRevision({ é: '€', a: [1, { b: 2 }] }), createHash('sha1').update('{"a":[1,{"b":2}],"é":"€"}').digest('hex'), 'utf-8, nesting');
}

// ------------------------------------------------------------------ the original, unfolded
for (const id of Object.keys(BASE)) {
  const form = forms[id], tl = compileOriginal(form, scores[id]);
  assert.deepEqual(tl.unresolved, []);
  assert.deepEqual(tl.occurrences.map(o => o.bar), form.source.unfolded.map(u => u.bar), `${id}: the unfolded bars in order`);
  assert.deepEqual(tl.occurrences.map(o => o.label), form.source.unfolded.map(u => u.section));
  assert(tl.occurrences.every(o => o.beatScale === 1 && o.item === 'original'));
  assert.equal(tl.occurrences[0].start, 0);
  assert.equal(tl.end, tl.occurrences.at(-1).start + tl.occurrences.at(-1).dur);
  assert.deepEqual([tl.finale, tl.balloons, tl.holds], [null, [], []], 'no events');
  assert.equal(tl.bpm, form.tempo.knots[0].bpm);
  assert.equal(tl.beats.length, Math.floor(tl.end) + 1);
}
{ // drac: the score's own order (1a vegada 8, 2a vegada 9-15, D.S. from bar 6 to 18, then the coda 52-56)
  const bars = compileOriginal(forms.drac, scores.drac).occurrences.map(o => o.bar);
  assert.deepEqual(bars.slice(0, 17), [0, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 9]);
  assert.deepEqual(bars.slice(-10), [14, 15, 16, 17, 18, 52, 53, 54, 55, 56]);
  assert.equal(compileOriginal(forms.drac, scores.drac).melody.some(n => n[1] === 3), true, 'ties apply in the original too');
  assert.equal(compileOriginal(forms.mulassa, scores.mulassa).occurrences.length, 74);
}

// ------------------------------------------------------------------ the allowlist, the CLI, browser safety
assert(isSong('drac') && !isSong('../drac') && !isSong('toString'));
const cli = (...args) => spawnSync(process.execPath, [new URL('../tools/compile-music-form.mjs', import.meta.url).pathname, ...args], { encoding: 'utf8' });
for (const id of Object.keys(BASE)) {
  const run = cli(id), orig = cli(id, '--original');
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout), JSON.parse(JSON.stringify(timelines[id])), `${id}: the CLI prints the timeline`);
  assert.deepEqual(JSON.parse(orig.stdout), JSON.parse(JSON.stringify(compileOriginal(forms[id], scores[id]))));
}
assert.equal(cli('nope').status, 2);
assert.equal(cli('drac', '--bogus').status, 2);
const code = readFileSync(here('../src/music-form/compile.js'), 'utf8');
assert(!/node:|require\(|process\.|\bdocument\b|\bwindow\b|\bimport\b/.test(code), 'compile.js is browser-safe and imports nothing');
console.log('music-form ok');
