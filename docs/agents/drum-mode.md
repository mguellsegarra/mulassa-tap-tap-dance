# Mode timbal (a Taiko drum controller)

Branch `feat/timbal-taiko`. The owner's decisions (13 Nov 2026):

- **Only with the drum.** When `drumOn()` (`src/platform/drum.js`) is true as a run starts and the figure has a drum
  chart, the run is a drum run. Touch and keyboard keep today's game, charts, records and boards untouched.
- **Played like the touch game, on the drum** (owner, 13 Nov 2026, second round; the first, Taiko's don/ka by zone,
  was too much). The drum's side matters again, and the notes look as they always did:
  - **GUA** (small, left, ◀ arrow, orange) = the LEFT FACE (centre). **PA** (small, right, ▶, turquoise) = the RIGHT FACE.
  - **GUAPA** (big, the half/half disc) = BOTH RIMS (the top edge) together, within the pair window. One rim alone is not
    a hit: the window closes on today's ERROR «ELS DOS ALHORA!» (`settleBig`), on every level.
  - A rim on a small note, or a face on a GUAPA, is a wrong move (today's PATAPAM miss).
  - **roll** (yellow bar) replaces MANTÉN: every hit, any zone, scores while it lasts. **balloon** (GLOBUS): any zone.
  - One hard hit can fire both sides' sensors: the other side's same zone within 30 ms is an echo, not a hit (`isDrumEcho`),
    except as a GUAPA's partner.
- **The chart is written new for the drum**, Taiko style, on the Mulassa's existing MP3 (audio untouched, bit-identical).
- **No boards:** a drum run never publishes (`submit_result`) and keeps its own local record key.
- Sync: a hit is dated when the driver sees it (`performance.now()` at the poll, every 4 ms in a song), never from
  `gamepad.timestamp` (stale on some platforms: it shifted every hit up to 0.5 s early).

## Chart data contract (one file per figure)

`src/figures/mulassa/mula-drum-chart.json` (a figure's own folder; read through a `drumChart` trait/hook, no id check):

```json
{ "version": 1, "levels": [ [/* FÀCIL */], [/* NORMAL */], [/* DIFÍCIL */] ] }
```

Each level is a list of events in **song beats** (fractions allowed, on `song.beats`; never seconds, never a BPM):

| Event | Meaning |
| --- | --- |
| `[beat, "d"]` | GUA (left face) |
| `[beat, "k"]` | PA (right face) |
| `[beat, "D"]` | GUAPA (both rims) |
| `[beat, "K"]` | GUAPA (both rims; kept apart from D only for the generator's history) |
| `[beat, "r", endBeat]` | roll from beat to endBeat |
| `[beat, "b", endBeat, need]` | balloon, `need` hits to pop |

Runtime note shape (built by `makeDrumChart(song, chart, diff)` in `src/game/chart.js`, times via `timeAtBeat`): the
touch game's own, so they draw and judge as always: `{ t, phrase, input: 'L', big: false, end: 0 }` for d (GUA),
`'R'` for k (PA), `{ input: 'B', big: true }` for D and K (GUAPA);
`{ t, end, roll: true, input: 'P', phrase }` for rolls; balloons exactly as `makeDanceChart` builds them.

## Driver → judge

The driver sends `press(side, e, zone)`: `side` 'L' or 'R' (the zone's side), `zone` one of `'FL' 'FR' 'RL' 'RR'`.
In a drum run the judge reads the rim from `zone`: rims pair a GUAPA, faces play GUA and PA. No latch.

## Lanes (who owns what, for parallel work)

| Lane | Files |
| --- | --- |
| Driver + measuring page | `src/platform/drum.js`, drum part of `src/ui/input.js`, `tools/dev/timbal.html` (+ its js), `tests/ui/drum.mjs` |
| Chart | `src/figures/mulassa/mula-drum-chart.json`, its generator under `tools/music/`, a listening page under `tools/dev/` |
| Rules | `src/game/chart.js`, `judge.js`, `judge-core.js`, `flow.js`, `state.js`, `records.js`, `figures/index.js` trait, no-publish |
| Drawing | `src/hud/lane.js`, `src/hud/balloon.js` and the HUD pieces that draw notes |
| Tutorial | `src/game/practice.js`, `figure-theme.js`, `hud/draw.js` practice line, `index.html` howto, locales |

## Measured on the real drum (13 Nov 2026, owner's Mac, Chrome 157, `/tools/dev/timbal.html`)

- Plain HTTP over the LAN works (`secureContext: false`, the pad is listed): `Taiko Controller (Vendor: 0f0d Product: 00f0)`, mapping `""`, 14 buttons, 10 axes.
- Faces confirmed: 10 = FL, 11 = FR. Rims (6, 7) not measured yet.
- A hit holds its button 48–59 ms (mean 54): the 4 ms poll (measured mean gap 3.3 ms, max 15.5) never loses one.
- `gamepad.timestamp` was fresh there (2.6–8.9 ms old), but dating at the poll stays: it costs ≤ 4 ms and does not depend on the platform.
- Tapping to a click: +10 ms ± 12 ms with the audio's output latency (32 ms) accounted for, +46 ms without it. The drum adds no measurable lag; the game's sync calibration must be done with the drum.
- The button map is learnt per device on `/tools/dev/timbal.html` («Aprèn el timbal»: 3 hits per zone) and kept under
  `drum-map` in localStorage (`saveDrumMap`); order: `?drummap` (dev hosts), the learnt map, `DRUM_ZONES`. The sync
  sheet's metronome takes drum hits as taps (`sheets.sync.drumTap`), polled every 4 ms while it is open.
