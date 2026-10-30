// renderHero: the share photo rendered off-screen from the live scene, for the fixed photos (public/share/, share-card.js)
// and public/og.jpg via __dbg.hero: never on a player's results screen (it crashed some GPUs).
import { selectedFigure } from '../game/figure-song.js';
import { confetti } from './confetti.js';
import { fireworks } from './fx.js';
import * as THREE from 'three';
import { blocks } from './framing.js';
import { errors, errorName } from '../services/errors.js';
import { plaza, renderer, CAM_AZ, scene } from './stage.js';
import { M } from './figure-springs.js';
import { insidePlaza } from './cameras.js';
import { FIGURE_SCENES, sceneOf } from './figure-scenes.js';
import { setBandLineup } from './quality.js';

// The share card's photo (share-card.js): her from the crowd's gap (the play camera's side)
// with a camera of its own, rendered into a render target and read back, so the screen's buffer is never touched
// (no preserveDrawingBuffer). The scene renders linear into a float target (8-bit if the GPU can't); a quad then
// encodes sRGB into bytes, flipped so row 0 is the top. A finished dance strikes the final hit's pose (dance.js) for
// the photo (a collapse is never shared): each figure's hero pose (figure-scenes.js). Every transform is put back
// before the next frame. Not per frame.
export const heroCam = new THREE.PerspectiveCamera(24, 1, 0.5, 200), heroXYZ = [0, 0, 0], heroFocus = [0, 0, 0];
let heroQuad = null;
export function heroQuadMake() { // the sRGB encoding pass (built once; precompile() warms its program too)
  return heroQuad ??= (() => {
    // opaque 0 keeps the source's alpha (the GLOBUS stills, balloon3d.js); the photo is opaque
    const material = new THREE.ShaderMaterial({ uniforms: { src: { value: null }, opaque: { value: 1 } }, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main() { vUv = vec2(uv.x, 1.0 - uv.y); gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D src; uniform float opaque; varying vec2 vUv; void main() { vec4 s = texture2D(src, vUv); vec3 c = clamp(s.rgb, 0.0, 1.0);' +
        ' gl_FragColor = vec4(mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)), max(s.a, opaque)); }' });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    return { scene: new THREE.Scene().add(quad), cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), material };
  })();
}
function flatImage(px) { // one colour everywhere (sampled): nothing was drawn
  for (let i = 4 * 97; i < px.length; i += 4 * 97) if (Math.abs(px[i] - px[0]) + Math.abs(px[i + 1] - px[1]) + Math.abs(px[i + 2] - px[2]) > 6) return false;
  return true;
}
const gpuLost = () => { try { return renderer.getContext().isContextLost() === true; } catch { return false; } };
function heroIssue(phase, target, e) {
  if (gpuLost()) return errors.breadcrumb('share-hero-context-lost', { phase, target });
  console.warn('[share] hero render failed', e);
  errors.report('share-hero-failed', { phase, target, name: errorName(e) });
}
export function renderHero(w, h, figureId = selectedFigure.id) {
  if (gpuLost()) { errors.breadcrumb('share-hero-context-lost', { phase: 'context', target: 'none' }); return null; }
  const saved = [], props = plaza.props.map(p => p.mesh.visible);
  const own = sceneOf(figureId) ?? FIGURE_SCENES[0], hero = own.hero; // the figure's own pose (figure-scenes.js)
  const root = own.root(), scale = hero.scale;
  const effects = [confetti, fireworks, ...FIGURE_SCENES.flatMap(f => f.hero.fx?.() ?? [])].filter(Boolean);
  const visibility = [...effects, ...FIGURE_SCENES.map(f => f.root())].map(o => [o, o.visible]);
  root.traverse(o => saved.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone(), o.visible]));
  hero.save?.(saved);
  let rt = null, out = null, prevTarget = null, phase = 'setup', target = 'none';
  try {
    prevTarget = renderer.getRenderTarget();
    effects.forEach(o => { o.visible = false; });
    for (const f of FIGURE_SCENES) f.root().visible = f === own;
    hero.pose();
    setBandLineup(own.band ?? 'banda'); // (the next frame's figure on show puts its own back)
    const fy = 1.8 * scale, need = 5.6 * scale, t = Math.tan(heroCam.fov * Math.PI / 360);
    heroCam.aspect = w / h;
    const d = Math.max(need / 2 / t, 6 * scale / 2 / t / heroCam.aspect), el = 12 * Math.PI / 180;
    heroCam.position.set(M.pos.x + Math.cos(el) * Math.sin(CAM_AZ) * d, fy + Math.sin(el) * d, M.pos.y + Math.cos(el) * Math.cos(CAM_AZ) * d);
    insidePlaza(heroCam.position, M.pos.x, fy, M.pos.y);
    heroCam.lookAt(M.pos.x, fy, M.pos.y);
    heroCam.updateProjectionMatrix();
    heroXYZ[0] = heroCam.position.x; heroXYZ[1] = heroCam.position.y; heroXYZ[2] = heroCam.position.z;
    heroFocus[0] = M.pos.x; heroFocus[1] = fy; heroFocus[2] = M.pos.y;
    for (const p of plaza.props) p.mesh.visible = !blocks(p, heroXYZ, heroFocus);
    // multisampled half floats need EXT_color_buffer_float (half_float alone may leave the target incomplete: a flat
    // image, retried in 8 bits below)
    let float = renderer.extensions.has('EXT_color_buffer_float');
    out = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false }); // the quad pass never tests depth
    heroQuadMake();
    const px = new Uint8Array(w * h * 4);
    for (;;) {
      phase = 'render'; target = float ? 'float' : 'byte';
      rt = new THREE.WebGLRenderTarget(w, h, { type: float ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: 4,
        resolveDepthBuffer: false }); // nothing samples the scene's depth: skip its resolve blit
      renderer.setRenderTarget(rt);
      renderer.render(scene, heroCam);
      heroQuad.material.uniforms.src.value = rt.texture;
      renderer.setRenderTarget(out);
      renderer.render(heroQuad.scene, heroQuad.cam);
      phase = 'read';
      renderer.readRenderTargetPixels(out, 0, 0, w, h, px);
      if (!float || !flatImage(px)) break;
      float = false; rt.dispose(); // the GPU drew nothing into the float target: the same photo in 8 bits
    }
    phase = 'flat';
    if (flatImage(px)) throw new Error('hero render came back flat');
    phase = 'canvas';
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(px.buffer), w, h), 0, 0);
    return c;
  } catch (e) { // share-card.js draws a plain sky and plaça without it; heroIssue reports it (a lost context only leaves a breadcrumb)
    heroIssue(phase, target, e);
    return null;
  } finally {
    for (const [o, p, q, sc, v] of saved) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(sc); o.visible = v; }
    hero.restore?.();
    visibility.forEach(([o, visible]) => { o.visible = visible; });
    plaza.props.forEach((p, i) => (p.mesh.visible = props[i]));
    try {
      heroQuad && (heroQuad.material.uniforms.src.value = null);
      rt?.dispose(); out?.dispose(); // restore may throw: release the temporary targets first
      renderer.setRenderTarget(prevTarget);
    } catch (e) { heroIssue('cleanup', target, e); }
  }
}
