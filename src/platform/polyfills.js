// Imported first by main.js. Canvas roundRect arrived in Safari 16 and Chrome 99; the HUD and the share
// card call it while loading, so an older browser would stop at the calçot for good.
// Only filled in when missing. Radii: a number or an array of 1–4 (CSS order: tl, tr, br, bl), as the code uses.
export function roundRect(x, y, w, h, radii = 0) {
  const a = (Array.isArray(radii) ? radii : [radii]).map(r => Math.max(0, +(r?.x ?? r) || 0));
  let tl = a[0] ?? 0, tr = a[1] ?? tl, br = a[2] ?? tl, bl = a[3] ?? tr;
  const W = Math.abs(w), H = Math.abs(h);
  const f = Math.min(1, W / (tl + tr || 1), W / (bl + br || 1), H / (tl + bl || 1), H / (tr + br || 1)); // radii that don't fit shrink together
  tl *= f; tr *= f; br *= f; bl *= f;
  const sx = Math.sign(w) || 1;
  this.moveTo(x + tl * sx, y);
  this.arcTo(x + w, y, x + w, y + h, tr); // arcTo with radius 0 is a plain corner
  this.arcTo(x + w, y + h, x, y + h, br);
  this.arcTo(x, y + h, x, y, bl);
  this.arcTo(x, y, x + w, y, tl);
  this.closePath();
  this.moveTo(x, y);
}
for (const C of [globalThis.CanvasRenderingContext2D, globalThis.OffscreenCanvasRenderingContext2D, globalThis.Path2D]) {
  if (C?.prototype && !C.prototype.roundRect) C.prototype.roundRect = roundRect;
}
