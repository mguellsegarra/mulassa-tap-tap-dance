// The generic dance engine: plans a figure's dance for any song, once, and poses it at any beat, allocating nothing.
// The plan is deterministic (the same song and figure, the same dance, at every difficulty: decisions.md 7) and follows
// the grammar of research/motor-ball/coreografia.md: one move per phrase of 8 beats (two phrases for the 16-beat ones),
// a block of moves per intensity step, each section starting its block again, the second section on a step dancing it
// mirrored and the third a little wider; from song.finale to the last hit, turns on the spot; then a still bow.
// A block is a list of UNITS, each danced whole or not at all: the clock's four spokes, a turn and its unturn, or one
// move. A unit takes its long moves when the section has room, else its short ones, and every move in it must keep
// within the figure's room (nose and tail clear of the colla) and its carriers' speed and turn rate at the song's local
// tempo, shrinking a little if it must; a unit that cannot go there gives way to the next one, and a phrase nothing
// fits sways. Every unit ends facing the front, so every section does too.
//
// vocab (the figure's, in its folder): { reach: { front, back, room } m, speed m/s, turnRate rad/s, wait: move,
//   blocks: { 1: [unit...], 2: [...], 3: [...] } unit = [{ move, span (phrases), short? (its one-phrase version) }],
//   finale(beats): move }
import { timeAtBeat } from '../../core/beat-grid.js';
import { songStructure } from './song-structure.js';
import { choreoMoveAt, choreoMirror, choreoShrink, choreoTurnOf, choreoSway } from './moves.js';

const CHOREO_REST = Object.freeze({ id: 'rest', kind: 'keys', D: 8, keys: [[0, 0, 0, 0, 0], [8, 0, 0, 0, 0]], hops: [], amp: 0.5 });
const CHOREO_STEP = 1 / 8; // beats between the fit's samples

export function newChoreoPose() { return { x: 0, z: 0, yaw: 0, bow: 0, hop: 0, amp: 0.5, beat: 0, u: 0, len: 8, level: 0, move: 'rest' }; }

// An entry of the plan in the dance frame: the move, where it starts (beat) and how long, its heading at the start
const choreoEntry = (start, len, move, yaw0, level) => ({ start, len, move, yaw0, level });

// Pose of entry e, u beats into it, in the dance frame (the pivot's x, z and the heading)
function choreoPoseOf(e, u, o) {
  choreoMoveAt(e.move, u, e.len, o);
  const s = Math.sin(e.yaw0), c = Math.cos(e.yaw0), x = o.x, z = o.z;
  o.x = x * c + z * s; o.z = -x * s + z * c; o.yaw += e.yaw0;
  return o;
}

// Does entry e keep within the figure's room, speed and turn rate at this song's tempo? (sampled every eighth of a beat)
function choreoFits(e, vocab, B) {
  const a = newChoreoPose(), b = newChoreoPose(), { front, back, room } = vocab.reach;
  for (let u = 0; u <= e.len; u += CHOREO_STEP) {
    choreoPoseOf(e, u, b);
    const s = Math.sin(b.yaw), c = Math.cos(b.yaw);
    if (Math.hypot(b.x + front * s, b.z + front * c) > room || Math.hypot(b.x - back * s, b.z - back * c) > room) return false;
    if (u > 0) {
      const dt = timeAtBeat(B, e.start + u) - timeAtBeat(B, e.start + u - CHOREO_STEP);
      if (Math.hypot(b.x - a.x, b.z - a.z) / dt > vocab.speed || Math.abs(b.yaw - a.yaw) / dt > vocab.turnRate) return false;
    }
    Object.assign(a, b);
  }
  return true;
}
// e, shrunk until it fits (a few steps), or null
function choreoFitted(e, vocab, B) {
  for (let k = 0; !choreoFits(e, vocab, B); k++) {
    const smaller = k < 8 && choreoShrink(e.move, 0.85);
    if (!smaller) return null;
    e.move = smaller;
  }
  return e;
}

// Unit `unit` from phrase k of a section's dance phrases P, heading yaw: its long moves, else its short ones.
// Returns { entries, used (phrases), yaw } or null (no room, or a move that cannot fit even shrunk).
function choreoPlace(unit, P, k, yaw, level, n, vocab, B) {
  for (const short of [false, true]) {
    if (short && !unit.some(it => it.short)) break;
    const out = [];
    let j = k, y = yaw;
    for (const it of unit) {
      const span = short ? 1 : it.span;
      if (j + span > P.length || short && it.span !== 1 && !it.short) break;
      let move = short && it.short ? it.short : it.move, len = 0;
      if (n % 2 === 0) move = choreoMirror(move); // the second section on this step: to the other side
      if (n >= 3 && move.kind !== 'spin') move = choreoShrink(move, 1.15) ?? move; // the third: a little wider
      for (let q = j; q < j + span; q++) len += P[q].len;
      const e = choreoFitted(choreoEntry(P[j].start, len, move, y, level), vocab, B);
      if (!e) break;
      out.push(e); y += choreoTurnOf(e.move); j += span;
    }
    if (out.length === unit.length) return { entries: out, used: j - k, yaw: y };
  }
  return null;
}

export function planChoreo(song, vocab) {
  const st = songStructure(song), B = song.beats, entries = [], times = {}; // times: sections danced on each step so far
  let yaw = 0;
  const still = (p, move, level) => entries.push(choreoFitted(choreoEntry(p.start, p.len, move, yaw, level), vocab, B) ?? choreoEntry(p.start, p.len, choreoSway(0.5), yaw, level));
  for (const s of st.sections) {
    const P = st.phrases.filter(p => p.section === s && p.start + p.len > st.first);
    for (const p of st.phrases) if (p.section === s && p.start + p.len <= st.first) entries.push(choreoEntry(p.start, p.len, CHOREO_REST, yaw, 0));
    if (!s.level) { P.forEach(p => still(p, vocab.wait, 0)); continue; }
    const units = vocab.blocks[s.level], n = times[s.level] = (times[s.level] ?? 0) + 1;
    for (let k = 0, cursor = 0; k < P.length;) {
      let placed = null, u = 0;
      for (; u < units.length && !placed; u++) placed = choreoPlace(units[(cursor + u) % units.length], P, k, yaw, s.level, n, vocab, B);
      if (!placed) { still(P[k++], choreoSway(1), s.level); continue; }
      entries.push(...placed.entries); yaw = placed.yaw; k += placed.used; cursor += u;
    }
  }
  if (st.end > st.finale) still({ start: st.finale, len: st.end - st.finale }, vocab.finale(st.end - st.finale), 4);
  return { first: st.first, end: st.end, finale: st.finale, structure: st, entries };
}

// pose(beat, out) fills a ChoreoPose (newChoreoPose) at that beat: before the plan, at rest; past the last hit, at home
// with `bow` rising to a held 1 (its last bow). O(1): the entry is looked up by whole beat.
export function createChoreo(song, vocab) {
  const plan = planChoreo(song, vocab), { entries } = plan, start = entries[0]?.start ?? 0, last = entries.at(-1);
  const stop = last ? last.start + last.len : start;
  const at = new Int16Array(Math.max(1, stop - start));
  entries.forEach((e, k) => at.fill(k, e.start - start, e.start - start + e.len));
  function pose(beat, out) {
    out.beat = beat;
    if (beat < start || beat >= stop) {
      out.x = out.z = out.hop = 0; out.yaw = last && beat >= stop ? last.yaw0 + choreoTurnOf(last.move) : 0;
      out.bow = beat >= stop ? Math.min(1, (beat - stop) / 2) : 0; out.amp = beat >= stop ? 0.3 : 0.5;
      out.move = beat >= stop ? 'end' : 'rest'; out.level = 0; out.u = 0; out.len = 8;
      return out;
    }
    const e = entries[at[Math.floor(beat) - start]];
    out.u = beat - e.start; out.len = e.len; out.level = e.level; out.move = e.move.id;
    return choreoPoseOf(e, out.u, out);
  }
  return { pose, plan };
}
