# Full performance review — 19 October 2026

Source: El Camp Difusio, Balladeta de la Mulassa, Santa Ursula 2017, YouTube `D53pgXOeIL0`.
The review uses source seconds, 0–166.2 s. It concerns the development comparison, not the game choreography.
The original voxel body, skirt, neck and head proportions remain unchanged.

## Coverage and findings

Normal-speed synchronized playback was captured continuously from beginning to end in successive blocks,
with one source/model comparison per second and the actual capture timestamps retained. All contact sheets
were inspected. Corrected late passages were replayed and captured again at normal speed. The final coordinated-foot version then received another full-duration pass at 2x, sampled every two source seconds. This is a complete-duration review,
not a claim that every decoded video frame or every hidden foot contact was visually verified.

| Source time | Observation and correction | Remaining limit |
| --- | --- | --- |
| 0–31.7 s | Small foot adjustments, sideways travel and return. Retained the previously fitted lateral path and signed hem tilt. | Hidden footfalls are inferred, not counted. |
| 31.7–35 s | First half-turn passes through the front. The old leg solver let knees/upper legs escape through the side of the skirt. Pelvis and shoulders now follow the tilted shell. | The original narrow voxel body differs from the real silhouette. |
| 35–66.5 s | Opposite side, repeated weight changes and lateral movement. Retained source-derived hem and background cues. | Camera/scale fit is approximate. |
| 66.5–71 s | Turn through the back, then face left. Checked the transition into the approach. | Turning changes the visible cloth panel; its centroid is not a direct world-space measurement. |
| 71–76 s | Rapid diagonal approach. The old floor path was too short and the camera cancelled much of the visible travel. Increased actual floor travel and fitted framing separately from the green-panel landmark. | Depth is inferred; screen-space tracking does not establish metres. |
| 76–89 s | Turn across the front, move right in the image, then retreat. Added intermediate floor anchors and source framing. | Close framing can crop the ears/head, as in the source; original proportions prevent an exact silhouette match. |
| 89–121 s | Model was too static. The source moves laterally away and back and alternates body dips. Added background-stabilized travel, signed hem tilt and panel framing, including the strong dip around 110 s. | Median filtering softens quick cloth movement; sparse/occluded hem detections are interpolated. |
| 121–126 s | Turn through the back towards the left-facing side. Heading order retained. | Amplitude and depth remain fitted estimates. |
| 126–134 s | Alternating raises and dips, especially 127/128 and 130/132/133. Corrected the previous predominantly upward tilt so the front also lowers. | Angles are silhouette estimates, not recovered joint motion. |
| 134–145.5 s | Turning sequence and two changes of direction. Retained unwrapped heading and both reversals. | The path around the centre remains approximate. |
| 145.5–161.5 s | Faster final turns. Reviewed all one-second comparisons and retained the earlier half-second heading annotations. | Hidden carrier steps are generated to support the body motion. |
| 161.5–166.2 s | Brake, left-facing finish and settle. Retained the end of the actual recording. | No exit after the recording is invented. |

## Carrier corrections and checks

The pelvis no longer follows the midpoint of lagging shoes: it sits under the shell. Knees bend using fixed-length
thigh/shin segments. Crouch height accounts for reach. The four carriers alternate coordinated support groups. Each group lifts before horizontal travel, keeps clearance above the standing shoes, and lowers only after reaching a clear landing. Landing correction moves the whole group together to preserve spacing. Stance positions remain world-fixed. This coordination is an inferred support solution, not a claim that the eight hidden feet were traced individually.

An intermediate vertical avoidance fix made feet pop at landing. It was rejected after checking both sides of
every lift-off/landing instant. Intermediate per-frame detours and whole-swing optimizers also failed continuity/clearance checks and were removed. None is part of the final implementation. The final checks inspect actual transformed mesh vertices, all 28 shoe pairs,
fixed bone lengths, planted contacts, contact continuity and seek history. These checks protect geometry and
continuity, not fidelity to feet that the real video hides.

## Evidence and limits

Local evidence is retained outside Git in `Mulassa/revisio-2026-10-19/full-motion-audit/` inside the Bestiari R+D
folder. It includes the pre-fix source snapshot, synchronized playback captures/timestamps, tracking diagnostics,
critical comparisons and validation logs. Intermediate captures are labelled by their directory; later captures
supersede them where the implementation changed. See `validation.md` for final test outcomes.

Four carriers, two front and two rear, are confirmed by the [Unio Anelles de la Flama figure description](https://uaf.cat/seguici-ceremonial/mulassa/). The source audio is unchanged. This review does not certify musical transcription or a new game arrangement.
No production model, production choreography or production audio was replaced. The reconstruction is ready for
another visual review; exact depth, original-model silhouette differences and hidden foot timing remain estimates.
