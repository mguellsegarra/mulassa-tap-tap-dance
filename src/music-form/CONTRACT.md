# Music form contract (dev music editor)

One file per song, `music/<song>-form.json`, holds every arranging decision Marc makes: which phrases of the original,
in which order, labels, scale, tempo, intro, balloons, holds, ending. The generators (`tools/build_taiko.py`,
`tools/build_drac.py`) and the editor (`editor.html`, dev only) read the SAME compiled timeline, produced by ONE
browser-safe JS compiler (`src/music-form/compile.js`). Python gets it through `node tools/compile-music-form.mjs <song>`
(prints the timeline JSON on stdout). Instruments, voicings, harmony tables, accompaniment patterns and automatic
chart selection stay in Python.

Songs: `mulassa` (score `music/score.json`, form `music/mulassa-form.json`) and `drac` (`music/drac-score.json`,
`music/drac-form.json`). Song ids are an allowlist in `src/music-form/songs.js`; a new character adds one row there.

## Form (`version: 1`)

```jsonc
{
  "version": 1,
  "song": "drac",
  "labels": ["intro", "pickup", "A2", "B", "...", "coda", "roll"], // allowed style ids (the dance's STYLE keys)
  "source": {
    "score": "drac-score.json",           // relative to music/
    "transpose": -5,                       // semitones applied to every score pitch
    "beatsPerBar": 2,
    // the ORIGINAL as played, repeats / D.S. written out once by hand (no repeat-notation interpreter):
    "unfolded": [{ "id": "u001", "bar": 0, "section": "A" }, { "id": "u002", "bar": 1, "section": "A" }],
    "ties": [[21, 22], [54, 55], [55, 56]] // [fromBar, toBar]: tie only when the two occurrences are adjacent
  },
  "phrases": [ // Marc's phrases on the original; bars reference unfolded ids, in order
    { "id": "p-a", "name": "A, primera frase", "bars": ["u002", "u003", "u004", "u005"] }
  ],
  "sequence": [ // the song in use, in order
    {
      "id": "s1", "phrase": "p-a", "label": "A2",
      "repeat": 1,          // times played (>= 1); repeats get iteration 0..repeat-1
      "beatScale": 1,       // 2 = every duration doubled (shown as x½ speed), 0.5 = x2 speed
      "bars": null,         // optional: item-local list of unfolded ids overriding the phrase's bars (single-bar edits)
      "barOverrides": {}    // unfoldedId -> { "notes"?: "C5:4 R:3 E5:0.5 E5:0.5", "beatScale"?: 1 }
    }
  ],
  "intro": { "beats": 12, "pickup": { "bar": "u001", "beatScale": 1, "label": "pickup" } }, // pickup ends where the sequence starts
  "tempo": {
    "clock": "drac-midpoint-us",    // or "constant-exact" (mulassa today)
    "interpolation": "smoothstep",
    "leadIn": 0.1,                  // seconds of audio before beat 0
    "knots": [{ "at": { "beat": 0 }, "bpm": 126 }]  // any anchor (below)
  },
  "events": {
    "balloons": [{ "id": "g1", "start": { "beat": 191 }, "end": { "beat": 195 } }],   // whole beats for now
    "holds": [{ "id": "h1", "start": { "item": "s3", "iteration": 0, "bar": "u022", "note": 0 }, "end": { "beat": 53 }, "kind": "don" }],
    "fills": [],                    // song-specific accompaniment fills, anchors
    "noteDurations": [{ "at": { "item": "z", "edge": "end", "note": -1 }, "beats": 7 }] // e.g. the ringing last note
  },
  "ending": {
    "finale": { "item": "z", "edge": "start" },     // FINAL ESBOJARRAT starts here
    "roll": { "beat": 191 },                         // the closing 'roll' label
    "hit": { "beat": 195 }                           // the final hit
  }
}
```

Anchors (every position above): `{ "beat": n }` absolute arranged beat, `{ "item", "edge": "start"|"end", "offset"? }`,
or `{ "item", "iteration"?, "bar", "note"?, "offset"? }` (note index inside that bar occurrence, negative from the end;
offset in arranged beats). An anchor whose item / bar is gone is an ERROR in `unresolved`, never silently moved.

## Compiled timeline (`compileForm(form, score) -> Timeline`, pure, deterministic)

```jsonc
{
  "song": "drac", "revision": "<sha-1 of the canonical form JSON>",
  "beatsPerBar": 2, "bpm": 126,
  "occurrences": [ // every bar actually played, in order (pickup first)
    { "id": "s1#0:u002", "item": "s1", "iteration": 0, "unfolded": "u002", "bar": 1, "start": 12, "dur": 2,
      "label": "A2", "beatScale": 1, "notes": [[12, 0.75, 67], [12.75, 0.25, 62]] }
  ],
  "melody": [[12, 0.75, 67]],        // [startBeat, durBeats, midi] after transpose, ties, overrides, noteDurations
  "melodyRef": ["s1#0:u002/0"],      // parallel: occurrence id / note index
  "arrangement": [[0, "intro"], [11, "pickup"], [12, "A2"]], // [beat, label] where a label starts (+ roll)
  "itemSpans": [["s1", 0, 12, 26]],  // [item, iteration, startBeat, endBeat]
  "tempo": { "clock": "drac-midpoint-us", "knots": [[0, 126]], "beatUs": [476190] }, // beatUs: integer µs per whole beat
  "beats": [0.1, 0.576190],          // song seconds of every whole beat 0..end+1 (preview + dance; Python may recompute, tests assert parity)
  "end": 195, "finale": 191, "balloons": [[191, 195]], "holds": [[50, 53, "don"]], "fills": [],
  "unresolved": []                   // [{ path, message }]: the editor shows these; generators refuse to run on any
}
```

`compileOriginal(form, score)` returns the same shape for `source.unfolded` played straight (label = its `section`,
beatScale 1, the form's first tempo knot, no events): the editor's top track.

Number rules: beats are exact sums of score durations (fractions like 1/6 are parsed as rationals and summed exactly,
then emitted as doubles); never accumulate floats bar by bar if Python did not. `drac-midpoint-us` = Python's current
rule (tempo at each beat's midpoint, `round()` to integer µs with ties-to-even, linear inside the beat). The compiler's
baseline output for both current forms must reproduce what the generators produce today.

## Dance (choreography factories)

`makeDance({ arrangement, end })` (src/game/dance.js) and `makeDracDance({ arrangement, end })` (src/game/dance-drac.js)
return `{ pose(out, beat) }` with the same pose objects as today. Cues are written relative to the start of the label
they belong to, so a reordered / repeated / shortened section carries its moves; joins stay continuous. Existing exports
(`ARRANGEMENT`, `END_BEAT`, `dancePose`, `dracPose`, …) remain as the default instance built from the baseline, and with
the baseline arrangement every pose is identical to today (tests sample it). The Drac foot plan is built per instance.

## Editor preview API (`src/dev/music-editor/preview/`)

- `createTransport(audioCtx)` → `{ load(timeline, audioBuffer?), play(), pause(), seek(sec), setLoop(a, b|null),
  time(), beat(), playing, onTick(fn) }`: one clock for the melody synth (or the generated mp3 when given) and the dance;
  seek / loop cancel scheduled voices.
- `createStage(canvas, song)` → `{ setTimeline(timeline), render(beat), resize(), dispose() }`: the character
  (`buildMulassa` / `buildDrac`) posed by its dance factory for the timeline's arrangement, simple floor + light.

## Dev backend (Vite plugin `tools/music-editor/vite-plugin.mjs`, `apply: 'serve'` only)

Loopback + same-origin requests only; song id from the allowlist; no paths or commands from the client; one generation
at a time.
- `GET /__music/form?song=` → `{ form, score, revision }`
- `PUT /__music/form?song=` body `{ form, baseRevision }` → 409 if the file changed since; else writes it, `{ revision }`
- `POST /__music/generate?song=` → backs up the song's generated artifacts, runs its generator (uv) and its checks;
  on failure restores the backup; `{ ok, revision, log, errors, audioUrl }`
