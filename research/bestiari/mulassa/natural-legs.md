# Carrier posture and knee continuity — 2026-10-19

Scope: the reference comparison (`mulassa-compare.html`), on `t3/character-select-v1-2-0`.
The beast mesh, its proportions, root choreography, camera and audio are unchanged by this correction.

## Defect and cause

The previous rig limited both 0.44 m segments to a 0.76 m hip–ankle reach even when stationary. At t=0, the most inclined shin was 38.05 degrees from vertical. A knee pole computed from a low, tilted shell point could also pass through the hip–ankle axis, abruptly reversing the knee. The saved previous rig exhibits a 0.62 m knee displacement in one 1/240 s sample near 5.42 s.

## Correction

- Raise the resting pelvis and allow a nearly extended leg. Blend back into flexion when lateral foot separation needs it; an ordinary fore/aft stride does not force a squat.
- Keep flexion through a fast turn, preventing the pelvis from standing up between successive footfalls.
- Use a horizontal knee pole with a persistent forward component and an inward component beneath the cloth. It does not inherit shell pitch/roll.
- Give horizontal shoe travel 70% of the swing instead of 60%, retaining the quintic easing and zero velocity/acceleration at each end. Shoes still lift clear before translating and finish translation before lowering.
- Preserve the actual 0.44 m thigh/shin lengths, rigid shoes, planned contact positions and deterministic seeking.

Standing shin maximum at t=0 is now 14.77 degrees. This is an artistic posture constraint, not a measured anatomical angle from the source. The source hides many feet; carrier support placements remain inferred. Energetic turns still need visibly bent legs.

## Validation

`node tests/figures/common/bestiari-research.mjs` passes: the actual rendered rig is sampled across 0–166.2 s at 240 Hz, offset half a sample, checking skirt containment, shoe intersections, fixed bone joints and ankle reach. Existing stance/seek/contact-boundary checks pass. New checks cover nearly vertical resting shins and the previously observed knee flips. The new resting-pose regression fails against the saved old implementation (38.05 > 20 degrees) and passes against the correction (14.77 < 20).

The complete comparison was played at 1x, with 84 saved side-by-side captures from 0 to 166 s at 2 s intervals, plus closer playback sampling around 70–77 s and matched before/after at 110 s. All seven contact sheets were inspected. Mobile portrait and landscape rendering were also checked. Console had no warnings/errors. This sampling does not certify every hidden foot placement matches the real carriers or every instantaneous pose is anatomically exact.

`npm run check` passes on the final rerun. An earlier run stopped in the concurrently edited Drac music-form assertion (225 vs 231); its current version was corrected outside this task before the rerun. `npm run build` passes, with the existing large-chunk warning. All files in `public/music` match their hashes from the start of this correction. No commit, push or deployment was made.

Evidence: `~/Desktop/Bestiari de Valls - I+D/Mulassa/revisio-2026-10-19/natural-legs/` (matched before/after, full playback captures and times, seven contact sheets, per-file diffs and probes). Preview: `http://localhost:5188/mulassa-compare.html?mute`.
