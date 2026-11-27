// The generic dance engine (src/game/choreo/) with the Tombairot's vocabulary on every song, the four real ones and a few
// made-up ones that break the easy cases (a lead-in before the grid, no chart yet, a tempo jump mid-section, a half-beat
// pickup): the song's structure in beats and 8-beat phrases, a plan that is the same every time and ignores song.bpm,
// a dance that keeps clear of the colla and within the carriers' speed and turn rate at the song's own tempo, every
// section ending at home facing the front, whole clocks (8-beat spokes when the 16-beat ones do not fit), 16-beat turns
// never squeezed, the figure's own moves on every song, a pose that depends only on its beat (seeks), and a still loop
// for the selector that never leaves its spot.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { timeAtBeat } from '../../src/core/beat-grid.js';
import { songStructure } from '../../src/game/choreo/song-structure.js';
import { planChoreo, createChoreo, newChoreoPose } from '../../src/game/choreo/planner.js';
import { choreoTurnOf } from '../../src/game/choreo/moves.js';
import { TOMBA_VOCAB, TOMBA_PIVOT_Z, createTombaDance, newTombaPose } from '../../src/figures/tombairot/tomba-dance.js';

const load = k => JSON.parse(readFileSync(new URL(`../../src/song-${k}.json`, import.meta.url)));
const REAL = Object.fromEntries(['mulassa', 'drac', 'bou', 'tombairot'].map(k => [k, load(k)]));
const TAU = 2 * Math.PI, square = a => Math.abs(a - Math.round(a / TAU) * TAU) < 1e-6; // facing the front
// A made-up song: a beat grid from a tempo per beat (bpm(b)), a note on every beat from `from`, finale and end as beats
function made({ beats = 120, bpm = () => 120, lead = 0, from = 8, notes = true, finale, end, ...rest }) {
  const B = [lead];
  for (let b = 0; b < beats; b++) B.push(B[b] + 60 / bpm(b));
  return { beats: B, notes: notes ? B.slice(from, end).map(t => [t, 'don', 0, 0, 0]) : [], finale: B[finale], end: B[end], ...rest };
}
const MADE = {
  // Carbon #5: a 0.4 s lead-in before the grid's first beat, the first section at 0 s
  lead: { beats: Array.from({ length: 60 }, (_, i) => 0.4 + i * 0.5), notes: [[2.4, 'don', 0, 1, 0]], sections: [[0, 'A'], [12.4, 'B']], finale: 24.4, end: 28.4 },
  // a traditional song with no chart yet: its grid and sections only
  chartless: made({ beats: 140, notes: false, sections: [[0, 'A'], [36, 'B'], [52, 'A']], finale: 120, end: 136 }),
  // Carbon #4: 152 BPM with beats 24-32 at 170, a clock section of 28 beats
  rise: made({ beats: 90, bpm: b => (b >= 24 && b < 32 ? 170 : 152), arrangement: [[0, 'intro'], [8, 'A1'], [36, 'B'], [68, 'C']], finale: 76, end: 84 }),
  // Astra #4: a 32-beat clock section, its first 16 beats at 120 BPM and the rest at 300
  jump: made({ beats: 100, bpm: b => (b >= 24 && b < 40 ? 300 : 120), arrangement: [[0, 'intro'], [8, 'A'], [40, 'B'], [72, 'A2']], finale: 88, end: 96 }),
  // a half-beat pickup, and two sections in a row of the same kind (A, A)
  half: made({ beats: 120, arrangement: [[0, 'intro'], [7.5, 'pickup'], [8, 'A'], [40, 'A'], [72, 'B']], finale: 104, end: 112 }),
  // slow (90 BPM): a 16-beat turn squeezed into one phrase would still fit the turn rate, so only the rule stops it
  slow: made({ beats: 120, bpm: () => 90, arrangement: [[0, 'intro'], [8, 'A'], [40, 'B'], [64, 'A2']], finale: 96, end: 104 }),
};
const SONGS = { ...REAL, ...MADE };

// Structure: the Mulassa's arrangement (beats), the Aligot's coarse sections (seconds), climbing intensity steps
{
  const st = songStructure(REAL.mulassa);
  assert.deepEqual([st.first, st.finale, st.end], [12, 208, 228], 'first note, finale and last hit as beats');
  assert.deepEqual(st.sections.filter(s => s.level).map(s => [s.label, s.start, s.len, s.level]),
    [['A1', 16, 64, 1], ['A2', 80, 64, 2], ['B', 144, 32, 3], ['C', 176, 32, 3]], 'A1 sober, the second A livelier, B and C comic');
  const al = songStructure(REAL.tombairot);
  assert.deepEqual(al.sections.map(s => [s.label, s.start, s.len, s.level]), [['A', 0, 104, 1], ['B', 104, 42, 2], ['A', 146, 48, 3]],
    'seconds read on the beat grid; each new section a step up');
  const lead = songStructure(MADE.lead);
  assert.deepEqual(lead.sections.map(s => s.start), [0, 24], 'a lead-in starts no section before the grid');
  assert(lead.sections.every(s => Number.isFinite(s.tempo) && s.level >= 1), 'and reads no tempo outside it');
  assert.deepEqual(songStructure(MADE.chartless).sections.map(s => s.level), [1, 2, 3], 'a chartless song climbs on its sections');
  assert.deepEqual(songStructure(MADE.half).sections.map(s => s.start), [0, 8, 40, 72], 'a half-beat pickup lands on a whole beat');
  for (const s of Object.values(SONGS)) {
    const { phrases, finale } = songStructure(s);
    for (let i = 1; i < phrases.length; i++) assert.equal(phrases[i].start, phrases[i - 1].start + phrases[i - 1].len, 'phrases tile the song');
    assert.equal(phrases.at(-1).start + phrases.at(-1).len, finale, '... up to the finale');
    assert(phrases.every(p => Number.isInteger(p.start) && p.len <= 11 && (p.start - p.section.start) % 8 === 0), 'whole-beat phrases of 8 from each section\'s start');
  }
}

// The plan is the same every time and never reads song.bpm (decisions.md: never hardcode the BPM)
for (const [k, s] of Object.entries(SONGS)) {
  const plan = planChoreo(s, TOMBA_VOCAB);
  assert.deepEqual(planChoreo(s, TOMBA_VOCAB).entries, plan.entries, `${k}: deterministic`);
  assert.deepEqual(planChoreo({ ...s, bpm: 999 }, TOMBA_VOCAB).entries, plan.entries, `${k}: song.bpm is not a clock`);
}

// Room, speed and turn rate at the local tempo; no jump anywhere (from before the first move to after the last hit);
// every section, the finale's start and the end at home facing the front; 16-beat moves on 16 beats, a turn always
// followed by its unturn; the figure's own moves (its signature, step 3) somewhere in every song.
const STEP = 1 / 16, SLACK = 1.03, OWN = new Set(['half', 'quarter', 'bow', 'walk']);
for (const [k, s] of Object.entries(SONGS)) {
  const { pose, plan } = createChoreo(s, TOMBA_VOCAB), { front, back, room } = TOMBA_VOCAB.reach, B = s.beats;
  const p = newChoreoPose(), q = newChoreoPose();
  let far = 0, fast = 0, spin = 0;
  pose(-1, q);
  for (let b = -1 + STEP; b <= plan.end + 4; b += STEP) {
    pose(b, p);
    const sn = Math.sin(p.yaw), cs = Math.cos(p.yaw), dt = timeAtBeat(B, b) - timeAtBeat(B, b - STEP);
    far = Math.max(far, Math.hypot(p.x + front * sn, p.z + front * cs), Math.hypot(p.x - back * sn, p.z - back * cs));
    fast = Math.max(fast, Math.hypot(p.x - q.x, p.z - q.z) / dt); spin = Math.max(spin, Math.abs(p.yaw - q.yaw) / dt);
    Object.assign(q, p);
  }
  assert(far <= room + 1e-9, `${k}: nose and tail within ${room} m of the centre (${far.toFixed(2)})`);
  assert(fast <= TOMBA_VOCAB.speed * SLACK, `${k}: walks at most ${TOMBA_VOCAB.speed} m/s (${fast.toFixed(2)})`);
  assert(spin <= TOMBA_VOCAB.turnRate * SLACK, `${k}: turns at most ${TOMBA_VOCAB.turnRate} rad/s (${spin.toFixed(2)})`);
  const starts = new Set(plan.structure.sections.map(x => x.start).concat(plan.finale, plan.end));
  for (const e of plan.entries) if (starts.has(e.start)) assert(square(e.yaw0), `${k}: beat ${e.start} starts facing the front`);
  for (const b of starts) if (b >= plan.first) { pose(b, p); assert(Math.hypot(p.x, p.z) < 1e-9 && square(p.yaw), `${k}: at home facing the front at beat ${b}`); }
  const E = plan.entries;
  for (let i = 0; i < E.length; i++) if (E[i].move.id === 'turn' || E[i].move.id === 'arc') {
    const [a, b] = [E[i], E[i + 1]];
    assert(a.len >= 16 && b?.len >= 16, `${k}: the ${a.move.id} at beat ${a.start} and its pair take 16 beats each`);
    assert(b.move.id === a.move.id && choreoTurnOf(b.move) === -choreoTurnOf(a.move), `${k}: the ${a.move.id} at beat ${a.start} is followed by its undoing`);
    i++;
  }
  assert(E.some(e => OWN.has(e.move.id)), `${k}: the Tombairot's own moves are danced (decisions.md 9)`);
}

// Whole clocks: on the Aligot the first A holds a 16-beat clock and then an 8-beat one; B a turn and its unturn and a
// sway (no room for the circles); its returning A, the Tombairot's own moves. The Mulassa's A1: one long clock.
{
  const { entries } = planChoreo(REAL.tombairot, TOMBA_VOCAB), at = b => entries.find(e => e.start === b);
  assert.deepEqual([8, 24, 40, 56, 72, 80, 88, 96].map(b => [at(b)?.move.id, at(b)?.len]),
    [...Array(4).fill(['spoke', 16]), ...Array(4).fill(['spoke', 8])], 'A: a long clock, then a short one that fits whole');
  assert.deepEqual([104, 120, 136].map(b => at(b)?.move.id), ['turn', 'turn', 'sway'], 'B: a turn, its unturn, then no room for a circle pair');
  assert(entries.filter(e => e.start >= 146 && e.start < 194).every(e => OWN.has(e.move.id) || e.move.id === 'sway'), 'the second A: its own moves');
  const mula = planChoreo(REAL.mulassa, TOMBA_VOCAB).entries;
  assert.deepEqual(mula.filter(e => e.level === 1).map(e => [e.start, e.len]), [[16, 16], [32, 16], [48, 16], [64, 16]], 'the Mulassa\'s A1: one long clock');
  const twoA = planChoreo(MADE.half, TOMBA_VOCAB).entries.filter(e => e.start >= 8 && e.start < 72);
  assert.deepEqual(twoA.map(e => e.move.id), Array(8).fill('spoke'), 'two A sections in a row: a whole clock each, none carried across');
  // a section with three phrases and a 4-beat tail cannot hold a whole short clock: it sways rather than cut one short
  const rise = planChoreo(MADE.rise, TOMBA_VOCAB).entries.filter(e => e.level === 1);
  assert(rise.every(e => e.move.id === 'sway') || rise.filter(e => e.move.id === 'spoke').length % 4 === 0, 'no clock danced in part');
}

// Seek: the pose at a beat (and the Tombairot's at a second, feet included) is the same whatever was posed before
for (const s of [REAL.mulassa, REAL.tombairot]) {
  const { pose } = createChoreo(s, TOMBA_VOCAB), beats = Array.from({ length: 400 }, (_, i) => -2 + i * 0.6113);
  const along = beats.map(b => ({ ...pose(b, newChoreoPose()) }));
  const o = newChoreoPose();
  for (const i of beats.map((_, i) => (i * 157) % beats.length)) assert.deepEqual({ ...pose(beats[i], o) }, along[i], `seek to beat ${beats[i]}`);
  const d = createTombaDance(s), t = 41.3, fresh = { ...d.pose(t) }, foot = { ...d.foot(t, 2) };
  d.pose(80, newTombaPose()); d.foot(12, 2);
  assert.deepEqual({ ...d.pose(t) }, fresh, 'the Tombairot\'s pose at a second');
  assert.deepEqual({ ...d.foot(t, 2) }, foot, 'and its carriers\' feet');
}

// The selector's held loop (tomba-stage.js): on its spot facing the front at every instant, its own bow, no jump as the
// clock runs on past the song's end (it never wraps)
for (const s of [REAL.mulassa, REAL.tombairot]) {
  const d = createTombaDance(s, { still: true }), p = newTombaPose(), q = newTombaPose();
  let bowed = 0;
  d.pose(0, q);
  for (let t = 1 / 60; t < 400; t += 1 / 60) {
    d.pose(t, p);
    assert(Math.abs(p.yaw) < 1e-9 && Math.abs(p.x) < 1e-9 && Math.abs(p.z + TOMBA_PIVOT_Z) < 1e-9, `still at ${t.toFixed(2)} s: on its spot, facing the front`);
    assert(Math.abs(p.bow - q.bow) < 0.2, `still at ${t.toFixed(2)} s: no jump`);
    bowed = Math.max(bowed, p.bow); Object.assign(q, p);
  }
  assert(bowed > 0.99 && p.move === 'bow', 'it bows, its own move');
}
console.log(`choreo ok: structure, determinism, room and speed on ${Object.keys(SONGS).length} songs, whole units, signatures, seek, still loop`);
