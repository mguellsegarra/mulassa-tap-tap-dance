import * as THREE from 'three';

// The home's portraits of the figures, drawn by the board's renderer into a small target: a second WebGL context costs a
// phone more than it shows. One kind per task, so the boot screen keeps running. tight: cropped to the figure's own pixels (the
// camera frames its bounding sphere, which leaves a wide empty margin), for a card the figure should fill.
export async function drawPortraits(renderer, GEOS, mat, kinds, size = 112, { tight = false } = {}) {
  const s = new THREE.Scene(), cam = new THREE.PerspectiveCamera(26, 1, .1, 100), light = new THREE.DirectionalLight('#ffe8c0', 2.4);
  s.add(new THREE.HemisphereLight('#fff3d6', '#8a6a4a', 2.1), light);
  light.position.set(-6, 12, 8);
  const rt = new THREE.WebGLRenderTarget(size, size, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace; // the same colours as on screen
  const px = new Uint8Array(size * size * 4), pic = document.createElement('canvas');
  pic.width = pic.height = size;
  const ctx = pic.getContext('2d'), img = ctx.createImageData(size, size), out = {}, box = new THREE.Box3(), c = new THREE.Vector3(), d = new THREE.Vector3();
  try {
    for (const kind of kinds) {
      await new Promise(go => setTimeout(go));
      const m = new THREE.Mesh(GEOS[kind], mat);
      s.add(m);
      box.setFromObject(m).getCenter(c);
      const R = box.getSize(d).length() / 2;
      cam.position.set(c.x, c.y + R * 1.4, c.z + R * 3.5);
      cam.lookAt(c);
      renderer.setRenderTarget(rt);
      try {
        renderer.render(s, cam);
        renderer.readRenderTargetPixels(rt, 0, 0, size, size, px);
      } finally { renderer.setRenderTarget(null); s.remove(m); }
      for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4); // GL rows run bottom up
      ctx.putImageData(img, 0, 0);
      out[kind] = tight ? cropped(pic, img.data, size) : pic.toDataURL();
    }
  } finally { rt.dispose(); } // freed even when a draw throws
  return out;
}

function cropped(pic, rgba, size) {
  let l = size, r = 0, t = size, b = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (rgba[(y * size + x) * 4 + 3] > 8) { l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y); }
  if (r < l) return pic.toDataURL();
  const out = Object.assign(document.createElement('canvas'), { width: r - l + 1, height: b - t + 1 });
  out.getContext('2d').drawImage(pic, l, t, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL();
}
