// Generated arrangement cues, in song beats: follows tempo changes and seeks without a cursor.
import bouPercussionCues from './bou-percussion.json' with { type: 'json' };
import bouPercussionSong from '../../song-bou.json' with { type: 'json' };
import { timeAtBeat } from '../../core/beat-grid.js';

const BOU_PERCUSSION_HANDS = bouPercussionCues.hands.map(hits => hits.map(([beat, strength]) => [timeAtBeat(bouPercussionSong.beats, beat), strength]));

export function bouPercussionLift(hand, beat) {
  const hits = BOU_PERCUSSION_HANDS[hand], time = timeAtBeat(bouPercussionSong.beats, beat);
  let lo = 0, hi = hits.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (hits[mid][0] <= time) lo = mid + 1; else hi = mid;
  }
  const previous = hits[lo - 1], next = hits[lo];
  // Stay raised between hits: returning to the head on every rebound invented silent extra strokes.
  // Durations are in seconds so a tempo change never compresses a stroke into a tremor.
  const after = previous ? time - previous[0] : Infinity;
  const before = next ? next[0] - time : Infinity;
  if (!previous && before > .075) {
    const ready = Math.max(0, Math.min(1, (.2 - before) / .125));
    return ready * ready * (3 - 2 * ready);
  }
  if (!next && after > .1) {
    const rest = Math.max(0, 1 - (after - .1) / .6);
    return rest * rest * (3 - 2 * rest);
  }
  const gap = previous && next ? next[0] - previous[0] : Infinity;
  const rebound = Math.min(1, after / Math.min(.1, gap * .55));
  const strike = Math.min(1, before / Math.min(.075, gap * .45));
  return Math.min(rebound * (2 - rebound), strike * strike);
}

export function poseBouPercussion(band, beat) {
  for (const p of band) {
    if (p.lineup !== 'grallers' || p.kind !== 'timbal' || !p.g.scale.x) continue;
    p.arms[1].rotation.x = p.rest[2] - .6 * bouPercussionLift(0, beat);
    p.arms[0].rotation.x = p.rest[0] - .6 * bouPercussionLift(1, beat);
  }
}
