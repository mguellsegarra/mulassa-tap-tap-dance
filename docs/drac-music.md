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

The score's own order, with the D.S. played through bar 51, then the coda. Its last note is held past its written
length, over the closing roll, until the dance settles:

| Part | Bars | Beats | Label |
| --- | --- | --- | --- |
| Count-in | | 0-11 | intro |
| Pickup | 0 | 11-12 | pickup |
| A | 1-8, 1-7 | 12-42 | A2 |
| B, C, D, E | 9-15, 16-23, 24-39, 40-51 | 42-128 | B, C, D, E |
| D.S. | 6, 7, 9-15 | 128-146 | A3, B3 |
| D.S. | 16-23, 24-39 | 146-194 | C3, D3 |
| D.S. | 40-51 | 194-218 | E3 |
| Coda | 52-56 | 218-233 | coda; the last C from 222, held 11 beats (written 5); roll 225-233, final hit 233 |

233 beats from the start of the count-in to the final hit, 222 from the pickup. The last C is held 6 beats past its
written 5 and rings 2 more past the hit (`noteDurations`: 13). The closing roll and its GLOBUS last 8 beats (were 4),
the finale (FINAL ESBOJARRAT) starts with the roll. The hold (bar 21, first C), the mid-song GLOBUS (124-128) and the
12-beat count-in are unchanged.

Round 1 (2026-10-19 morning) played E's last phrase (48-51) twice before the coda (item `t09`) to fill 8 beats the
tracked pulse counted in the recording. Marc knows the dance and said the original has no such repeat. It is gone; the
recording's late seconds go to the held last note instead (below, point 5).

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
4. The late tempo is a real 150, not a subdivision (round 2, `r2/analysis/late2.py`). In 4 s windows from 88 to
   98 s the onset autocorrelation of every band peaks at 150-152 BPM and at its half, 74-76 BPM (the bar), the low
   40-250 Hz drum band included (75.4 at 0.24, 149.8 at 0.20 for 90-94 s). A true 125 BPM beat counted twice would
   show 125 / 62.5 there; it does not. The chroma DTW of the score's own order from D3's last phrase (beat 186,
   84.36 s) agrees: bars 42 to 51 take 7.20 s for 18 beats (150 BPM), the tracker 7.18 s.
5. The dossier's late anchors (coda 99.50 s, roll 101.94 s) came from chroma binned at A440 with the recording 0.45
   semitone sharp. To reach them E3 would have to run at about 125-135 BPM, against point 4. Rejected. With the pulse,
   the score's order reaches the coda (beat 218) at 97.66 s and the last note (bar 54) at about 99.3 s. After about
   98.5-99 s no band has a stable period (peaks of 0.07-0.15 wandering between 94 and 191 BPM), the chroma shows no
   melody line, and the level stays at -24 to -26 dB until about 106.5 s (it drops at 107). The open-end DTW of the
   score's order has two minima, the hit at 99.45 s (0.6032, the band still at 150) or at 104.5-105 s (0.6064-0.6075):
   it cannot tell a held note from no music. So something with no pulse and no new melody fills about 99.3-104 s
   while the dance spins six times and settles: read here as the last note held over a roll, a fermata. Round 1's
   reading (8 more beats of melody: any 4-bar phrase scored 0.6125-0.6168, control phrases the same or better) gave no
   evidence for a particular phrase either.
6. The ending, three ways (dev mp3s, below): A, the last C held 6 more beats over an 8-beat roll with a rit. to 117,
   hit at ref 104.236 s (in the game); B, no added beats, the whole gap taken by the tempo: 151.5 at the coda to 45
   at the hit (smoothstep), hit at ref 104.17 s, the last beats about 1.3 s each; C, round 1's repeated phrase. B
   slows the music to a crawl under the fastest spins of the dance; A keeps the measured 150 through every spin and
   only broadens over the held note.

Marc's ear must confirm the long D.S. and the ending: the held last note over the roll, how long, and whether the
band broadens into the hit.

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
| 218 | `s20` (coda) | 151.5 |
| 222 | `s21` (the last C) | 150.0 (authored) |
| 233 | `s21` + 11 (the final hit) | 117.0 (authored: the rit. under the held note) |

The first two rows hold the count-in at bar 1's fitted tempo; the fit cannot see before the pickup. Range 117.0-151.5
BPM. The largest step is 2.5 BPM a beat at the jump into the final spins (the tracker shows the band going from about
128 to 140 between 85.8 and 86.7 s) and 4.5 in the rit. under the held note. Beats 0-218 are the round-1 fit,
unchanged (removing the repeat left E3 on the same beats). Against the raw tracked beats the music is off by 23 ms rms,
68 ms at worst (beat 157). Count-in plus pickup: the pickup note at 5.741 s (it was 5.338 s at 126 BPM). The final hit
is at 109.889 s, the generated files last 113.389 s.

Before this, the game used a hand curve (126, 148 from the D.S., 135 in the coda), and the trial a curve of 121-151
read off coarse onset windows.

## The time map

`reference` in the form: `end: 104.8` and one anchor per sequence item's start (the smoothed tracked pulse there),
plus the video's first frame (beat 10.887, the count-in tempo before the pickup), the pickup (beat 11 at 0.058 s, the
dossier's value), the final hit and the settle (beat 234.1, `s21` + 12.1, at 104.8 s). `s20` (the coda) is the
tracked beat 218 (97.663 s, the last measured anchor); `s21`, the hit and the settle are past the measured pulse:
they keep the music's own clock from `s20` (authored).

`src/song-drac.json` gets `ref: [[songSec, refSec], ...]` (33 anchors, rising in both, song seconds to 4 decimals) and
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
| s20 (coda) | 103.316 | 97.663 | +0.010 |
| s21 (the last C, authored) | 104.908 | 99.255 | +0.010 |
| final hit (authored) | 109.889 | 104.236 | +0.010 |
| settle (authored) | 110.453 | 104.800 | +0.010 |

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
| settle | 104 | 109.653 | 232.54 | +0.236 (the final hit, 233) |
| end | 104.8 | 110.453 | 234.10 | -0.564 (the final hit, 233) |

The audited foot placements (`VERIFIED` in `src/dev/drac-compare/phrases.js`): 32 of 40 arrival windows contain a beat
of the song, none is more than 0.224 s from one. The first walk (0-16 s) steps once a beat, the strides at 29-32 s and
73-76 s once every two beats, on the beat within 0.08 s. The misses are closing steps and partly hidden support moves
(2.05, 6.1, 7.65, 8.0, 9.15, 40.8, 58.3, 58.75 s), mostly 0.07-0.12 s ahead of the beat.

## Observed, measured, authored

- Observed (the audit of the video): the dance's phrases and foot placements, in reference seconds.
- Measured (audio analysis, no listening): the tuning, the pulse to 98.5 s (150 BPM late, the bar at 75), the phrase
  positions (chroma DTW), the beat counts that chose the form, the tempo the knots are fitted to, that no band keeps
  a pulse after about 99 s while the level holds until about 106.5 s.
- Inferred: the long D.S. (supported by both measures), that the time between the last note's entry (about 99.3 s)
  and the settle has no new melody.
- Authored: the held last note (6 beats past its written 5) and its 8-beat roll, the rit. to 117, the map past
  97.66 s, the count-in tempo, the pickup's 0.058 s, the arrangements and their timbres.
- Marc (2026-10-19): no repeated phrase before the coda; more GUAPA on DIFÍCIL.

## DIFÍCIL GUAPAs (round 2)

Marc asked for more GUAPA (both buttons; the Drac's word is CREMA) on DIFÍCIL, where there already are some. The
chart format has one GUAPA flag per note on every level that has the note, so a DIFÍCIL-only GUAPA has to be a
DIFÍCIL-only (level 2) note. `tools/build_drac.py` (`HARD_BIG`): from the D.S. on, in every phrase item that opens on
a GUAPA, the eighth falling from the phrase's highest note is a GUAPA too, when it is a level-2 eighth:

| Beat | Item, label | Note (sounding) | Its peak |
| --- | --- | --- | --- |
| 131.5 | `s16`, A3 (bars 6-7) | A4, an eighth | B4 at 131 |
| 149.5 | `s19`, C3 (bars 16-18) | B4 | D5 at 149 |
| 199.5 | `t06`, E3 (bars 40-43) | B4 | D5 at 199 |
| 219.5 | `s20`, coda (bars 52-53) | B4 | C5 at 219 |

D3's first phrase (`t02`) opens on a GUAPA too, but the note after its peak is a NORMAL note: no DIFÍCIL-only
eighth there. GUAPAs per level: before 13 / 13 / 13 (one of them on the removed repeat's first note), now
12 / 12 / 16, inside the 10-16 a level that check.mjs and tests/drac.mjs ask for. Notes per level: 110 / 207 / 288 before,
106 / 199 / 276 now (the repeat's 8 beats are gone). The audio does not change with them: no crash or taiko is added
for a DIFÍCIL-only note. A GUAPA on a FÀCIL or NORMAL note but only on DIFÍCIL (on a downbeat, say) would need the
chart format to carry the level from which a note is a GUAPA (`game/chart.js`, `makeDanceChart`).

## Dev auditions (round 2)

Outside the repo, in `~/.local/share/drac-integration-20261019/music/r2/` (festiva, 160 kbit/s; the analysis scripts
and dumps in `analysis/`):

- `A-integrated-held-final-note.mp3`: the game's, the same bytes as `public/music/drac-taiko.mp3`.
- `B-tempo-only-ritardando.mp3`: no added beats, the coda slows from 151.5 to 45 (hit at ref 104.17 s).
- `C-old-with-repeat.mp3`: round 1, E's last phrase twice (the same bytes as round 1's game file).

## Marc's choice (round 2)

Marc listened to A in the game and accepted it (2026-10-19): "la música de la versió A em va bé, és la bona". A is
the game's song; B and C stay as dev auditions only.

## Open points for Marc's ear

- The D.S. through bar 51 (measured, never heard).
- The ending: the last C held over the roll (about 5 s from its entry to the hit), the band broadening into the hit
  (rit. 150 to 117), and where the hit falls in the settle (ref 104.24 s). Or B's slower coda, or a shorter hold.
- The jump to the final spins: the fit ramps from 126 to 151 over E3's first bars (2.5 BPM a beat at most).
- The four DIFÍCIL-only GUAPAs, on the falling eighth after each peak.
- Festiva or austera, and whether either timbre is acceptable.

## Hashes (sha256, first 16)

| File | Before round 1 | Round 1 | Round 2 |
| --- | --- | --- | --- |
| `drac-taiko.mp3` | `12dc07e90d3b1160` | `9510cfd5b9c81946` | `df5ac41aa4b174ac` (`?v=4c459a108f`) |
| `drac-taiko.mid` | `bb1626b4c33e0d4f` | `b21115ad14355d90` | `be31b7d6e460c0f4` |
| `drac-taiko-ambient.mp3` | `de9501e6384eb33e` | unchanged | unchanged (`?v=2daa666987`) |
| Mulassa (5 files) | | unchanged | unchanged |

The menu ambience keeps its own 126 BPM (`AMB_BPM`), so it is byte-identical. The austera candidate
`tmp/audio/drac-taiko-austera.mp3` is `3ab08ac92a2dfabf`.
