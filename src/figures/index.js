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
    photoE: null, // free play: what E does
    photoBody: 'mula', // free play: which PHOTO body (game/photo-control.js) it drives
    springs: true, // M (scene/figure-springs.js) is this figure's own body, not a shared one the selector borrows
    splashHost: true, splashPartner: false, // the splash's pair: the one that hosts it, the one beside the host
    splashSolo: false, // the splash shows this figure alone on the first visits, then takes turns with the pair (splashSoloAt)
    landing: 0.98, // the manual jump's landing shake (scene/manual-jump.js)
    reelCalm: false,
    novelty: false, // the selector's newest figure: first in the strip, its card shining, until it is played (ui/select-ui.js)
    frameLength: true, // the selector and showreel frame her by her length, whatever her heading (scene/cameras.js): turned side on at once she outgrew a phone's frame
  }),
  'drac-valls': Object.freeze({
    key: 'drac', drumroll: 'carretilles', article: 'masc', cardFile: 'drac-de-valls.jpg', cardAlt: 'hud.card.altDrac',
    shareKey: null, shareLines: 'services.share.drac.', shareEmoji: '🐉', challenge: true, playCam: 'drac', wideClearance: true, photoE: 'sparks',
    photoBody: 'drac', springs: false, splashHost: false, splashPartner: true, splashSolo: false, landing: 0.9, frameLength: false, reelCalm: false, novelty: false,
  }),
  'bou-tradicional-valls': Object.freeze({
    key: 'bou', drumroll: 'esquellot', article: 'masc', cardFile: 'bou-tradicional-de-valls.jpg', cardAlt: 'hud.card.altBou',
    shareKey: 'services.share.bou', shareLines: null, shareEmoji: null, challenge: false, playCam: 'mula', wideClearance: false, photoE: null,
    photoBody: 'bou', springs: false, splashHost: false, splashPartner: false, splashSolo: true, landing: 0.9, frameLength: false, reelCalm: true, novelty: true, // reelCalm: the selector's showreel camera follows it slowly (scene/cameras.js)
  }),
});
// The Bou is active for the 1.4.0 worktree review; its online board remains disabled.
// While the set holds it, a build also leaves its modules and song out (tools/deploy/unreleased-figure.mjs); empty it to ship it.
export const UNRELEASED_IDS = Object.freeze(new Set([]));
export const PLAYABLE_IDS = Object.freeze(Object.keys(FIGURE_TRAITS).filter(id => !UNRELEASED_IDS.has(id))); // in the order free play's Tab goes round
export const traitsOf = id => FIGURE_TRAITS[id] ?? FIGURE_TRAITS['mulassa-valls'];
export const traitsByKey = key => PLAYABLE_IDS.map(id => FIGURE_TRAITS[id]).find(t => t.key === key) ?? FIGURE_TRAITS['mulassa-valls'];
export const SPLASH_HOST_ID = Object.keys(FIGURE_TRAITS).find(id => FIGURE_TRAITS[id].splashHost);
export const SPLASH_SOLO_IDS = PLAYABLE_IDS.filter(id => FIGURE_TRAITS[id].splashSolo);
// Who the splash shows on a page's `visit`-th load (0 on): the newest splashSolo figure alone on the first `first` visits
// (the novelty an update brings), then the pair and each splashSolo figure in turn; null = the pair (scene/stage-motion.js)
export const splashSoloAt = (visit, ids = SPLASH_SOLO_IDS, first = 3) =>
  visit < first ? ids.at(-1) ?? null : ids[(visit - first) % (ids.length + 1) - 1] ?? null;
export const idOfKey = key => PLAYABLE_IDS.find(id => FIGURE_TRAITS[id].key === key) ?? null;
// A score version's figure (the server's versions start with the figure's short name; the Mulassa's older ones do not)
export const figureOfVersion = version => Object.keys(FIGURE_TRAITS).find(id => id !== 'mulassa-valls' && String(version).startsWith(FIGURE_TRAITS[id].key)) ?? 'mulassa-valls';
