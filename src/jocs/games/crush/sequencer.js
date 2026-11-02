// From Pica la Mulassa, with the tempo and the voices now set by each game. The music, played live: every note is scheduled on its own, so the tempo rises smoothly with nothing stretched or
// pitched, and new voices come in as the score grows. Soft sine and triangle timbres only (the Mulassa game's audio rule: no pulse or square buzz).

const STEP = .5, GLIDE = 3; // eighth-note grid; BPM per second, so a rise is never heard as a jump
export const hz = m => 440 * 2 ** ((m - 69) / 12);

// song: { melody: [[beat, beats, midi]], chords, chordAt(beat), pickup, loopStart, loopEnd }.
// bpmFor(score) and layersFor(score) give the tempo and which voices sound.
export function createSequencer(ctx, out, song, bpmFor, layersFor) {
  const { melody, chords: CHORDS, chordAt, pickup: PICKUP, loopStart: LOOP_START, loopEnd: LOOP_END } = song;
  const wrap = p => (p >= LOOP_END ? p - LOOP_END + LOOP_START : p);
  const byBeat = new Map();
  for (const n of melody) if (!byBeat.has(n[0])) byBeat.set(n[0], n);
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

  let pos = PICKUP, next = 0, bpm = bpmFor(0), target = bpm, score = 0, lastChord = '';
  const levels = { bass: 0, kick: 0, shaker: 0, octave: 0 };

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

  function step(t, spb) {
    const n = byBeat.get(pos), chord = chordAt(pos), tones = CHORDS[chord];
    if (n) {
      pluck(n[2], t, Math.max(.16, n[1] * spb), .17);
      if (levels.octave > 0) pluck(n[2] - 12, t, Math.max(.2, n[1] * spb), .08 * levels.octave);
    }
    if (chord !== lastChord) { // a quiet held harmony under everything
      lastChord = chord;
      let beats = STEP;
      while (beats < 16 && chordAt(wrap(pos + beats)) === chord) beats += STEP;
      // gone before the next chord (the margin: the tempo may rise meanwhile), or two harmonies ring together and it sounds out of tune
      for (const pc of tones.slice(0, 3)) voice(hz(48 + pc), t, beats * spb * .9 - .02, .035, 'sine', Math.min(.12, beats * spb * .3)).pad = true;
    }
    const onBeat = pos % 1 === 0, on2 = pos % 2 === 0;
    if (on2 && levels.bass > 0) voice(hz(36 + tones[0]), t, spb * 1.4, .2 * levels.bass);
    if (!on2 && onBeat && levels.bass > 0) voice(hz(48 + tones[1]), t, spb * .6, .05 * levels.bass); // the polka's "pah"
    if (on2 && levels.kick > 0) kick(t, .22 * levels.kick);
    if (!onBeat && levels.shaker > 0) shaker(t, .03 * levels.shaker);
  }

  return {
    start(score0 = 0) {
      pos = PICKUP;
      next = ctx.currentTime + .05;
      score = score0;
      bpm = target = bpmFor(score0);
      lastChord = '';
      Object.assign(levels, layersFor(score0));
    },
    setLevel(s) { score = s; target = bpmFor(s); },
    gain(v) { master.gain.setTargetAtTime(v, ctx.currentTime, .05); },
    // Queue every step that starts before time `until`.
    schedule(until) {
      while (next < until) {
        const spb = 60 / bpm, want = layersFor(score);
        for (const k in levels) levels[k] = Math.min(want[k], levels[k] + (want[k] > levels[k] ? spb * STEP / 3 : 1)); // voices fade in over 3 s
        step(next, spb);
        next += spb * STEP;
        bpm += Math.max(-GLIDE * spb * STEP, Math.min(GLIDE * spb * STEP, target - bpm));
        pos += STEP;
        pos = wrap(pos);
      }
    },
    get bpm() { return bpm; },
  };
}
