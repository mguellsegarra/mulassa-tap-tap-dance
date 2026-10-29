# Drac reference trial

A local, dev-only comparison of the current Drac (music and dance) with a proposal built from the 2018 Sant Joan
recording. Nothing here reaches the game: the game's form, song, audio, dance, feet planner, rig and model are
byte-identical to the trial baseline, and the lab imports no service client.

## Open it

```
npm run dev
# http://localhost:5178/drac-lab.html?mute
```

The reference video is not versioned. Copy it to `public/drac-reference/pm-lEViiPK0.mp4` (gitignored). Without it the
page says so and the rest still works.

The page starts silent. "So" chooses one source at a time: silence, the lab's music, or the video's own sound. With
`?mute` only silence is offered. "Programa" switches between Actual (the game's `song-drac.json` grid and mp3,
`dracPose`, the game's feet) and Proposta (the trial form and dance). Switching keeps the same moment of the video.
"Música" picks the proposal's audio: Austera, Festiva, or the browser's melody synth when the generated files are
missing or belong to another form revision. "Vídeo" either lets the recording run at its own speed from the pickup
(plus an offset in seconds) or makes it follow the DTW phrase anchors. Phrase and observed-window chips seek.

While a choice loads, the old song is already stopped and the play button only sets whether the new one starts once
loaded: "Pausa" cancels a resume the switch carried over, "Reprodueix" asks for it. The obsolete source never
restarts. If two choices overlap, only the latest one's result (its music or its load error) becomes the state.

`window.__dracLab` exposes `state()`, `play()`, `pause()`, `seek(sec)`, `seekBeat(b)`, `select(id, variant)`,
`setSound(mode)`, `setView(view)`, `setVideo(mode, offset)`, `pose()` and a `programmes` summary.

## Commands

```
# candidate music (writes only drac-trial-* files; never runs build_drac.py's main)
uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido python tools/build_drac_trial.py
# trial checks (both are in npm run check)
node tests/drac-trial.mjs
uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido python tests/drac-trial-audio.py
```

## Evidence and hypothesis

Observed in the video (Ball del Drac de Valls, El Camp Difusió, Sant Joan 24 June 2018,
https://www.youtube.com/watch?v=pm-lEViiPK0, 111.934 s): one carrier, a rigid beast, both mouths open, heads, necks,
wings and tail moving with the shell, no active fire. The dance windows in video seconds are listed in
`OBSERVED` (`src/dev/drac-lab/programmes.js`).

Measured, not annotated: the onset tempo estimates (121 BPM at 5-15 s up to about 151 BPM at 92-100 s) and the
chroma-DTW anchors from the research folder.

Hypothesis: the long return. The printed score says "D.S. al Coda" after bar 51 without a visible "To Coda" mark.
The current form jumps from bar 18 to the coda. The trial plays the D.S. through bar 51 and then the coda. Bar 51 is
identical to bar 18, so the join into bar 52 is the same one the current form already uses. DTW cost was .528 for
this form against .571 for the current one. That supports the hypothesis without proving it.

Authored: every tempo knot, every beat a move lands on, distances, angles, turn direction and the count of turns.

## Bar order

| Part | Bars | Beats | Label |
| --- | --- | --- | --- |
| Pickup | 0 | 11-12 | pickup |
| S1 | 1-8 | 12-28 | A2 |
| S2 | 1-7, 9-15 | 28-56 | A2, B |
| S2 | 16-23 | 56-72 | C |
| S2 | 24-39 | 72-104 | D |
| S2 | 40-51 | 104-128 | E |
| D.S. | 6, 7, 9-15 | 128-146 | A3, B3 |
| D.S. | 16-23 | 146-162 | C3 (the current form stops after 18) |
| D.S. | 24-39 | 162-194 | D3 (new) |
| D.S. | 40-51 | 194-218 | E3 (new) |
| Coda | 52-56 | 218-227 | coda, roll at 223, final hit 227 |

Beats 0-152 are note for note the current form. Beats 152-218 repeat the first pass's bars 19-51 (beats 62-128),
including the 21-22 tie. The coda is the current coda shifted by 66 beats. Pitch, transposition (-5), the score file,
the hold and the 12-beat intro are unchanged. Tests assert all of this.

## Tempo and timings

Knots (`music/drac-trial-form.json`, smoothstep between knots, whole microseconds a beat, the same clock as the
game's Drac): 121 at beat 0, 123 at B (42), 125 at D (72), 127 at E (104), 128 at B3 (132), 127 at D3 (162) and at
its last phrase (186), 151 at E3 + 10 (204), 151 at the coda (218), 138 at the last note (222).

The intro is still 12 beats, but at 121 BPM the first note moves from 5.338 s to 5.549 s.

| Section | Beat | Song s | Video s (fixed offset) | DTW anchor | Residual |
| --- | --- | --- | --- | --- | --- |
| pickup | 11 | 5.549 | 0.058 | 0.058 | 0 |
| B | 42 | 20.756 | 15.265 | 15.228 | +0.04 |
| C | 56 | 27.567 | 22.076 | 22.872 | -0.80 |
| D | 72 | 35.273 | 29.782 | 30.437 | -0.66 |
| E | 104 | 50.512 | 45.021 | 44.969 | +0.05 |
| A3 | 128 | 61.813 | 56.322 | 56.521 | -0.20 |
| C3 | 146 | 70.259 | 64.768 | 64.377 | +0.39 |
| D3 | 162 | 77.806 | 72.315 | 73.085 | -0.77 |
| E3 | 194 | 92.820 | 87.329 | 88.720 | -1.39 |
| coda | 218 | 102.505 | 97.014 | 99.498 | -2.48 |
| roll | 223 | 104.603 | 99.112 | 101.936 | -2.82 |

Final hit 106.342 s. Generated files: 109.842 s each.

The late anchors and the onset tempo disagree. Between D3 and the coda the anchors imply about 123-134 BPM, while
the onsets say 143-151. The trial follows the onsets, so it reaches the coda about 2.5 s (roughly three bars at 151)
before the anchor. Either the late anchors are off, the tempo estimate is, or the recording has bars this form
lacks. I can't tell which from these measurements.

## Choreography

`src/dev/drac-lab/trial-dance.js`, table `TRIAL`, keys in beats from each label's start.

| Video s | Beats | Move |
| --- | --- | --- |
| 0-16 | A2 12-42 | Short steps and sway, front on, heading corrections of ±0.07 turn |
| 16-20 | B 43-50 | One turn on the spot |
| 20-30 | C 56-72 | Heading opens and closes, ±0.13 turn |
| 30-43 | D 72-102 | Out to its left, in towards the camera (1.7 m), past it through profile and back, home front on |
| 43-60 | E, A3 | Steps and sway |
| 60-64 | B3 135-142 | One turn on the spot |
| 64-73 | C3 | Sway |
| 73-86 | D3 162-192 | The same walk out and back |
| 86-101 | 192-222 | Five consecutive turns, 5.5 beats each (about 2.2 s at 151 BPM), 7-beat spin-up, 6.5-beat spin-down |
| 101-104 | roll 223-227 | Still, front on |

Whole-body only: weight-shift roll up to 3.5°, a lean into turns up to 6°, a forward lean up to 3° when walking,
a 1.5 cm bob. No rear, crouch, hop, fire, jaw or wing motion, no neck, head or tail waves. Measured over the song:
13.5 m of travel, at most 1.70 m from its spot, 0.75 m/s, 186°/s at the fastest turn, roll 5.6°, pitch 2.8°. The
current dance for comparison: 0.21 m from its spot, roll 42°, pitch 32°, 15.4 cm lift.

The rig is posed through `poseDrac` unchanged, via `poseRigid` (`trial-rig.js`). `poseDrac` counter-rolls the necks
against `roll` and waves the tail with `drive`; the trial routes its lean through `shake` and keeps `drive` out of
the rig. The feet use `makeDracFeet(trialDance, 227)` unchanged.

## What the tests check

`tests/drac-trial.mjs`:

- Form: bar order, note-for-note prefix, repeated D.S. bars and coda, holds, balloons, baseline song and audio
  hashes against `song-drac.json`.
- Clock: strictly rising grid, tempo steps of at most 2.05 BPM a beat (5 in the coda rit.), 121-151 BPM, anchors
  within 0.9 s through D3 and 3 s after, video mapping round trips in both modes.
- Dance: no skipped or out-of-section key, no jump at any seam, no speed jump, seek equals a fresh pose, turn counts
  per window, the walk-out reaches 1.7 m and returns home, still after the end.
- Rig: no part moves on the body; planted soles fixed in the world at 30, 60 and 120 fps, three frame phases, two
  `front` headings; soles at least 3 mm up whenever they travel; steps over 0.6 lift at least 3 cm; shoe and trouser
  boxes apart, left foot left; a foot strays at most as far from under its hip as in the current dance; frame jolt
  under drac-parts.mjs's 0.08 at 60 fps and four phases.
- Lab: import graph limited to the lab, rig, dance, feet, compiler, transport and three.js; the game never reaches the
  lab; the video is local and muted; a fake AudioContext shows the gate starts closed, `?mute` keeps it closed, a
  switch stops the old source before loading, an overtaken fetch is dropped, at most one source ever plays; a pause
  during a load stays paused, play during a load waits for it without restarting the old source, a stale fetch's
  rejection never replaces the winner's state while the winner's own failure is reported; the Pages allowlist rejects
  a trial mp3.
- Candidate metadata, once generated: revision, beat grid and hashes.

Failures seen during development, each caught by these checks: plain `poseDrac` moved part matrices 3654 times in the
rigidity sweep; a first finale with 4.5-beat turns and a short spin-up made the shoes touch (-0.017); 5-beat turns
gave a shoe frame jolt of 0.0823; a key on a label's last beat was reported. `tests/drac-trial-audio.py` probes the reed's note-off with a 0.25 s release and requires the probe to fail.

## Candidate files

| File | sha256 (first 16) | URL version |
| --- | --- | --- |
| `public/music/drac-trial-v1-austera.mp3` | `7ec53148cf5be6d4` | `?v=e2b58b4155` |
| `public/music/drac-trial-v1-festiu.mp3` | `c8e3c2181479c261` | `?v=e688b4aa9c` |
| `public/music/drac-trial-v1.json` | `c35077eb8e4ba50f` | form revision `169f64b2a7f7…` |

Also `tmp/audio/drac-trial-v1-{austera,festiu}.wav` (ignored). The baseline files keep the trial-baseline hashes:
`drac-taiko.mp3` `12dc07e90d3b1160`, `drac-taiko-ambient.mp3` `de9501e6384eb33e`, `drac-taiko.mid`
`bb1626b4c33e0d4f`, and the Mulassa files likewise.

## Browser and file validation (independent review, 2026-10-18)

Verified locally, before the load/pause clock fix above:

- Both variants generated with `tools/build_drac_trial.py`; ffprobe 109.841882 s each. All 8 baseline audio, MIDI and
  WAV files byte-identical.
- `drac-lab.html?mute` at 375x667 and 1280x800: no overflow; the video reached readyState 4, muted.
- Switching between Actual and Proposta kept the reference video's position.
- Live proposal playback through the acceleration: beats 186 to 205, 127 to 151 BPM, the video within 0.03 s.
- The natural end (109.841875 s) paused both the video and the transport.

Two clock defects found in that review (an explicit pause during a load was undone when the load finished; a stale
fetch's rejection overwrote the winning selection's error) are fixed and covered in `tests/drac-trial.mjs`.

A later check found 393x852 with no overflow and the model in frame. At 852x393 the panes stacked (the only
two-column rule was `min-width: 900px`), so the video filled the screen and the model sat below it. `lab.css` now also
puts them side by side at `min-width: 600px` in landscape; portrait phones still stack, desktop is unchanged. That
fix was then verified at 852x393 and 667x375: both panes are visible together without horizontal overflow.
Frontal, lateral and top views were inspected; captures are in the research folder under `trial-validation/`.
The browser console had no warnings or errors. The independent load/pause reproduction now stays paused and a
stale rejection leaves the current error null. Listening remains unverified.

## Limits

- Listening is unverified: the candidate audio was generated and checked structurally, not auditioned. Festiva is the
  game's arrangement on the new form. Austera is one synthetic reed voice plus timbal and bass drum. Neither is the
  xeremiers' sound.
- The long return, the tempo map and the turn count are hypotheses or adaptations, and the late tempo disagrees with
  the late anchors.
- The worst shoe frame jolt is 0.0766 against the 0.08 limit, at the start of the second walk-out. Faster or
  longer strides would need the feet planner revisited, not a looser limit.
- The lab's "Al seu ritme" mode keeps a fixed offset, so the current programme drifts against the video (126 BPM
  against 121-128). "Per frases" follows the DTW anchors and inherits their noise. The video resyncs by seeking when
  it is more than 0.25 s off while playing.
- `npm run build:pages` rejects the trial mp3s if they are still in `public/music` (`tools/deploy/prepare-pages.mjs`
  allowlist). That keeps them unpublished, but they have to be removed or integrated before a deploy build.
- Framing was checked numerically (both dances' bounding boxes stay inside each 16:9 view, at most 0.87 of the
  half-frame). The browser checks above also cover phone portrait/landscape layouts and the three camera views.
  Device performance has not been benchmarked.
