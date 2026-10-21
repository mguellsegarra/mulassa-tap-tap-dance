// Compatibility entrypoint for package.json while its owner updates the check command.
// The unreleased seven-day schema was replaced, so exercise its replacement contracts.
await import('./seasons-db.mjs');
await import('./player-stats-db.mjs');
