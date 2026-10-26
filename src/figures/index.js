// What differs from one playable figure to the next, as plain data: the shared systems read a trait here instead of
// asking «is it the Drac?». A new figure adds its row (and its own folder beside this file); ids are game/figures.js's.
// Data only, no imports: anything may read it without an import cycle. Behaviour that differs (a dance, a model) stays
// in the figure's folder; this table only says which one to use.
export const FIGURE_TRAITS = Object.freeze({
  'mulassa-valls': Object.freeze({
    key: 'mulassa', // the figure's short name: its theme, its words' variant, its ?figura= value
    drumroll: 'balloon', // what a drumroll shows: balloon | carretilles | esquellot
    article: 'fem', // «amb la Mulassa» / «amb el Drac»
    cardFile: null, cardAlt: 'hud.card.altMula', // the share image's file name (null: the game's) and its alt text
    shareKey: null, // the share caption: null = the outcome lines (record, challenge…), else this one key
    shareLines: 'services.share.', shareEmoji: '🫏', // the outcome lines' keys (prefix + challenge | record | clear | fail) and their opening emoji
    challenge: true, // the ?repte challenge link
    playCam: 'mula', // the play camera's follow (scene/cameras.js MULA_CAM / DRAC_CAM)
    wideClearance: false, // free play: the crowd and props keep the Drac's wider clearance
    photoSpace: 'ui.photo.act.jump', photoE: null, // free play: Space's label, and what E does
    photoBody: 'mula', // free play: which PHOTO body (game/photo-control.js) it drives
    springs: true, // M (scene/figure-springs.js) is this figure's own body, not a shared one the selector borrows
    splashHost: true, splashPartner: false, // the splash's pair: the one that hosts it, the one beside the host
    landing: 0.98, // the manual jump's landing shake (scene/manual-jump.js)
  }),
  'drac-valls': Object.freeze({
    key: 'drac', drumroll: 'carretilles', article: 'masc', cardFile: 'drac-de-valls.jpg', cardAlt: 'hud.card.altDrac',
    shareKey: null, shareLines: 'services.share.drac.', shareEmoji: '🐉', challenge: true, playCam: 'drac', wideClearance: true, photoSpace: 'ui.photo.act.jump', photoE: 'sparks',
    photoBody: 'drac', springs: false, splashHost: false, splashPartner: true, landing: 0.9,
  }),
  'bou-tradicional-valls': Object.freeze({
    key: 'bou', drumroll: 'esquellot', article: 'masc', cardFile: 'bou-tradicional-de-valls.jpg', cardAlt: 'hud.card.altBou',
    shareKey: 'services.share.bou', shareLines: null, shareEmoji: null, challenge: false, playCam: 'mula', wideClearance: false, photoSpace: 'ui.photo.act.bou.space', photoE: null,
    photoBody: 'bou', springs: false, splashHost: false, splashPartner: false, landing: 0.9,
  }),
});
// The Bou ships with 1.2.0 (branch feat/bou empties this set); until then the selector shows it as pending.
export const UNRELEASED_IDS = Object.freeze(new Set(['bou-tradicional-valls']));
export const PLAYABLE_IDS = Object.freeze(Object.keys(FIGURE_TRAITS).filter(id => !UNRELEASED_IDS.has(id))); // in the order free play's Tab goes round
export const traitsOf = id => FIGURE_TRAITS[id] ?? FIGURE_TRAITS['mulassa-valls'];
export const traitsByKey = key => PLAYABLE_IDS.map(id => FIGURE_TRAITS[id]).find(t => t.key === key) ?? FIGURE_TRAITS['mulassa-valls'];
export const SPLASH_HOST_ID = Object.keys(FIGURE_TRAITS).find(id => FIGURE_TRAITS[id].splashHost);
export const idOfKey = key => PLAYABLE_IDS.find(id => FIGURE_TRAITS[id].key === key) ?? null;
// A score version's figure (the server's versions start with the figure's short name; the Mulassa's older ones do not)
export const figureOfVersion = version => Object.keys(FIGURE_TRAITS).find(id => id !== 'mulassa-valls' && String(version).startsWith(FIGURE_TRAITS[id].key)) ?? 'mulassa-valls';
