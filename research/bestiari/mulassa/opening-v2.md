# Opening and carrier revision, 19 October 2026

This supersedes the first draft's claim that the opening stays in one small zone.
Source: El Camp Difusió, D53pgXOeIL0, 50 fps. Times below are video time.

## Observations used

- 0–3 s: small support adjustments. Do not animate eight shoes marching continuously.
- 4–8 s: the body turns slightly towards the camera and lowers the front. Rear foot movements are partly visible.
- 9–14 s: the green panel moves right relative to background landmarks; the front rises gradually.
- 14–24 s: lateral return to the left, strongest around 24 s, with the front raised.
- 24–31 s: partial return to the right, then preparation for the turn.
- 31.7–35.5 s: half-turn through the front, accompanied by translation. A stationary root misses this movement.
- 36–42 s: rightward adjustment with the other side visible; the front is raised.
- 42–48 s: leftward return, changing tilt. Partial recovery through the following phrase.

`opening-tracking.json` retains background affine transforms, panel centroids and gold-hem angles at 5 Hz.
`tools/bestiari/track-mulassa-opening.py VIDEO OUTPUT_DIR` reproduces the source-specific extraction (OpenCV + NumPy).
The mask is designed for this recording. Inspect the diagnostic images before reusing it for another figure/video.
A median window of +/-0.6 s reduces cloth-edge jitter. At 32–35 s the visible panel changes, so raw centroid
jumps are not interpolated as direct world motion; the turn is bridged manually.

The 0.013 metre/pixel conversion and 0.27 m panel-side compensation are **inferred**. The monocular recording
cannot provide surveyed distances, all foot contacts, or a unique camera solution. Opening yaw uses a
silhouette-ratio estimate; pitch uses the gold edge and estimated yaw. Depth remains manually approximated.
The second-side camera has an additional 0.6 m framing adjustment; later camera following remains approximate.

## What changed

The first 65 seconds use source-derived lateral/tilt cues instead of only an arbitrary repeating sway.
The opening camera follows measured background changes rather than hiding 65% of the reconstructed travel.
Four carrier pairs are planned from root displacement and yaw. Stationary carriers retain their contacts;
turns shorten swing duration. A swinging foot travels around the planted shoe instead of cutting through it.
Each human has a pelvis, two fixed-length thigh/shin pairs and rigid shoes. The shell no longer stretches
straight trouser meshes to reach the floor. Supports are precomputed so seeking stays deterministic.

The owner rejected the preview's overall height/length and skirt scaling. Those adjustments have been removed:
the original voxel shell, head, neck and skirt proportions are preserved. The camera distance/FOV/target height
now accommodate the original model again, retaining the lateral tracking and follow logic. Articulated carrier
legs, timing, root path, source-derived tilt cues and overhead view remain. No production model, choreography,
score or audio file is changed.

## Limits

Foot identities and exact step counts are not fully recoverable through the cloth, musicians and spectators.
The new feet are a constrained plausible reconstruction, not tracked foot motion. Only the first 65 s received
this detailed position/tilt fit. Later headings retain the previous source annotations; secondary sway and
camera matching there still require review. Numeric tests establish contact/rig consistency, not cultural or
visual fidelity. This remains a review prototype, not a claim of an identical full performance.
