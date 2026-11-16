# Native launcher with the J1 design (plan for review)

Status: plan, 16 Nov 2026. Design chosen by the owner in round 8: **J1 «L'anella» with J2's direct tap**
(`/Volumes/development/design/mulassa-games/app-home/ronda-8/J.html?p=1`, captures in its `shots/`, review page
https://claude.ai/artifact/Hus67eyXC6ShxuJ9oaHHAY). Ownership, bridge and phases: `native-shell.md`.

## What the owner chose
- Two tabs at launch, **Jocs** and **Perfil** (settings behind a gear in Perfil). The app opens on Jocs. Room for a
  third tab (news, the group challenges) later: the bar is centred and widens.
- S2's tab bar: floating, a yellow block that slides to the chosen tab, a horizontal swipe changes tab.
- Jocs: the logo top-left and «N jocs» top-right; chips Tots · Favorits (and the categories Ritme, Acció, Enginy,
  Puzles only from 8 games); a ring with the chosen cartridge big between its dimmed neighbours, the 01…NN ruler,
  JUGA in the game's colour; below, every game as a grid of cartridges, 4 per row. **A tap on a grid cartridge
  plays it** (one tap); a tap on a ring neighbour moves the ring; a tap on the centred one plays it.
- The cartridge: a cut top-right corner with the favourite heart, a notch, grip ridges, a cream label with the
  game's art and short name, gold contacts, a darker copy behind for thickness; tags ÚLTIM / NOU.
- Launch: the iris, a circle in the game's colour growing from the pressed cartridge with the figure and the name on
  a dark plate in the middle; the reverse iris when the player comes back.
- No stars. Perfil tiles: Partides / Jocs / Dies jugats.

## How it is built natively (and why: measured on the S10, 16 Nov 2026)
The web mock missed the 50 ms budget on every interaction on the S10 (201-301 ms frames with 12 games). The main
owner was the cartridge drawn as a CSS `clip-path` (two per cartridge): without it the tab change went 201 → 67 ms
and the iris 301 → 117 ms; the drop-shadow filters cost nothing measurable. The rest was the mock rebuilding all 12
cartridges on every ring move or chip (60-100 ms tasks). Script: `ronda-8/tools/s10-cost.mjs` in the design folder. So:
- **The cartridge is one native view** drawn from a path (SwiftUI `Shape`, Compose `GenericShape`) filled in the
  game's colour, with its parts (ridges, contacts, thickness) in the same drawing, flattened once per game and
  colour (`drawingGroup()` / `graphicsLayer`) so a ring move or a scroll only moves bitmaps. To verify on the S10,
  not assumed.
- **The ring is a paged horizontal list** (`ScrollView` + `scrollTargetBehavior(.viewAligned)`, Compose
  `HorizontalPager`) with scale and dimming as a function of the page offset: no rebuild when it moves.
- **Chips filter the same items** (stable ids, lazy grid): a chip changes what shows, it never rebuilds the screen.
- **The iris is a circular mask animated on the GPU** (`.mask(Circle().scale)` / `graphicsLayer { clip; shape }`),
  above the game's controller while it loads, so it also hides the WebView start; the reverse plays on exit.
- Art: each game's figure and cartridge art come from the catalogue (contract 6), bundled in the web bundle, not in
  the app; the shell shows them offline.

## Data
Everything the launcher shows comes from `catalogue.json` (contract 6) plus three local values per account: the last
game played, favourites, and records (`reportBest`, with the backfill). Favourites and «last played» are local
(per device) at launch; syncing them is not in scope.

## Order (fits `native-shell.md`'s phases)
1. Phase 1 closes: the session adapter is committed on `release/2.0.0` (waits for the owner's OK).
2. Catalogue schema + a first `catalogue.json` with the 4 launch games (phase 1's third item).
3. **Phase 2 with J1 as its UI**: the launcher shell on both platforms shows J1 from the catalogue and opens a game
   in the bridge with the iris, back returns with the reverse iris; update activation and readiness as planned.
   The S10 and an iPhone are measured on this build (taps, ring, chips, tab swipe, iris), budget 50 ms.
4. Perfil in phase 3-4, when the native session and settings exist (until then a placeholder with the tiles).

## Platform setup (owner's decisions, 16 Nov 2026)
- iOS: **minimum iOS 17** (the ring's `scrollTargetBehavior`; iPhone XS/XR and later). The project's
  `IPHONEOS_DEPLOYMENT_TARGET` goes from 15.0 to 17.0 when phase 2 starts.
- Android: **add Kotlin and Jetpack Compose** (Kotlin plugin and the Compose BOM in `android/app/build.gradle`);
  the existing Java classes (`MainActivity`, `PowerPlugin`) stay; `minSdk 24` is fine.

## Copy for Codex (provisional in the mock)
Strings needed, Catalan source + translations: tab names (Jocs, Perfil), «N jocs», chips (Tots, Favorits and the 4
categories), the category subtitles, tags (ÚLTIM, NOU), JUGA, «AL DESEMBRE»-style dates for games not out yet, the
empty Favorits title, line and button, the iris line under the name, Perfil tile labels, the footer.
