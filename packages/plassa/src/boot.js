// Shader warmup is an optimisation, never a prerequisite for submitting the first real frame.
// A driver can leave compileAsync pending (including after context loss). The render itself remains
// responsible for compiling anything unfinished; the page watchdog still bounds a failed startup.
export function waitForWarmup(warm, { timeout = 1500, timers = globalThis } = {}) {
  return new Promise(resolve => {
    let settled = false;
    const finish = result => {
      if (settled) return;
      settled = true;
      timers.clearTimeout(timer);
      resolve(result);
    };
    const timer = timers.setTimeout(() => finish('timeout'), timeout);
    try { Promise.resolve(warm()).then(() => finish('ready'), () => finish('failed')); }
    catch { finish('failed'); }
  });
}
// Each program's first use waits for its driver compile (and reads its log and uniforms): the first frame paying that for
// all of them held the thread long enough to freeze the loader's Mulassa. Paid here a few ms at a time, between tasks.
export function linkPrograms(programs = [], { budget = 8, now = () => performance.now(), timers = globalThis } = {}) {
  const list = [...programs];
  return new Promise(done => (function slice() {
    const end = now() + budget;
    while (list.length && now() < end) try { list.pop().getUniforms(); } catch { /* the first render tries again */ }
    if (list.length) timers.setTimeout(slice); else done();
  })());
}
