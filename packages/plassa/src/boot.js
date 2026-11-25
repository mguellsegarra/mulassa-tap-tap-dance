// Shader warmup is an optimisation, never a prerequisite for submitting the first real frame.
// A driver can leave compileAsync pending (including after context loss). The render itself remains
// responsible for compiling anything unfinished; the page watchdog still bounds a failed startup.
// progress(): a number that changes while the warmup advances (programs compiled, linked). With it, `timeout` is the
// longest wait without a change and `cap` the whole wait's: a slow phone that is still compiling is not cut off at 1.5 s
// (an iPhone in Low Power Mode, 16/11/2026: past it, the first frame compiled and drew every program at once, 7.6 s),
// and a driver that stalls still is.
export function waitForWarmup(warm, { timeout = 1500, progress = null, cap = timeout, timers = globalThis, now = () => performance.now() } = {}) {
  return new Promise(resolve => {
    let settled = false, timer = null;
    const finish = result => {
      if (settled) return;
      settled = true;
      timers.clearTimeout(timer);
      resolve(result);
    };
    const start = now();
    let seen, still = start;
    try { seen = progress?.(); } catch { /* likewise */ }
    const check = () => {
      let p = seen; try { p = progress(); } catch { /* a probe that throws reads as no progress */ }
      const t = now();
      if (p !== seen) { seen = p; still = t; }
      if (t - still >= timeout || t - start >= cap) finish('timeout');
      else timer = timers.setTimeout(check, 100);
    };
    timer = progress ? timers.setTimeout(check, 100) : timers.setTimeout(() => finish('timeout'), timeout);
    try { Promise.resolve(warm()).then(() => finish('ready'), () => finish('failed')); }
    catch { finish('failed'); }
  });
}
// Each program's first use waits for its driver compile (and reads its log and uniforms): the first frame paying that for
// all of them held the thread long enough to freeze the loader's Mulassa. Paid here a few ms at a time, between tasks.
export function linkPrograms(programs = [], { budget = 8, now = () => performance.now(), timers = globalThis, onSlice = () => {} } = {}) {
  const list = [...programs];
  return new Promise(done => (function slice() {
    const end = now() + budget;
    while (list.length && now() < end) try { list.pop().getUniforms(); } catch { /* the first render tries again */ }
    onSlice();
    if (list.length) timers.setTimeout(slice); else done();
  })());
}
