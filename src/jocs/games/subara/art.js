// The pictures and the numbers that place them.
const load = src => Object.assign(new Image(), { src });

export const PIECES = ['01-casteller', '02-solar', '03-local', '04-bastida', '05-masia', '06-bloc', '07-super', '08-teatre', '09-roser', 'm1-masmiquel', 'm2-oli', 'm3-pati', 'm4-blat', 'm5-museu', 'm6-campanar'].map(n => load(`/jocs/subara/cards/${n}.webp`));
export const VISITORS = ['nans', 'cavallets', 'mulassa', 'aliga', 'gegant'].map(n => load(`/jocs/subara/cards/${n}.webp`));
// Height of each piece in cell widths: it only ever grows, and only the campanar rises well over the row behind.
export const HEIGHT = [.42, .5, .68, .88, .9, 1, 1, 1.12, 1.2, 1.1, 1.22, 1.2, 1.35, 1.45, 2.1];
// Quiet flat ground, so the buildings carry the picture. A faint mark per colour tells them apart without seeing hue.
export const GROUND = [
  { top: '#88a35f', bevel: '#75904e', side: '#5f7640', shine: '#a1b878', mark: 'grass' },
  { top: '#d3b773', bevel: '#bda05d', side: '#a58a4d', shine: '#e2ca8f', mark: 'dots' },
  { top: '#b76e52', bevel: '#a35d43', side: '#8a4c36', shine: '#cb8870', mark: 'tiles' },
  { top: '#8f8ea8', bevel: '#7d7c97', side: '#696880', shine: '#a7a6bd', mark: 'rings' },
  { top: '#e0b94f', bevel: '#c9a23c', side: '#a9862c', shine: '#efd07a', mark: null }, // monuments
];
export const CAMPANAR_GROUND = 4;
export const CYAN = '#00aeef', TAN = '#c8a98a', NAVY = '#17335f';
export const CONVERGE = .12, POP = .1, FALL = .24;
export const easeInOut = t => t * t * (3 - 2 * t);

// Crop to what is painted, so every piece stands on the same line whatever margin its image has.
export function bakePiece(img, h, maxW, dpr) {
  const probe = document.createElement('canvas');
  probe.width = img.naturalWidth;
  probe.height = img.naturalHeight;
  const p = probe.getContext('2d', { willReadFrequently: true });
  p.drawImage(img, 0, 0);
  const { data, width, height } = p.getImageData(0, 0, probe.width, probe.height);
  let x0 = width, x1 = 0, y0 = height, y1 = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 24) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  const sw = x1 - x0 + 1, sh = y1 - y0 + 1, k = Math.min(h / sh, maxW / sw);
  const out = document.createElement('canvas');
  out.width = Math.ceil(sw * k * dpr);
  out.height = Math.ceil(sh * k * dpr);
  const o = out.getContext('2d');
  o.imageSmoothingQuality = 'high';
  o.drawImage(img, x0, y0, sw, sh, 0, 0, out.width, out.height);
  return { canvas: out, w: sw * k, h: sh * k };
}
