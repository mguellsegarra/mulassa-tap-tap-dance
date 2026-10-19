# Local validation — 19 October 2026

Target: `t3/character-select-v1-2-0`. No commit, push or deployment was performed by this research task.
The checkout has concurrent selector changes; they were not edited or reverted here.

## Passed

- `node tests/bestiari-research.mjs`: archived source SHA-256 integrity, complete source-time coverage,
  both half-turns, the two late reversals, approximately four final turns, seek determinism, finite supports,
  planted-shoe stability, byte ranges and exclusion from the production import graph.
- `node tests/modules.mjs`: 138 modules, no import cycles, composition root 322 lines.
- `npm run check`: full existing suite passed (exit 0), including 43 backup tests. Captured log retained externally.
- `npm run build`: exit 0. Existing large-chunk warning remains; no research videos, candidate music or comparison
  page was included in dist. The preview is served only by Vite development.
- `git diff --check` and the skill-creator validator passed.
- HTTP: source HEAD 200; partial 100-byte request 206 with correct length; unsatisfiable range 416;
  disallowed method 405; unknown/traversal-style resource IDs 404. Drac compatibility URL also 200.
- SHA-256 comparison against the pre-task baseline: all production music files, song metadata, game dance and
  Mulassa model unchanged. Only concurrent selector UI/style files differed among previously existing src files.

## Browser observations

- Desktop: source and WebGL model rendered; no warning/error logs. Matched frames inspected at 0, 33, 76,
  130, 140.75, 142, 144, 151 and 161.5 s. The 33 s and 130 s tilt corrections were checked again after adjustment.
- Playback advanced from 138 s through the finale and stopped at 166.20 s. This verifies transport/rendering;
  it is not a claim that every intermediate frame was visually accepted.
- Frame buttons moved 130.00 → 130.02 → 130.00 s while paused; all views followed. Half-speed control set the
  native playback rate to 0.5. Switching to the current-game mode worked and identified its 90.10 s duration.
- Mobile CSS sizes 375×667 and 393×852 were checked during development. Final shared-button styling was
  rechecked at 375×667 and 852×392; no horizontal overflow. In landscape all three panes fit above y=352.
  Browser viewport overrides were reset. These are browser checks, not a physical-iPhone performance test.
- The frozen Drac comparison rendered video/model/map and the corrected diagonal S/N/W/E frame with a separate
  camera marker, with no browser warning/error logs.
- LAN URL `http://192.168.1.195:5188/mulassa-compare.html?mute` returned 200. It requires this Mac/server and the
  same network. Vite PID 29426 on port 5188 is deliberately retained for Marc's review; pre-existing servers
  and unrelated resources are preserved.

## Remaining artistic validation

The broad heading sequence is supported by source frames; exact sway phase, metric travel and hidden footfalls
remain inferred. Close approaches are not an exact camera match. The original model's narrow body and long neck
remain visible differences. Original audio is present and technically playable, but musical listening, manual
beat/phrase annotation and a production arrangement are not signed off. No exact tempo or step-count claim is
made from autocorrelation. Review this as a first reconstruction, not a completed production integration.

Evidence is in the external Mulassa `revisio-2026-10-19/validation/` directory. `mulassa-keyframes.jpg` preserves
an intermediate comparison before the two tilt corrections; `comparison-desktop.png`, `comparison-phone.png`
and `comparison-landscape.png` show the later viewer. Logs and integrity-check.json accompany them.
