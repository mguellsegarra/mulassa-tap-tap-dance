// The run's sound: every note is given its exact time on the audio clock, so the tune and its accompaniment stay on the
// grid whatever the taps do. Soft sine and triangle only (the Mulassa game's audio rule).
export function createSynth() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
  if (navigator.audioSession) navigator.audioSession.type = 'playback'; // iPhone: sounds with the silent switch on
  const bus = ctx.createGain(), soft = ctx.createBiquadFilter(), limit = ctx.createDynamicsCompressor();
  bus.gain.value = .8;
  soft.type = 'lowpass';
  soft.frequency.value = 3200;
  limit.threshold.value = -6;
  limit.ratio.value = 12;
  bus.connect(soft).connect(limit).connect(ctx.destination);
  const hz = m => 440 * 2 ** ((m - 69) / 12);
  function voice(type, midi, at, dur, peak, attack = .005) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = hz(midi);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(.0001, at + dur);
    o.connect(g).connect(bus);
    o.start(at);
    o.stop(at + dur + .05);
    return g;
  }
  // a held note: it keeps its level for its written length, as a gralla would
  function sung(midi, at, len) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = hz(midi);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(.3, at + .008);
    g.gain.linearRampToValueAtTime(.2, at + len - .06);
    g.gain.linearRampToValueAtTime(0, at + len + .06);
    o.connect(g).connect(bus);
    o.start(at);
    o.stop(at + len + .1);
    return g;
  }
  return {
    ctx,
    // the tune's note, with a little shine an octave up → its gains, for cut()
    lead: (midi, at, len, held) => [held ? sung(midi, at, len) : voice('triangle', midi, at, Math.max(.4, len * 1.1), .3), voice('sine', midi + 12, at, .2, .07)],
    cut(gains) {
      for (const g of gains) {
        g.gain.cancelScheduledValues(ctx.currentTime);
        g.gain.setTargetAtTime(0, ctx.currentTime, .015);
      }
    },
    bass: (pc, at) => voice('triangle', 43 + (pc + 5) % 12, at, .34, .2, .01), // G2 to F#3
    stab(pcs, at) { for (const pc of pcs) voice('sine', 60 + pc, at, .16, .045); },
    tick: at => voice('sine', 88, at, .06, .14, .002),
  };
}
