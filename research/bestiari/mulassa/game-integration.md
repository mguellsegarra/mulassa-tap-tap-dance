# Mulassa · game integration of the 2017 reconstruction

2026-10-19, branch `t3/character-select-v1-2-0`, local only (no commit, push or deployment). This integrates the
accepted comparison proposal (`simple-carriers-v3.md`, `camera-seam-89s.md`) into the real game and the free viewer,
with a new tempo map for the music and a Mulassa colla. It records what is observed, what is inferred and what is a
new artistic adaptation. Validation results are in `validation.md` (section «Game integration»).

## Revision: figures instead of the trace (2026-10-19, later)

Marc's review: the traced path read as erratic (in 82 s she set off 28 times, reversed her travel 13 times and her turn
9 times: the reconstruction's small drifts) and dull. The game now dances FIGURES on the song's beats
(`src/game/mula-figures.js`), an ARTISTIC ADAPTATION styled on the 2017 source, not a trace of it:

| Beats | Section | Figure |
| --- | --- | --- |
| 16–80 | A1 | four runs of 16 beats, to W, E, N and S: out 1.5 m, front up, half turn (pivot 0.4 m ahead: the rear sweeps, as measured in the 2017 half turns, 0.35–0.56 m), home with a hop; ends facing W |
| 80–112 | A2 | out to W, a quarter turn, one whole circle of 1.5 m round the middle, a head shake |
| 112–144 | A2 | the passada across to E (two hops), half turn, home; faces the lens for the drumroll, trembles, rears up |
| 144–176 | B | eight culades about her head (0.6 m ahead stays put): four back and forth, four the same way; a rear kick at each end |
| 176–204 | C | a charge at S with a skid and a backing-off, the reversal, a charge through the middle at N, the reversal back, home |
| 204–228 | X, roll | 2.75 turns on the spot (the 2017 «voltes seguides» turn about her centre), faster and faster, hops, braking onto W with the front up at the final hit |

Joins are eased (a 0.35-beat Gaussian), so she does not stop and start between figures: 13 departures in the song.
Second review (Marc, same day): «more comic and faster»: A1 became four shorter runs instead of two with long pauses,
and the kicks, skids, tremble, head shakes and hops are bigger (X hops on every beat).
Peaks (with the gentler 164 BPM music): turns 184 °/s (the culades and the spin), travel 1.89 m/s (the charges). The sway, FESTA, the shoes and the
compass are as below; the 80 % travel scale and the reference tilt cues no longer apply to the game. The plaça answers:
the attendants raise their arms and hop at each culada end, each skid, the final hit and a big hit, and the crowd's
groove gets a big kick at the same moments (balloons at the «eeeh!» were tried and removed, Marc 2026-10-20). The sections below describe the superseded
trace-led version; its time map still drives the comparator's video.

## One clock

Music, chart, steps and animation read the song's seconds (`src/song.json`: `beats`, `notes`, `ref`). The only bridge
to the video is the time map `src/game/mula-time.js`:

1. The music form (`music/mulassa-form.json`) carries a `reference` block: phrase positions tied to dance landmarks
   of the 2017 source (D53pgXOeIL0). `tools/build_taiko.py` writes them as `song.ref` [[songSec, refSec]] on its own
   audio clock (asserted).
2. Inside each pair of anchors the song time is shared out by what the reference does there (`NEED`,
   `src/game/mula-dance.js`): turning, travel and the tilt cues take their time; swaying in place goes by quickly. This
   keeps turns and reversals at a readable speed instead of a uniform stretch.
3. The rate is eased over ±0.4 s of song time, so a phrase change never jolts a turn.

The sway is not taken from the video's own cycles: its phase runs on the song's beat grid (a lean every 4 beats in A,
every 2 from B), its size from the reference envelope. The 2017 recording is about 166 s and the game song about
87 s; no global factor is applied anywhere. The comparator's «Joc nou» mode plays the new song as the clock and drives
the video through this map (seek when paused, playback rate = map rate while playing).

## Anchors and resulting phases

Form anchors (beat → reference s): pickup 12 → 0; s2 48 → 35.5; s3 80 → 69.5; s4+8 120 → 86; s4+24 136 → 110;
end of s15 224 → 161.3; +10 beats 234 → 166.2. These pairings are ARTISTIC ADAPTATION, chosen so the half turns close
phrases, the livelier advance falls in A2, the rear turn and tilts in B, the reversals at C's start and the four turns
through C and the frenzy into the roll. They are not a musical alignment with the grallers in the video: automatic
pitch/chroma analysis of the 2017 audio was attempted and was not reliable (crowd noise, detuned grallas), and no manual
listening annotation exists.

| Phase (choreography.json) | Video s | Song s | Beats | Video s per song s |
| --- | --- | --- | --- | --- |
| 1. Petites passes i canvi de pes | 0–10.5 | 4.4–8.6 | 11–22 | 2.52 |
| 2. Es desplaça i torna | 10.5–21 | 8.6–12.4 | 22–31 | 2.78 |
| 3. Acaba el retorn i aixeca el davant | 21–31.7 | 12.4–16.4 | 31–41 | 2.69 |
| 4. Primera mitja volta | 31.7–35.5 | 16.4–19.0 | 41–48 | 1.42 |
| 5. Balanceig a l'altre costat | 35.5–46 | 19.0–22.3 | 48–56 | 3.20 |
| 6. Repetició del balanceig | 46–56.5 | 22.3–25.6 | 56–65 | 3.22 |
| 7. Prepara el retorn | 56.5–66.5 | 25.6–28.8 | 65–73 | 3.15 |
| 8. Segona mitja volta | 66.5–69.5 | 28.8–31.6 | 73–80 | 1.04 |
| 9. S'acosta amb més moviment | 69.5–76.5 | 31.6–37.0 | 80–94 | 1.30 |
| 10. Passada i gir cap a la dreta | 76.5–86 | 37.0–47.0 | 94–120 | 0.96 |
| 11. S'allunya i baixa el ritme del cos | 86–97 | 47.0–50.1 | 120–128 | 3.46 |
| 12. Balanceig més recollit | 97–110 | 50.1–53.3 | 128–136 | 4.18 |
| 13. Prepara la part final | 110–121 | 53.3–57.9 | 136–148 | 2.38 |
| 14. Mitja volta pel darrere | 121–124 | 57.9–59.5 | 148–152 | 1.85 |
| 15. Inclinacions grans de cara | 124–131 | 59.5–63.8 | 152–164 | 1.62 |
| 16. Volta amb inclinacions | 131–138 | 63.8–68.1 | 164–176 | 1.63 |
| 17. Canvia el sentit | 138–142.5 | 68.1–70.5 | 176–182 | 1.90 |
| 18. Torna a invertir el gir | 142.5–145.5 | 70.5–72.1 | 182–187 | 1.86 |
| 19. Voltes seguides | 145.5–161.3 | 72.1–85.5 | 187–224 | 1.18 |
| 20. Frenada i final | 161.3–166.2 | 85.5–89.4 | 224–234 | 1.26 |

Consequences: the swaying blocks are told 2.5–4× faster than the video (their sway is the music's, not sped up), turns
1.0–1.9×. Peak turning about 140–171 °/s (the reversals are the fastest), peak travel about 1.5 m/s.

## Tempo map (music)

Melody, harmony, instruments and form are unchanged (same 228 beats, same notes, same judgments per level). Tempo,
`drac-midpoint-us` clock with smoothstep ramps of two beats before each phrase: intro + A1 152 (the menu loop's tempo,
as before), A2 154, a short ease back to 152 over the long held note and the pre-B drumroll, B 158, C 161, X (FINAL
ESBOJARRAT) 164 (Marc asked for a gentler rise than the first 170), then a broadening back to 152 over the last melodic beats into the closing roll and the final hit.
The percussion leans in by +5/10/15 % in B/C/X (no new instruments). Final hit 88.2 s (was 90.10).

The two drumrolls keep their old duration on purpose: the balloon tap counts feed the score calibration anchors and the
server's ceilings (`score-scale.js`, the 202610160001 migration). With them at 152 every reference score, judgment
count, ceiling and extras limit is identical to the current `mulassa-v2-short` contracts, so no database change is
needed. A faster chart is still somewhat harder at B–X; whether that deserves a new score version is Marc's decision.

## Figure, carriers and steps

- Model: `buildMulassa()` unchanged except that its old animated legs are removed; the eight shoes and trouser cuffs of
  the four carriers are `src/scene/mula-carriers.js` (two instanced meshes), the accepted simple-carriers-v3 rig.
- The song's shoes are planned in SONG seconds (`planSupports` over the song pose): seek, pause and restart show the
  same shoes, and faster phrases step faster. Everything off the song (selector walk, practice, results, the free
  viewer) steps live under the actual shell (`createStepper`): same trigger, swing and landing rules, landing a little
  ahead of the measured motion. A jump carries the shoes rigidly; above 5 rad/s (photo culada) the shoes turn with the
  shell and step again when it slows.
- Body roll keeps the approved +15 % and the 12 % head roll. FESTA (adaptation) adds +5/10/15/18 % sway in A2/B/C/X,
  eased over two beats, with a small weight shift towards the lean, fading out in the last seconds. `?festiu=0` shows
  the reference amplitudes only.
- Travel is 80 % of the reconstruction's inferred metres (GAME ADAPTATION, `TRAVEL`): at full size the advance came
  about 3 m at a phone's play camera, which already stands at the plaça's edge. Shape, headings and turns are unchanged.
  The comparator's «Reconstrucció» mode still shows 100 %.

## Plaça placement, compass and colla

- The dance frame turns so the play camera looks between W and S: she opens three-quarter on (W 45° off the lens)
  and the first half turn passes S, facing the lens, as it faces the 2017 camera. The frame centre (the centre of the
  smallest circle around the whole song's footprint, radius 4.98 m) is the plaça's centre.
- Four attendants at 5.5 m on W/N/S/E facing the dance (W, the closest, stays 0.9 m clear of the swept footprint) and
  0/3/5/7 seated members by quality at ~6.1 m in the three gaps away from the camera; the crowd keeps beyond 6.7 m while
  her colla is out. GAME ADAPTATION: the carriers are under the beast; the sources do not establish four exterior
  stations. Clothes follow `helpers-design.md` (pale blue shirts, rolled sleeves, very dark trousers, broad dark /
  green / striped sashes, rope-soled dark espadrilles, an optional pale neck cloth; no insignia).
- The colla is hidden in photo mode and on the two-figure splash (as the Drac's); `?lletres` shows the marks.
- Play camera: the Drac's calm follow (no heading follow); for her: full sideways follow, and towards the lens only as far
  as the square lets the camera back away (`MULA_CAM.room`).

## Not established / pending

Musical phrase alignment with the 2017 grallers, exact footfalls, metric travel, the exact number and duties of
exterior attendants, insignia. No listening sign-off of the new music and no physical-device test (browser emulation
only). See `validation.md`.
