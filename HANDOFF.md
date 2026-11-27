# Handoff: Mulassa Tower, the end-of-run campanar (26 Nov 2026)

Do not commit this file. Reply to Marc in Catalan. Read AGENTS.md (CLAUDE.md) first: visible changes need Marc's OK
before tests; every commit/push needs his explicit confirmation in chat; other agents work in this same worktree.

## Goal
Mulassa Tower (id `campanar`, src/jocs/games/campanar/) is a Stack-like game: slabs slide, a tap drops them, the
overhang falls. As the tower rises, each floor turns to stone floor by floor and the finished tower reads as the
campanar de Valls (neo-gothic, Roda de Berà ashlar). Marc wants it to read like a Townscaper/Little City generative
building: square, beautiful, never lopsided, never lower than what the player built.

## Where
- Worktree: /Volumes/development/worktrees/mulassa-tap-tap-dance/jocs-tower-2.0.0-5f767e7ad93a8a1f, branch
  `jocs/tower-2.0.0`, pushed to origin. Dev server (Vite, this worktree): http://192.168.1.232:5186/jocs/campanar/
- Commits of this thread: 201e2f9f (Tower first), 6acc524a (campanar in 3D + square cut), ab910174 (cleanup).
  A parallel thread («Tower», 825a8248…) owns the feel and rhythm: c038fbae Stack feel by default (`?stack=0` old),
  52809874 360° sky/foot/home, cdda6bdc `?ritme=fable&canco=mulassa|drac|bou` (ritme*.js, audio.js, main.js).
  Don't touch their files without Marc.
- `npm run check` 186/186 and `npm run check:gpu` 3/3 at ab910174 (PLAYWRIGHT_DIR=/private/tmp/claude-501/-Volumes-development-worktrees-mulassa-tap-tap-dance-jocs-tower-2-0-0-5f767e7ad93a8a1f/804bc57e-b98a-4db4-80c5-66584f507af7/scratchpad/pw).

## Current state (all committed)
- **Rule** (rules.js `drop`): the overhang falls as in Stack; what landed is squared on the tower's axis with the same
  area («B Escairat», Fable + Neon studies, Marc chose it). `landed` is returned for the animation; perfect.js
  `squareSettle` rests 70 ms then squares in 160 ms (Marc: «està bé així»). Every floor is a square centred on (0,0).
- **Planning** (pure, no three): bodies.js (bodies ≥ 5 floors, TOL 0.08, TAPER 0.28, AHEAD 5), facade.js
  `createFacade` settle()/finish(): each floor settled for good as it turns to stone (5 under the top), never changed
  at the end; portal, base, imposta, faixa every 7 floors, windows (≥10 floors apart) and espitlleres, clock earned in
  play (from floor 12) with arquets over it, bells + remat under the parapet; floors too thin for bells = `agulla`.
- **3D** (pooled meshes, +2 draw calls): openings.js composes arches.js (measures, chamberOf), relief.js (pools,
  tris), bells.js (Fable's bell, fixed proportions), portal.js, clock.js (real device time, hands updated per minute),
  mouldings.js (imposta, faixa, arquets, remat with a trefoil gable). coping.js: shader-drawn coping stones on tops,
  glacis and hip weatherings (Fable's «R»), balustrade on wide terraces (now all round), pinnacles. crown.js: crown/
  bronze cage, stone spire as tall as the thin floors (no cap: Marc rejected the cap). stone.js: textures (only
  base/fust/cantonera/imposta/arquets/remat remain), `campanarFoot`. fall.js: rigid offcuts that never rest on a
  terrace (hop off). end-camera.js: close shot of the top, then out to the whole tower. palette.js: play colours.
- **Page**: Safari bars in sky colours (theme-color, --page-bg gradient, --boot-bg in packages/plassa/src/game.css),
  `#edge` fade at the edges on touch, public/campanar.webmanifest (full screen from the home screen).
- **Background**: Cogulla antenna = the hill rising in a concave cusp to a thin mast (tools/jocs/campanar-carena/
  carena.mjs, carena.json antennaRise/antennaSpread/antennaW; regenerate with bake.mjs). Marc approved.
- Menu: tower/towerDesc in 16 locales (Codex wrote them), public/catalogue.json regenerated.

## What worked
- Settling each floor once (no double change at the end); realistic simulated runs (Node: tests/jocs/campanar-rules.mjs
  plays 200; browser: /private/tmp/claude-501/-Volumes-development-worktrees-mulassa-tap-tap-dance-jocs-tower-2-0-0-5f767e7ad93a8a1f/804bc57e-b98a-4db4-80c5-66584f507af7/scratchpad/pw/real2.mjs seeds via window.__campanar).
- Parallel studies (Astra xhigh, Fable, Carbon/Neon) in /private/tmp/campanar-* folders, then Marc picks; the
  comparison artifact for symmetry: https://claude.ai/artifact/RBJrGDv1Af6ffu8EegBdUh
- Geometry-hash equivalence (/private/tmp/claude-501/-Volumes-development-worktrees-mulassa-tap-tap-dance-jocs-tower-2-0-0-5f767e7ad93a8a1f/6762ba44-bde2-455d-894c-146b90a14f74/scratchpad/geo-eq.mjs) to prove refactors change nothing.

## Rules from Marc
- Famous heights on the left altimeter (bands.js, collection.js MILESTONES): a milestone's tick always lands on a line
  the ruler already draws (the nearest 2 m one), never between two. The value it stands for may be off by up to 1 m;
  the label keeps the real metres. The ruler's lines and `.fita` share one origin (style.css `#marks`): keep it so when
  changing the tick spacing (`--px`, 2 m / 10 m).
- The altimeter's ruler shows from the first floor of a run; only a famous height's tick and label come and go.
- No «El de Valls en fa 74» line at the end (removed 27 Nov): the end shows only the run's metres and the record.

## What didn't work (don't repeat)
- Flat painted motifs (bells, windows, clock) and stretched textures on tops: replaced by 3D relief and shaders.
- Capping the spire height: the tower looked lower than built. Antenna exaggerations (wide legs, two colours).
- Re-reading only (squaring the stone but not the play): thin bodies and colour over narrower stone.
- One-sided terraces with a squeezed balustrade (now impossible with the square rule).
- A tall «fust» delaying the first stone 10 floors: Marc wanted floors to turn one per tap.
- Delegated Codex/Astra agents stop to ask for authorization unless the brief quotes Marc's request verbatim.

## Next steps / open
1. Galaxy S10 blocking-cost measurement of settling floors, chambers, clock, end (Marc: «més endavant»; ask that the
   S10 is free first).
2. Closed 27 Nov: after a cut the square is ~3 px per side wider than what landed (B's licence, visible 1 cut in 8);
   Marc chose to leave it as it is (not C Picapedrer, not hiding it).
3. Rare: a run ending right as an opening starts gets a smaller bell chamber (2 in 200); Marc accepted it.
4. Window tympanum was darkened (#c08d55); Marc only saw a headless capture.
5. Leaderboard with each player's campanar (stored as the run's taps, rebuilt on the device), name from fixed parts,
   metres: its own thread «Tower: rànquing amb campanar, nom i metres» (branch jocs/tower-ranking).

---
**File path:** /Volumes/development/worktrees/mulassa-tap-tap-dance/jocs-tower-2.0.0-5f767e7ad93a8a1f/HANDOFF.md
**To continue:** Start a fresh session and give it this file path.
