---
name: mulassacat-colla-festa
description: "Mulassa project only. Design a figure's colla (compass attendants, capatàs, seated members, carriers' dress), the crowd's reaction to it, and its own festa effects (fire, smoke, carretilles, confetti, disco floor, final parade). Use for a new figure's colla or festa, attendants' dress, crowd collisions or crowding, and effects that are too much, too little or mistimed."
---

# Colla, crowd and festa

Apply only to Mulassa and its checkouts. For a whole new figure, start from `mulassacat-nova-figura`; this skill owns phase 6. The current rules are in `docs/figures/dances.md` (the Drac's colla and fire), `docs/figures/bou.md` (the Bou's colla, festa and final) and `docs/scene/crowd-and-plaza.md` (crowd, making way, ripple); this skill keeps how to arrive at them.

## Owners

| What | Where |
| --- | --- |
| Colla bodies and dress | `scene/models/colla.js` (`COLLA`, `HELPER_LOOKS`, the Drac's seated looks), `scene/models/colla-seated.js`, `figures/mulassa/mula-suit.js` (`MULA_SUIT`), `figures/bou/bou-suit.js` (`BOU_SUIT`, `BOU`) |
| Each figure's colla | built by `figures/common/colla.js` (+ `colla-run.js`); `figures/drac/drac-colla.js`, `figures/mulassa/mula-colla.js`, `figures/bou/bou-colla.js` (+ `figures/bou/bou-parade.js` for the carried lap and the crowd file) |
| Crowd | `scene/crowd-build.js` (who stands where), `scene/crowd.js` (making way; mood and groove in `crowd-mood.js`), `scene/crowd-fx.js` (ripple), `scene/representation/` (looks, `population.js` weights) |
| Festa rules / drawing | Drac: `figures/drac/drac-fx-rules.js`, `figures/drac/drac-fx.js`, `figures/common/fire.js`, `figures/drac/drac-show.js`, `figures/drac/drac-soot.js`. Bou: `figures/bou/bou-correfoc.js`, `figures/bou/bou-show.js`, `figures/bou/bou-bills.js`. Shared: `scene/confetti.js` (`CONF_LOOK`), `scene/fx.js` |

Reuse the existing colla system and suits for a new figure; add a suit and a colla module, do not fork the Drac's.

## The colla

1. **Research the dress** from photos and video frames of that figure's colla: shirt or tunic, trousers, sash, headwear, shoes, colours, glasses. Keep crops with source and instant. Never copy another colla's dress (the Drac's camouflage is the Drac's; the Bou's colla wears garnet correfoc tunics, some hooded, with sunglasses because of the sparks).
2. **Separate roles:** carriers, the four compass attendants who guide the turns, the capatàs, musicians, relief carriers, public. A shirt colour alone does not give a role.
3. **Compass attendants** stand at N/W/S/E outside the whole path of the body and tail, facing the figure, with room from the public and the camera. If the real colla has no such four, label them a game adaptation.
4. **The capatàs** (when there is one) stands near the dance but on none of the four marks, close to the front row.
5. **Seated members:** only if documented and only as many as read well; the owner removed them for the Bou ("a few people").
6. **Variety without noise:** different builds, ages and accessories, discreet clapping on the beat, never a mechanically synchronised ring. Sunglasses, hats and props must be well made at close range (the showreel's close-ups show them).
7. Attendants step with planted soles; they never slide or pass through the figure, each other or the capatàs.

## The crowd

- During play the crowd stays nearly still and answers hits softly; it parts when the figure's turning ends reach it and walks back. Nobody is knocked over in the game.
- The generator spreads people with reduced mobility, children and adults naturally for every figure: wheelchairs not always in the middle, no beards on children, no effect (such as soot) that blackens the people in wheelchairs.
- A figure's own crowd moment (the Bou's final file of people running behind it, touching its rump, cheering) is choreographed: join and leave one at a time from the nearest place, no crossing, no collisions, euphoric poses, and at their own speed so nobody lags metres behind.

## The festa

- **Each figure has its own festa**, drawn from its real festa: the Drac's fire from its real fire points, carretilles and smoke; the Bou's correfoc tubes, disco floor and banknotes ("bou que tot ho mou… busca'm un bon sou"). Do not reuse the Mulassa's confetti and balloons by default.
- **One effect at a time.** When the disco floor lights, nothing else plays; sparks, smoke and confetti each get their own moment.
- **Tie effects to the music and the chart:** a streak, a drumroll, the final phrase. Effects that run all the time stop meaning anything; the owner asks to restrict sparks to fixed moments, not during the lift or set-down.
- **Fade in and out.** A figure that disappears does so with a smoke puff and an opacity fade, not by shrinking; nothing pops in or out.
- **Show proposals first.** Effects and props (banknote design, carretilla look, smoke colour) start as 3 visual proposals; integrate only the chosen one.
- **Readable for everyone:** button and effect colours checked for colour blindness; lighting on the figure without spotlights or shadows on the floor when they clash with floor lights.
- **Mobile cost:** pools per quality tier (`PROFILES`), no per-frame allocations, and a check on an old phone or iOS Low Power simulator (see `mulassacat-web-performance-diagnosis`).
- Free play may have its own effects (the Drac's soot) that never appear in the game, the demos or the selector.

## Validation

Record the festa windows with `npm run capture` at the exact song time (`?figura=…&from=…`) and check the people, the figure and the effects frame by frame for collisions, blinks and popping. See `mulassacat-validacio-visual`.
