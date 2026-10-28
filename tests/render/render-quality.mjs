import './finale-effects.mjs';
import './adaptive-quality.mjs';
import './photo-control.mjs';
// The game's contracts in a mocked DOM, one file per area, in this order on ONE shared game (game-context.mjs): a file
// may rely on the state the ones before it left (a stub chip, vm vars, the seeded random), so they are not run alone.
// Sequential dynamic imports: static sibling imports with top-level await would not wait for each other.
await import('./quality-models.mjs');
await import('./scene-crowd.mjs');
await import('./game-flow.mjs');
await import('./game-play.mjs');
await import('./sheets-share.mjs');
await import('./hud-play.mjs');
await import('./clock-theme.mjs');
await import('./photo-showreel.mjs');
