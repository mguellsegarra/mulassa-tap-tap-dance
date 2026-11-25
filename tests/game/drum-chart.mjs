// The Mulassa's drum chart (docs/agents/drum-mode.md): the file's format, a spacing a drum can play per level, nothing
// inside a roll or a balloon, the rim really used, every note on a sound the MP3 plays, and the generator writes it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDrumChart, renderDrumChart, drumChartStats } from '../../tools/music/build_drum_chart.mjs';

const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const text = read('src/figures/mulassa/mula-drum-chart.json'), chart = JSON.parse(text);
const song = JSON.parse(read('src/song-mulassa.json')), EV = JSON.parse(read('tools/dev/notes-propostes/chart-events.json'));

assert(text === renderDrumChart(buildDrumChart()), 'the file is not what the generator writes: node tools/music/build_drum_chart.mjs');
assert.equal(EV.audio, song.audio, 'the Mulassa MP3 changed: regenerate chart-events.json and review the drum chart');
assert.equal(chart.version, 1);
assert.equal(chart.levels.length, 3);

const LAST = song.beats.length - 1, NAMES = ['FÀCIL', 'NORMAL', 'DIFÍCIL'];
const GRID = [1, 0.5, 0.25]; // the finest step and the closest two notes, in beats: a quarter, an eighth, a sixteenth
const isNote = e => 'dkDK'.includes(e[1]), zone = e => e[1].toLowerCase();
const near = (list, b) => list.some(([x]) => Math.abs(x - b) < 1e-3);
const sounds = b => near(EV.melody, b) || ['don', 'ka', 'kick', 'snare', 'clap', 'ohat'].some(k => near(EV.hits[k], b));
const stats = drumChartStats(chart, song.beats);

chart.levels.forEach((ev, L) => {
  const name = NAMES[L], notes = ev.filter(isNote), spans = ev.filter(e => !isNote(e));
  for (const e of ev) {
    const [b, kind, end, need] = e, at = `${name} beat ${b}`;
    assert(Number.isFinite(b) && b >= 0 && b <= LAST, `${at}: outside song.beats`);
    if (isNote(e)) assert.equal(e.length, 2, `${at}: a note is [beat, kind]`);
    else if (kind === 'r') assert(e.length === 3 && end > b && end <= LAST, `${at}: a roll is [beat, "r", endBeat]`);
    else if (kind === 'b') assert(e.length === 4 && end > b && Number.isInteger(need) && need > 0, `${at}: a balloon is [beat, "b", endBeat, need]`);
    else assert.fail(`${at}: unknown kind ${kind}`);
  }
  ev.forEach((e, i) => i && assert(e[0] > ev[i - 1][0], `${name}: not in order at beat ${e[0]}`));
  notes.forEach((e, i) => {
    assert(Number.isInteger(e[0] / GRID[L]), `${name}: beat ${e[0]} is off the level's grid`);
    if (i) assert(e[0] - notes[i - 1][0] >= GRID[L], `${name}: beats ${notes[i - 1][0]} and ${e[0]} are too close`);
    assert(sounds(e[0]), `${name}: nothing sounds at beat ${e[0]}`);
  });
  for (const [a, , b] of spans) {
    assert(!ev.some(e => e[0] > a && e[0] < b), `${name}: something inside the span ${a}-${b}`);
    assert(!ev.some(e => e[0] === b && !isNote(e)), `${name}: a span starts where ${a}-${b} ends`);
  }
  // a span leaves half a beat to get back to the notes; only the song's final hit lands on the end of its drumroll
  for (const [a, , b] of spans) assert(!notes.some(e => e[0] >= b && e[0] < b + 0.5 && e[0] !== LAST), `${name}: a note right on the end of the span ${a}-${b}`);
  // the balloons are the song's drumrolls, on whole beats as chart.js reads them
  assert.deepEqual(spans.filter(e => e[1] === 'b').map(e => [e[0], e[2]]), song.balloonBeats, `${name}: the song's balloons`);
  assert(spans.some(e => e[1] === 'r'), `${name}: has rolls`);
  assert.deepEqual(ev.at(-1), [LAST, 'D'], `${name}: ends on the big final hit`);
  if (L) assert(ev.filter(e => e[1] === 'b').every((e, i) => e[3] > chart.levels[L - 1].filter(x => x[1] === 'b')[i][3]), `${name}: balloons ask for more hits`);

  // the rim: a real half of the playing from NORMAL up, a few on FÀCIL
  const { ka, notes: n, max7 } = stats[L];
  if (L) assert(ka >= 0.35 && ka <= 0.45, `${name}: ka is ${(ka * 100).toFixed(1)}% of the notes, wanted 35-45%`);
  else assert(ka > 0.1 && ka < 0.3, `${name}: ka is ${(ka * 100).toFixed(1)}% of the notes, wanted a few`);
  assert(max7 <= [14, 24, 36][L], `${name}: ${max7} notes in 7 s`);
  if (L) {
    assert(n > stats[L - 1].notes, `${name}: adds notes`);
    const by = new Map(ev.map(e => [e[0], e]));
    for (const e of chart.levels[L - 1]) {
      const h = by.get(e[0]);
      assert(h && zone(h) === zone(e), `${name}: loses the easier level's ${e[1]} at beat ${e[0]}`);
      if (!isNote(e)) assert.equal(h[2], e[2], `${name}: the span at ${e[0]} ends elsewhere`);
    }
  }
});
// DIFÍCIL really has sixteenths, NORMAL eighths, FÀCIL no big ka and few big notes
const closest = L => Math.min(...chart.levels[L].filter(isNote).map((e, i, a) => (i ? e[0] - a[i - 1][0] : 9)));
assert.deepEqual([0, 1, 2].map(closest), GRID, 'each level reaches its own closest spacing');
assert(stats[0].K === 0 && stats[0].D < stats[1].D + stats[1].K, 'FÀCIL has the fewest big notes');
console.log('drum chart ok:', stats.map((s, L) => `${NAMES[L]} ${s.notes} notes, ka ${(s.ka * 100).toFixed(0)}%`).join(' · '));
