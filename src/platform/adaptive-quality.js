// Quality recovery owns its evidence windows, not the scene. The caller supplies drawn-frame CPU cost and cadence.
import { frameMonitor } from './render-quality.js';

// A stable cadence is necessary but not proof of GPU headroom. A menu-only one-level trial, followed by the existing
// overload monitor, tests actual restored work. Failed trials back off (30 s → 5 min); never probe during a song.
export function adaptiveQuality({ ceiling, level, change, report = () => {} }) {
  let time = 0, elapsed = 0, samples = 0, late = 0, costSum = 0, costPeak = 0, good = 0;
  let cooldown = 2000, retry = 12000, sinceChange = 0, trial = false, failures = 0, cadence = 0;
  let lastHold = null, lastPlay = null, lastHalf = null, lastLowPower = null, suspended = false;
  let frameMs = 0, frameCost = 0, currentPace = null, held = false, playing = false;
  // Allocate diagnostic objects only at a decision/window boundary, never in the per-frame sample path.
  const context = () => ({ hz: currentPace.hz, fps: currentPace.fps, half: currentPace.half, lowPower: currentPace.lowPower,
    hold: held, play: playing, budget: 1000 / currentPace.fps, frame: frameMs, cpu: frameCost });
  const clear = () => { elapsed = samples = late = costSum = costPeak = good = 0; };
  const switchTo = (next, reason, evidence) => {
    const from = level();
    if (next === from) return;
    if (reason === 'overload') {
      if (trial) { failures++; retry = Math.min(300000, 30000 * 2 ** Math.min(4, failures - 1)); }
      trial = false;
    } else trial = true;
    change(next); down.reset(); sinceChange = 0; cooldown = 2000; clear();
    report({ time, reason, from, to: next, retry, ...context(), ...evidence });
  };
  const down = frameMonitor((steps, evidence) => switchTo(Math.max(-1, level() - steps), 'overload', evidence));
  const reset = (reason = 'reset') => {
    down.reset(); clear(); cooldown = 2000; cadence = 0; lastHold = lastPlay = lastHalf = lastLowPower = null;
    report({ time, reason, level: level() });
  };
  const sample = (ms, cost, pace, hold = false, ready = true, play = hold) => {
    if (!ready) { if (!suspended) reset('not-ready'); suspended = true; return; }
    suspended = false;
    if (!(ms > 0 && ms <= 1000)) { reset('gap'); return; }
    time += ms; sinceChange += ms;
    frameMs = ms; frameCost = cost; currentPace = pace; held = hold; playing = play;
    const { hz, fps, half, lowPower } = pace;
    // pace.half can be retained while a slower display is detected; only >95 Hz actually skips alternate callbacks.
    const pacedHalf = half && hz > 95, budget = 1000 / fps;
    // A struggling GPU changes estimated Hz too. Discard recovery credit, but preserve overload evidence;
    // otherwise repeated cadence changes can indefinitely postpone a necessary downgrade.
    if (lastHold !== hold || lastPlay !== play || lastHalf !== pacedHalf || lastLowPower !== lowPower || cadence && Math.abs(fps / cadence - 1) > 0.15) {
      if (lastHold !== null && (lastHold !== hold || lastPlay !== play)) down.reset(); // menus, pauses and songs own separate spike windows
      clear(); cooldown = 2000; lastHold = hold; lastPlay = play; lastHalf = pacedHalf; lastLowPower = lowPower; cadence = fps;
      report({ time, reason: 'cadence', level: level(), ...context() });
    }
    down(ms, play);
    // Two seconds after a profile change: its 0.8 s presence fade, shadow-map/shader work and fresh cadence.
    // Perf telemetry still records these frames; they earn no recovery credit.
    if (cooldown > 0) { cooldown -= ms; return; }
    elapsed += ms; samples++; if (ms > budget * 1.5) late++;
    costSum += cost; costPeak = Math.max(costPeak, cost);
    if (elapsed < 4000) return;
    const evidence = { window: elapsed, samples, late, cost: costSum / samples, peak: costPeak, ...context() };
    // Half-pacing and a power cap can hide overload: let the pacer recover first. A missing/invalid cost proves nothing.
    // The cost is weighed against a 60 fps frame at least: on a 120 Hz screen (ProMotion) a frame that fits 60 fps
    // with room to spare never fitted 45% of 8.3 ms, so a profile dropped once in free play stayed down all session.
    // Restoring it may only halve the pacer to 60 fps, the game's own target; a real overload still steps back down.
    const costBudget = Math.max(budget, 1000 / 60);
    const headroom = !hold && !pacedHalf && !lowPower && fps >= 40 && Number.isFinite(costSum) &&
      late / samples <= 0.02 && costSum / samples < costBudget * 0.45 && costPeak < costBudget * 0.9;
    good = headroom ? good + elapsed : 0;
    report({ time, reason: 'window', level: level(), good, retry, ...evidence });
    if (trial && sinceChange >= 12000 && headroom) trial = false;
    if (good >= 12000 && sinceChange >= retry && level() < ceiling) switchTo(level() + 1, 'headroom-trial', evidence);
    elapsed = samples = late = costSum = costPeak = 0;
  };
  sample.reset = reset;
  return sample;
}
