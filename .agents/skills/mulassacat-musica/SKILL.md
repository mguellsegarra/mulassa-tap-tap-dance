---
name: mulassacat-musica
description: "Mulassa project only. Take a festive figure's music from its source (score PDF, recordings) to the game's song and chart, and review, shorten or fix an existing arrangement. Use for a new figure's song, wrong-sounding notes, score fidelity, phrase cuts, intros and count-ins, tempo ramps, chart/audio drift, mobile mix and duration checks (Mulassa, Drac, Bou)."
---

# Music for a figure

Apply only to Mulassa and its checkouts. For a whole new figure, start from `mulassacat-nova-figura`; this skill owns phase 2 (music) and the music side of phase 3 (chart). It does not authorize publication, Git history operations or ranking migrations.

Read [polish and cuts](references/polish-and-cuts.md) before shortening, splicing or diagnosing a note, and [the Drac and Mulassa casebook](references/drac-mulassa.md) and [the Bou casebook](references/bou.md) when the symptom matches. `music/README.md` (Catalan) holds the game's musical rules; `src/music-form/CONTRACT.md` the form editor's contract.

## Where each song is made

| Song | Source | Generator | Game files |
| --- | --- | --- | --- |
| Mulassa | `music/mulassa/score.json`, `music/mulassa/mulassa-form.json` | `tools/music/build_taiko.py` | `src/song-mulassa.json`, `public/music/mulassa-taiko*` |
| Drac | `music/drac/drac-score.json`, `music/drac/drac-form.json` | `tools/music/build_drac.py` | `src/song-drac.json`, `public/music/drac-taiko*` |
| Bou | `music/bou-tradicional/` (PDF, `score.json`, `timing.json`, approval) | `tools/music/build_bou_mobile.py`, `tools/music/build_bou_chart.mjs` | `src/song-bou.json`, `public/music/bou-tradicional-v14-mobile.mp3` |

Generated JSON and audio are outputs: regenerate, never hand-edit. Audio must stay bit-identical when the task is not about music (`shasum public/music/*` before and after). The form editor (`tools/dev/editor.html`, `src/music-form/`) knows the songs listed in `src/music-form/songs.js`; a new figure adds one row there. `tools/dev/notes.html` plays the Bou's audio with the score's note sounding, per voice, so the owner can point at one.

## From source to song

1. **Find the score before transcribing by ear.** "Not found" is not "does not exist": the Drac's score turned up later (Grallers d'Alfés), the Bou's came from the owner as a PDF. Ask the owning colla or association (UAF) when nothing is public. Record title, composer, edition, voices and transposing instruments.
2. **With a score, use only the score.** Recordings then serve for tempo, form and what is actually played live. A printed note that sounds wrong against every recording may be an engraving error (the Bou's bar 12 missing natural): show the evidence, correct `score.json` with a note, and keep the original PDF untouched.
3. **Without a score**, filter and isolate the lead (the gralla) from several recordings, compare them to remove artefacts, and look for proven note-extraction software before guessing. Mark uncertain bars. Do not invent a melody to fill a gap.
4. **Make a plain reference melody first** (MIDI, no ornaments) and check notes, octaves, rests, pickups, repeats and form against two performances. Keep a tempo map per phrase; louder or busier is not faster (firecrackers fooled the Drac's beat detection).
5. **Serve a listening preview to the phone** (a small HTML page on the LAN address) at every step the owner must hear. State plainly that you could not listen if you could not.

## House style (what the owner accepts)

- Festive, warm, never shrill: no gralla timbre, no square-wave buzz. Taiko-style percussion carries the beat; the lead doubles what the player taps.
- **The lead uses the same instrument as the Mulassa's and the Drac's.** Second voices sit clearly lower in the mix; the owner asks for them quieter almost every round.
- **Count-in and intro like the others:** the shared count (LEAD, 3 2 1, BALLA!) and the figure's own short intro after it; the first melody note lands at about the same time after the count as on the other figures. Do not stack two intros.
- **Build energy, do not start at full power:** a techno kick may enter part-way and lift the final section, but a kick from the first bar sounds monotonous. Check that the kick is audible on phone speakers.
- **Endings:** an ascending close on the same instrument, a simple fade on the last note, a festive drum roll before it. No special effect on the final note, nothing that rings for seconds (the owner reported tinnitus).
- **Duration:** about 90–120 s. Cut by complete repeated phrases where the join is not audible; keep the opening phrases identical to the source. Give the owner an HTML with several shortened versions and a phrase selector grouping identical phrases, and let them choose: "the phrases come out lame" when an agent cuts alone.
- The faithful version and the festive adaptation are two labelled things. Never credit generated accompaniment to the composer.

## Chart and game words

- Every tap is a melody note; harder levels contain the easier ones; check density per level against the targets in `docs/agents/gameplay.md` and compare with the version on `main` when the tempo or form changes.
- Each figure has its own pair of button words and final chant (GUA·PA·GUAPA for the Mulassa, CRE·MA for the Drac, BRA·MA for the Bou). Research the figure's history and colla for them; keep them in Catalan in every language. The final chant lands on the song's climax, not on a quiet tail.
- Each figure has its own drumroll element (balloons, carretilles, esquellot) and its own help text; nothing in the chart or HUD may assume the Mulassa.

## Before saying it is done

Run the generator, the chart checks (`check.mjs`, `tests/figures/bou/bou-chart.mjs`, `tests/figures/drac/drac.mjs`, `tests/figures/drac/drac-audio.py` as relevant) and `npm run check`. Measure the served file with [scripts/measure_audio.py](scripts/measure_audio.py). Audit the game's notes against the score bar by bar when the owner doubts one. Report duration, retained phrases, the preview URL, what was listened to and by whom, and what is still unverified.
