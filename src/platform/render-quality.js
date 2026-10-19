// Hardware hints choose a conservative starting point; frame times handle unknown GPUs.
// backdrop: simple instanced figures along the façades (one draw call); balconies: people up on the first floors
// (medium: static, merged into the buildings; high: skinned with the crowd, waving on the beat); band: the musicians
// playing the ball (models.js BAND, in that order). mid: the same instanced figures as the backdrop (no bones, no CPU a
// frame) filling the ground beyond the moving ring, on the far side the play camera looks across
// (main.js midCrowd). near: how many of the skinned ring (the nearest her that the camera sees) answer hits more (NEAR).
// ripple: rows (from the front) that also see each hit travel round the ring (crowd-fx.js); the first ring always does; -1 = nobody.
// smoke: the Drac's smoke puffs (drac-fx.js pool; 0 = none); embers: its small sparks (guspires) off the fire points;
// wheels: the sparks of its rodes de foc (its confetti: a wheel on each of its 5 fire points; minimal: the 2 mouths).
export const PROFILES = [
  { name: 'low', dpr: 1, pixels: 850_000, shadow: 0, rows: 2, stride: 2, confetti: 80, fireworks: 180, backdrop: 160, mid: 130, balconies: 16, near: 12, ripple: 0, band: 6, smoke: 48, embers: 64, wheels: 160 },
  { name: 'medium', dpr: 1.5, pixels: 1_600_000, shadow: 1024, rows: 3, stride: 2, confetti: 150, fireworks: 350, backdrop: 280, mid: 240, balconies: 36, near: 18, ripple: 1, band: 8, smoke: 96, embers: 128, wheels: 320 },
  { name: 'high', dpr: 2, pixels: 3_000_000, shadow: 2048, rows: 3, stride: 1, confetti: 260, fireworks: 700, backdrop: 380, mid: 340, balconies: 40, near: 26, ripple: 9, band: 10, smoke: 160, embers: 256, wheels: 400 },
];
// Level -1: for GPUs that can't keep up even at 'low' (the frame monitor steps down to it) and software WebGL (below):
// the 3D below 1× (~350k px), one crowd row, a thin backdrop. PROFILES[0..2] keep their indices.
export const MINIMAL = { name: 'minimal', dpr: 1, pixels: 350_000, shadow: 0, rows: 1, stride: 2, confetti: 40, fireworks: 90, backdrop: 60, mid: 40, balconies: 0, near: 10, ripple: -1, band: 6, smoke: 0, embers: 24, wheels: 64 };
export const profileAt = level => (level < 0 ? MINIMAL : PROFILES[Math.min(level, PROFILES.length - 1)]);
// The HUD canvas budget follows the quality: at low/minimal the fill rate is the problem, so text is a little softer.
export const hudBudget = (level, touch) => (level <= 0 ? 900_000 : touch ? 2_500_000 : 4_200_000);
// Software WebGL: no GPU (Chrome's SwiftShader on a blocklisted GPU or with acceleration off, Mesa's llvmpipe/softpipe,
// Windows' Basic Render Driver, "GDI Generic", Apple's software renderer). Two signals, either is enough: the renderer
// string (unmasked where the browser allows; Firefox may sanitise it, resistFingerprinting says just "Mozilla": no
// match, no guess) and `caveat`: a context asked with failIfMajorPerformanceCaveat was refused while a plain one
// works (Chrome and Firefox refuse it on software rendering; Safari ignores the flag).
const SOFTWARE_GL = /swiftshader|subzero|llvmpipe|lavapipe|softpipe|\bsoftware\b|basic render driver|gdi generic/i;
export const isSoftwareRenderer = ({ renderer = '', vendor = '', caveat = false } = {}) =>
  caveat === true || SOFTWARE_GL.test(`${renderer ?? ''} ${vendor ?? ''}`);
// The probe behind it, before the real renderer (whose antialias depends on the level): a throwaway WebGL 2 context,
// no depth/stencil/MSAA, released at once (WEBGL_lose_context). Only a refused caveat context costs a second one.
// Chrome/Safari report "WebKit WebGL" as RENDERER: only then the debug extension (Firefox warns it is deprecated).
export function probeRenderer(makeCanvas = () => document.createElement('canvas')) {
  const out = { renderer: '', vendor: '', caveat: false, probe: 'none' };
  const open = caveat => { try { return makeCanvas().getContext('webgl2', { failIfMajorPerformanceCaveat: caveat, antialias: false,
    depth: false, stencil: false, powerPreference: 'high-performance' }) || null; } catch { return null; } };
  let gl = open(true);
  if (!gl) { gl = open(false); out.caveat = !!gl; } // WebGL 2 works, only not without a major performance caveat
  if (!gl) return out; // no WebGL 2 at all: main.js's renderer says so
  out.probe = out.caveat ? 'caveat' : 'ok';
  try {
    const plain = String(gl.getParameter(gl.RENDERER) ?? ''), x = /^webkit/i.test(plain) ? gl.getExtension('WEBGL_debug_renderer_info') : null;
    out.renderer = String((x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : plain) ?? '');
    out.vendor = String((x ? gl.getParameter(x.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)) ?? '');
  } catch { /* strings unavailable: the caveat alone decides */ }
  try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* freed with the canvas anyway */ }
  return out;
}
export function initialQuality({ mobile = false, cores, memory, saveData = false } = {}) {
  if (saveData || (memory && memory <= 2)) return 0;
  // phones: the core count is no signal (iOS Safari reports a low, capped number even on an iPhone 16), so they
  // start at medium (antialiased, sharper) and the frame monitor steps down only if frames really are slow
  if (mobile) return 1;
  return (memory && memory <= 4) || (cores && cores <= 4) ? 1 : 2;
}
export function renderDpr(profile, width, height, dpr) {
  return Math.min(dpr || 1, profile.dpr, Math.sqrt(profile.pixels / Math.max(1, width * height)));
}
// Quality steps normally judge the drawn frames against 60 fps: a 120 Hz screen that misses its 8.3 ms halves its
// rate first (framePacer). A sustained 30 Hz cadence uses the capped budget below instead.
// Spikes: a device that keeps hitching during play (SPIKE.count frames over SPIKE.ms within SPIKE.within ms) steps
// down one level at the end of that window even when most frames are fine; a one-off hitch (a first use, a GC) never
// does. `play` = false (menus, the pause sheet) counts no spikes; a gap over 1 s (hidden tab, a stall) resets it all.
// SLOW_SHARE: over a 4 s window, the share of frames that missed a 60 Hz vsync (> 24 ms) that steps quality down. 12% is
// ~53 fps: a steady judder on the note lane although the fps counter never reads far under 60.
const SLOW_SHARE = 0.12;
const SPIKE = { ms: 50, count: 5, within: 3000 };
// iOS Low Power Mode (and thermal throttling) caps Safari's rAF at 30 Hz (WebKit AnimationFrameRate.cpp): every frame is
// 33 ms, all of them read as slow and medium fell straight to minimal. CAP.run frames in a row at a steady ~33 ms suggest
// a cap: until a faster frame, frames are judged against 30 Hz (twice the times above) and the run's frames
// don't count as slow. A 60 Hz device too slow for 60 draws the same steady 33 ms: that alone steps down once (`probed`).
const CAP = { lo: 29, hi: 38, run: 12 };
export function frameMonitor(onSlow) {
  let elapsed = 0, samples = 0, slow = 0, slow60 = 0, warmup = 2000, clock = 0, n = 0, spiky = false;
  let run = 0, runSlow = 0, capped = false, probed = false; // runSlow: this window's slow frames of the current run
  const spikes = new Float64Array(SPIKE.count); // when the last few spikes happened (monitor time, ring buffer)
  return (ms, play = true) => {
    if (ms <= 0 || ms > 1000) { elapsed = samples = slow = slow60 = n = run = runSlow = 0; spiky = capped = false; return; }
    clock += ms;
    const inCap = ms >= CAP.lo && ms <= CAP.hi, was = capped;
    run = inCap ? run + 1 : 0;
    if (ms < 24) capped = false; else if (run >= CAP.run) capped = true;
    if (warmup > 0) { warmup = Math.max(0, warmup - ms); return; }
    const k = capped ? 2 : 1;
    if (play && ms > SPIKE.ms * k) {
      spikes[n++ % SPIKE.count] = clock;
      if (n >= SPIKE.count && clock - spikes[n % SPIKE.count] <= SPIKE.within) spiky = true; // the oldest of the last few
    }
    elapsed += ms; samples++;
    if (ms > 24) slow60++;
    if (ms > 24 * k) slow++;
    if (!inCap) runSlow = 0; else if (!capped) runSlow++;
    if (capped && !was) { slow -= runSlow; runSlow = 0; } // the run that showed the cap was its pace, not misses
    if (elapsed >= 4000) {
      const share = samples >= 8 ? slow / samples : 0;
      if (share > SLOW_SHARE || spiky) { onSlow(share > 0.8 ? 2 : 1); warmup = 2000; n = 0; } // way too slow: two steps
      else if (capped && !probed && slow60 / samples > SLOW_SHARE) { probed = true; onSlow(1); warmup = 2000; n = 0; } // the cap, or too slow for 60
      elapsed = samples = slow = slow60 = runSlow = 0; spiky = false;
    }
  };
}
// The HUD canvas is cleared and redrawn every frame: its backing store is capped by a pixel budget (an iPad Pro at
// DPR 2 would be 5.6 Mpx; at 2.5 Mpx it is drawn at ~1.35x, still crisp) instead of always at the screen's DPR.
export function hudScale(width, height, dpr, budget) {
  return Math.max(1, Math.min(2, dpr || 1, Math.sqrt(budget / Math.max(1, width * height))));
}
// Frame pacing. The refresh interval is the lower quartile of the recent rAF deltas (missed vsyncs don't hide the
// display's rate; it can change: Low Power Mode, an external display). Up to 95 Hz every refresh is drawn (halving
// 90 Hz would judder at 45). Faster screens (ProMotion 120 Hz) run at the display rate while the device keeps up; when
// more than 15% of the frames in a 2 s window miss their refresh, every other refresh is drawn instead (an even 60).
// Back up only after a sustained good spell (5 s, doubling with each recent drop) and at most a few switches a
// minute, so it never flip-flops. Input and judging don't wait for frames (event timestamps, audio clock), and
// everything that moves uses real time (dt), so 60 and 120 look the same, only smoother.
// `hold` (a song is on): it may still drop to the half rate, never try the full one again until the song is over.
// A try is a 2 s window of missed refreshes when it fails, and every switch changes the notes' step on screen: tried
// mid-song, a device that reads a steady 60 broke the lane's motion a few times a song.
// pace(now, hold) -> draw this frame?; pace.hz (refresh rate), pace.fps (target rate), pace.half, pace.lowPower (~30 Hz).
const PACE = { window: 2000, slowShare: 0.15, recover: 5000, perMinute: 3, warmup: 1500 };
export function framePacer(opts) {
  const o = { ...PACE, ...opts }, N = 31, d = new Float32Array(N).fill(Infinity), sorted = new Float32Array(N);
  const switches = new Float64Array(o.perMinute).fill(-1e9); // when the last few switches happened
  let i = 0, n = 0, prev = 0, lastDraw = -1e9, iv = 1000 / 60, start = -1, winT = 0, winN = 0, winSlow = 0, good = 0, sw = 0;
  let upT = -1e9, fails = 0; // the last try at the full rate; how many recent tries failed (the wait doubles)
  const recent = now => { let k = 0; for (const t of switches) if (now - t < 60000) k++; return k; };
  const flip = (now, half) => {
    if (half && now - upT < 10000) fails++; else if (!half) upT = now;
    pace.half = half; switches[sw = (sw + 1) % switches.length] = now; winT = now; winN = winSlow = good = 0; };
  const pace = (now, hold = false) => {
    const gap = prev ? now - prev : 0;
    prev = now;
    if (start < 0) start = winT = now;
    if (gap > 250) { winT = now; winN = winSlow = 0; lastDraw = now; return true; } // hidden tab, a stall: not the display's rate
    if (gap > 0) {
      d[i] = gap; i = (i + 1) % N; n = Math.min(n + 1, N);
      if (n >= 5 && (n < N || i % 8 === 0)) { sorted.set(d); sorted.sort(); iv = sorted[n >> 2]; } // no per-frame sort, no allocation
    }
    const hz = 1000 / iv, fast = hz > 95;
    pace.hz = hz; pace.lowPower = hz > 27 && hz < 34; // Low Power Mode is 30 exactly
    if (!fast) { pace.fps = hz; lastDraw = now; return true; } // (a slow patch can read as 60 Hz: `half` is kept)
    pace.fps = pace.half ? hz / 2 : hz;
    const since = now - lastDraw;
    if (pace.half && since < 1.5 * iv) return false; // every other refresh, evenly
    lastDraw = now;
    if (now - start < o.warmup) return true; // loading, shader compiles: not the device's pace
    winN++; if (since > (pace.half ? 2.5 : 1.25) * iv) winSlow++; // missed its refresh (at 120 Hz: over ~10 ms)
    if (now - winT >= o.window) {
      const share = winN >= 10 ? winSlow / winN : 0;
      if (!pace.half && share > o.slowShare) flip(now, true); // can't sustain it: an even half rate
      else if (!pace.half && now - upT > 30000) fails = 0; // it held: the next drop waits the base time again
      else if (pace.half) {
        good = share <= o.slowShare / 3 ? good + now - winT : 0;
        const k = recent(now);
        if (!hold && k < o.perMinute - 1 && good >= o.recover * 2 ** Math.min(3, fails)) flip(now, false); // try the full rate again (never mid-song)
      }
      winT = now; winN = winSlow = 0;
    }
    return true;
  };
  Object.assign(pace, { hz: 60, fps: 60, half: false, lowPower: false });
  return pace;
}
// The song clock the frames are drawn on. The Web Audio clock (ctx.currentTime, so Chip.now()) only moves when the
// audio thread renders a buffer, in whole blocks (Chrome on a Mac: 256 samples at 48 kHz, 5.3 ms; phones can be
// 20 ms): read once per frame it steps 16.0, 16.0, 16.0, 21.3 ms at 60 Hz (5.3 or 10.7 ms at 120 Hz), so the notes
// stuttered although every frame was drawn. This one advances by the frame's real time and is slewed gently (tau) onto
// the audio clock: monotonic, at most `lead` ahead of it, and it snaps only on a real jump (a new song, a seek). dt = 0
// holds it (pause). Drawing only: judging stays on the audio clock and event timestamps.
// view(audio, dt) -> the time to draw; audio: the audio clock's reading (s), dt: real seconds since the last call.
export function smoothClock({ tau = 0.25, lead = 0.03, snap = 0.1 } = {}) {
  let v = NaN;
  return (audio, dt) => {
    const p = v + dt, err = audio - p;
    if (!(Math.abs(err) < snap) || !(dt >= 0 && dt < 0.25)) return (v = audio); // first call, a jump, a stall
    return (v = Math.max(v, Math.min(audio + lead, p + err * Math.min(1, dt / tau))));
  };
}
