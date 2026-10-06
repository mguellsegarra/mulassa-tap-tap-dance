// Judge windows (s, ±) per level: PERFECTE, BÉ, and how early a press still counts as that note's ERROR (later, a note
// is missed after `miss` too). Narrowed once the song clock lost its buffer steps (audio.js audioClock).
export const WINDOWS = [
  { perfect: 0.06, good: 0.14, miss: 0.18 },
  { perfect: 0.045, good: 0.11, miss: 0.15 },
  { perfect: 0.035, good: 0.09, miss: 0.125 },
];
export function quality(counts) {
  const total = counts.perfect + counts.good + counts.miss;
  return total ? 100 * (counts.perfect + counts.good * 0.8) / total : 0;
}
export const judgedCount = counts => counts.perfect + counts.good + counts.miss;
// The quality as shown: an em dash until a note is judged (0% would read as "you failed").
export const qualityText = counts => (judgedCount(counts) ? `${Math.round(quality(counts))}%` : '—');
// 0-3 stars, the result medal anyone reads without a legend (was the arcade letters S/A/B/C/D)
export const starsFor = value => value >= 85 ? 3 : value >= 70 ? 2 : value >= 50 ? 1 : 0;
// How long ago (s) an input event happened: its timeStamp and performance.now() share one clock. A tap that waited
// behind a long frame (low-end phones stall 100–400 ms) is judged when it happened, not when its handler ran; the song
// clock (AudioContext.currentTime) keeps running on the audio thread meanwhile. Missing, zero, future or foreign-clock
// (epoch) stamps count as "now"; older than `cap` is capped.
export const eventAge = (stamp, now, cap = 0.5) => (stamp > 0 && now > stamp ? Math.min(cap, (now - stamp) / 1000) : 0);
