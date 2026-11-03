// Approved selector contours, rasterized once at 3x. No SVG parsing on the frame path.
import mulaSource from './mulassa.svg?raw';
import dracSource from './drac.svg?raw';
import { goodieSvg } from './goodies.js';

export const FLAT_KINDS = ['mula', 'drac', 'mulaFalsa', 'dracFals', 'petard', 'calcot', 'campanar', 'carretilla'];
const svgUrl = s => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;

function figureSvg(kind, pose, clac) {
  if (!['mula', 'mulaFalsa', 'drac', 'dracFals'].includes(kind)) return goodieSvg(kind, pose);
  const mule = kind.startsWith('mula');
  const doc = new DOMParser().parseFromString(mule ? mulaSource : dracSource, 'image/svg+xml');
  const root = doc.documentElement, body = root.firstElementChild;
  if (mule) {
    const parts = [...body.children];
    // Nod the whole neck, but hinge the lower jaw independently.
    const neck = doc.createElementNS(root.namespaceURI, 'g');
    neck.setAttribute('transform', `rotate(${[-5, 4, -9, 1][pose]} 146 72)`);
    body.insertBefore(neck, parts[19]);
    parts.slice(19, 40).forEach(p => neck.append(p));
    parts.slice(24, 27).forEach(p => p.setAttribute('transform', `rotate(${clac * 8} 158 38)`));
    parts.slice(0, 16).forEach((p, i) => {
      const a = (i % 4 < 2 ? 1 : -1) * [0, 9, -7, 5][pose];
      p.setAttribute('transform', `${p.getAttribute('transform')} rotate(${a})`);
    });
    // A small velvet pompom belongs to the festive mule, not a crown.
    const pom = doc.createElementNS(root.namespaceURI, 'circle');
    Object.entries({ cx: 153, cy: 15, r: 4, fill: '#c8283a' }).forEach(([k, v]) => pom.setAttribute(k, v));
    neck.append(pom);
    if (kind === 'mulaFalsa') for (const el of root.querySelectorAll('[fill], [stroke]')) {
      const colors = { '#a3182f': '#246b44', '#7c1024': '#164e32', '#c43752': '#4e9762' };
      for (const attr of ['fill', 'stroke']) if (colors[el.getAttribute(attr)]) el.setAttribute(attr, colors[el.getAttribute(attr)]);
    }
  } else if (kind === 'dracFals') {
    for (const el of root.querySelectorAll('[fill]')) {
      const hex = el.getAttribute('fill');
      if (!/^#[0-9a-f]{6}$/i.test(hex)) continue;
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      if (g > r * 1.18 && g > b * 1.12) el.setAttribute('fill', `rgb(${Math.min(230, g * 1.65)},${Math.round(r * .85)},${Math.round(b * .9)})`);
    }
  }
  const wrapper = doc.createElementNS(root.namespaceURI, 'g');
  wrapper.setAttribute('transform', pose % 2 ? 'translate(160 0) scale(-1 1)' : '');
  root.append(wrapper); wrapper.append(body);
  if (!mule) wrapper.setAttribute('transform', `${wrapper.getAttribute('transform')} translate(${[0, 0, -3, 3][pose]} 0) rotate(${[0, 0, -3, 3][pose]} 80 104)`);
  return new XMLSerializer().serializeToString(root);
}

export async function createFlatArt() {
  const sprites = {}, portraits = {};
  await Promise.all(FLAT_KINDS.map(async kind => {
    const phases = kind.startsWith('mula') ? 3 : 1;
    sprites[kind] = await Promise.all(Array.from({ length: 4 * phases }, async (_, n) => {
      const source = figureSvg(kind, Math.floor(n / phases), n % phases);
      const img = new Image(); img.src = svgUrl(source); await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 336;
      const paint = () => canvas.getContext('2d').drawImage(img, 0, 0, 480, 336);
      paint(); canvas.addEventListener('contextrestored', paint);
      return canvas;
    }));
    // The existing sheet gives every portrait a square slot. Preserve the art's ratio.
    const portrait = document.createElement('canvas'); portrait.width = 224; portrait.height = 224;
    portrait.getContext('2d').drawImage(sprites[kind][0], 0, 33.6, 224, 156.8);
    portraits[kind] = portrait.toDataURL();
  }));
  return { sprites, portraits };
}
