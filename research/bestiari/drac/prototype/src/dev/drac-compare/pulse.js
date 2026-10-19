// An ESTIMATED pulse of the source recording (dev only), in video seconds: not a beat transcription. The tempo follows
// the local periodicities measured in audio-diagnostics.json (about 118-123 BPM early, 129 in the middle, 152 at the
// end); the phase is fitted window by window (circular mean of the onset envelope of audio-analysis.wav) and held after
// 98 s, where the onsets stop agreeing. comic-v1/scratch/pulse.py and pulse-anchors.json
// derived these anchors; never the game's beat grid.
import { track, at } from './path.js';

// [video s, beats since an arbitrary origin], strictly increasing
export const PULSE_ANCHORS = [[0, -0.224], [4, 7.608], [8, 15.52], [12, 23.591], [16, 31.75], [20, 39.833], [24, 48.04],
  [28, 56.26], [32, 64.45], [36, 72.757], [40, 81.056], [44, 89.44], [48, 97.894], [52, 106.326], [56, 114.856],
  [60, 123.38], [64, 131.909], [68, 140.504], [72, 148.906], [76, 157.27], [80, 165.815], [84, 174.166],
  [88, 182.885], [92, 192.686], [96, 202.733], [104.8, 224.991]];
// one more anchor 4 s either side at the neighbouring rate, so the curve keeps its pace at 0 and 104.8 (the monotone
// cubic rests at its end keys)
const A = PULSE_ANCHORS, rate = (a, b) => (b[1] - a[1]) / (b[0] - a[0]);
const P = track([[-4, A[0][1] - 4 * rate(A[0], A[1])], ...A, [A.at(-1)[0] + 4, A.at(-1)[1] + 4 * rate(A.at(-2), A.at(-1))]]);
// the pulse's phase at t (beats; an integer = an estimated beat), monotone and C1
export const pulseAt = t => at(P, t);
