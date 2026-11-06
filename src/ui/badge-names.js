// A badge's name (set_profile_badge's closed list, 202611010001): proper names as they are, five said each language's own
// way (word(key): the main game's ui.badge.name.<key>, a mini-game's badge.<key>), a town's from the figure catalogue.
// The main game's picker groups them (player-badges.js); a mini-game's board only names them (src/jocs/games/pop).
import townCatalog from '../game/figure-catalog.json' with { type: 'json' };

const PROPER = { uaf: 'UAF', pessigolla: 'La Pessigolla', 'colla-vella': 'Colla Vella', 'colla-joves': 'Colla Joves', andorra: 'Andorra', balears: 'Illes Balears', // i18n-ok: proper names
  mallorca: 'Mallorca', menorca: 'Menorca', eivissa: 'Eivissa', formentera: 'Formentera', alguer: 'L’Alguer' }; // i18n-ok: proper names, as the towns
export const BADGE_WORDS = { 'campanar-valls': 'campanar', senyera: 'senyera', 'estelada-groga': 'esteladaGroga', 'estelada-blava': 'esteladaBlava', occitana: 'occitana' };
const TOWN = new Map(townCatalog.towns.map(t => [`town:${t.id}`, t.name]));
export const badgeName = (id, word) => PROPER[id] ?? (BADGE_WORDS[id] ? word(BADGE_WORDS[id]) : TOWN.get(id)) ?? null;
