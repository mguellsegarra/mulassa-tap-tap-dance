// Pop's ⚙ «Bústia» (src/jocs/games/pop/settings.js) sends through the feedback service, as the main game's sheet does: it was
// handed the leaderboard, which has no send(), so every message failed with a TypeError (Sentry feedback-failed, 14 Nov 2026).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../src/jocs/games/pop/settings.js', import.meta.url), 'utf8');
const call = src.match(/setupFeedback\(\{([^}]*)\}\)/)?.[1];
assert.ok(call, 'Pop sets up the feedback sheet');
const keys = call.split(',').map(k => k.trim().split(':')[0].trim());
assert.ok(!keys.includes('service'), 'no service of its own: the default is the feedback sender (services/feedback.js)');
console.log('pop feedback: the sheet uses the feedback sender ok');
