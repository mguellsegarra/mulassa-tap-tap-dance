import { beatAtTime, timeAtBeat } from '../../../core/beat-grid.js';
import { createSynth } from './synth.js';

export function createTransport(audioCtx) {
  const synth = createSynth(audioCtx), listeners = new Set();
  let timeline = null, buffer = null, events = [], position = 0, origin = 0, active = false;
  let loopA = 0, loopB = null, timer = null, source = null, generation = 0, cursor = 0;
  let scheduledThrough = 0, scheduleOrigin = 0;
  let endTime = 0;
  const duration = () => endTime;
  const limit = () => loopB ?? duration();
  function cancel() {
    synth.cancel();
    if (source) { source.stop(); source.disconnect(); source = null; }
  }
  function locate(sec) {
    cursor = 0;
    while (cursor < events.length && events[cursor].end <= sec) cursor++;
  }
  function begin() {
    origin = audioCtx.currentTime - position;
    scheduleOrigin = origin; scheduledThrough = position; locate(position);
    if (buffer && position < buffer.duration) {
      source = audioCtx.createBufferSource(); source.buffer = buffer;
      source.loop = loopB !== null;
      if (source.loop) { source.loopStart = loopA; source.loopEnd = loopB; }
      source.connect(audioCtx.destination); source.start(audioCtx.currentTime, position);
    }
  }
  function time() {
    if (!active) return position;
    const sec = audioCtx.currentTime - origin;
    if (loopB !== null && sec >= loopB) return loopA + (sec - loopB) % (loopB - loopA);
    return Math.min(duration(), Math.max(0, sec));
  }
  function emit() { const sec = time(); for (const fn of listeners) fn(sec, timeline ? beatAtTime(timeline.beats, sec) : 0); }
  function schedule() {
    if (!active) return;
    const now = audioCtx.currentTime, sec = now - origin;
    if (loopB === null && sec >= duration()) { pause(); position = duration(); emit(); return; }
    if (!buffer) {
      // The 0.2 s look-ahead may cross several tiny loops. Schedule each cycle against the same audio origin;
      // notes end at its boundary, so no voice from a previous cycle can bleed into the next one.
      const horizon = now + 0.2;
      if (loopB !== null && scheduleOrigin + loopB < now) {
        scheduleOrigin += Math.floor((now - scheduleOrigin - loopA) / (loopB - loopA)) * (loopB - loopA);
        scheduledThrough = loopA; locate(loopA);
      }
      for (;;) {
        const to = Math.min(limit(), horizon - scheduleOrigin);
        while (cursor < events.length && events[cursor].start < to) {
          const event = events[cursor++], start = Math.max(event.start, scheduledThrough), end = Math.min(event.end, limit());
          const when = Math.max(now, scheduleOrigin + start);
          synth.note(event.midi, when, scheduleOrigin + end - when);
        }
        scheduledThrough = Math.max(scheduledThrough, to);
        if (loopB === null || to < loopB || scheduleOrigin + loopB >= horizon) break;
        scheduleOrigin += loopB - loopA;
        scheduledThrough = loopA; locate(loopA);
      }
    }
    emit();
  }
  function pause() {
    position = time(); active = false; generation++;
    if (timer !== null) clearInterval(timer);
    timer = null; cancel(); emit();
  }
  function seek(sec) {
    if (!Number.isFinite(sec)) return;
    position = Math.max(0, Math.min(duration(), sec));
    if (loopB !== null && position >= loopB) position = loopA;
    cancel();
    if (active) { begin(); schedule(); } else emit();
  }
  function load(next, audioBuffer = null) {
    pause();
    if (!next || next.beats?.length < 2 || !Number.isFinite(next.end)) throw new TypeError('A compiled timeline is required');
    timeline = next; buffer = audioBuffer; events = synth.events(next);
    endTime = events.reduce((end, event) => Math.max(end, event.end), Math.max(timeAtBeat(next.beats, next.end + 1), buffer?.duration ?? 0));
    position = 0; loopA = 0; loopB = null; emit();
  }
  async function play() {
    if (!timeline || active) return;
    const request = ++generation;
    await audioCtx.resume();
    if (request !== generation) return;
    if (position >= duration()) position = loopB === null ? 0 : loopA;
    active = true; begin(); schedule();
    if (active) timer = setInterval(schedule, 25);
  }
  function setLoop(a, b = null) {
    if (b !== null && (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b <= a || b > duration())) throw new RangeError('Invalid loop');
    const sec = time(); loopA = b === null ? 0 : a; loopB = b;
    seek(sec);
  }
  return {
    load, play, pause, seek, setLoop, time,
    beat: () => timeline ? beatAtTime(timeline.beats, time()) : 0,
    get playing() { return active; },
    onTick(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
