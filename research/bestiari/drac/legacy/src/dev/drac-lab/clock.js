// The lab's one clock: a single music-editor transport (AudioContext time) for whichever programme is selected, behind
// one gain gate that starts closed. Switching programme or music pauses and reloads that same transport (its sources
// are stopped first), so two songs never play at once; a slower fetch that a newer choice overtook is dropped. No DOM.
import { createTransport } from '../music-editor/preview/transport.js';
import { beatAtTime, timeAtBeat } from '../../core/beat-grid.js';
import { videoAt, beatAtVideo } from './programmes.js';

export function createLabClock({ audioCtx, programmes, fetchBuffer, muteLocked = false }) {
  const gate = audioCtx.createGain();
  gate.gain.value = 0; gate.connect(audioCtx.destination);
  // the transport and its synth only see this facade: everything they connect lands on the gate
  const ctx = {
    get currentTime() { return audioCtx.currentTime; }, resume: () => audioCtx.resume(), destination: gate,
    createBufferSource: () => audioCtx.createBufferSource(), createOscillator: () => audioCtx.createOscillator(),
    createGain: () => audioCtx.createGain(), createPeriodicWave: (re, im) => audioCtx.createPeriodicWave(re, im),
  };
  const transport = createTransport(ctx);
  const state = { programme: null, variant: null, sound: 'off', video: 'offset', offset: 0, duration: 0, loading: false, error: null };
  let request = 0, resume = false;

  const current = () => programmes[state.programme];
  const time = () => transport.time();
  const beat = () => (state.programme ? beatAtTime(current().timeline.beats, time()) : 0);
  function setSound(mode) {
    state.sound = muteLocked ? 'off' : mode;
    gate.gain.setTargetAtTime(state.sound === 'lab' ? 1 : 0, audioCtx.currentTime, 0.01); // no click
    return state.sound;
  }
  // Selects a programme and its music, keeping the same moment of the reference video (or `at`, song seconds).
  async function select(id, variant, at) {
    const p = programmes[id], ticket = ++request;
    if (!p) throw new RangeError(`unknown programme ${id}`);
    const was = state.programme ? videoAt(current(), beat(), state.video, state.offset) : null;
    resume ||= transport.playing; // an earlier, still pending choice already paused it
    transport.pause();
    const url = p.audio[variant] ?? null;
    state.loading = !!url;
    let buffer = null, error = null;
    if (url) try { buffer = await fetchBuffer(url); } catch (err) { error = `${url}: ${err.message}`; } // falls back to the melody
    if (ticket !== request) return false; // a newer choice won: its outcome, not this one's, is the state
    state.loading = false; state.error = error; state.programme = id; state.variant = buffer ? variant : 'melodia';
    transport.load(p.timeline, buffer);
    state.duration = Math.max(timeAtBeat(p.timeline.beats, p.timeline.end + 3), buffer?.duration ?? 0);
    seek(at ?? (was === null ? 0 : timeAtBeat(p.timeline.beats, beatAtVideo(p, was, state.video, state.offset))));
    const play = resume;
    resume = false;
    if (play) await transport.play();
    return true;
  }
  function seek(sec) { transport.seek(Math.max(0, Math.min(state.duration, sec))); }
  const seekBeat = b => seek(timeAtBeat(current().timeline.beats, b));
  const label = b => { const s = current().timeline.arrangement.filter(([x]) => x <= b); return s.length ? s[s.length - 1][1] : 'intro'; };
  function bpm(b) { const B = current().timeline.beats, k = Math.min(Math.max(Math.floor(b), 0), B.length - 2); return 60 / (B[k + 1] - B[k]); }
  function snapshot() {
    const b = beat();
    return { programme: state.programme, variant: state.variant, sound: state.sound, muteLocked, playing: transport.playing, pendingPlay: state.loading && resume, loading: state.loading, error: state.error,
      time: time(), beat: b, label: label(b), bpm: bpm(b), video: videoAt(current(), b, state.video, state.offset), videoMode: state.video, offset: state.offset, duration: state.duration };
  }
  return {
    state, transport, gate, select, seek, seekBeat, setSound, time, beat, label, bpm, snapshot, current,
    // While a choice loads, play / pause only set whether it starts once loaded: the old source never restarts and an
    // explicit pause wins over the resume a switch carried over. playing() is what the button shows.
    play() { if (state.loading) { resume = true; return Promise.resolve(); } return transport.play(); },
    pause() { resume = false; transport.pause(); },
    playing: () => transport.playing || (state.loading && resume),
    setVideo(mode, offset = state.offset) { state.video = mode; state.offset = offset; },
  };
}

// What the <video> should do to show `target` seconds: seek only when it is visibly off (playing: 0.25 s, paused:
// 1/25 s), run while the song runs and the target is inside the recording.
export function videoSync(v, target, playing, rate) {
  const end = Number.isFinite(v.duration) ? v.duration : Infinity, t = Math.min(Math.max(target, 0), end);
  const inside = target >= 0 && target < end;
  return { seek: Math.abs(v.currentTime - t) > (playing && inside ? 0.25 : 0.04) ? t : null, play: playing && inside, rate };
}
