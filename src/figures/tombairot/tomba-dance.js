// The Tombairot's dance: a GAME ADAPTATION (research/bestiari/tombairot/README.md, «Ball al joc»). In the cercavila it
// only walks and sways; here each 8-beat phrase of the song (the chart's own phrases) is one readable action: walk
// forward and back, a quarter turn and back, a half turn and back, a bow of the long neck, a big sway; the finale hops
// round. Every phrase starts and ends at home (its spot, facing the frame's front), so the pose at second t is a pure
// function of t: the same instant is the same pose on any seek. Under it, the COMIC layer on every beat (a dip, the jaw
// snapping, a head waggle a bar, the ears flicking, cross-eyed on a phrase's last beat).
// No three.js: pose(t, out) and foot(t, i, out) fill plain objects, in the dance frame's metres (+z its front).
import { beatAtTime, timeAtBeat } from '../../core/beat-grid.js';

export const TOMBA_PHRASE = 8; // beats (game/chart.js: a note's phrase is its beat / 8)
export const TOMBA_PIVOT_Z = -1.4; // the long body's middle in the rig's frame: it turns about here, not about the cone
const TOMBA_QUARTER = Math.PI / 2, TOMBA_WALK = 1.1; // rad; m a walk goes forward (and comes back)
// A move: keys [beat in the phrase, forward m, turn rad, bow 0-1], eased between; hops on these beats; amp: the sway's size.
const TOMBA_MOVES = {
  walk: { keys: [[0, 0, 0, 0], [3.5, TOMBA_WALK, 0, 0], [4, TOMBA_WALK, 0, 0.3], [7.5, 0, 0, 0], [8, 0, 0, 0]], hops: [3.5], amp: 1 },
  turnL: { keys: [[0, 0, 0, 0], [2.5, 0, TOMBA_QUARTER, 0], [4, 0, TOMBA_QUARTER, 0.6], [6.5, 0, 0, 0], [8, 0, 0, 0]], hops: [], amp: 1 },
  turnR: { keys: [[0, 0, 0, 0], [2.5, 0, -TOMBA_QUARTER, 0], [4, 0, -TOMBA_QUARTER, 0.6], [6.5, 0, 0, 0], [8, 0, 0, 0]], hops: [], amp: 1 },
  half: { keys: [[0, 0, 0, 0], [4, 0, Math.PI, 0.4], [8, 0, 0, 0]], hops: [4], amp: 0.8 }, // round and back, a nod at its back to us
  bow: { keys: [[0, 0, 0, 0], [1.5, 0, 0, 1], [3, 0, 0, 1], [4, 0, 0, 0], [5.5, 0, 0, 1], [6.5, 0, 0, 1], [7.5, 0, 0, 0], [8, 0, 0, 0]], hops: [], amp: 0.6 },
  sway: { keys: [[0, 0, 0, 0], [8, 0, 0, 0]], hops: [3, 7], amp: 2 },
  finale: { keys: [[0, 0, 0, 0], [8, 0, 2 * Math.PI, 0]], hops: [0, 1, 2, 3, 4, 5, 6, 7], amp: 1.2 },
};
// Which move each phrase of a section dances, in turn (the song's sections: A, B, then any other letter)
const TOMBA_PLAN = { A: ['walk', 'bow', 'turnR', 'sway', 'walk', 'half', 'turnL', 'bow'], B: ['turnL', 'half', 'turnR', 'bow', 'sway', 'walk'], other: ['sway', 'walk', 'half', 'bow'] };
const tombaEase = u => u * u * (3 - 2 * u);
const TOMBA_HOP = { h: 0.22, len: 0.5 }; // m, beats: a hop's lift and length (up and down, landing on its beat)

export function newTombaPose() { return { x: 0, z: 0, yaw: 0, bow: 0, hop: 0, amp: 0.5, beat: 0, dip: 0, jaw: 0, waggle: 0, ears: 0, cross: 0, move: 'rest' }; }

// song: { beats, notes, sections, finale, end }
export function createTombaDance(song) {
  const B = song.beats, first = Math.floor(beatAtTime(B, song.notes[0][0]) / TOMBA_PHRASE) * TOMBA_PHRASE;
  const end = beatAtTime(B, song.end), finale = beatAtTime(B, song.finale);
  // one move per phrase, from the first note's phrase to the song's end
  const phrases = [];
  for (let b = first, i = 0, prev = null; b < end; b += TOMBA_PHRASE) {
    const t = timeAtBeat(B, b), letter = (song.sections.filter(([s]) => s <= t + 1e-6).pop() ?? song.sections[0])[1];
    if (letter !== prev) { i = 0; prev = letter; }
    phrases.push(b >= finale - 0.5 ? 'finale' : (plan => plan[i++ % plan.length])(TOMBA_PLAN[letter] ?? TOMBA_PLAN.other));
  }
  const keyAt = (keys, u, k) => {
    let i = 0; while (i < keys.length - 2 && u >= keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1], f = tombaEase(Math.min(1, Math.max(0, (u - a[0]) / (b[0] - a[0]))));
    return a[k] + (b[k] - a[k]) * f;
  };
  function pose(t, out = newTombaPose()) {
    const beat = beatAtTime(B, t), p = Math.floor((beat - first) / TOMBA_PHRASE);
    const move = p < 0 ? null : p < phrases.length ? TOMBA_MOVES[phrases[p]] : null, u = beat - first - p * TOMBA_PHRASE;
    out.beat = beat; out.move = move ? phrases[p] : p < 0 ? 'rest' : 'end';
    const fwd = move ? keyAt(move.keys, u, 1) : 0;
    out.yaw = move ? keyAt(move.keys, u, 2) : 0;
    // after the last phrase: a last deep bow, held (the end of the song, its results)
    out.bow = move ? keyAt(move.keys, u, 3) : p < 0 ? 0 : Math.min(1, (beat - first - phrases.length * TOMBA_PHRASE) / 2);
    out.amp = move ? move.amp : p < 0 ? 0.5 : 0.3;
    // the rig's origin (the cone) in the dance frame: its pivot (the body's middle) stands on the frame's centre and goes
    // forward along its turned heading
    const s = Math.sin(out.yaw), c = Math.cos(out.yaw);
    out.x = (fwd - TOMBA_PIVOT_Z) * s; out.z = (fwd - TOMBA_PIVOT_Z) * c;
    out.hop = 0;
    if (move) for (const h of move.hops) { const k = (u - h + TOMBA_HOP.len) / TOMBA_HOP.len; if (k > 0 && k < 1) out.hop = Math.max(out.hop, TOMBA_HOP.h * Math.sin(Math.PI * k)); }
    // the comic layer: on the beat, once the dance is on
    const on = move ? 1 : 0, ph = beat - Math.floor(beat), bar = Math.floor(beat / 4);
    out.dip = on * 0.035 * Math.exp(-ph * 6); // the carriers' knees give on the beat
    out.jaw = on * 0.16 * Math.max(0, Math.sin(Math.PI * (ph - 0.5) * 2)); // a snap: open on the off-beat, shut on the beat
    out.waggle = on * 0.12 * Math.sin(Math.PI * (beat % 4) / 2) * (bar % 2 ? 1 : -1); // the head shakes a bar one way, a bar the other
    out.ears = on * 0.25 * Math.exp(-ph * 4);
    out.cross = move && u >= 7 ? Math.sin(Math.PI * (u - 7)) : 0; // goggle-eyed on a phrase's last beat
    return out;
  }
  // A carrier's foot (0-1 the front carrier's, 2-3 the rear one's, homes in the rig's frame) planted on the paving: it
  // stays where it stepped and steps once a beat, a half beat apart from its partner, landing where the body will be at
  // the middle of its next stance. Fills out { x, y, z, yaw } in the dance frame.
  const FOOT_HOME = [[-0.13, 0.1], [0.13, 0.1], [-0.13, -1.6], [0.13, -1.6]], at = newTombaPose(), SWING = 0.45;
  const homeAt = (beat, i, o) => { // where foot i's home is at that beat (the rig's frame turned and moved by the pose)
    pose(timeAtBeat(B, beat), at); const s = Math.sin(at.yaw), c = Math.cos(at.yaw), [hx, hz] = FOOT_HOME[i];
    o.x = at.x + hx * c + hz * s; o.z = at.z - hx * s + hz * c; o.yaw = at.yaw;
    return o;
  };
  const FA = {}, FB = {};
  function foot(t, i, out = {}) {
    const off = (i % 2) * 0.5 + (i > 1 ? 0.25 : 0), ph = beatAtTime(B, t) - off, k = Math.floor(ph), u = ph - k;
    homeAt(k + off + 0.72, i, FB); // the middle of this stance (u from SWING to 1)
    if (u >= SWING) { out.x = FB.x; out.z = FB.z; out.yaw = FB.yaw; out.y = 0; return out; }
    homeAt(k + off - 0.28, i, FA); // the last stance's: swinging from there
    let turn = FB.yaw - FA.yaw; turn = Math.atan2(Math.sin(turn), Math.cos(turn)); // (a full turn wraps)
    const e = tombaEase(u / SWING), moved = Math.hypot(FB.x - FA.x, FB.z - FA.z) + Math.abs(turn);
    out.x = FA.x + (FB.x - FA.x) * e; out.z = FA.z + (FB.z - FA.z) * e; out.yaw = FA.yaw + turn * e;
    out.y = Math.min(0.08, moved) * Math.sin(Math.PI * u / SWING); // a foot that has nowhere to go stays down
    return out;
  }
  return { pose, foot, phrases, first, duration: song.duration };
}
