// The music, played live: every step of the tune (laid out in game time by conductor.js) is scheduled on its own, so the
// tempo rises smoothly with nothing stretched or pitched, and new voices come in as the score grows. Soft sine and triangle
// timbres only (the Mulassa game's audio rule: no pulse or square buzz).
import { MELODY, CHORDS, chordAt } from './melody.js';
import { STEP, layersFor, wrap } from './conductor.js';

export const hz = m => 440 * 2 ** ((m - 69) / 12);
const byBeat = new Map();
for (const n of MELODY) if (!byBeat.has(n[0])) byBeat.set(n[0], n);

export function createSequencer(ctx, out = ctx.destination) {
  const master = ctx.createGain(), tone = ctx.createBiquadFilter(), comp = ctx.createDynamicsCompressor();
  master.gain.value = .9;
  tone.type = 'lowpass';
  tone.frequency.value = 2600; // the cure for shrill
  tone.Q.value = .4;
  master.connect(tone).connect(comp).connect(out);
  const echo = ctx.createDelay(1), wet = ctx.createGain();
  echo.delayTime.value = .06; // a short room: a longer echo rang old notes over the next chord
  wet.gain.value = .14;
  tone.connect(wet).connect(echo).connect(comp);
  const noise = ctx.createBuffer(1, ctx.sampleRate / 10, ctx.sampleRate), nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const chordLog = [], noteLog = [];
  let lastChord = '';
  const levels = { bass: 0, kick: 0, shaker: 0, octave: 0 };
  let half = false; // the bell's slow time: the beat goes half-time, so it sounds slower though the tempo only glides

  function voice(freq, t, dur, vol, type = 'sine', attack = .01) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(vol * .02, .0002), t + Math.max(dur, attack + .02));
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + Math.max(dur, attack + .02) + .02);
    return o;
  }
  const pluck = (m, t, dur, vol) => { voice(hz(m), t, dur, vol); voice(hz(m), t, dur * .6, vol * .35, 'triangle'); };
  function kick(t, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(50, t + .1);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.001, t + .16);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + .18);
  }
  function shaker(t, vol) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise;
    f.type = 'bandpass';
    f.frequency.value = 2200;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.001, t + .05);
    s.connect(f).connect(g).connect(master);
    s.start(t);
    s.stop(t + .06);
  }

  function step(t, spb, pos) {
    const n = byBeat.get(pos), chord = chordAt(pos), tones = CHORDS[chord];
    if (n) {
      noteLog.push({ t, midi: n[2] });
      if (noteLog.length > 16) noteLog.shift();
      pluck(n[2], t, Math.max(.16, n[1] * spb), .17);
      if (levels.octave > 0) pluck(n[2] - 12, t, Math.max(.2, n[1] * spb), .08 * levels.octave);
    }
    if (chord !== lastChord) { // a quiet held harmony under everything
      lastChord = chord;
      chordLog.push({ t, tones });
      if (chordLog.length > 8) chordLog.shift();
      let beats = STEP;
      while (beats < 16 && chordAt(wrap(pos + beats)) === chord) beats += STEP;
      // gone before the next chord (the margin: the tempo may rise meanwhile), or two harmonies ring together and it sounds out of tune
      for (const pc of tones.slice(0, 3)) voice(hz(48 + pc), t, beats * spb * .9 - .02, .035, 'sine', Math.min(.12, beats * spb * .3)).pad = true;
    }
    const onBeat = pos % 1 === 0, on2 = pos % (half ? 4 : 2) === 0;
    if (on2 && levels.bass > 0) voice(hz(36 + tones[0]), t, spb * (half ? 2.8 : 1.4), .2 * levels.bass);
    if (!half && !on2 && onBeat && levels.bass > 0) voice(hz(48 + tones[1]), t, spb * .6, .05 * levels.bass); // the polka's "pah"
    if (half ? pos % 4 === 0 : on2) kick(t, .22 * (half ? 1 : levels.kick)); // half-time keeps a slow kick even before the kick layer
    if (!half && !onBeat && levels.shaker > 0) shaker(t, .03 * levels.shaker);
  }

  return {
    start() {
      lastChord = '';
      chordLog.length = noteLog.length = 0;
      for (const k in levels) levels[k] = 0;
    },
    gain(v) { master.gain.setTargetAtTime(v, ctx.currentTime, .05); },
    // the bell's slow time: the music goes muffled and roomy at once (the tempo itself only glides, see conductor.js)
    slow(on) {
      half = on;
      tone.frequency.setTargetAtTime(on ? 650 : 2600, ctx.currentTime, on ? .08 : .25);
      wet.gain.setTargetAtTime(on ? .35 : .14, ctx.currentTime, .1);
    },
    // Queue the conductor's steps; `at` turns a step's game time into audio time.
    play(steps, at) {
      for (const { t, spb, pos, score } of steps) {
        const want = layersFor(score);
        for (const k in levels) levels[k] = Math.min(want[k], levels[k] + (want[k] > levels[k] ? spb * STEP / 3 : 1)); // voices fade in over 3 s
        step(at(t), spb, pos);
      }
    },
    // The harmony sounding now (music is queued ahead of the clock), so the effects can stay in key.
    tonesNow() {
      const now = chordLog.filter(c => c.t <= ctx.currentTime).at(-1);
      return (now ?? chordLog[0])?.tones ?? CHORDS.Cm;
    },
    // The tune's note sounding now, for the tap: it plays along with the lead voice.
    noteNow() {
      return (noteLog.filter(n => n.t <= ctx.currentTime).at(-1) ?? noteLog[0])?.midi ?? 72;
    },
  };
}
