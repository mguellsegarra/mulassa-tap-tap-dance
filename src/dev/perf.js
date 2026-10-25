// ?perf: the per-frame breakdown, averaged every 3 s.
import { Q } from '../core/env.js';
import { pace } from '../core/timing.js';
import { G } from '../game/state.js';
import { renderer, renderProfile, sun, plaza } from '../scene/stage.js';
import { activeCrowd, midCrowd } from '../scene/quality.js';
import { hud } from '../hud/canvas.js';

// ?perf: per-frame breakdown averaged every 3 s, logged to the console and kept in window.__perf. `3d` and `hud` are
// the CPU time spent issuing each (the GPU work lands in `frame`, the rAF interval); ?perf=sync waits for the GPU
// after the 3D (its real cost), ?perf=nohud / ?perf=no3d leave one out, to compare frame times.
export const PERF = Q.has('perf') ? { mode: Q.get('perf'), n: 0, frame: 0, worst: 0, late: 0, js: 0, gl: 0, hud: 0, ov: 0, ovNow: 0, crowd: 0, t0: 0, prev: 0, calls: 0, tris: 0 } : null;
export function perfReset() {
  if (PERF) Object.assign(PERF, { n: 0, frame: 0, worst: 0, late: 0, js: 0, gl: 0, hud: 0, ov: 0, crowd: 0, t0: 0, prev: 0 });
}
export function qualitySample(evidence) {
  if (!PERF) return;
  const trace = window.__qualityTrace ??= [];
  trace.push({ at: performance.now(), state: G.state, ...evidence });
  if (trace.length > 128) trace.shift();
  if (evidence.reason !== 'window') console.log('[quality]', JSON.stringify(trace.at(-1)));
}
export function perfSample(f0, p0, p1, now) {
  const P = PERF, end = performance.now();
  if (P.prev) { const gap = now - P.prev; P.frame += gap; P.worst = Math.max(P.worst, gap); P.n++; if (gap > 1500 / pace.fps) P.late++; } // late: a frame that missed its turn (a visible hitch in the lane)
  P.prev = now;
  P.js += end - f0; P.gl += p1 - p0; P.hud += end - p1 - P.ovNow; P.ov += P.ovNow; // hud = the 2D canvas; the balloon overlay is counted apart (ov)
  if (!P.t0) P.t0 = now;
  if (now - P.t0 < 3000 || !P.n) return;
  const r = v => Math.round(v * 100) / 100;
  window.__perf = { state: G.state, fps: r(1000 * P.n / P.frame), hz: Math.round(pace.hz), half: pace.half && pace.hz > 95, halfRequested: pace.half, late: P.late, frame: r(P.frame / P.n), worst: r(P.worst), js: r(P.js / P.n), '3d': r(P.gl / P.n), hud: r(P.hud / P.n), ov: r(P.ov / P.n), crowd: r(P.crowd / P.n),
    calls: P.calls, tris: P.tris, glPx: renderer.domElement.width * renderer.domElement.height, hudPx: hud.width * hud.height, quality: renderProfile.name,
    at: now, targetFps: r(pace.fps), lowPower: pace.lowPower, dpr: renderer.getPixelRatio(), activeCrowd: activeCrowd.length,
    backdrop: plaza.backdrop?.mesh.count ?? 0, mid: midCrowd?.mesh.count ?? 0, shadows: renderer.shadowMap.enabled, shadowSize: sun.shadow.mapSize.x };
  const f = window.__perf;
  PERF.line = `${f.fps} fps (${f.hz} Hz${f.half ? ' ÷2' : ''}, ${f.late} late) · frame ${f.frame} (worst ${f.worst}) · js ${f.js} = 3d ${f['3d']} + hud ${f.hud} ms · ${f.calls} calls ${f.tris} tris · gl ${(f.glPx / 1e6).toFixed(2)} hud ${(f.hudPx / 1e6).toFixed(2)} Mpx · ${f.quality}`;
  console.log('[perf]', JSON.stringify(f));
  Object.assign(P, { n: 0, frame: 0, worst: 0, late: 0, js: 0, gl: 0, hud: 0, ov: 0, crowd: 0, t0: now });
}
// The on-screen line, painted into its own canvas only when its text changes (every 3 s): setting the font and filling
// the long string every frame cost ~20% of a throttled frame, enough to make the quality monitor step down while measuring.
let perfLineCanvas = null, perfLineText = '', perfLineScale = 0;
export function drawPerfLine(H, y, w) {
  const s = H.getTransform().a;
  if (PERF.line !== perfLineText || s !== perfLineScale) {
    perfLineText = PERF.line; perfLineScale = s;
    perfLineCanvas ??= document.createElement('canvas');
    perfLineCanvas.width = Math.ceil(w * s); perfLineCanvas.height = Math.ceil(8 * s);
    const c = perfLineCanvas.getContext('2d');
    c.setTransform(s, 0, 0, s, 0, 0);
    c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, w, 8);
    c.font = '600 6px ui-monospace, monospace'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = '#fff'; c.fillText(perfLineText, 2, 1);
  }
  H.drawImage(perfLineCanvas, 0, y, w, 8);
}
