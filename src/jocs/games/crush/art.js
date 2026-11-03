// The pieces' art and the blurred background, ready to draw.
import { CARRETILLA, TRONADA } from './rules.js';
import { SEGUICI } from './levels.js';

// The particles of each piece.
export const COLOURS = { drac: '#22b45a', calcot: '#1f9c7d', bou: '#f4911d', basilisc: '#1f62d8', mulassa: '#b0122e', lleo: '#f5c518', aliga: '#e8ecef', carretilla: '#e8902a', tronada: '#f5c518' };
const ART = {};
let version = 0;
export const artVersion = () => version;
for (const name of [...SEGUICI, CARRETILLA, TRONADA]) {
  ART[name] = Object.assign(new Image(), { src: `/jocs/crush/cards/${name}.png`, onload: () => { version++; } });
}
const hasArt = name => ART[name].complete && ART[name].naturalWidth > 0;

// The art already has its own gelatine volume: only a shadow to lift it off the board.
export function paintPiece(ctx, name, size) {
  if (!hasArt(name)) return;
  ctx.imageSmoothingQuality = 'high';
  ctx.shadowColor = 'rgba(10, 4, 16, .55)';
  ctx.shadowBlur = size * .06;
  ctx.shadowOffsetY = size * .04;
  ctx.drawImage(ART[name], size * .01, 0, size * .98, size * .98);
}

export function paintIcon(canvas, name) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  paintPiece(ctx, name, canvas.width);
}

// The same dark wine as the menus, so the game does not change world when a level opens.
export function paintBackground(width, height, W, H, dpr) {
  const bg = Object.assign(document.createElement('canvas'), { width, height });
  const c = bg.getContext('2d');
  c.scale(dpr, dpr);
  const wine = c.createRadialGradient(W / 2, H * .46, 0, W / 2, H * .46, Math.max(W, H) * .75);
  wine.addColorStop(0, '#a12a42');
  wine.addColorStop(.42, '#6a1c2f');
  wine.addColorStop(1, '#34121a');
  c.fillStyle = wine;
  c.fillRect(0, 0, W, H);
  return bg;
}
