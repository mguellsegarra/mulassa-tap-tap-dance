# Polishing, cutting and verifying an arrangement

Keep the melody's phrase structure and the game's timing coherent. Follow the active host orchestration and project approval rules. This skill does not authorize publication, Git history operations, service changes or ranking migrations.

Read [the casebook](drac-mulassa.md) for Mulassa/Drac work or a matching failure. It separates rejected proposals from accepted structural changes and unverified listening judgments. Do not reuse a historical port, beat number, duration or score count without checking the current artifact.

## Establish what is actually playing

Identify the source checkout, serving process, URL, loaded song metadata and exact audio asset/hash. Distinguish production, the original local version and each isolated trial. Measure the served media, not merely a file in a different checkout.

Use [scripts/measure_audio.py](../scripts/measure_audio.py) for repeatable ffprobe measurements of a local file or public URL. Supply the current song JSON to compare metadata, and an explicit count-in if the question concerns elapsed time from pressing play. Preserve these separate quantities:

- Musical entry / first playable note.
- Final hit (`end` in this project).
- Result/celebration tail (`tail`, not necessarily the file end).
- Complete encoded audio duration, including ringout.
- Application count-in or loading delay, which is outside the recording.

A slider showing `65 · E` may show a musical beat, not 65 seconds. Convert it through the active beat grid before diagnosing a timestamp. Read the running page when its loaded/cached version may differ from disk.

## Preserve the baseline and map ownership

Save the current generator, score, arrangement, song data, relevant choreography/tests and audio hashes outside Git. An isolated worktree from HEAD does not inherit dirty source. Give each writer the actual baseline and integrate only its task delta. Keep a rejected local candidate recoverable.

Find the single generator and its downstream contracts: score → form/bar order → harmony/orchestration → tempo map → audio/MIDI → chart → dance/camera/effects → results/versioned score rules. Generated JSON is output, not a hand-editing target. Keep unrelated songs and menu loops byte-identical when they are outside scope.

## Reconstruct the original musical form before cutting

Use the actual score and identifiable recordings. Inspect repeats, alternate endings, segno/coda, ties, pickups, cadences, question/answer pairs and multi-bar sequences. Distinguish score evidence, a particular live interpretation and an artistic game adaptation. Recording noise or firecrackers do not establish a written musical rest. Do not ask the user to find references the agent can locate.

Build a compact bar/beat table and write the exact retained bar order. For every proposed cut, show the last complete phrase before it, the retained preparation, the expected resolution and the first complete phrase after it. Inspect both written voices when available, not just the rendered lead.

Prefer complete repeat omissions and preserve every dependency at the join. Matching chords or the first pitch does not prove compatible phrase position. A same-pitch reattack, lost answer, displaced pickup or skipped return preparation can sound broken despite perfectly continuous samples.

Preserve an introduction the user has accepted. Do not shorten it or add another cut merely to force a numerical target. If the safest form is longer, state the tradeoff. A shorter arrangement changes the prescribed repeat count; do not describe it as the literal original form.

Do not invent a tie, truncate a held note, mute an awkward fragment or crossfade a broken musical sequence merely to conceal the cut. A new musical adaptation needs its own rationale and validation.

## Diagnose the actual sound before tuning

Reproduce the reported window using the actual generated asset. Compare the uncut reference's corresponding phrases, the rejected join and candidate join at matched levels. Keep short excerpts with bar/beat and second labels.

For a note reported as out of tune, independently read its original notation first: staff position, clef, key signature, local accidentals and their bar scope, octave, transposition and ties. Audit the complete suspect phrase and its repeated variants. A generated melody compared with the same transcription is a pipeline test, not evidence that the transcription is right. Record the source page/bar/voice and what was actually checked; disclose missing or cropped voices.

Then inspect **every audible pitched layer**, not just the lead or MIDI note list. A correct written note can sound wrong because an earlier bell, lead release, arpeggio or chord is still sounding. Compare each sample's actual release with the tempo-mapped written note-off and the next pitch change. At fast subdivisions a fixed 1.4-second bell can preserve a previous semitone at almost full level. Separate intentional reverberation from an undamped dry melodic voice. Gate or damp the affected voice with a smooth release; do not hard-truncate a waveform or rewrite a correct melody to accommodate an added instrument.

Do not treat every overlap as a defect or impose a gate on all melodic layers. A short accepted lead release can supply intentional legato. Change the demonstrated offending layer first and preserve unaffected phrasing/timbre; compare its actual stem with the accepted baseline. If a repeated figure feels newly mechanical, check changed articulation before deleting a printed response or variation. Reconfirm the reported slider unit and exact source bar before changing form.

Treat added harmony as an arrangement choice, not part of the source score. Check it against both written voices and the entire audible interval, including notes starting between accompaniment attacks. For an arrangement seeking clear consonant doubling, revoice or omit a decorative note that causes an unintended semitone; do not impose a universal ban on passing tones, seconds or dissonance in other styles. Regression-check the actual offending samples or spectral/voice overlap, with an old-failing or controlled-mutation case. Event parity alone misses the defect.

Exercise the production event selection and rendering call sites, not just a new envelope helper in isolation. Prove that removing the production gate, restoring the conflicting event or restoring a fixed-seconds duration makes the regression fail. Wire that regression into the project's normal validation command with its declared dependency environment.

Separate phrase incompatibility from DSP or scheduling defects. Check note-on/off events, ties, releases, overlaps, stem envelopes, accompaniment, fills, reverb tails, clipping and global normalization. If diagnostic stems require instrumentation, modify a scratch generator and first prove it reproduces the shipped audio; never silently patch the live generator just to obtain measurements.

**Listening is a separate gate.** Audition the intro, every changed join, repeated passages, acceleration and ending, plus a continuous run for overall balance. Event parity, MIDI equality, waveform continuity and a green suite do not establish a natural or imperceptible join. If no genuine auditory input is available, say that listening is unverified. Do not claim to have listened because ffplay ran, an audio item was emitted or a silent browser recording exists. A local review preview may be provided with that limitation; do not label audible quality approved.

When the user rejects a join, withdraw that claim and reconsider the cut itself. Do not keep patching the same rejected bridge. Preserve or restore the known complete form while preparing a better trial when appropriate.

## Regenerate and retime as one change

- Keep one authoritative beat-to-seconds map for audio, MIDI, chart, muted playback, seeking and animation. Variable tempo invalidates `beat * constantSPB` song clocks. Cosmetic averages are not scheduling clocks.
- Preserve phase by integrating changing frequency. After cuts, enumerate every oscillator, including independent fixed-period waves and `sin(phase/2)`. Whole cycles of one term may reverse another.
- Re-anchor authored arrangement, yaw, style, rear/crouch envelopes, balloons, finale, camera/crowd probes and regression windows. Keep unwrapped turns continuous. Practice loops may use a separate stable style and must remain independent.
- Check rational beat positions and float-boundary comparisons. Tiny cumulative drift can silently drop chart notes when code compares a modulo with exact zero. Normalize at a justified musical boundary or use exact representation; compare against the intended score, not only a buggy old chart.
- Regenerate through the project's generator, including content hashes. Wait for regeneration to finish before validating outputs. Preserve the original score unless the task explicitly changes it.

## Verify music, gameplay and motion separately

1. Compare retained melody/event order against the source and explicit offsets. Explain any intended additions/restored notes. Check ties, no unexpected overlap and all first/end/finale/balloon anchors.
2. Verify chart nesting, judgment counts, density over sliding windows including seams, holds, simultaneous hits and both inputs. An aggregate count cannot establish the shape of the difficulty curve.
3. Test real seconds through the active tempo map. Continuous beat-space motion can still accelerate harshly. Check actual rig points, multiple frame rates and sub-frame origins around worst steps; compare raw maxima before rounding. Keep established quality thresholds.
4. Run relevant existing tests and required full project checks. Prove a new regression catches the saved defect or a controlled mutation. Do not treat a retimed test still pointing past the ending as coverage.
5. Validate live muted browser playback, seeks, pause/resume, practice, finale and results. Test mobile and desktop. Allow for the application's count-in before claiming the sampled playback crossed the splice. A deterministic frame export bypasses parts of the live clock.

For 3D checks, use the `mulassacat-voxel` skill when relevant. Do not confuse numerical motion bounds with visual acceptance or device frame-rate guarantees.

## Keep rankings and publication separate

A shorter chart changes judgment totals, point ceilings, combo opportunities and sometimes difficulty. Do not normalize old scores by duration alone, silently weaken existing version contracts, relabel short runs as the old version or write production data.

If ranking work is deferred, keep the trial isolated and unpublishable at actual service entrypoints, independent of env/URL flags. Missing credentials and autoplay's publication suppression are insufficient proof. Use synthetic enabled configuration and throwing network/SDK suppliers. Preserve strict old-version checks against a proven full-song fixture; the chart builder must use that fixture's own balloon windows. Test active short gameplay separately. Keep trial records on a separate origin or namespace.

Report exact measured duration, retained/removed phrases, preview URL, checks actually run, listening status and any remaining limits. Distinguish local, committed, pushed and deployed state. Never promise perfection from sampled or purely structural evidence.
