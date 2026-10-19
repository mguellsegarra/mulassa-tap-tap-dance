# Drac music and its time map

The game's Drac song follows the 2018 Sant Joan recording that the Drac's dance is authored from (Ball del Drac de
Valls, El Camp Difusió, https://www.youtube.com/watch?v=pm-lEViiPK0). Its form, its tempo and the map between song
seconds and the recording's seconds were chosen from analysis of that recording's audio. Nobody has listened to the
result yet: everything below is measured, inferred or authored, never "heard".

## Files and commands

- `music/drac-form.json`: the form (bars, labels, tempo knots, events) and the `reference` block (the map's anchors).
- `tools/build_drac.py`: the one generator. It writes `public/music/drac-taiko.{mp3,mid}`, `drac-taiko-ambient.mp3`,
  `music/drac-arrangement.json` and `src/song-drac.json` (beats, chart, balloons, holds, finale, hashed URLs, `ref`,
  `refEnd`).
- `src/game/drac-time.js`: `createDracTime(song)` / `dracTime` read `song.ref` and `song.refEnd`.
- Tests: `tests/drac-form.mjs`, `tests/drac.mjs`, `tests/drac-time.mjs` (`node tests/drac-time.mjs --tables` prints the
  tables below), `tests/drac-audio.py`, `tests/music-form.mjs`.

```
uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido python tools/build_drac.py
```

The arrangement is one constant in `tools/build_drac.py`:

```python
VARIANT = 'festiva'   # or 'austera'
```

Marc chose `festiva` (2026-10-19): the game's current party band on the new form. `austera`
is one soft reed voice that stops at its written note-offs, over a timbal and a bass drum (from the reference trial).
Every run renders the chosen one into `public/music/drac-taiko.mp3` and the other one into
`tmp/audio/drac-taiko-<variant>.{wav,mp3}` (gitignored, never `public/`). The MIDI is the festiva voices in both
cases: it carries the tempo map and the melody. With `austera` no drum doubles the chart taps, which the Mulassa's rule
"the audio plays what the chart asks you to tap" expects; that is part of the choice. Neither is the xeremiers' sound.

## The form

The score's own order, with the D.S. played through bar 51 and E's last phrase once more before the coda:

| Part | Bars | Beats | Label |
| --- | --- | --- | --- |
| Count-in | | 0-11 | intro |
| Pickup | 0 | 11-12 | pickup |
| A | 1-8, 1-7 | 12-42 | A2 |
| B, C, D, E | 9-15, 16-23, 24-39, 40-51 | 42-128 | B, C, D, E |
| D.S. | 6, 7, 9-15 | 128-146 | A3, B3 |
| D.S. | 16-23, 24-39 | 146-194 | C3, D3 |
| D.S. | 40-51, then 48-51 again | 194-226 | E3 (item `t09`: the repeat) |
| Coda | 52-56 | 226-235 | coda, roll at 231, final hit 235 |

235 beats from the start of the count-in to the final hit, 224 from the pickup. The last C rings 7 beats as before,
the hold (bar 21, first C), both GLOBUS (124-128 and the closing roll 231-235), the finale rule (at the roll) and the
12-beat count-in are unchanged.

### Why this form

Evidence, all from `audio-analysis.wav` of the research dossier (scripts and dumps in
`~/.local/share/drac-integration-20261019/music/analysis/`, outside the repo):

1. Tuning. The recording sits 0.43-0.49 of a semitone sharp (`librosa.estimate_tuning` per 30 s window). The dossier's
   chroma was binned at A440, which split every note between two pitch classes: its DTW found transposition 6 for one
   form and 7 for another. With tuned chroma the shift is unambiguous for every candidate (cost 0.50-0.51 against 0.54
   for the next shift).
2. The pulse. A dynamic-programming beat tracker on the 250-8000 Hz onset envelope, with a slowly varying tempo prior
   from windowed autocorrelation, finds a beat every 0.50 s at the start (the high band's peaks at 0.60, 1.14, 1.65,
   2.18 s...). Its beat count agrees with the dossier's independent pulse estimate (`pulse.js`: integrated tempo and
   onset phase) within 0.16 beat at every 4 s from 4 to 96 s. The two methods share the onset envelope, so this is
   consistency, not independent proof. After about 98.5 s the onsets stop agreeing (windowed periodicities jump to
   160-185 BPM), so past that point the pulse is not measured.
3. The long D.S. Taking bar 1's downbeat as tracked beat 12 (0.60 s), the chroma-DTW position of every phrase start
   was compared with the tracked beat count there. The trial form (D.S. through 51) agrees within 2.4 beats at all 12
   landmarks up to 98 s. The alternatives drift: D.S. only to bar 18 (the old game form) by up to 33 beats, D.S. from
   bar 1 by up to 13, an extra D3 phrase by up to 11.
4. The late discrepancy. The pulse reaches about 236 beats at 104.8 s. The trial form's final hit (beat 227) would
   fall near 101.2 s, while the dance spins until 104 s, settles at 104-104.8 s and the recording keeps its pitched
   energy and onsets past 104.8 s. One more 4-bar phrase (8 beats) puts the final hit at 104.67 s, inside the settle.
   The old "coda 2.5 s early" compared the trial's tempo with a DTW whose end was forced to 103 s; against the tracked
   pulse the trial's coda (beat 218) comes 0.65 s early, and its form ends 8 beats short.
5. Which phrase. A DTW on the late segment only (from E3's first bar at 87.96 s to an open end at 100-106.5 s):
   trial 0.6248, the same with the final note held 8 beats longer 0.6251, plus 4 beats of coda 0.6193, any added
   8-beat phrase 0.6125-0.6168 (E3 middle again 0.6125, E3 last again 0.6145, coda 52-53 twice more 0.6152). Control
   phrases that make no musical sense score the same or better (a D phrase 0.5984, a C phrase 0.6070). So the analysis
   supports 8 more beats of melody and cannot tell which 8. E's last phrase (48-51) once more is a musical choice: it
   repeats a phrase whose joins already exist in the score (51 to 48 is 47 to 48; 51 to 52 is the coda's own entry).

Marc's ear must confirm the long D.S., and which four bars the xeremiers add before the coda. The analysis also
leaves open a fermata or a longer roll in the coda.

## Tempo knots

`tempo.knots` in the form (smoothstep between knots, each beat in whole microseconds at its midpoint), least-squares
fitted so the song's beats from bar 1 (beat 12) to beat 219 (98.5 s) land on the tracked pulse:

| Beat | Anchor | BPM |
| --- | --- | --- |
| 0, 12 | count-in, `s01` | 117.0 |
| 42 | `s05` (B) | 122.2 |
| 72 | `s09` (D) | 123.5 |
| 104 | `s13` (E) | 126.4 |
| 132 | `s17` (B3) | 128.2 |
| 162 | `t02` (D3) | 126.8 |
| 186 | `t05` (D3's last phrase) | 126.3 |
| 194 | `t06` (E3) | 139.8 |
| 202 | `t07` | 150.0 |
| 218 | `t09` | 151.5 |
| 226 | `s20` (coda) | 151.5 (authored) |
| 230 | `s21` (long note) | 138.0 (authored, the trial's rit.) |

The first two rows hold the count-in at bar 1's fitted tempo; the fit cannot see before the pickup. Range 117.0-151.5
BPM. The largest step is 2.5 BPM a beat at the jump into the final spins (the tracker shows the band going from about
128 to 140 between 85.8 and 86.7 s) and 5.0 in the coda's rit. Against the raw tracked beats the music is off by
23 ms rms, 68 ms at worst (beat 157). Count-in plus pickup: the pickup note at 5.741 s (it was 5.338 s at 126 BPM).
The final hit is at 110.318 s, the generated files last 113.818 s.

Before this, the game used a hand curve (126, 148 from the D.S., 135 in the coda), and the trial a curve of 121-151
read off coarse onset windows.

## The time map

`reference` in the form: `end: 104.8` and one anchor per sequence item's start (the smoothed tracked pulse there),
plus the video's first frame (beat 10.887, the count-in tempo before the pickup), the pickup (beat 11 at 0.058 s, the
dossier's value), the final hit and the settle (beat 235.306 at 104.8 s). Items `t09`, `s20`, `s21`, the hit and the
settle are past the measured pulse: they keep the music's own clock from `t08` (authored).

`src/song-drac.json` gets `ref: [[songSec, refSec], ...]` (34 anchors, rising in both, song seconds to 4 decimals) and
`refEnd: 104.8`. The compiler (`src/music-form/compile.js`) computes the same in `ref`, `refEnd` and `refAnchors`
(`[[beat, refSec]]`); the generator asserts that its own clock gives the same song seconds.

`game/drac-time.js`: a monotone C1 cubic (drac-path.js's Fritsch-Butland `track` / `at`) through the anchors, with one
padding key past each end so the curve keeps its pace up to them. Before the first anchor `refAt` holds 0 (the
count-in: the Drac waits); after the last it holds 104.8. `songAtRef` inverts it by bracketed Newton (round trip error
1e-11 s). `beatAt` is `beatAtTime(song.beats, t)`, the game's own grid.

Slope (reference seconds per song second) 0.979-1.099. The 1.08-1.10 stretch is the pickup bar: the video's pickup at
0.058 s is 0.553 s before bar 1's downbeat, the count-in's beat is 0.513 s.

### Residuals

Drift = how far the song's own clock (offset at bar 1's downbeat) is from the anchor. The map passes through every
anchor, so this is what it absorbs:

| Anchor | Song s | Ref s | Drift s |
| --- | --- | --- | --- |
| video frame 0 | 5.683 | 0.000 | +0.040 |
| pickup | 5.741 | 0.058 | +0.040 |
| s01 (bar 1) | 6.254 | 0.611 | 0 |
| s05 (B) | 21.308 | 15.642 | +0.023 |
| s07 (C) | 28.169 | 22.515 | +0.011 |
| s09 (D) | 35.960 | 30.308 | +0.009 |
| s13 (E) | 51.327 | 45.663 | +0.021 |
| s16 (A3) | 62.652 | 56.991 | +0.018 |
| s17 (B3) | 64.524 | 58.875 | +0.006 |
| s19 (C3) | 71.089 | 65.437 | +0.009 |
| t01 | 73.915 | 68.223 | +0.049 |
| t02 (D3) | 78.642 | 73.004 | -0.005 |
| t05 | 90.021 | 84.365 | +0.013 |
| t06 (E3) | 93.633 | 87.975 | +0.015 |
| t07 | 96.948 | 91.294 | +0.011 |
| t08 | 100.142 | 94.490 | +0.009 |
| t09 (repeat, authored) | 103.316 | 97.665 | +0.008 |
| s20 (coda, authored) | 106.484 | 100.833 | +0.008 |
| s21 (authored) | 108.144 | 102.493 | +0.008 |
| final hit (authored) | 110.318 | 104.667 | +0.008 |
| settle (authored) | 110.451 | 104.800 | +0.008 |

Every other item is within 0.037 s (`tests/drac-time.mjs` asserts < 0.1 s at all of them).

The dance's phrase boundaries (reference seconds from `src/game/drac-path.js`) against the music: the beat there and
how far its nearest beat is. The boundaries come from a visual audit, not from the beat, so offsets up to half a beat
are expected:

| Milestone | Ref s | Song s | Beat | Nearest beat - milestone |
| --- | --- | --- | --- | --- |
| pickup | 0.058 | 5.741 | 11.00 | 0.000 |
| turn | 16.7 | 22.359 | 44.14 | -0.070 |
| torsions | 19.8 | 25.439 | 50.42 | -0.206 |
| strides | 28.8 | 34.464 | 68.92 | +0.039 |
| second walks | 44.3 | 49.961 | 101.12 | -0.059 |
| prepare | 59 | 64.648 | 132.27 | -0.125 |
| second turn | 60 | 65.640 | 134.38 | -0.181 |
| torsions | 63.4 | 69.027 | 141.61 | +0.180 |
| second arc | 72.8 | 78.440 | 161.57 | +0.204 |
| quickening turns | 86.4 | 92.057 | 190.39 | -0.172 |
| brake | 93.8 | 99.452 | 208.27 | -0.107 |
| six turns CW | 94.8 | 100.452 | 210.78 | +0.088 |
| settle | 104 | 109.651 | 233.47 | -0.203 |
| end | 104.8 | 110.451 | 235.31 | -0.133 |

The audited foot placements (`VERIFIED` in `src/dev/drac-compare/phrases.js`): 32 of 40 arrival windows contain a beat
of the song, none is more than 0.224 s from one. The first walk (0-16 s) steps once a beat, the strides at 29-32 s and
73-76 s once every two beats, on the beat within 0.08 s. The misses are closing steps and partly hidden support moves
(2.05, 6.1, 7.65, 8.0, 9.15, 40.8, 58.3, 58.75 s), mostly 0.07-0.12 s ahead of the beat.

## Observed, measured, authored

- Observed (the audit of the video): the dance's phrases and foot placements, in reference seconds.
- Measured (audio analysis, no listening): the tuning, the pulse to 98.5 s, the phrase positions (chroma DTW), the
  beat counts that chose the form, the tempo the knots are fitted to.
- Inferred: the long D.S. (supported by both measures), that 8 beats are missing late (beat count).
- Authored: which 8 beats (E's last phrase again), the coda's tempo (hold 151.5, rit. to 138), the map past 98.5 s,
  the count-in tempo, the pickup's 0.058 s, the arrangements and their timbres.

## Open points for Marc's ear

- The D.S. through bar 51, and the four bars before the coda: E's last phrase again, its middle phrase, the coda's
  52-53 twice more, or a held note or roll.
- The final bars: whether the band slows into the last note (authored rit.), and where the final hit falls in the
  settle.
- The jump to the final spins: the fit ramps from 126 to 151 over E3's first bars (2.5 BPM a beat at most).
- Festiva or austera, and whether either timbre is acceptable.

## Hashes (sha256, first 16)

| File | Before | After |
| --- | --- | --- |
| `drac-taiko.mp3` | `12dc07e90d3b1160` | `9510cfd5b9c81946` (`?v=9ad84924bc`) |
| `drac-taiko.mid` | `bb1626b4c33e0d4f` | `b21115ad14355d90` |
| `drac-taiko-ambient.mp3` | `de9501e6384eb33e` | unchanged (`?v=2daa666987`) |
| Mulassa (5 files) | | unchanged |

The menu ambience keeps its own 126 BPM (`AMB_BPM`), so it is byte-identical. The austera candidate
`tmp/audio/drac-taiko-austera.mp3` is `5bcfac15c2e0fe7e`.
