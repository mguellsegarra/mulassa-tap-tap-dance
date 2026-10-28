// ?perf: the per-frame breakdown, averaged every 3 s.
import { Q } from '../core/env.js';
import { pace } from '../core/timing.js';
import { G } from '../game/state.js';
import { renderer, renderProfile, sun, plaza, scene, GPU } from '../scene/stage.js';
import { activeCrowd, midCrowd } from '../scene/quality.js';
import { hud } from '../hud/canvas.js';
import { crowdMesh } from '../scene/crowd-build.js';

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
// What the skinned meshes cost per frame (bone matrices are re-uploaded every frame): walked only when the line is built.
function skinnedLoad() {
  let meshes = 0, bones = 0;
  scene.traverseVisible(o => { if (o.isSkinnedMesh) { meshes++; bones += o.skeleton.bones.length; } });
  return { skinned: meshes, bones, people: activeCrowd.length + plaza.band.filter(p => p.g.scale.x).length + plaza.balcony.filter(p => p.g.scale.x).length };
}
// The same counts at this instant (the last frame's calls and triangles, GPU memory, skinned load): the leak and budget test reads it.
if (PERF) window.__perfLive = () => ({ calls: PERF.calls, tris: PERF.tris, geos: renderer.info.memory.geometries, texs: renderer.info.memory.textures, programs: renderer.info.programs?.length ?? 0, ...skinnedLoad(), quality: renderProfile.name });
// ?perf&hide=crowd,backdrop,mid,plaza: a test on a device, which part of the 3D costs it its frames (each one hidden; the
// mid band is built late, so every frame). crowd: the skinned people (the representation cast and the old crowd mesh); plaza: all but its floor.
const PERF_HIDE = new Set((Q.get('hide') ?? '').split(',').flatMap(k => (k === 'people' ? ['crowd', 'backdrop', 'mid'] : [k])).filter(Boolean)); // people: every spectator
function hideParts() {
  if (PERF_HIDE.has('crowd')) { crowdMesh.visible = false; if (window.__representation) window.__representation.mesh.visible = false; } // (the representation cast draws the people now)
  if (PERF_HIDE.has('backdrop') && plaza.backdrop) plaza.backdrop.mesh.visible = false;
  if (PERF_HIDE.has('mid') && midCrowd) midCrowd.mesh.visible = false;
  if (PERF_HIDE.has('plaza')) plaza.group.children.forEach((o, i) => { if (i) o.visible = false; }); // (child 0: the floor)
}
export function perfSample(f0, p0, p1, now) {
  if (PERF_HIDE.size) hideParts();
  const P = PERF, end = performance.now();
  if (P.prev) { const gap = now - P.prev; P.frame += gap; P.worst = Math.max(P.worst, gap); P.n++; if (gap > 1500 / pace.fps) P.late++; } // late: a frame that missed its turn (a visible hitch in the lane)
  P.prev = now;
  P.js += end - f0; P.gl += p1 - p0; P.hud += end - p1 - P.ovNow; P.ov += P.ovNow; // hud = the 2D canvas; the balloon overlay is counted apart (ov)
  if (!P.t0) P.t0 = now;
  if (now - P.t0 < 3000 || !P.n) return;
  const r = v => Math.round(v * 100) / 100;
  window.__perf = { state: G.state, fps: r(1000 * P.n / P.frame), hz: Math.round(pace.hz), half: pace.half && pace.hz > 95, halfRequested: pace.half, late: P.late, frame: r(P.frame / P.n), worst: r(P.worst), js: r(P.js / P.n), '3d': r(P.gl / P.n), hud: r(P.hud / P.n), ov: r(P.ov / P.n), crowd: r(P.crowd / P.n),
    ...window.__perfLive(), glPx: renderer.domElement.width * renderer.domElement.height, hudPx: hud.width * hud.height,
    at: now, targetFps: r(pace.fps), lowPower: pace.lowPower, dpr: renderer.getPixelRatio(), activeCrowd: activeCrowd.length,
    backdrop: plaza.backdrop?.mesh.count ?? 0, mid: midCrowd?.mesh.count ?? 0, shadows: renderer.shadowMap.enabled, shadowSize: sun.shadow.mapSize.x };
  const f = window.__perf;
  PERF.line = `${f.fps} fps (${f.hz} Hz${f.half ? ' ÷2' : ''}, ${f.late} late) · frame ${f.frame} (worst ${f.worst}) · js ${f.js} = 3d ${f['3d']} + hud ${f.hud} ms · ${f.calls} calls ${f.tris} tris · ${f.geos} geo ${f.texs} tex ${f.programs} prog · ${f.people} skinned people, ${f.bones} bones · gl ${(f.glPx / 1e6).toFixed(2)} hud ${(f.hudPx / 1e6).toFixed(2)} Mpx · ${f.quality} (people ${renderProfile.people}) · ${GPU.renderer || 'GPU name hidden'}`; // (the GPU: render-quality.js's tables match it)
  console.log('[perf]', JSON.stringify(f));
  Object.assign(P, { n: 0, frame: 0, worst: 0, late: 0, js: 0, gl: 0, hud: 0, ov: 0, crowd: 0, t0: now });
}
// The on-screen line (a tablet has no console): its own element over everything (the HUD canvas sat under the selector's
// gradient), rewritten only when its text changes (every 3 s), so it never makes the HUD repaint a frame.
let perfLineEl = null;
export function showPerfLine() {
  if (!perfLineEl) {
    perfLineEl = document.createElement('div');
    perfLineEl.style.cssText = 'position:fixed;left:0;right:0;top:env(safe-area-inset-top);z-index:2147483647;pointer-events:none;'
      + 'background:rgba(0,0,0,.6);color:#fff;font:600 10px/14px ui-monospace,monospace;padding:0 4px;overflow-wrap:anywhere'; // wraps: the GPU's name at its end
    document.body.append(perfLineEl);
  }
  if (perfLineEl.textContent !== PERF.line) perfLineEl.textContent = PERF.line;
}
