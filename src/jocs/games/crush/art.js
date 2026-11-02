// The pieces' art and the blurred background, ready to draw.
import { CARRETILLA, TRONADA } from './rules.js';
import { SEGUICI } from './levels.js';

// The particles of each piece.
export const COLOURS = { drac: '#22b45a', nans: '#f0a890', bou: '#b0521e', basilisc: '#18a0b8', mulassa: '#e0142c', lleo: '#f0a020', aliga: '#d8dde0', carretilla: '#e8902a', tronada: '#f5c518' };
const ART = {};
let version = 0;
export const artVersion = () => version;
for (const name of [...SEGUICI, CARRETILLA, TRONADA]) {
  ART[name] = Object.assign(new Image(), { src: `/jocs/crush/cards/${name}.png`, onload: () => { version++; } });
}
const FONS = Object.assign(new Image(), { src: '/jocs/crush/cards/fons.png', onload: () => { version++; } });
const hasArt = name => ART[name].complete && ART[name].naturalWidth > 0;

const FONS_ANCHOR = .2; // a wide window crops the height: keep the tower and the bunting, not the empty paving
// A light box blur, three passes, close to a gaussian, at nearly full size so the upscale cannot show squares.
// ctx.filter does not exist on iOS Safari.
function softBackground(img, W, H, x, y, dw, dh) {
  const scale = Math.min(1, 1400 / Math.max(W, H)), w = Math.ceil(W * scale), h = Math.ceil(H * scale), R = 1;
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, x * scale, y * scale, dw * scale, dh * scale);
  const px = g.getImageData(0, 0, w, h), d = px.data, out = new Uint8ClampedArray(d.length);
  const blur = (from, to, len, lines, step, line) => {
    for (let l = 0; l < lines; l++) for (let k = 0; k < 3; k++) {
      const at = i => from[(l * line + Math.max(0, Math.min(len - 1, i)) * step) * 4 + k];
      let sum = 0;
      for (let i = -R; i <= R; i++) sum += at(i);
      for (let i = 0; i < len; i++) {
        to[(l * line + i * step) * 4 + k] = sum / (2 * R + 1);
        sum += at(i + R + 1) - at(i - R);
      }
    }
    for (let i = 3; i < to.length; i += 4) to[i] = 255;
  };
  let a = d, b = out;
  for (let pass = 0; pass < 3; pass++) {
    blur(a, b, w, h, 1, w); [a, b] = [b, a];
    blur(a, b, h, w, w, 1); [a, b] = [b, a];
  }
  px.data.set(a);
  g.putImageData(px, 0, 0);
  return c;
}

// The art is flat; a stronger colour, a soft top light and a shaded base give it the volume of a candy.
export function paintPiece(ctx, name, size) {
  if (!hasArt(name)) return;
  const art = Object.assign(document.createElement('canvas'), { width: size, height: size });
  const a = art.getContext('2d', { willReadFrequently: true });
  a.imageSmoothingQuality = 'high';
  a.drawImage(ART[name], 0, 0, size, size);
  const px = a.getImageData(0, 0, size, size);
  for (let i = 0; i < px.data.length; i += 4) {
    const grey = (px.data[i] + px.data[i + 1] + px.data[i + 2]) / 3;
    for (let k = 0; k < 3; k++) px.data[i + k] = Math.min(255, grey + (px.data[i + k] - grey) * 1.25);
  }
  a.putImageData(px, 0, 0);
  a.globalCompositeOperation = 'source-atop';
  const light = a.createLinearGradient(0, 0, 0, size);
  light.addColorStop(0, 'rgba(255, 255, 255, .22)');
  light.addColorStop(.45, 'rgba(255, 255, 255, 0)');
  light.addColorStop(.7, 'rgba(0, 0, 0, 0)');
  light.addColorStop(1, 'rgba(30, 0, 40, .3)');
  a.fillStyle = light;
  a.fillRect(0, 0, size, size);
  ctx.shadowColor = 'rgba(10, 4, 16, .55)';
  ctx.shadowBlur = size * .06;
  ctx.shadowOffsetY = size * .04;
  ctx.drawImage(art, size * .01, 0, size * .98, size * .98);
}

export function paintIcon(canvas, name) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  paintPiece(ctx, name, canvas.width);
}

export function paintBackground(width, height, W, H, dpr) {
  const bg = Object.assign(document.createElement('canvas'), { width, height });
  const c = bg.getContext('2d');
  c.scale(dpr, dpr);
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#20223f');
  sky.addColorStop(.7, '#7a4a63');
  sky.addColorStop(1, '#e09a5a');
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);
  if (FONS.naturalWidth) {
    const zoom = Math.max(W / FONS.naturalWidth, H / FONS.naturalHeight);
    const dw = FONS.naturalWidth * zoom, dh = FONS.naturalHeight * zoom;
    c.drawImage(softBackground(FONS, W, H, (W - dw) / 2, (H - dh) * FONS_ANCHOR, dw, dh), 0, 0, W, H);
  }
  return bg;
}
