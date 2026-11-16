// One visible stroke per drum cue; no silent return stroke, and the intro plays before the figure moves.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { bouPercussionLift, poseBouPercussion } from '../../../src/figures/bou/bou-percussion.js';
import cues from '../../../src/figures/bou/bou-percussion.json' with { type: 'json' };
import song from '../../../src/song-bou.json' with { type: 'json' };
import { beatAtTime, timeAtBeat } from '../../../src/core/beat-grid.js';
const audio = readFileSync(new URL('../../../public/' + song.audio.split('?')[0], import.meta.url));
assert.equal(createHash('sha256').update(audio).digest('hex'), cues.audioSha256, 'cues identify the served arrangement');
// The intro's main drums alternate once per beat. Shaker subdivisions must not create extra arm strikes.
assert.deepEqual(cues.hands.map(h => h.slice(0, 3).map(x => x[0])), [[0, 2, 4], [1, 3, 5]]);
for (let hand = 0; hand < 2; hand++) {
  for (const [beat] of cues.hands[hand]) assert(bouPercussionLift(hand, beat) < 1e-7, 'the stick reaches the head exactly at every cue');
}
for (let beat = .4; beat <= 1.5; beat += .05) assert(bouPercussionLift(0, beat) > .99, 'between intro hits the stick stays raised, never inventing a second stroke');
// Same rebound duration through tempo changes, including the slow passage and fast coda.
for (const hand of [0, 1]) {
  const hits = cues.hands[hand];
  for (let i = 0; i < hits.length - 1; i++) {
    const at = timeAtBeat(song.beats, hits[i][0]), next = timeAtBeat(song.beats, hits[i + 1][0]);
    if (next - at > .25) assert(bouPercussionLift(hand, beatAtTime(song.beats, at + .12)) > .99, 'the rebound takes seconds, not a hardcoded tempo');
  }
}
const p = { kind: 'timbal', lineup: 'grallers', g: { scale: { x: 1 } }, rest: [0, 0, 0, 0], arms: [{ rotation: { x: 0 } }, { rotation: { x: 0 } }] };
poseBouPercussion([p], .4, 0); // the host keeps the figure still during the audible intro
assert(p.arms[1].rotation.x < -.5, 'the timbaler moves during the intro even while figure live=0');
poseBouPercussion([p], 170); poseBouPercussion([p], .4);
assert(p.arms[1].rotation.x < -.5, 'seeking back uses the song clock, not a stale event cursor');
console.log('Bou percussion: arrangement identity, clear strokes, intro and seeks ok');
