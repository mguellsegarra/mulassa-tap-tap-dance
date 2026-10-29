// The three chart proposals (tools/dev/notes-propostes/chart-proposals.js) keep the game's chart rules (check.mjs) and land on sounds
// the game's MP3 really plays (chart-events.json), with the side the sound has.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildProposal, PROPOSALS } from '../../tools/dev/notes-propostes/chart-proposals.js';
import { makeDanceChart } from '../../src/game/chart.js';
import { beatAtTime } from '../../src/core/beat-grid.js';

const song = JSON.parse(readFileSync(new URL('../../src/song-mulassa.json', import.meta.url)));
const EV = JSON.parse(readFileSync(new URL('../../tools/dev/notes-propostes/chart-events.json', import.meta.url)));
assert.equal(EV.audio, song.audio, 'the Mulassa MP3 changed: CHART_EVENTS=tools/dev/notes-propostes/chart-events.json tools/music/build_taiko.py');
const beat = t => beatAtTime(song.beats, t), onGrid = b => Math.abs(b * 2 - Math.round(b * 2)) < 2e-3;
const near = (list, b) => list.some(([x]) => Math.abs(x - b) < 1e-3);
const sounds = b => near(EV.melody, b) || ['don', 'ka', 'kick', 'snare', 'clap', 'ohat'].some(k => near(EV.hits[k], b));
const game = [0, 1, 2].map(d => makeDanceChart(song, d)), plain = c => c.filter(n => !n.balloon);

for (const p of PROPOSALS) {
  const s = { ...song, notes: buildProposal(p.id, song.beats) };
  const charts = [0, 1, 2].map(d => makeDanceChart(s, d));
  charts.forEach((c, d) => {
    const notes = c.filter(n => !n.balloon), name = `${p.id} ${d}`;
    assert(notes.length > 100, `${name}: too few notes`);
    notes.forEach((n, j) => {
      const b = beat(n.t);
      assert(onGrid(b), `${name}: ${b} off the half-beat grid`);
      if (j) assert(b - beat(notes[j - 1].t) > 0.45, `${name}: notes too close at ${b}`);
      if (n.t < song.end - 1e-3) assert(sounds(Math.round(b * 2) / 2), `${name}: nothing sounds at beat ${b}`);
      if (n.end) assert(beat(notes[j + 1].t) - beat(n.end) >= 1 - 1e-3, `${name}: hold at ${b} runs into the next note`);
    });
    assert.deepEqual(c.filter(n => n.balloon), game[d].filter(n => n.balloon), `${name}: the same GLOBUS`);
    assert.deepEqual(notes.filter(n => n.big).map(n => n.t), plain(game[d]).filter(n => n.big).map(n => n.t), `${name}: the same GUAPAs`);
    assert.deepEqual(notes.filter(n => n.end).map(n => [n.t, n.end, n.input]), plain(game[d]).filter(n => n.end).map(n => [n.t, n.end, n.input]), `${name}: the game's holds`);
    assert(notes.at(-1).big && Math.abs(notes.at(-1).t - song.end) < 1e-3, `${name}: ends on the final GUAPA`);
    const ka = notes.filter(n => n.input === 'R').length, don = notes.filter(n => n.input === 'L').length;
    assert(Math.min(ka, don) > 0.3 * (ka + don), `${name}: both sides play (${don} GUA, ${ka} PA)`);
    if (d) {
      assert(notes.length > charts[d - 1].filter(n => !n.balloon).length, `${name}: adds notes`);
      const by = new Map(notes.map(n => [n.t, n.input]));
      assert(charts[d - 1].every(n => n.balloon || by.get(n.t) === n.input), `${name}: contains the easier chart, same buttons`);
    }
  });
  // the side follows the sound where a taiko alone plays (taiko don = GUA, taiko ka = PA)
  if (p.id === 'tambors') for (const [t, kind] of s.notes) {
    const b = Math.round(beat(t) * 2) / 2, don = near(EV.hits.don, b), ka = near(EV.hits.ka, b);
    if (b % 1 === 0 && don !== ka && t < song.end - 1e-3) assert.equal(kind, don ? 'don' : 'ka', `tambors: beat ${b} plays a taiko ${don ? 'don' : 'ka'}`);
  }
}
console.log('chart proposals ok');
