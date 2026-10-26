# Camera handoff correction, 2026-10-19

Reported frame: 88.54 s / 4427. The visible discontinuity occurs just after 89 s.
Source: `D53pgXOeIL0`, Santa Ursula 2017. Reviewed original frames at 86, 88,
88.54, 89, 89.02, 90, 92 and 94 s, then browser playback from 86 to approximately
95.8 s with the reference, model and overhead together. The original has body
sway and camera movement, but not the reconstruction's instantaneous screen jump.

## Cause and correction

`lateFit` replaced the active `approachCamera` reference weight (1) with its own
starting weight (almost 0) just after 89 s. That abruptly removed the fitted camera
before bringing it back over the next second. The world-space body path was continuous.

The fit now retains the combined outgoing/incoming weight. One continuous screen
landmark track joins the 89 s and 90 s samples, avoiding an abrupt stop at either
track endpoint. Body translation, heading, support planning, original model geometry
and music are unchanged.

The camera's full look-at target now blends back to its normal height AND depth.
Previously, a tiny nonzero fit weight still discarded part of that target, causing
another discontinuity when the fit ended at 121 s. Camera evaluation is extracted
into `tools/dev/bestiari-compare/camera.js` and shared with the regression check.

## Evidence and validation

`tests/figures/common/bestiari-research.mjs` failed on the preserved camera logic at 89 s, then
passed after correction. It evaluates a body point through the actual model and
camera matrices at all fit boundaries, and checks screen motion at 30/50/60/120 fps
with two sample origins around the reported handoff. These are continuity checks,
not proof that the fitted camera exactly reproduces the source operator.

At a normalized 1280 x 720 model panel:

| Measurement | Before | After |
| --- | ---: | ---: |
| Projected jump across 89 s (epsilon 1 microsecond each side) | 97.197 px | 0.000036 px |
| Projected jump across 121 s | 25.984 px | 0.000021 px |
| Largest per-frame displacement, 88–91 s at 50 fps | 97.415 px | 1.921 px |

Browser verification used the muted preview on port 5188, process 26476 in this
worktree. Replayed the surrounding passage, inspected its captures, then used the
actual next-frame button for 88.98, 89.00 and 89.02 s. Also checked 375 x 667
mobile framing. Browser errors/warnings were empty after reload.

Evidence directory (outside Git):
`~/Desktop/Bestiari de Valls - I+D/Mulassa/revisio-2026-10-19/camera-seam-89s/`

- `stage.js`, `motion.js`, `supports.js`, `carriers.js`: preserved pre-edit source.
- `source-sheet.jpg`: original video frames around the event.
- `metrics.json`: numeric before/after measurements.
- `verified-adjacent.jpg`: corrected adjacent frames, confirmed through UI stepping.
- `play-*.png`, `playback-times.json`: 41 live-playback samples. Capturing takes time,
  so actual times differ from the requested 0.2 s sampling grid; use the recorded times.
- `after-mobile-89.02.png`: mobile capture.

Early rapid seek screenshots (`before-*`, `after-*`) can lag the requested instant
in the browser compositor; use `verified-*` for exact corrected adjacent-frame evidence.
Build passed with the existing large-chunk warning; production music hashes match
the pre-edit baseline. Full check initially stopped on the audio applause timing
benchmark (116 ms); validation status for its rerun is recorded in `validation.md`.
