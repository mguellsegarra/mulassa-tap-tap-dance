// Runs ON AWS Device Farm's test host (farm-spec.yml starts Appium, then `npm test` runs this): drives the rented phone's
// browser through the flows of farm-plan.json, on a QA build (`QA_BUILD=1 npx vite build`, served through a tunnel), and
// writes what its frames did to $DEVICEFARM_LOG_DIR/mulassa-perf.json. Plain WebDriver over fetch: no dependencies.
// A flow: { label, url, figure?, diff?, maxSeconds }. With a figure it picks its card, waits 3 s (what choosing it costs
// the selector) and plays `diff`; without one it only loads and taps (does this phone boot the game at all?).
// `phases` ([{ label, seconds, css?, awake? }]) run first, on the selector: an A/B there, one injected CSS at a time.
// Packaged and sent by farm-run.mjs. Docs: docs/agents/device-profiling.md («A rented phone»).
import { readFileSync, writeFileSync } from 'node:fs';

// In the page. PROBE: every frame's gap; in a song, per second of song (frames, frames over 25 and 50 ms, the worst) and
// the long ones with their song time; out of one, the frames over 50 ms with the page's ms (`mark`: when
// the card was picked). CARD and PLAY: the figure's card, then its level. READ: what the run looks like now.
export const PROBE = `if (window.__farm) return; const F = window.__farm = { sec: {}, long: [], menu: [], mark: null, errors: [], n: 0 }; let last = 0;
  addEventListener('error', e => F.errors.length < 20 && F.errors.push(String(e.message).slice(0, 200)));
  const tick = t => { const d = t - last, play = window.__dbg && __dbg.G.state === 'play';
    if (last && play) { const s = Math.floor(__dbg.songTime()), b = F.sec[s] ??= [0, 0, 0, 0];
      b[0]++; if (d > 25) b[1]++; if (d > 50) b[2]++; if (d > b[3]) b[3] = Math.round(d); if (d > 50 && F.long.length < 400) F.long.push([+__dbg.songTime().toFixed(2), Math.round(d)]); }
    else if (last && d > 50 && F.menu.length < 200) F.menu.push([Math.round(t), Math.round(d)]);
    F.n++; last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);`;
export const CARD = 'window.__farm.mark = Math.round(performance.now()); document.querySelector(`.sel-card[data-id="${arguments[0]}"]`).click(); return __dbg.G.state;';
export const PLAY = '__dbg.choose(arguments[0]); return __dbg.G.state;';
export const READ = `const G = window.__dbg?.G, p = window.__perf; return { state: G?.state ?? null, t: G?.state === 'play' ? +__dbg.songTime().toFixed(1) : null,
  perf: p && { fps: p.fps, hz: p.hz, half: p.half, late: p.late, worst: p.worst, js: p.js, '3d': p['3d'], hud: p.hud, quality: p.quality, lowPower: p.lowPower, dpr: p.dpr, glPx: p.glPx } };`;
// PHASE: on the screen it is on, swap the injected CSS (an A/B on the device: hide or stop one part) and, kept awake, say
// the pointer moved (the selector's idle reel starts after 10 s untouched). COUNT: frames so far, for the phase's fps.
export const PHASE = `const [css, awake] = arguments; let st = document.getElementById('farm-css'); if (!st) { st = document.createElement('style'); st.id = 'farm-css'; document.head.append(st); }
  if (st.textContent !== css) st.textContent = css; if (awake) document.body.dispatchEvent(new PointerEvent('pointermove', { clientX: 5, clientY: 5, bubbles: true }));`;
export const COUNT = 'return [performance.now(), window.__farm.n, document.body.classList.contains("reel-idle"), window.__perf?.quality ?? null];';
// (anims: the CSS animations running at the end, «name target»: count, to know what a screen left moving)
const DONE = 'const anims = {}; for (const a of document.getAnimations?.() ?? []) { const e = a.effect?.target, k = (a.animationName ?? "transition") + " " + (e ? e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + "." + [...e.classList].join(".") + (a.effect.pseudoElement ?? "") : "?"); if (a.playState === "running") anims[k] = (anims[k] ?? 0) + 1; } return { ...window.__farm, anims, loaded: performance.getEntriesByType("resource").filter(r => /textures\\//.test(r.name)).map(r => [r.name.split("/").pop(), Math.round(r.responseEnd)]), ua: navigator.userAgent, dpr: devicePixelRatio, w: innerWidth, h: innerHeight, booted: window.__mulassaBooted ?? null };';

async function main() {
  const plan = JSON.parse(readFileSync(new URL('./farm-plan.json', import.meta.url), 'utf8')), out = `${process.env.DEVICEFARM_LOG_DIR ?? '.'}/mulassa-perf.json`;
  const base = `http://127.0.0.1:4723${process.env.APPIUM_BASE_PATH ?? ''}`, sleep = ms => new Promise(r => setTimeout(r, ms));
  const wd = async (method, path, body) => {
    const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) }), j = await r.json();
    if (!r.ok) throw new Error(`${method} ${path}: ${JSON.stringify(j.value).slice(0, 300)}`);
    return j.value;
  };
  const result = { device: process.env.DEVICEFARM_DEVICE_NAME, os: process.env.DEVICEFARM_DEVICE_OS_VERSION, flows: [] };
  const save = () => writeFileSync(out, JSON.stringify(result));
  // the rented minutes are the cost: whatever happens, this ends by itself
  setTimeout(() => { result.stopped = 'hard stop'; save(); process.exit(1); }, plan.flows.reduce((s, f) => s + f.maxSeconds + (f.phases ?? []).reduce((x, p) => x + p.seconds, 0) + 60, 60) * 1000).unref();
  // (Safari's inspector is sometimes not there in Appium's default 5 s, «did not return any connected web applications»: 2 runs of 7)
  const open = () => wd('POST', '/session', { capabilities: { alwaysMatch: { 'appium:nativeWebTap': true, 'appium:newCommandTimeout': 120, 'appium:webviewConnectTimeout': 30000 } } });
  // (no second try: a phone whose inspector is not there after 30 s was not there after 60 either, and the minutes are metered)
  const { sessionId } = await open().catch(e => { result.stopped = e.message; save(); throw e; });
  const S = `/session/${sessionId}`, js = (script, args = []) => wd('POST', `${S}/execute/sync`, { script, args });
  try {
    for (const flow of plan.flows) {
      const run = { ...flow, samples: [], notes: [] }; result.flows.push(run);
      try {
        await wd('POST', `${S}/url`, { url: flow.url });
        let up = false;
        for (let i = 0; i < 60 && !(up = await js('return !!window.__dbg && (document.getElementById("loader")?.hidden ?? true)')); i++) await sleep(1000);
        if (!up) run.notes.push('the loader never left');
        run.loaderMs = await js('return Math.round(performance.now())'); // (the page's ms when its cover was seen gone, polled every second)
        await js(PROBE); await sleep(3000);
        // the splash wants a real tap (the audio's gesture): a native one on the page's body
        try { await wd('POST', `${S}/element/${Object.values(await wd('POST', `${S}/element`, { using: 'css selector', value: 'body' }))[0]}/click`, {}); } catch (e) { run.notes.push(`tap: ${e.message}`); }
        await sleep(2500);
        run.notes.push(`after the tap: ${(await js(READ)).state}`);
        for (const ph of flow.phases ?? []) { // each: its fps, and whether the idle reel and which quality it ended on
          const [t0, n0] = await js(COUNT);
          for (let i = 0; i < ph.seconds; i += 2) { await js(PHASE, [ph.css ?? '', !!ph.awake]); await sleep(2000); }
          const [t1, n1, idle, quality] = await js(COUNT);
          run.samples.push({ phase: ph.label, fps: +((n1 - n0) / (t1 - t0) * 1000).toFixed(1), idle, quality }); save();
        }
        if (flow.figure) {
          run.notes.push(`card: ${await js(CARD, [flow.figure])}`); await sleep(3000);
          run.notes.push(`started: ${await js(PLAY, [flow.diff ?? 1])}`);
        }
        for (let i = 0, played = false; i < flow.maxSeconds / 2; i++) {
          await sleep(2000);
          const s = await js(READ); run.samples.push(s); save();
          if (s.state === 'play') played = true; else if (played) break;
        }
        Object.assign(run, await js(DONE));
      } catch (e) { run.notes.push(`failed: ${e.message}`); }
      save();
    }
  } finally { save(); await wd('DELETE', S).catch(() => {}); }
  console.log(JSON.stringify(result));
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) await main();
