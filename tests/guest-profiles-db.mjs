// The guest profiles' database contracts in one command (the unreleased seven-day schema was replaced by them).
// npm run check runs both suites directly, so it does not list this file.
await import('./seasons-db.mjs');
await import('./player-stats-db.mjs');
