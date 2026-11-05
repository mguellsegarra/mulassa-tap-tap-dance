# Directing a figure's showreel (camera operator and director)

What we learnt choosing the Mulassa's and the Drac's edit (2026-11-03). The owner asked for TV production or musical, not pop video: «plans i transicions ben pensades segons moviments, que sigui natural». The owner's verdicts are in [selector-and-showreel](selector-and-showreel.md) (item 14). Read this before writing or reviewing any `SHOWREELS` entry.

## 1. Measure the dance before placing a cut

Don't place cuts on a grid of bars. A cut every two bars, whatever she was doing, fell in the middle of her runs, and the owner called it «canvis de plans sense sentit». Before writing the shot list, sample her:

```
npm run dev
node tools/qa/reel-motion.mjs --figs=mulassa,drac --url=http://localhost:5178
```

Every 2 beats it prints her position, her speed, where she travels relative to the play camera (towards the lens, across, away) and how fast she turns. Read the dance as legs and turns. For example, the Mulassa's A1 is out, turn at 22, through the middle, turn at 38, back, then the other diagonal from 48.

## 2. Where to cut (the director)

- Cut on the beat a run sets off after a turn, or where she stops. Never cut mid-run.
- Don't cut in the middle of a fast turn (more than ~0.3 rad a beat): the 0.5 s dissolve then shows two of her turning. Cut where the turn ends.
- Open each part of the dance with a wider shot and tighten inside it. Repeating the same camera for the same move is fine, even good: the Drac's two charges (D and D3) use the same front camera.
- A head close-up only where the root stands still, and at least 8 beats long. A 4-beat insert felt like a glitch, and the test rejects it.
- Let spins play uncut, from low or from a crane. A spin is already movement.

## 3. Which angle (the camera operator)

Pick the angle from where she runs next, not to vary the picture:

| She… | Shoot from | Why |
| --- | --- | --- |
| comes towards the lens | where she heads: a long lens (`tightL`/`tightR`) or a fixed camera (`camL`/`camR`/`camFront`) | she grows, the most dramatic shot of a charge |
| crosses | profile from the other side (`profL`/`profR`, a side camera) | she crosses the frame; keep her screen direction across the cut |
| runs away | nobody; cut before, on the turn | her back for 3 s is dead time |
| spins in place | low (`low`, `camLow`), tight or a crane | the turn is the picture |
| stops (a stare, a drumroll) | a close-up or a push-in | the pause is the accent |

Both figures run along two diagonals. Seen from the play camera (az 0), the A1 runs and the Drac's A2/E come head on from az ≈ -0.75 and in profile from az ≈ +0.8. The Mulassa's third and fourth runs and her charges are the other way round. So two ground cameras, one either side, cover every run. Recheck this with `reel-motion.mjs` for a new figure or a changed dance.

Keep every angle on the camera's side of the action (|az| ≤ 1.2, the 180° rule); the test enforces it.

## 4. Camera moves

- **A dolly that follows her keeps her the same size wherever she goes.** It reads as artificial when she charges. A **fixed camera** (`fixed: true`, scene/cameras.js `fixedLens`) stays where its cut placed it and pans after her, as a TV camera on its stand does, so she grows as she comes. Rules:
  - Enter a fixed shot on a cut: the cut is what places the camera.
  - Its lens is placed by the cut and only ever widens. On phones the square stops the camera backing off, and without widening the Drac's charge left a 375×667 frame by 14%.
  - Its pan speed depends on the distance. Side cameras at fill 0.6 panned at 0.17 rad/s after the Drac crossing; at 0.45, 0.14.
- **Crane:** `el: [from, to]` rises through the shot. Keep it under 0.05 rad a beat, like the azimuth drift. Use it on a circle (it draws the shape) and on the final hit (up and out).
- A slow drift round her (`trackL`/`trackR`) is fine inside a long take. Walking round her (old `arcL`/`arcR`) passed behind an attendant and was dropped.
- Comfort: measure the view's turn rate, pans included. It must stay ≤ 0.15 rad/s (`reel-motion.mjs` prints it). A long lens magnifies every move, so it goes only where she stays in place.

## 5. Showing proposals to the owner

- Three proposals per figure with clearly different ideas. This round: A TV broadcast (fixed cameras + crane), B musical (one long take per part), C music video where every cut answers a move. The owner chose C for the Mulassa and A for the Drac: the same rules, a different style per figure.
- They live in `tools/dev/reel-review/proposals.js` with a note per shot. `?reel=A` plays one in the game itself (dev hosts; a corner label names the shot, e.g. `C-7 profL`, for the owner to point at). `/tools/dev/reel-review.html` shows several sizes side by side.
- Contact sheets only show framing, not motion: give the owner the LAN links and let them watch it live.
- Before showing: `node tools/qa/reel-review.mjs --props=A,B,C` checks the figure stays in frame (phones too), and `reel-motion.mjs --reel=A` gives the turn rate.
- The owner also judges the background. Remove what distracts in the new angles (low shots showed the campanar; the owner had it removed).

## 6. Traps met while integrating

- `tests/build/modules.mjs` caps modules at 300 lines. Extra camera logic pushed `cameras.js` over, and the colla dodge moved to `scene/colla-dodge.js`.
- The vm tests seed `Math.random`, and every `Vox.box` draws a colour jitter. Adding or removing scene boxes shifts the crowd's draws and moves seed-dependent bounds (the quiet crowd's rotation, tests/render/game-flow.mjs).
- `photo-showreel.mjs` jumps from the selector straight to results. A long-lens showreel shot left the menu zoom set, and `easeLensX` snapped it. In the game a run always comes in between.
- An `import()` by URL from a dev module can load a second copy of a module after a hot update. Hand the game's own module instances to `applyProposal` (`src/dev/reel-proposal.js`).

## Research

No installed or registry skill covers real-time camera direction. Searched on skills.sh: cinematography, camera direction, film editing, music video, dance film, multicam, shot list. What exists covers prompts for generated video, audio-driven multicam editing of real footage and generic three.js rigs. The rules above come from live TV direction (fixed cameras, cut to the camera the action goes to), dance film ([sources](sources.md)) and measuring this dance.
