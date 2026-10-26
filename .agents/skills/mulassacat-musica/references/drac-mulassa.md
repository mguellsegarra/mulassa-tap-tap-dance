# Drac and Mulassa lessons, 2026-10-16

This is a historical casebook. Re-measure current files, server identities and versions. Latest source outranks earlier reports; filenames containing 'final' do not establish acceptance.

## Durations and scope

The published Mulassa MP3 measured126.757891s directly at https://mulassa.cat/music/mulassa-taiko.mp3 . Its final hit was123.258s in the corresponding original metadata. The isolated short trial measured93.599977s overHTTP at5184, metadata93.6s, finalhit90.1s,152BPM, with the full introduction retained. The application's3.2s count-in is separate.

The Drac's long local recording was110.241s. An early trial was91.194s but incorrectly shortened the accepted introduction. Restoring that intro made the trial95.003s. The final whole-phrase arrangement also measured95.003s, but its melody and hash differ from the earlier rejected95s trial. Duration equality does not identify a version.

## Rejected Drac cuts

1. **23→40:** the first design removed the whole first D. Review treated bar23 as equivalent to39 because the chord and opening rhythm appeared similar. Bar23 actually ends with a triplet preparation for D;39 prepares the return. Bar40 is not a substitute resolution. Structural tests passed and no audition occurred before handoff. The owner immediately heard a broken phrase around displayed65·E (a beat index).
2. **21→38 with a new tie:** an analysis prototype preserved the total length, invented tie38:21 and retained38–39 before40. It repaired a local melodic relation but cut across the larger phrase. The owner rejected it around67·C. Do not present that bridge as accepted.
3. **Introduction cuts:** both songs' accepted intros were shortened to pursue~90s. The owner explicitly required their restoration. Original first melody entries were about5.3s Drac and4.8s Mulassa. A requested shorter track did not imply permission to sacrifice the intro.

No clipping, note overlap or abnormal gain envelope was demonstrated as the cause of the first rejected Drac join. Scratch stems reproduced the shipped assets byte-for-byte. The evidence supported a phrase-position error, not a sample-edit artifact. A crossfade would not restore the missing musical resolution.

## Latest structurally verified Drac form

Source score https://grallersalfes.wordpress.com/wp-content/uploads/2014/01/ball-del-drac-de-valls.pdf . A local rendered copy was examined in both voices when the web reader could not open the PDF. The encoded first voice is `music/drac/drac-score.json`; its description was historically stale about the D.S., so inspect the actual notation.

The original arrangement used S1=1..8, S2=1..7+9..51, S3=6,7+9..51, then52..56, with12 intro beats. The latest reduction omits the complete S1 repeat and first-pass24..31:

```
S1 = []
S2 = 1..7 + 9..23 + 32..51
S3 = 6,7 + 9..51
coda = 52..56
```

This preserves21→22's written tie,22–23's preparation, and38–39's return into40. Bars24 and32 have identical complete pitches/durations in both voices, so23→32 preserves the expected entry figure. No new tie is needed. The arrangement omits repetitions and is not the literal printed repeat form. Listening was still unverified; do not upgrade this structural verdict into audible approval or user acceptance.

Original spans omitted were[12,28) and[72,88),32beats. New END195, C40,D56,E72,D.S.96,E3=162,coda186,roll191. The full D.S. and ending remain. The conservative alternative is omit S1 only, about102.622s, preserving the entire central statement/response.

The removed spans contain two slow sway cycles and four fast cycles, preserving parity of `sin(phase/2)`. Original yaw loses one full turn. Retained pose comparisons differed by less than7e-14 outside the new transition; practice was identical. Full rig/feet tests and the complete suite passed. Geometry, motion implementation and foot planner stayed byte-identical. This does not prove imperceptible musical editing.

## Mulassa reduction and rankings boundary

The short local form retains the original intro and removes original[174,258),84beats. Bar31 matches48, so31→49 retains the existing approach into C. Both C statements and the full X/finale/roll remain. END228, C176,X208,roll224, finalhit90.1s,total93.6s. The return of A′/B′ and one balloon are omitted; do not claim every ending variant remains.

The generator, balloons, choreography and tests used manually copied anchors. They needed coordinated retiming. A proposed `FULL/SHORT` runtime framework was rejected as unnecessary for one isolated trial. Generated balloon windows were added so a supplied song fixture could actually build its own chart instead of using module-global short windows.

Published `mulassa-v1` judgments stayed[150,181,318] and strict ceilings[147000,163000,250000]. The short trial judgments were[108,133,240]. These are historical measured contracts, not new constants to scatter through code. Do not replace old ceiling equality with `<=`, invert old publishability assertions or adjust scores by126.8/93.6 alone.

The isolated trial disabled actual leaderboard, feedback, captcha, Sentry, account actions, mock publication through`?final`, challenges and competitive sharing. Direct hidden-button calls and enabled-env cases were tested, not just autoplay. Old-version rules and production data were untouched.

## Timing and verification traps

### Correct notes can still render as a wrong note

A later report at displayed beat59 (capture60.7 D, approximately29 seconds) prompted a fresh reading of all198 pitched events in the57 source bars. The upper-voice transcription matched the PDF. Printed bar33 ends in C5, unlike25/29/37 which end in D5; do not homogenize that real variation. Lower-voice thirds in33–34 were checked, but the source clips the last lower staff, so a complete lower-voice audit was unavailable.

The renderer doubled even0.119-second sixteenths with undamped1.4-second bells. At beat59 the previous G5 bell retained about86% of its fundamental envelope while F#5 began. At59.75 an added F#5 arpeggio attacked against the next G5 bell. This mechanism is absent from the written two-voice passage. Melody-JSON parity tests passed because neither the duration of synthesized bells nor the added arpeggio was represented by that contract.

The initial correction gated dry lead/bell voices at their written note-off with a15ms fade, and limited decorative arpeggios to their tempo-mapped quarter-beat step, omitting unintended semitone conflicts with the melody over that step. A later complaint at slider28 led to narrowing this: **the lead gate was reverted**, restoring its original bounded~0.1s release/legato; the bell gate and arpeggio correction remain. Written pitches, ties, form, tempo and duration stay unchanged. This is a demonstrated synthesis correction, not proof that the user's perceived defect is fully resolved without auditory A/B review. Similar bell overlaps also occurred near58 seconds, so a timestamp/beat ambiguity did not justify ignoring either window.

Slider28 means sourcebar10 at13.433s, not the earlier dissonance near28seconds. Printed10/12 repeat a motif, but11/13 answer differently. The79 melody events in the first A/B/C matched the long baseline, shifted16beats earlier after omitting S1; no new whole-phrase duplication was introduced there. First-pass B has no bell or arpeggio layer. The global lead gate nevertheless changed its articulation unnecessarily. Do not delete source variations or claim an acoustic cause from this evidence alone. The restored lead is a conservative trial, not listening acceptance.

- **Float drift:** bar start154.00000000000003 failed exact modulo tests and lost intended chart taps. Boundary normalization was checked against rational layout; restored taps were disclosed rather than treated as unexpected new composition.
- **Tempo ramp:** finite shoe-swing curvature exceeded a real60Hz second-difference limit when tempo rose too soon. Extending the ramp fixed the measured trajectory without weakening the historical .08m limit. This metric is not mathematical jerk.
- **Phase:** an earlier8beat intro cut removed an odd sway cycle, reversing`sin(ph/2)` while ordinary sin/cos stayed aligned. A song-only2pi offset was needed for that particular trial and was removed when the intro was restored. Do not copy it blindly.
- **Rounding:** a historical accumulator stored`+jolt.toFixed(3)`, corrupting peak comparison and location. Keep raw values; format only for display.
- **Playback sampling:** waiting4wallseconds after starting Mulassa from64s advanced only about.7s of actual song because of the3.2s count-in. A separate check had to cross the actual68.78s splice, reaching71.23s.
- **Browser evidence:** native snapshots twice timed out, so repository-supported SwiftShader Chromium was used and disclosed. Silent recordings prove rendered playback, not audio quality or real-device performance.

## Local evidence index

Under `~/.t3/userdata/browser-artifacts/`, optional forensic records include:

- `drac-music-20261016/score-research/hi-1.png`, tempo research and`tempo-jolt-astra/report.md`.
- `drac-short-20261016/` contains the original baseline, early designs and the rejected intro-shortening trial.
- `drac-audible-seam-20261016/` contains reproduced stems and original/rejected/prototype excerpts. Its proposed21→38 fix was subsequently rejected.
- `drac-phrase-rework-20261016/score-verdict.md` and`verification.md` describe the later whole-phrase reduction, captured playback and its listening limitation.
- `mulassa-short-20261016/impl/completion.md`, `parent-verification.md`,mapping and browser reports describe the isolated93.6s trial.

Do not depend on these absolute directories to apply the general workflow. Temporary worktrees and ports can disappear. Keep accepted, rejected, measured and unverified states explicit when consulting their reports.
