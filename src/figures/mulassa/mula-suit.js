// The Mulassa's colla's dress over the shared colla bodies (scene/models/colla.js buildHelper / buildSeated).
// The Mulassa's group (2017/2021/2023 recordings): pale blue / blue-grey collared shirts with the sleeves rolled, very dark
// trousers, a broad sash (usually dark; a dark green and a yellow one with red stripes were seen), low espadrille-like
// shoes on light rope soles, now and then a pale neck cloth. Colours are artistic approximations; no insignia (too small
// in the sources to redraw), no hats; hair and face vary.
export const MULA_SUIT = { legs: '#242936', dye: false, sole: '#bcaa86', upper: '#2a2a2f', lace: null, shade: '#8198aa', rolled: true };
export const MULA_HELPER_LOOKS = [
  { ...MULA_SUIT, top: '#a8b9c8', sash: '#171e23' },
  { ...MULA_SUIT, top: '#9fb2c2', sash: '#171e23', scarf: '#dec887' },
  { ...MULA_SUIT, top: '#a8b9c8', sash: '#24382b' },
  { ...MULA_SUIT, top: '#b1c1cd', sash: '#171e23', rolled: false },
];
export const MULA_SEATED_LOOKS = [
  { ...MULA_SUIT, top: '#a8b9c8', sash: '#171e23' },
  { ...MULA_SUIT, top: '#9fb2c2', sash: '#171e23', scarf: '#dec887' },
  { ...MULA_SUIT, top: '#b1c1cd', sash: '#d4a32c', stripes: '#b8452f' },
  { ...MULA_SUIT, top: '#a8b9c8', sash: '#24382b' },
  { ...MULA_SUIT, top: '#9fb2c2', sash: '#171e23', rolled: false },
];
