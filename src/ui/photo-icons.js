// Photo mode's touch buttons (ui/photo-stick.js): what each figure does, drawn. The Mulassa's three from the loader's
// side view (red cloth, green saddle, the carriers' legs), the Drac's from its pixel portrait (figures.js).
import { MULASSA, DRAC, BOU, FIGURES, portraitArt, portraitPalette } from '../game/figures.js';
import { nextPhotoId } from '../game/photo-control.js';
import { pixelSvg } from './select-ui.js';

// 48-unit drawn icons (no emoji). The Mulassa seen from the side, head to the right: red cloth body, green saddle, gold hem,
// long light-brown neck and head, the carriers' grey legs with pale soles (legible on the dark buttons).
const PI_C = { body: '#c42340', hem: '#8e1429', sad: '#22703f', gold: '#f2b928', fur: '#b57647', furD: '#7d4a2a', leg: '#a99cab', shoe: '#f4efe4', cream: '#fff3d6', ink: '#2a1a10' };
const piLeg = (x, y, rot, len = 11) => `<g transform="rotate(${rot} ${x} ${y})"><rect x="${x - 1.9}" y="${y}" width="3.8" height="${len}" rx="1.4" fill="${PI_C.leg}"/><path d="M${x - 2.4} ${y + len - 1.6}h4.4l3 1.6v2h-7.4z" fill="${PI_C.shoe}"/></g>`;
const piBody = (x, w) => `<rect x="${x}" y="20" width="${w}" height="15" rx="3" fill="${PI_C.body}" stroke="${PI_C.ink}" stroke-width="1.2"/><path d="M${x + 0.6} 30.5h${w - 1.2}v2.2q0 1.7-1.7 1.7h-${w - 4.6}q-1.7 0-1.7-1.7z" fill="${PI_C.hem}"/><rect x="${x - 0.5}" y="33.6" width="${w + 1}" height="2.2" rx="1" fill="${PI_C.gold}"/>`;
const piSaddle = x => `<rect x="${x}" y="17.5" width="12" height="13" rx="1.6" fill="${PI_C.sad}" stroke="${PI_C.gold}" stroke-width="1.4"/>`;
const PI_HEAD = `<path d="M28 23 31.5 8.5l4.4.6-1.8 15z" fill="${PI_C.fur}" stroke="${PI_C.ink}" stroke-width="1.1" stroke-linejoin="round"/><path d="M31 4.5 30.3-1.2l3.4 4.6z" fill="${PI_C.furD}"/><circle cx="34" cy="7.5" r="4.1" fill="${PI_C.fur}"/><path d="M32 4.8l11.2 3.4q1.8.6 1.5 2.6l-.4 1.6-11.4-1.6z" fill="${PI_C.fur}" stroke="${PI_C.ink}" stroke-width="1.1" stroke-linejoin="round"/><circle cx="34.6" cy="7.2" r="1.5" fill="${PI_C.cream}"/><circle cx="35.1" cy="7.3" r=".8" fill="${PI_C.ink}"/><circle cx="31.6" cy="5.4" r="1" fill="#e0303f"/>`;
const piTail = x => `<path d="M${x + 1} 22.5q-4.2 4.6-3.6 13l2.8.2q-.2-7.4 3-11.6z" fill="${PI_C.furD}"/>`;
const piSvg = body => `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${body}</svg>`;
// Q: the cavallito, front half reared up on the hind carriers (her rear runs off the left edge).
const MULA_REAR = piSvg(`<g transform="translate(1 7) rotate(-34 16 38)">${piLeg(4, 33, 0)}${piLeg(9, 33, 0)}${piLeg(22, 33, -78, 12)}${piLeg(27, 33, -52, 12)}${piBody(-8, 37)}${piSaddle(4)}${PI_HEAD}</g><path d="M3 44.5h18" stroke="${PI_C.cream}" stroke-width="2" stroke-linecap="round" opacity=".7"/>`);
// E: the coça, rear half with the croup up and both hind carriers kicking out behind (her front runs off the right).
const MULA_KICK = piSvg(`<g transform="translate(4 -2) rotate(24 40 38)">${piLeg(15, 33, 84, 15)}${piLeg(20, 33, 64, 15)}${piLeg(38, 33, 0)}${piBody(11, 40)}${piSaddle(22)}${piTail(11)}</g><path d="M2 40h6M3 45h7" stroke="${PI_C.cream}" stroke-width="2.2" stroke-linecap="round"/>`);
// R: the culada, the whole Mulassa swinging round (an arrow round her).
const MULA_SPIN = piSvg(`<g transform="translate(9 12) scale(.66)">${piLeg(9, 33, 0)}${piLeg(13, 33, 0)}${piLeg(24, 33, 0)}${piLeg(28, 33, 0)}${piTail(5)}${piBody(5, 28)}${piSaddle(11)}<g transform="translate(-3 2)">${PI_HEAD}</g></g><path d="M41.5 31A20 13 0 1 1 33 9.6" fill="none" stroke="${PI_C.cream}" stroke-width="2.6" stroke-linecap="round"/><path d="M27.5 5.5l6 4-3.6 5.6" fill="none" stroke="${PI_C.cream}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`);
const DRAC_PX = (x, y, w) => pixelSvg(portraitArt(DRAC), portraitPalette(DRAC), '#2a1a10').replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${w * 12 / 14}" `);
const piLines = (d, w = 2.6) => `<path d="${d}" fill="none" stroke="${PI_C.cream}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
// Q: the roar, heads up and jaws open (its pixel heads and the sound).
const DRAC_ROAR = piSvg(`${DRAC_PX(3, 14, 32)}${piLines('M38 10q4 5 0 10M42.5 6q7 9 0 18')}`);
// E: the sparks off its tubes (white-gold, as drac-fire.js).
const DRAC_SPARKS = piSvg(`${DRAC_PX(2, 22, 24)}<g stroke-linecap="round" stroke-width="2.6"><path d="M34 4v7M34 21v6M24 14h6M38 14h7M27 7l4 4M37.5 17.5l4 4M27 21l4-4M37.5 10.5l4-4" stroke="${PI_C.gold}"/><circle cx="34" cy="14" r="2.6" fill="${PI_C.cream}"/></g>`);
// R: it turns round.
const DRAC_SPIN = piSvg(`${DRAC_PX(10, 15, 26)}${piLines('M41.5 31A20 13 0 1 1 33 9.6')}${piLines('M27.5 5.5l6 4-3.6 5.6')}`);
const PI_JUMP = piSvg(`${piLines('M24 34V10M14.5 19.5 24 10l9.5 9.5', 3.4)}${piLines('M12 41h24', 3.4)}`);
// The Bou, from its pixel portrait (head to the right, 20 × 15 with the rim): it never leaves the floor, so no jump.
const BOU_PX = (x, y, w) => pixelSvg(portraitArt(BOU), portraitPalette(BOU), '#2a1a10').replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${w * 15 / 20}" `);
// Space: the charge, head down and speed lines behind it.
const BOU_CHARGE = piSvg(`<g transform="rotate(10 30 30)">${BOU_PX(13, 16, 32)}</g>${piLines('M2 20h8M4 28h7M2 36h8')}`);
// Q: the head lifted (an arrow up over the horns).
const BOU_HEAD = piSvg(`${BOU_PX(4, 20, 32)}${piLines('M38 17V5M33 10l5-5 5 5')}`);
// E: the carriers' leg stretched forward, heel down and toe up (the dance's gesture).
const BOU_LEG = piSvg(`${BOU_PX(2, 10, 30)}${piLines('M20 33l14 7', 3.2)}${piLines('M33 37l4 6')}`);
// R: the half turn.
const BOU_SPIN = piSvg(`${BOU_PX(9, 16, 28)}${piLines('M41.5 31A20 13 0 1 1 33 9.6')}${piLines('M27.5 5.5l6 4-3.6 5.6')}`);
export const PHOTO_ICONS = {
  [MULASSA.id]: { Space: PI_JUMP, KeyQ: MULA_REAR, KeyE: MULA_KICK, KeyR: MULA_SPIN },
  [DRAC.id]: { Space: PI_JUMP, KeyQ: DRAC_ROAR, KeyE: DRAC_SPARKS, KeyR: DRAC_SPIN },
  [BOU.id]: { Space: BOU_CHARGE, KeyQ: BOU_HEAD, KeyE: BOU_LEG, KeyR: BOU_SPIN },
};
// The swap button shows who you'd become: the next figure's pixel portrait.
export const swapArt = id => { const f = FIGURES.find(g => g.id === nextPhotoId(id)); return pixelSvg(portraitArt(f), portraitPalette(f), '#2a1a10'); };
