// This game's own words (packages/plassa/src/words.js).
import ca from './locales/ca.json' with { type: 'json' };
import { gameWords } from '#plassa/words.js';

export const { t, applyWords } = await gameWords(ca, import.meta.glob(['./locales/*.json', '!./locales/ca.json']));
