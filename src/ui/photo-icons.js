// Photo mode's touch buttons (ui/photo-stick.js): what each figure does, drawn. The Mulassa's and the Drac's pictures
// follow their selector portraits; the Bou's (unreleased) still come from its pixel portrait (figures.js).
import { MULASSA, DRAC, BOU, FIGURES, portraitArt, portraitPalette } from '../game/figures.js';
import { nextPhotoId } from '../game/photo-control.js';
import { pixelSvg } from './select-ui.js';

// The Mulassa's and the Drac's own moves are drawn pictures (public/photo-icons/, 3x the 64 px button), the rest 48-unit
// glyphs. The turn is one refresh arrow for every figure, the jump one arrow up, so only the figure's own moves look different.
const piImg = name => `<img src="/photo-icons/${name}.webp" alt="" draggable="false">`;
const piSvg = body => `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${body}</svg>`;
const piLines = (d, w = 2.6) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
// R, every figure: the refresh arrow (filled, as the usual icon).
const PI_SPIN = `<svg viewBox="1 1 22 22" aria-hidden="true" focusable="false"><path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M20.5 3.5v7h-7z" fill="currentColor"/></svg>`;
const PI_JUMP = piSvg(`${piLines('M24 35V11M14 20l10-10 10 10', 5.5)}${piLines('M11 42h26', 5)}`);
// The Bou, from its pixel portrait (head to the right, 20 × 15 with the rim): it never leaves the floor, so no jump.
const BOU_PX = (x, y, w) => pixelSvg(portraitArt(BOU), portraitPalette(BOU), '#2a1a10').replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${w * 15 / 20}" `);
// Space: the charge, head down and speed lines behind it.
const BOU_CHARGE = piSvg(`<g transform="rotate(10 30 30)">${BOU_PX(13, 16, 32)}</g>${piLines('M2 20h8M4 28h7M2 36h8')}`);
// Q: the head lifted (an arrow up over the horns).
const BOU_HEAD = piSvg(`${BOU_PX(4, 20, 32)}${piLines('M38 17V5M33 10l5-5 5 5')}`);
// E: the carriers' leg stretched forward, heel down and toe up (the dance's gesture).
const BOU_LEG = piSvg(`${BOU_PX(2, 10, 30)}${piLines('M20 33l14 7', 3.2)}${piLines('M33 37l4 6')}`);
export const PHOTO_ICONS = {
  [MULASSA.id]: { Space: PI_JUMP, KeyQ: piImg('mula-cavallet'), KeyE: piImg('mula-coca'), KeyR: PI_SPIN },
  [DRAC.id]: { Space: PI_JUMP, KeyQ: piImg('drac-rugit'), KeyE: piImg('drac-foc'), KeyR: PI_SPIN },
  [BOU.id]: { Space: BOU_CHARGE, KeyQ: BOU_HEAD, KeyE: BOU_LEG, KeyR: PI_SPIN },
};
// The swap button shows who you'd become: the next figure's pixel portrait.
export const swapArt = id => { const f = FIGURES.find(g => g.id === nextPhotoId(id)); return pixelSvg(portraitArt(f), portraitPalette(f), '#2a1a10'); };
