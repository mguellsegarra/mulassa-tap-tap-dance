# Local validation — 19 October 2026

Current prototype revision: see `simple-carriers-v3.md` for Marc's accepted rehearsal compass,
simple cuffs/shoes and expressive body/head sway. Its full-duration playback samples, 240 Hz
geometry/contact checks, mobile viewport checks, passing check/build and preserved music/model
hashes supersede the articulated-carrier implementation described in earlier sections below.
The historical reports are retained as evidence of prior iterations, not current rig anatomy.

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

## Revision 2 — response to opening/legs review

The first-draft visual conclusions above are superseded where they concern the opening.
See `opening-v2.md` for observations and inference boundaries.

- Source opening inspected at dense intervals, including visible foot crops and background-stabilized tracking.
  The return between 14 and 24 s was only 0.0648 model metres in the previous draft; it is now 0.9256 inferred
  model metres. This checks the old near-static defect; the metric scale is not a surveyed measurement.
- First 65 s now include source-derived lateral and hem-tilt cues. The first turn translates as well as rotates.
  Final-turn headings were re-read at 0.5 s intervals, correcting the left-front view at 151 s.
- Eight fixed-length articulated legs replace telescoping trousers. All 8,311 sampled poses pass knee/ankle
  reach checks. Every planned stance is unchanged in world coordinates. Swing arcs avoid the planted foot;
  each pair remains at least 0.25 m apart at 50 Hz. This is a pairwise support check, not a general cloth/crowd
  collision solver. Maximum planned stride was reduced from 1.42 m in the initial new planner to about 0.95 m.
- Browser: matched frames at 0.1, 6, 14, 24, 38, 48, 130 and 151 s; final 151 s rechecked after yaw refinement.
  Continuous opening playback sampled at 2, 4, 6, 8, 10 and 12 s. Mobile 375x667 and landscape 852x392 render;
  no horizontal overflow in the measured landscape/413px layouts. No browser warnings/errors. Viewport reset.
- The first full check failed an existing wall-clock audio benchmark (118 ms), while other concurrent work and
  rendering were active. It was not repaired by changing audio or loosening the test. The fresh full run passed (exit 0), including all 43 backup tests. The research regression test also passed after the final yaw/rig changes.
- All eight production music files remain byte-identical to the start-of-turn SHA-256 snapshot.
  The LAN review URL returned 200. Port 5188/PID 29426 remains available for review.
- No commit or staging operation was performed by this agent. Other work advanced HEAD from ee87db4 to 1e6b107
  and staged files during this revision; that concurrent history/index state was preserved.

Evidence: external `initial-motion-v2/`, including the baseline, raw tracking, comparison captures and continuous
opening contact sheet. Intermediate captures remain labelled; they do not certify later edits or the full dance.

Final whitespace check passed for the research changes. The concurrent whole-checkout diff reports an unrelated extra blank line in `src/ui/pending-title.js:29`; it was left unchanged.

## Original-proportion restoration

At Marc's request, removed all preview-only root height/length scaling and skirt geometry transforms.
The original voxel model factory is used unchanged; articulated carrier legs and the existing reconstruction
data are retained. Camera base distance/FOV/target height were adjusted to fit the restored original model.
The research regression test passes. Browser checked at 0 and 24 s, including current/proposal mode switching.
Screenshot: external `initial-motion-v2/original-proportions-restored.png`.

Restoration validation: `npm run check` passed in full (exit 0); scoped `git diff --check` passed.

## Full-duration revision — travel and carrier artifacts

See `full-audit.md` for the interval-by-interval findings. Earlier opening-only acceptance does not certify
this revision. The 71–76 s approach, 90–120 s travel/tilt and alternating 127–133 s raises/dips were corrected.
Source-derived camera framing is separate from the inferred floor path. Original model proportions remain intact.

- Reviewed the complete 0–166.2 s synchronized performance at normal speed, with comparisons captured every
  source second. Replayed 89–134 s after the late-body corrections. After replacing the independent foot plans
  with coordinated supports, replayed the entire duration at 2x and inspected comparisons every two source seconds.
  Playback samples are not exact paused timestamps: the capture log records the trigger time, and playback advances
  during screenshot capture. Paused critical captures, including 73.50 s, are exact source-time comparisons.
- Final `tests/bestiari-research.mjs` passes. It checks actual transformed leg/torso geometry, fixed bones and all
  28 shoe pairs at 240 Hz with a half-sample offset, plus source-frame pose finiteness, planted contacts, both sides
  of each lift-off/landing, seek determinism and the approach/late-dip regressions. Cloth bounds allow a 1 cm voxel
  edge tolerance. The independent dense probe's worst corner is about 8 mm at the hem near 136.36 s. The exact dense-check instant was rendered again after this final knee adjustment.
- Independent shoe sweep at 240 Hz found no overlaps over 1 cm. Contact probes found no discontinuities over
  1 mm across a 20 microsecond window. Final motion sampling found no shoe displacement over 10 cm in a 1/240 s
  interval. These are regression bounds, not proof of exact human foot timing or a complete continuous collision solver.
- `npm run check` passed in full (exit 0), including 43 backup tests. The final development-only foot refinement
  was followed by the research checks above and `tests/modules.mjs`: 159 files, no cycles, main.js 322 lines.
- `npm run build` passed; the existing large-chunk warning remains. Research assets stay outside the production
  import graph. Scoped whitespace check passed; the whole checkout reports an unrelated trailing blank line in
  `.gitignore:62`, left untouched.
- Final browser: no warning/error logs. Source, original-proportion model and overhead rendered at 73.50 s.
  Mobile CSS viewports 375x667 and 852x392 have no horizontal overflow; screenshots were captured after the
  resize frames settled. The viewport override was reset. These are responsive checks, not a physical-phone test.
- All five `public/music/mulassa-*` files match the prior SHA-256 baseline. Concurrent Drac music work changed
  its MIDI/MP3 relative to that older snapshot; it was neither edited nor reverted by this task.
- The LAN comparison URL returned 200. Vite PID 29426, port 5188, belongs to this worktree and remains available
  for Marc. No other server was stopped. No commit, push, staging or deployment was performed by this task.

Evidence: external `Mulassa/revisio-2026-10-19/full-motion-audit/`. `final-playback/`, `final-desktop.png`,
`final-phone.png`, `final-landscape.png` and `final-source/` identify the final version. Earlier experiments are
retained separately and do not describe the shipped prototype. The source audio is still the recording; no new
musical arrangement or listening sign-off is claimed.

## Camera seam correction — 2026-10-19

See `camera-seam-89s.md` for the reported 88.54 s capture, diagnosed discontinuity
just after 89 s, complete camera-target fade at 121 s, and numeric/rendered evidence.

- `node tests/bestiari-research.mjs`: passed. The new projected-camera regression
  first failed on the preserved logic at 89 s, then passed with the fix, including
  fit boundaries and 30/50/60/120 fps sampling around the reported transition.
- `npm run build`: passed; existing large-chunk warning remains.
- `npm run check`: initial run passed through crowd/input checks, then failed the
  audio applause generation timing assertion at 116 ms. Re-ran the exact check
  command sequence from `tests/audio.mjs` through the final backup-scheduler check:
  all passed. Thus the suite completed across two runs, not one uninterrupted pass.
  No audio code or thresholds were changed. Logs: `/tmp/mulassa-seam-check.log` and
  `/tmp/mulassa-seam-check-remainder.log`.
- Browser: muted side-by-side playback 86–95.8 s, additional playback 119–122 s,
  confirmed adjacent 88.98/89/89.02 s via next-frame UI, desktop and 375 x 667 mobile.
  No console errors/warnings after reload. Preview left paused at 86 s for review.
- Production music hashes match the captured pre-edit baseline. No model geometry,
  source choreography annotations or foot solver changes in this correction.
- LAN URL returned HTTP 200. Existing Vite PID 26476 on port 5188 belongs to this
  worktree and remains running. No new server, commit, push or deployment.
