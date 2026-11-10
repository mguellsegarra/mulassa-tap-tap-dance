# Mulassa Pop · home screen: strings needed (provisional)

All text in the mock-ups is provisional Catalan written by a design agent; the final copy and its translations are for Codex.
Existing keys in `src/jocs/games/pop/locales/ca.json` (`play`, `back`, `music`, `end.best`, `rule.*`, `goodie.*`) are reused where they fit.
"Tap" verbs: the game is played by touch and by mouse; the final copy needs a touch/mouse split or a neutral verb (docs/agents/ui.md).

| Key | Screen | Context | Max length | Provisional |
| --- | --- | --- | --- | --- |
| `home.how` | A, D | Secondary button / tab that opens the rules | 16 | Com es juga |
| `home.howTitle` | A sheet, D (wide) | Title of the rules sheet / column | 18 | Com es juga |
| `home.close` | A sheet | aria-label of the round × | 10 | Tanca |
| `home.groupTap` | A sheet, B | Group label: figures you must tap | 12 | Toca |
| `home.groupAvoid` | A sheet, B | Group label: figures you must not tap | 12 | No toquis |
| `home.groupExtras` | A sheet, B | Group label: goodies | 12 | Extres |
| `home.bestLabel` | A, D | Label above the big record number | 18 | El teu rècord |
| `home.bestShort` | B, C | Label next to the record number in a small box | 8 | Rècord |
| `home.bestNoneA` | A | Shown instead of the number before the first game | 34 | Encara cap rècord: estrena’l! |
| `home.bestNoneB` | B | Same, in the small dock box (2 lines of ~8) | 16 | Primera partida |
| `home.bestNoneC` | C | Same, in the pill next to Juga | 14 | Sense rècord |
| `home.bestNoneD` | D | Same, in the scoreboard | 36 | Encara cap: juga per fer el primer |
| `home.backShort` | D | Compact link back to the main game | 14 | Joc principal |
| `home.pitch` | C | One-line pitch under the logo (2 lines on 320 px) | 70 | Toca les Mulasses abans que s’acabi la metxa. Una errada i s’acaba. |
| `home.tapHint` | B | Info line before any tile is tapped | 36 | Toca una figura per saber què fa |
| `home.records` | D | Tab / column title | 12 | Rècords |
| `home.rankSoon` | D | Ribbon over the ranking mock: idea only, nothing online exists | 28 | Idea · encara no existeix |
| `home.rankYou` | D | The player's own row in the ranking mock | 8 | Tu |
| `fig.mula` | A, B, C, D | Figure name | 14 | Mulassa |
| `fig.petard` | all | Figure name | 14 | Petard |
| `fig.drac` | all | Figure name | 14 | Drac |
| `fig.dracFals` | all | Figure name (the red Drac, a trap) | 14 | Drac vermell |
| `fig.mulaFalsa` | A, C, D | Figure name (the green Mulassa, a trap) | 14 | Mulassa verda |
| `fig.calcot` / `fig.campanar` / `fig.carretilla` | A, C, D | Goodie names | 12 | Calçot / Campanar / Carretilla |
| `do.mula` | A, C, D wide | What to do (C card: 3 lines of ~14) | 40 | Toca-la abans que se li acabi la metxa |
| `do.petard` | A, C, D wide | What to do | 40 | Toca’l per apagar-lo abans que peti |
| `do.drac` / `do.dracFals` | all | What to do | 20 | No el toquis |
| `do.mulaFalsa` | A, C, D wide | What to do | 26 | És falsa: no la toquis |
| `do.calcot` | all | Effect | 14 | +5 punts |
| `do.campanar` | all | Effect | 16 | Temps lent 5 s |
| `do.carretilla` | A, C, D wide | Effect | 36 | El Drac crema totes les Mulasses |
| `tile.*` | B | One-word caption under each tile (tile ~76 px wide) | 12 | Mulassa, Petard, Drac, Drac vermell, Verda, +5, Lent, Foc |
| `tiny.*` | D phone | Two-word "what to do" in the 2-column list | 14 | Toca-la, Toca’l, No el toquis, No la toquis, +5 punts, Temps lent, Foc a totes |

Mock-up only (not for the game): the toast «Maqueta: …», the ranking's invented names and scores.
