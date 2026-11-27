// The Tombairot's dance: a GAME ADAPTATION (research/bestiari/tombairot/README.md, «Ball al joc»). In the cercavila it
// only walks and sways; here it has no dance of its own, so the generic engine (game/choreo/) plans one for whatever song
// plays, from this vocabulary: the universal moves (the clock, a turn in 16 beats, a circle, the final turns) and its own
// (a walk forward and back, a quarter turn and back, a half turn and back, a bow of the long neck, a big sway with hops).
// Every move starts and ends at home, so the pose at second t is a pure function of t: the same instant is the same pose
// on any seek. Under it, the COMIC layer on every beat (a dip, the jaw snapping, a head waggle a bar, the ears flicking,
// cross-eyed on a move's last beat).
// No three.js: pose(t, out) and foot(t, i, out) fill plain objects, in the dance frame's metres (+z its front).
import { beatAtTime, timeAtBeat } from '../../core/beat-grid.js';
import { smooth01 } from '../../core/math.js';
import { createChoreo, newChoreoPose } from '../../game/choreo/planner.js';
import { choreoKeyed, choreoSway, choreoSpoke, choreoTurn, choreoArc, choreoSpin, choreoMirror, choreoMoveAt } from '../../game/choreo/moves.js';

export const TOMBA_PIVOT_Z = -1.4; // the long body's middle in the rig's frame: it turns about here, not about the cone
const TOMBA_QUARTER = Math.PI / 2, TOMBA_WALK = 1.1; // rad; m a walk goes forward (and comes back)
// Its own moves, 8 beats by design: rows [beat, side m, forward m, turn rad, bow 0-1], eased between; hops on these beats.
const tombaMove = (id, keys, hops, amp) => choreoKeyed(id, 8, keys, { hops, amp });
const TOMBA_OWN = {
  walk: tombaMove('walk', [[0, 0, 0, 0, 0], [3.5, 0, TOMBA_WALK, 0, 0], [4, 0, TOMBA_WALK, 0, 0.3], [7.5, 0, 0, 0, 0], [8, 0, 0, 0, 0]], [3.5], 1),
  quarter: tombaMove('quarter', [[0, 0, 0, 0, 0], [2.5, 0, 0, -TOMBA_QUARTER, 0], [4, 0, 0, -TOMBA_QUARTER, 0.6], [6.5, 0, 0, 0, 0], [8, 0, 0, 0, 0]], [], 1), // to its right and back
  half: tombaMove('half', [[0, 0, 0, 0, 0], [4, 0, 0, Math.PI, 0.4], [8, 0, 0, 0, 0]], [4], 0.8), // round and back, a nod at its back to us
  bow: tombaMove('bow', [[0, 0, 0, 0, 0], [1.5, 0, 0, 0, 1], [3, 0, 0, 0, 1], [4, 0, 0, 0, 0], [5.5, 0, 0, 0, 1], [6.5, 0, 0, 0, 1], [7.5, 0, 0, 0, 0], [8, 0, 0, 0, 0]], [], 0.6),
  sway: choreoSway(2, [3, 7]),
};
// A block's units (game/choreo/planner.js): each danced whole or not at all
const tombaOne = move => [{ move, span: 1 }];
const TOMBA_SPOKE = { move: choreoSpoke(1.5, -TOMBA_QUARTER, 0), span: 2, short: choreoSpoke(0.8, -TOMBA_QUARTER, 0, 8) };
// Its size for the engine's room check: the cone and head 2.3 m ahead of the pivot, the tail 2.8 m behind; the colla
// stands 5.3 m out (tomba-colla.js), so nose and tail keep 4.5 m (a helper's body and some air short of them).
// Two children carry it: an easy walk, a turn no faster than about 150 deg/s (the owner's limit).
export const TOMBA_VOCAB = Object.freeze({
  reach: { front: 2.3, back: 2.8, room: 4.5 }, speed: 1.6, turnRate: 2.6,
  wait: choreoSway(0.7),
  blocks: {
    1: [[TOMBA_SPOKE, TOMBA_SPOKE, TOMBA_SPOKE, TOMBA_SPOKE]], // the clock: a quarter turn right a spoke, N, E, S, W
    2: [[choreoTurn(1, 1), choreoTurn(1, -1)], [choreoArc(0.8, 1), choreoArc(0.8, -1)]].map(u => u.map(move => ({ move, span: 2 }))), // turn and unturn; a circle each way
    3: [TOMBA_OWN.half, TOMBA_OWN.quarter, TOMBA_OWN.bow, TOMBA_OWN.sway, TOMBA_OWN.walk, choreoMirror(TOMBA_OWN.quarter), TOMBA_OWN.half, TOMBA_OWN.sway].map(tombaOne), // its own
  },
  finale: beats => choreoSpin(Math.max(1, Math.round(beats / 8)), 1), // a turn a phrase, braking to face home on the last hit
});
// The selector's held shot (tomba-stage.js): its bow, on its spot, over and over (starts and ends at home, square)
const TOMBA_STILL = TOMBA_OWN.bow;
const TOMBA_HOP = 0.22; // m: a hop's lift

export function newTombaPose() { return { ...newChoreoPose(), dip: 0, jaw: 0, waggle: 0, ears: 0, cross: 0 }; }

// The selector's held loop: its still move from beat 0 on, a whole move every TOMBA_STILL.D beats, at home facing the front
const tombaStill = { pose(beat, out) {
  const u = ((beat % TOMBA_STILL.D) + TOMBA_STILL.D) % TOMBA_STILL.D;
  choreoMoveAt(TOMBA_STILL, u, TOMBA_STILL.D, out);
  out.beat = beat; out.u = u; out.len = TOMBA_STILL.D; out.level = 0; out.move = TOMBA_STILL.id;
  return out;
} };

// song: { beats, notes, sections | arrangement, finale, end }; still: its held loop instead of the song's dance
export function createTombaDance(song, { still = false } = {}) {
  const B = song.beats, choreo = still ? tombaStill : createChoreo(song, TOMBA_VOCAB);
  function pose(t, out = newTombaPose()) {
    const beat = beatAtTime(B, t);
    choreo.pose(beat, out);
    const on = out.move !== 'rest' && out.move !== 'end' ? 1 : 0;
    out.hop *= TOMBA_HOP;
    // the rig's origin (the cone) in the dance frame: its pivot (the body's middle) is where the engine put it
    out.x -= TOMBA_PIVOT_Z * Math.sin(out.yaw); out.z -= TOMBA_PIVOT_Z * Math.cos(out.yaw);
    // the comic layer: on the beat, once the dance is on
    const ph = beat - Math.floor(beat), bar = Math.floor(beat / 4);
    out.dip = on * 0.035 * Math.exp(-ph * 6); // the carriers' knees give on the beat
    out.jaw = on * 0.16 * Math.max(0, Math.sin(Math.PI * (ph - 0.5) * 2)); // a snap: open on the off-beat, shut on the beat
    out.waggle = on * 0.12 * Math.sin(Math.PI * (beat % 4) / 2) * (bar % 2 ? 1 : -1); // the head shakes a bar one way, a bar the other
    out.ears = on * 0.25 * Math.exp(-ph * 4);
    out.cross = on && out.u >= out.len - 1 ? Math.sin(Math.PI * (out.u - out.len + 1)) : 0; // goggle-eyed on a move's last beat
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
    const e = smooth01(u / SWING), moved = Math.hypot(FB.x - FA.x, FB.z - FA.z) + Math.abs(turn);
    out.x = FA.x + (FB.x - FA.x) * e; out.z = FA.z + (FB.z - FA.z) * e; out.yaw = FA.yaw + turn * e;
    out.y = Math.min(0.08, moved) * Math.sin(Math.PI * u / SWING); // a foot that has nowhere to go stays down
    return out;
  }
  return { pose, foot, plan: choreo.plan, duration: song.duration };
}
