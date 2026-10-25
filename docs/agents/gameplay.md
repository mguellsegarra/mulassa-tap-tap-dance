# Gameplay and chart rules

- Every tap is a melody note. Exceptions: the final hit, and on DIFÍCIL the part-A backbeat PAs where the tune rests.
- **GUA** = left = orange `#FF7A1A` = `don`. **PA** = right = turquoise `#14B8A6` = `ka`. Never swap them.
- **GUAPA!** = both buttons on every level, within 80 ms (FÀCIL: 150 ms); one button alone = ERROR «ELS DOS ALHORA!»; half orange / half turquoise disc, double points.
- **MANTÉN** holds: NORMAL and DIFÍCIL only (the long part-A notes), judged at head and tail.
- Judge windows (`WINDOWS`, progress.js), ± PERFECTE / BÉ / earliest ERROR: FÀCIL 60 / 140 / 180 ms, NORMAL 45 / 110 / 150,
  DIFÍCIL 35 / 90 / 125; the practice uses FÀCIL's. They assume the de-stepped song clock (below); no «expert» level.
- **One song clock** (`audioClock`, audio-clock.js) for drawing, judging and the sync calibration: `ctx.currentTime` de-stepped
  against `performance.now()`, read at the frame's rAF time (lane) or the input event's `timeStamp` (`press`, `letGo`,
  calibration taps); latency latched per run. The lane is drawn through `smoothClock` on top of it (`viewClock`, main.js):
  identical while the audio runs evenly, it eases in the audio device's own few-ms jumps (a 4 px pop of every note
  otherwise); judging keeps the audio clock. `?rawclock` = the old stepped clock (A/B). Never judge or draw on a raw
  `currentTime` read (scheduling sounds on it is fine).
- **Judging rules**: judge on |error| in song seconds and keep the signed error for feedback (early/late); never adapt the windows silently. Every input path (touch, key, gamepad) calls `press(dir, e)` with the real event, so its `timeStamp` reaches `songTime`. The practice's speed scales the clock, not the windows: they stay in song time.
- **GLOBUS** balloons on the drumrolls: every tap on either side counts.
- **FINAL ESBOJARRAT** starts at the last coda phrase (`song.finale`): the festa (fireworks, lights, chant) for everyone; double points and the «x2 PUNTS» tag only while ENCERTS ≥ 70% (`G.finale` / `G.doublePoints`).
- Density targets (notes per 7 s): FÀCIL 6–7 flat; NORMAL 8 → 12; DIFÍCIL 13–15 → 20–25, ~30 only in the finale.
  Harder charts contain the easier ones (`check.mjs` enforces this and much more).
- **Record** = most comparable points per level, device (`beatsRecord`; keys per version: the Mulassa's `record-points-mulassa-v3-<level>`, the Drac's `record-drac-valls-<level>`; the previous dance's keys are only read, as «Rècord del ball anterior» in Perfil, and never compared) and
  server (`submit_result`), as the board ranks; the % only breaks ties. Points: thousands dots, `C.score` lilac (points only). `?repte` stays on %.
- **Ànim de la plaça** (energy/health): starts full, misses drain it, hits refill; empty = the mulassa collapses.
  Tuning lives in `src/game/energy.js` (misses from full to empty: FÀCIL 13, NORMAL 10, DIFÍCIL 8). The practice never drains.
- In-game top HUD (`drawTop`): one row, the pixel mulassa (`mulaPortrait`: leans back and throbs below 35%, hops on a refill) + the ÀNIM bar (health) + the ENCERTS %
  number, no caption (the quality: perfect = 1, good = 0.8; "—" until a note is judged); the 70% goal is only on the results screen.
  Song progress: a ring round the pause button (`drawProgressRing`, hud/top.js; `PROG_T0`/`PROG_T1` bound it, first note → `song.end` on `songTime()`); the «x2 PUNTS» tag sits on the panel's top edge.
- Lane (`lane()`): the band scales with the screen (1.4x phones, up to 2x big desktops); notes scale only as far as the
  chart's closest two notes keep half a diameter clear with >= 0.9 s look-ahead (`NOTE_GAP`, `MIN_LOOK`). Nothing
  is drawn inside the ring but hit words. The streak is the «RATXA» badge (`drawStreak`, `streakBox`, knobs in `STREAK`), from
  5 in a row: inside the band just behind the ring (where notes have passed) when there is room, else (portrait phones)
  above-left of the ring, left of the top panel; clear of the ring at its biggest, a missed GUAPA's reach, the judge word,
  the panel, the progress bar and #pause (tested at its biggest pop). Tiers cream 5 → gold 10 → orange 25 → pink 50 →
  white on a colour-cycling rim 100; each hit pops it a little, milestones (10, 25, 50, 75, then every 50 from 100) pop it
  more with a glow; from 50 it breathes on the beat; a miss sinks and fades it. Only scale and colour move; reduced motion
  = colour only; digits are cached per digit and tier, warmed ahead (`streakWarmups`). Not in the practice. Results say "RATXA". Big celebration words (the post-song
  chant, the practice's combo praise and «A BALLAR!») sit centred between the lane and the pad on portrait phones and
  tablets (`PRAISE_Y`, a bit low on phones: her head is mid-stage); compact practice words, and big ones on landscape
  screens, dodge a GLOBUS hanging under the ring (`dodgeBalloon`). The play camera stays inside the plaça (`insidePlaza`).
