import { timeAtBeat } from '../../../../src/core/beat-grid.js';

// A warm, quiet additive voice. All event times are AudioContext seconds, shared with the transport.
export function createSynth(audioCtx) {
  const voices = new Set();
  function note(midi, when, duration) {
    if (!(duration > 0)) return;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.setPeriodicWave(wave);
    osc.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), when);
    const attack = Math.min(0.012, duration / 4), release = Math.min(0.08, duration / 3), end = when + duration;
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(0.11, when + attack);
    gain.gain.exponentialRampToValueAtTime(0.055, Math.max(when + attack, end - release));
    gain.gain.linearRampToValueAtTime(0, end);
    osc.connect(gain); gain.connect(audioCtx.destination);
    const voice = { osc, gain };
    voices.add(voice);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); voices.delete(voice); };
    osc.start(when); osc.stop(end);
  }
  const wave = audioCtx.createPeriodicWave(new Float32Array(5), new Float32Array([0, 1, 0.22, 0.07, 0.02]));
  function cancel() {
    for (const { osc, gain } of voices) {
      gain.gain.cancelScheduledValues(audioCtx.currentTime);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      osc.stop(audioCtx.currentTime); osc.disconnect(); gain.disconnect();
    }
    voices.clear();
  }
  // Events are converted once per load; a seek includes the remainder of a note already sounding at that position.
  function events(timeline) {
    return (timeline.melody ?? []).map(([beat, duration, midi]) => ({
      start: timeAtBeat(timeline.beats, beat), end: timeAtBeat(timeline.beats, beat + duration), midi,
    })).sort((a, b) => a.start - b.start);
  }
  return { note, cancel, events };
}
