// The selector's showreel (src/game/showreel.js), filmed as a dance film: long shots (no shot under 16 beats, ~6 s), cuts and
// glides on bars, a hard cut only where the list says so (a glide eases across without a jump), never the same shot twice in
// a row (across the loop too), every angle on the camera's side of the action, her whole body with air round her, and the
// dance clock locked to the menu loop's beat.
import assert from 'node:assert/strict';
import { SHOWREELS, SHOT_KINDS, REEL_GLIDE, REEL_GLIDE_AZ, REEL, followBeat, shotAt, tickReel } from '../src/game/showreel.js';
import menuSong from '../src/song.json' with { type: 'json' };
import dracSong from '../src/song-drac.json' with { type: 'json' };
import bouSong from '../src/song-bou.json' with { type: 'json' };
import { beatAtTime } from '../src/core/beat-grid.js';
import { MULASSA, DRAC, BOU } from '../src/game/figures.js';
import { rootAt } from '../src/game/drac-path.js';
import { dracTime } from '../src/game/drac-time.js';
import { DRAC_SCALE } from '../src/scene/models/drac.js';

const songs = { [MULASSA.id]: menuSong, [DRAC.id]: dracSong, [BOU.id]: bouSong };
for (const [id, reel] of Object.entries(SHOWREELS)) {
  const { shots, loop, start } = reel, end = beatAtTime(songs[id].beats, songs[id].end);
  assert.deepEqual(shots[0].slice(0, 1).concat(shots[0][2]), [0, 'cut'], `${id}: the list covers the loop from its first beat, on a cut (the wrap)`);
  assert.ok(loop >= end && loop - end <= 8 && loop % 4 === 0, `${id}: the loop starts again on a bar shortly after the final hit (${end})`);
  assert.ok(start % 4 === 0 && start < loop, `${id}: a fresh selection starts on a bar`);
  assert.ok(shots.filter(s => s[2] === 'cut').length <= 5, `${id}: hard cuts only at the big changes`);
  shots.forEach(([b, kind, how], i) => {
    const next = shots[i + 1]?.[0] ?? loop, prev = shots.at(i - 1)[1];
    assert.ok(SHOT_KINDS[kind] && (how === 'cut' || how === 'glide'), `${id}: ${kind} ${how} is a shot`);
    assert.equal(b % 4, 0, `${id}: the change at ${b} is on a bar`);
    if (SHOT_KINDS[kind].part) assert.ok(next - b >= 8 && next - b <= 12 && how === 'cut' && (shots[i + 1]?.[2] ?? 'cut') === 'cut', `${id}: the close-up at ${b} is short (${next - b} beats), cut in and out`);
    else assert.ok(next - b >= 16 && next - b <= 40 && (how !== 'glide' || next - b > REEL_GLIDE), `${id}: the shot at ${b} lasts ${next - b} beats (a glide's, longer than the glide)`);
    assert.notEqual(kind, prev, `${id}: no change into the same shot at ${b}`);
    if (how === 'glide') assert.ok(Math.abs(SHOT_KINDS[kind].az[0] - SHOT_KINDS[prev].az[1]) <= REEL_GLIDE_AZ, `${id}: the glide at ${b} turns round her calmly`);
  });
  // a glide never jumps, and only a cut changes the index tickReel reports as a cut
  const a = {}, z = {};
  for (let b = 0; b < loop - 0.25; b += 0.25) {
    const ia = shotAt(reel, b, a), iz = shotAt(reel, b + 0.25, z);
    const cutHere = shots.some(s => s[2] === 'cut' && s[0] > b && s[0] <= b + 0.25);
    if (!cutHere) assert.ok(Math.abs(z.az - a.az) < 0.06 && Math.abs(z.el - a.el) < 0.06 && Math.abs(z.fill - a.fill) < 0.03 && ia === iz, `${id}: smooth at beat ${b}`);
    else assert.notEqual(ia, iz, `${id}: the cut at ${b + 0.25} is one`);
  }
}
// the Drac's close-ups only where its heads stand still (a long lens makes any travel or turn huge): its root, sampled
// through the dance's own time map, moves under 0.8 m and turns under 0.35 rad a beat across each close-up
{ const out = {}, B = dracSong.beats, songAt = b => { const i = Math.min(B.length - 2, Math.floor(b)); return B[i] + (B[i + 1] - B[i]) * (b - i); };
  const { shots, loop } = SHOWREELS[DRAC.id];
  shots.forEach(([b, kind], i) => {
    if (!SHOT_KINDS[kind].part) return;
    let worst = 0, turn = 0, last = null;
    for (let x = b; x <= (shots[i + 1]?.[0] ?? loop); x += 0.25) {
      rootAt(out, dracTime.refAt(songAt(x))); const p = [out.x * DRAC_SCALE, out.z * DRAC_SCALE, out.yaw];
      if (last) { worst = Math.max(worst, Math.hypot(p[0] - last[0], p[1] - last[1]) / 0.25); turn = Math.max(turn, Math.abs(p[2] - last[2]) / 0.25); }
      last = p;
    }
    assert.ok(worst < 0.8 && turn < 0.35, `drac: the close-up at ${b} holds a still moment (${worst.toFixed(2)} m, ${turn.toFixed(2)} rad a beat)`);
  }); }
for (const [name, k] of Object.entries(SHOT_KINDS)) {
  for (const az of k.az) assert.ok(Math.abs(az) <= 0.8, `${name}: stays on the camera's side of the action (180° rule)`);
  for (const f of k.fill) assert.ok(f >= 0.55 && f <= 0.82, `${name}: her whole body (a close-up: its part) with air round it`);
  assert.ok(Math.abs(k.az[1] - k.az[0]) <= 0.12, `${name}: nearly held (a slight drift, no swing)`);
}

// reduced motion: one still shot
const out = {}, mula = SHOWREELS[MULASSA.id];
assert.equal(shotAt(mula, 150, out, true), 0, 'reduced motion: one shot');
const calmAz = out.az; shotAt(mula, 10, out, true); assert.equal(out.az, calmAz, 'reduced motion: the shot holds still');

// the beat follower: the menu loop's beats across its wrap, its tempo in silence, its bar's phase once it sounds again
const s = { acc: 0, prev: null };
followBeat(s, 62, 0.1); followBeat(s, 63.5, 0.1); followBeat(s, 1, 0.1); // 62 -> 63.5 -> (wrap) 65
assert.ok(Math.abs((s.acc % 4) - 1) < 1e-9, 'on the loop\'s phase after its wrap');
const loopBpm = menuSong.ambientLoop.beats * 60 / (menuSong.ambientLoop.end - menuSong.ambientLoop.start);
const before = s.acc; followBeat(s, null, 1); assert.ok(Math.abs(s.acc - before - loopBpm / 60) < 1e-9, 'silent: the menu loop\'s own tempo');
followBeat(s, 2.25, 0.01); assert.ok(Math.abs(s.err) > 0, 'music again: the phase left to catch up (gradually, below)');
// the loop standing still while the page runs (a suspended context: a tab or app switch, iOS waiting for a tap): the dance
// carries on at the tempo, never frozen; a frame with no time changes nothing; the music moving again (or a seek): back onto
// its bar without a jump, at most REEL_CATCH (15%) faster or slower until in step
{ const f = { acc: 0, prev: null }, ph = x => ((x % 4) + 4) % 4;
  followBeat(f, 8, 0.1); assert.ok(Math.abs(ph(f.acc) - 0) < 1e-9, 'the first lock: straight onto the bar');
  followBeat(f, 8.25, 0.1); const a0 = f.acc;
  followBeat(f, 8.25, 0); assert.ok(f.acc === a0 && !f.alone, 'a frame with no time: nothing');
  for (let i = 0; i < 30; i++) followBeat(f, 8.25, 0.1);
  assert.ok(Math.abs(f.acc - a0 - 30 * 0.1 * loopBpm / 60) < 1e-9 && f.alone, 'standing still: the dance carries on alone at the tempo');
  let mb = 8.4, worst = 0, before = f.acc;
  followBeat(f, mb, 0.02); assert.ok(!f.alone && f.acc - before < 0.1, 'moving again: no jump');
  for (let i = 0; i < 400; i++) { before = f.acc; mb += 0.05; followBeat(f, mb, 0.02); worst = Math.max(worst, Math.abs((f.acc - before) / 0.05 - 1)); }
  assert.ok(worst <= 0.15 + 1e-9, `caught up at most 15% off the tempo (${worst.toFixed(3)})`);
  const err = Math.abs(ph(f.acc) - ph(mb)); assert.ok(Math.min(err, 4 - err) < 1e-6, 'and back onto the loop\'s bar'); }

// tickReel: a fresh selection starts on its first move, on the current bar; every shot change is a cut, the wrap too
Object.assign(REEL, { on: false, id: null, acc: 0, prev: null, alone: false, err: 0, locked: false });
let r = tickReel(true, MULASSA.id, 1, 0);
assert.equal(r.beat, 16 + 1, 'starts at her first move, as far into the bar as the music is'); assert.ok(r.cut, 'its first frame is a cut');
r = tickReel(true, MULASSA.id, 1.5, 0.2); assert.ok(!r.cut);
let cuts = 0, wraps = 0, last = r.beat;
for (let i = 0; i < 4 * 232 * 10; i++) { const mb = (1.5 + (i + 1) * 0.1) % 64; r = tickReel(true, MULASSA.id, mb, 0.04); if (r.cut) cuts++; if (r.beat < last) { wraps++; assert.ok(r.cut, 'the loop\'s wrap is a cut'); } last = r.beat; }
assert.ok(wraps >= 3 && cuts === wraps * mula.shots.filter(s => s[2] === 'cut').length, `every cut and the wrap, nothing else (${cuts} for ${wraps} loops)`);
r = tickReel(true, DRAC.id, 0, 0.04); assert.ok(r.cut && r.beat >= 8 && r.beat < 12, 'another figure starts its own reel (the Drac on the wide shot, not its close-up)');
r = tickReel(false, DRAC.id, 0.1, 0.04); assert.ok(!r.on && !r.cut);
console.log('showreel ok');
