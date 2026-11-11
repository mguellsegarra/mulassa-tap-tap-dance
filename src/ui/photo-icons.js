// Photo mode's touch buttons (ui/photo-stick.js): what each figure does, drawn. The Mulassa's and the Drac's pictures
// follow their selector portraits; the Bou's show its snout up and its sparks.
import { MULASSA, DRAC, BOU, FIGURES, portraitArt, portraitPalette } from '../game/figures.js';
import { nextPhotoId } from '../game/photo-control.js';
import { pixelSvg } from './select-ui.js';

// The figures' own moves are drawn pictures (public/photo-icons/, 3x the 64 px button), the rest 48-unit
// glyphs. The turn is one refresh arrow for every figure, the jump one arrow up, so only the figure's own moves look different.
const piImg = name => `<img src="/photo-icons/${name}.webp" alt="" draggable="false">`;
const piSvg = body => `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${body}</svg>`;
const piLines = (d, w = 2.6) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
// R, every figure: the refresh arrow (filled, as the usual icon).
const PI_SPIN = `<svg viewBox="1 1 22 22" aria-hidden="true" focusable="false"><path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M20.5 3.5v7h-7z" fill="currentColor"/></svg>`;
const PI_JUMP = piSvg(`${piLines('M24 35V11M14 20l10-10 10 10', 5.5)}${piLines('M11 42h26', 5)}`);
export const PHOTO_ICONS = {
  [MULASSA.id]: { Space: PI_JUMP, KeyQ: piImg('mula-cavallet'), KeyE: piImg('mula-coca'), KeyR: PI_SPIN },
  [DRAC.id]: { Space: PI_JUMP, KeyQ: piImg('drac-rugit'), KeyE: piImg('drac-foc'), KeyR: PI_SPIN },
  [BOU.id]: { Space: PI_JUMP, KeyQ: piImg('bou-guspires'), KeyE: piImg('bou-morro'), KeyR: PI_SPIN },
};
// The swap button shows who you'd become: the next figure's pixel portrait.
export const swapArt = id => { const f = FIGURES.find(g => g.id === nextPhotoId(id)); return pixelSvg(portraitArt(f), portraitPalette(f), '#2a1a10'); };
