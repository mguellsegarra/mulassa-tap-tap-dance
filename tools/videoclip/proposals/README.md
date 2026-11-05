# Montage proposals

Each `*.json` here is one montage the tool (`index.html`, «Muntatge» selector) plays and the owner reviews and annotates.
A proposal is made only of pieces of the current video: no new animation is rendered for it. Check every file with
`node tools/videoclip/check-proposals.mjs` (from the repository root) before handing it in.

## The material

- The current video: the song cut to 2:39 (`clip.json`, `duration` 159.064 s), and the scene keeps moving silently up to
  164.5 s under the end card. All times below are **seconds of this timeline**.
- `clip.json`: `beatTimes` (every beat, s; bars start on beats whose index % 4 == `downbeat`, which is 0), `phrases`
  (`start`, `beat`, `label`: intro, build, drop, hard, break, outro), `shouts` (the spoken MULASSA at 41.82 and GUAPA ×3
  at 88.93 91.82 94.69 and again at 123.50 126.38 129.21, each shown full screen as a text effect), `levels` (each stem's
  level per beat, 0..1), `kickLevel`.
- `edit.json`: the edit already approved (shot plan inputs, texts per shout, the title MULASSA at 1.2 s, the end card).
- Audio: `media/mix.wav` (the cut song) and its stems in `media/stems-cut/*.wav` (same timeline), to judge joins by ear
  or by measurement (chroma, MFCC, per-stem levels before and after a join).
- Sections today: 0.2 intro (dark entrance, title at 1.2) · 32.0 build · 41.8 MULASSA shout · 43.6–84.0 first drop
  (colour LED floor, repeated rounds) · 84.0 break · 89.7 build with GUAPA ×3 · 101.3–122.9 second drop · 122.9 build with
  GUAPA ×3 · 135.7 hard (red and white floor, hardstyle) · 144.3 outro · 158.4 end card over the video.
- To see it: the tool at http://<lan-ip>:5190/tools/videoclip/?t=<seconds> or one frame at a time with the render
  mode `?render=yt|reel&scale=.5` and `window.__clip.frame(t)` (headless Chrome; take tools/qa/capture-lib.mjs `lock()`
  first: the GPU is shared).

## The format

```json
{
  "id": "opus-a-reel",
  "author": "opus-a",
  "group": "youtube | reel | stories | tiktok",
  "title": "short name shown in the selector",
  "format": "yt | reel",
  "why": "2 to 4 lines in Catalan: the idea and why these pieces",
  "segments": [{ "from": 123.3, "to": 135.72 }, { "from": 43.56, "to": 55.12 }],
  "fade": { "in": 0.4, "out": 0.8 },
  "overlays": [
    { "type": "watermark", "from": 0, "to": 22 },
    { "type": "title", "at": 0, "dur": 1.6, "text": "(provisional) text", "look": "over" },
    { "type": "endcard", "at": 24.5 }
  ]
}
```

- `segments` play in order, back to back (the picture cuts, the sound joins with a 30 ms crossfade). Put every join on
  a bar line (a beat time with index % 4 == 0, within 20 ms) and choose joins where the music on both sides matches
  (same section kind, same stems playing): the owner hears a bad join at once. `from` < `to`, both within 0–164.5.
- `fade`: seconds from black at the start and to black at the end, picture and sound.
- `overlays` (times in seconds of the proposal, from its start):
  - `watermark`: a small mulassa.cat pill in the safe zone, `from`–`to`.
  - `title`: a short line of text, `look` `over` (white over the dimmed picture), `black` (on black) or `clean` (the picture untouched, at height `y`); `cut: true` shows it dry, without fades. Copy is
    provisional (final copy is written by another agent later): keep it short and mark it `(provisional)` in `why`.
  - `cta`: the call to play, small: «T'atreveixes a fer-la ballar?» with the mulassa.cat pill under it, `from`–`to`
    (optional `size`, 1 by default, `y`, its height as a share of the frame, low by default, `question: false` for the pill alone, and `pillY` to set the pill apart at its own height). It fades out by itself while a shout's full-screen letters are on and comes back after.
  - `shout`: one of the song's spoken shouts laid at `at` (`index` in clip.json `shouts`, 0 is MULASSA): its voice from
    the lead vocal stem over whatever music plays there, and its full-screen letters in its approved style.
  - `endcard`: the approved end card (the question and the mulassa.cat pill over the blurring picture, 5.5 s, ending in
    black). The picture under it must keep running for 5.5 s from `at`. The music fades out under it; `music: true` keeps it playing to the end (pair it with a short `fade.out`).
- `group` targets: youtube the whole video (shorter than 2:39 is welcome); reel 30–60 s; stories 3 files, 10–15 s, 10–15 s
  and the closing one, `id`s ending in `-story-1`, `-story-2`, `-story-3`; tiktok 20–40 s.
- `loop: true` marks a **perfect loop** (Reels and TikTok replay a video endlessly): the end runs straight back into
  the start, so that join is a join like any other and must be just as inaudible (the last piece's `to` and the first
  piece's `from` on bar lines, the same section and stems playing on both sides, never inside a melodic phrase), and
  the picture should restart naturally too. No `fade`, no `endcard` (it would break the loop); a `watermark` is fine.
  Put «Perfect loop» in its `title`. The tool plays it in a gapless loop.
- `format`: `reel` for every vertical piece (Reels, Stories, TikTok), `yt` for YouTube.
