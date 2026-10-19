# Handoff: integrate the reviewed Mulassa into the character-select game

Prepared 2026-10-19. This document is an implementation brief for the next agent,
not a report that the integration or new music has already been completed.

## Goal

Marc requests implementation by Claude Opus in this existing checkout:

- Worktree: `/Users/marc/.t3/worktrees/mulassa-de-valls/t3-b0a52b07`
- Branch: `t3/character-select-v1-2-0`

Integrate the reviewed Mulassa appearance, simple carrier legs and choreography
into the real game AND the free viewer/photo mode. Create a somewhat faster, more
festive musical arrangement in the project's existing style and adapt the dance
to it. Add four fixed compass attendants plus seated members around the dance
space, reusing the existing Drac colla infrastructure and the researched Mulassa
clothing. Preserve the current Drac and other concurrent work.

Read the checkout's `AGENTS.md` first. Local implementation and validation are the
requested work; commits, pushes, deployments and GitHub writes still require the
specific chat confirmations described there. Do not message other agents or
create new agents from an old coordination instruction. Follow current local rules.

## Current progress and source of truth

The working reference prototype is `/mulassa-compare.html?mute`, on the existing
Vite server at port 5188 (verify its process/cwd before reusing it). Its three views
are original video, proposed real game model, and overhead. The selected mode must
be `Reconstruccio del video`, not the old-game comparison mode.

Read these before implementing:

1. `research/bestiari/mulassa/README.md`
2. `research/bestiari/mulassa/simple-carriers-v3.md`
3. `research/bestiari/mulassa/camera-seam-89s.md` and `validation.md`
4. `research/bestiari/mulassa/helpers-design.md`
5. `research/bestiari/mulassa/contrast-2021-2023.md`
6. `research/bestiari/mulassa/choreography.json`, `reconstruction.json`,
   `spatial-frame.json`, `sources.json`
7. `.agents/skills/bestiari-reference-analysis/SKILL.md`
8. `/Users/marc/.codex/skills/voxel-3d-polish/SKILL.md` and its verification protocol;
   `/Users/marc/.codex/skills/rhythm-music-polish/SKILL.md` for musical validation.

Primary reference: El Camp Difusio, Santa Ursula 2017,
https://www.youtube.com/watch?v=D53pgXOeIL0 (166.2 s research timeline).
Contrasts: arditproduccions 2021, https://www.youtube.com/watch?v=WzO1q5mdPes,
and Sant Joan 2023, https://www.youtube.com/watch?v=BaVEzBKbm4U.
Local source files, hashes and extracted frames are documented in `sources.json`.
Media lives under
`/Users/marc/Desktop/Bestiari de Valls - I+D/Mulassa/revisio-2026-10-19/`.
Do not download again unnecessarily or ship reference footage in the game bundle.

Marc accepts the current visual proposal as the integration basis. This is not
proof of exact motion capture: root distances, some supports and camera fitting
are inferred; manual musical phrase alignment remains to be completed. Distinguish
observed, inferred and new artistic adaptation in the integration notes.

## What worked and must survive

### Figure and carrier rig

The reviewed "new model" is the ORIGINAL beast geometry with a revised support
rig and motion. `src/scene/models/mulassa.js` retains the approved proportions.
The prototype hides its old animated legs and supplies eight simple cuffs/shoes
for four carriers, two front and two rear. Do not redesign the head, neck, body,
blanket, silhouette or scale: Marc rejected the disproportionate remodel.

Implementation references:

- `src/dev/bestiari-compare/carriers.js`: simple visible trouser cuffs, rigid shoes,
  cloth coverage and fitting. Hidden anatomical joints are intentionally omitted.
- `supports.js`, `support-clearance.js`: inferred alternating supports, planted
  world-space feet, smooth lifted swings and shoe clearance.
- `motion.js`: root, unwrapped heading, sway, pitch, lift and small head accent.
- `stage.js`: how those pieces are actually assembled and posed in the prototype.
- `directions.js`: one coordinate mapping for the compass and markers.

Move the reusable runtime responsibilities into appropriately scoped production
modules. Do not import the research page entrypoint or make the game fetch local
video. Keep one shared figure/rig implementation across game, free viewer and
relevant previews; do not preserve a second obsolete leg renderer in one mode.

Production entrypoints to inspect, not blindly replace:
`src/scene/stage.js`, `mula-motion.js`, `mula-pose-rig.js`,
`src/game/dance.js`, `src/dev/music-editor/preview/stage.js`.
Free control lives in `src/game/photo-control.js`, `src/scene/photo-motion.js`,
`photo-collision.js`, `photo-obstacles.js` and `src/ui/photo-avatars.js`.
Verify current imports and ownership because this checkout has concurrent changes.

The free viewer must use the same appearance and natural feet when walking,
turning, stopping and doing its existing actions. A precomputed dance support
timeline cannot directly solve arbitrary manual walking. Adapt the support logic
to actual movement there; retain user control, pair mode, collision handling and
smooth transitions back to the automatic demo. Do not force the song's path while
the user is steering the figure.

### Dance and expressive layer

Preserve the reference-led phase order, approaches/returns, half turns, late
direction reversals, approximate four final turns, and final settling. Never use
shortest-angle interpolation that loses complete turns. Preserve the visibly
faster advance around 69.5–86 reference seconds; do not revert to swaying in place.

The current prototype ALREADY emphasizes body roll by 15% and gives the head a
small roll accent of 12% of body roll. Additional festivity must account for that,
not multiply exaggerated layers blindly. Add a modest, beat-aligned increase in
sway/weight transfer in livelier phrases, with eased gain changes and a quiet
ending. Preserve visible head/body movement without random jitter, sudden neck
twists, exposed knee chains or large unsupported jumps.

Keep hit/miss/hold/gameplay accents bounded on top of the base choreography.
Preserve practice, collapse, pause/resume, reduced motion and difficulty parity.

### Fixed compass and the colla

W is the opening-facing direction of the 2017 reconstruction; E is its opposite.
Positive yaw follows W -> S -> E -> N. These are rehearsal directions, not surveyed
geographic north. The camera has its own position and never defines S. Apply one
coherent transform to body path, headings, helpers and overhead when placing them
in the actual plaza; do not paste the research coordinates into unrelated axes.

The Drac already implements four helpers and a seated ring in this branch:
`src/scene/drac-colla.js`, `src/scene/models/colla.js`, `src/game/drac-layout.js`,
`src/scene/drac-dance.js`, `src/dev/colla-preview.js`, `tests/drac-colla.mjs`.
Reuse its construction/posing/quality mechanisms where they fit. Parameterize
shared behaviour or extract a narrow common module; do not blindly duplicate
Drac-specific dimensions, positions, uniforms or figure visibility conditions.

For Mulassa clothing follow `helpers-design.md` and its actual source crops:
pale blue/blue-grey collared shirts, dark trousers, broad usually dark sashes,
compact espadrille-like shoes with light soles. Optional pale patterned neck
cloths and sash variants are observed. Do not copy Drac camouflage, use an all-white
uniform, or invent unreadable embroidery. Vary people without copying identities.

Place four standing attendants at fixed N/W/S/E marks, looking toward the dance.
Add seated/squatting colla members distributed around the perimeter, as with the
Drac. Match the existing quality tiers and preserve camera sight lines, crowd
spacing and clearance for the ENTIRE retimed dance, not just its opening pose.
Use subtle beat-aware clapping and relaxed rests. Keep debug letters optional,
following the Drac's convention; the people are the in-game orientation cues.
Avoid duplicate or wrong-uniform groups when switching figures or in pair mode.

The four exterior stations are an approved GAME ADAPTATION. The official four
carriers are under the beast; the inspected videos do not establish a compulsory
four-point external formation. Do not present that assumption as a historical fact.

## Music and retiming work still required

Start from the current game's score, musical form, generator and audible style:
`music/README.md`, `music/score.json`, `music/mulassa-form.json`,
`tools/build_taiko.py`, its imported helpers, `src/music-form/CONTRACT.md`,
`src/game/figure-song.js`, `src/core/beat-grid.js` and generated `src/song.json`.
Inspect their CURRENT values; do not copy an obsolete BPM or old long-song layout.

Marc wants the recognizable Mulassa melody in the existing warm festive band/taiko
style, somewhat faster and with more festive momentum. Preserve soft timbres and
the established musical identity. Increase drive with phrasing, accompaniment,
percussion and a controlled rise toward the lively/final section; avoid strident
buzz, unrequested new instruments that clash, or continuous applause noise.
Choose and document a concrete first tempo/energy proposal after checking the
current arrangement and listening where available. Do not claim an audio audition
from a waveform or FFT alone; if actual listening is unavailable, disclose it and
deliver playable before/after audio for Marc's review.

The source dance lasts about 166 s and the game has its own shortened musical
form. Do NOT align them by normalized duration, arbitrary `time * speed`, or a
second independent animation clock. Identify source phrase/turn anchors and map
them monotonically to generated song time/beat positions, preserving meaningful
actions. Reuse the Drac's reference-time mapping pattern where appropriate:
`src/game/drac-time.js`, its form/reference data and associated tests.

Build the new tempo map through the actual generator/form pipeline. Music, chart,
accents, final hit and animation must agree on one clock. Smooth the time mapping's
rate at transitions and recompute support scheduling in playback time: speeding
up continuous poses can still make feet and acceleration look abrupt.

Audit constant-tempo Mulassa assumptions explicitly: `figure-song.js` currently
special-cases Mulassa count-in and extrapolation using average BEAT. If using
changing tempo, update those consumers to the generated local beat grid. Preserve
calibration, holds, count-ins, practice timing, scoring and density contracts.

Regenerate audio/MIDI/chart/hashes from their sources; never hand-edit generated
`src/song.json` or rename/copy audio to fake cache busting. Preserve the menu loop
unless the requested integration requires a documented change. Respect legacy
audio/cache compatibility and existing leaderboard/score migration boundaries;
do not make production database changes as part of local validation.

## What did not work

- Changing the beast's original proportions: explicitly rejected by Marc.
- Long articulated exposed legs, large diagonal steps and overlapping limbs:
  looked like a spider. Keep the simple accepted cuff/shoe silhouette.
- A nearly stationary model when the video advances rapidly.
- Erratic invented paths, compass labels tied to the camera, or a claimed exact
  four-step pattern without sufficient visible evidence.
- Declaring fidelity from stills or passing math tests without playback review.
- At reference 89 s, replacing an active camera fit with an incoming weight near
  zero caused a visible jump. The corrected shared screen track and weight join
  are in `motion.js`. `camera.js` also fixes the look-at target's 121 s exit.
  Keep the regression in `tests/bestiari-research.mjs`. These are RESEARCH camera
  fits; preserve the fix in the comparator, but retain the real game's gameplay
  camera and safe framing rather than transplanting the video camera blindly.

## Next steps and acceptance

1. Inspect branch, dirty files, existing model owners and playing music. Preserve
   unrelated work and capture a local baseline before editing. No extra checkout
   or duplicate server is needed if this one is suitable.
2. Integrate the shared approved figure/feet into play and free control. Validate
   stationary, walking, turning, stop/start, actions, pair mode and figure changes.
3. Complete phrase mapping; generate the festive arrangement and retime the dance.
   Add restrained sway/head emphasis. Keep a clear baseline versus festive variant
   available during review so changes can be judged, not guessed.
4. Adapt the existing colla infrastructure with Mulassa clothing, four fixed
   attendants and seated ring. Validate clearance in play AND free control.
5. Review the whole new song/dance in playback. In the comparator, seek the source
   through the time map when evaluating the accelerated version; do not compare
   identical elapsed seconds and call that synchronization. Verify overhead,
   compass, source landmarks and model together.
6. Include the critical reference moments 33, 69.5–86, 88.54–91, 110, 120–122,
   130, 140.75, 142, 144, 151, 161.5 and the ending, mapped to the new song.
   Test pauses, seeks, restarting and 30/60/120 fps. Feet must remain planted in
   world space during contact, with rigid shoes and no cloth protrusions.
7. Run relevant figure/dance/audio/rig/compass/free-viewer/clearance regressions,
   `node tests/bestiari-research.mjs`, `npm run check` and `npm run build`.
   Do not weaken tests to accept the implementation. Check 375x667, 393x852,
   landscape and desktop, including actual playback and browser errors.
8. Return a verified LAN URL on the same Wi-Fi, screenshots/clips, playable new
   audio and a short Catalan explanation of what changed and what remains artistic
   approximation. Keep the preview available. Local completion is not deployment.

Previous seam-fix validation: specific regression and build passed; the general
suite completed across two runs after a transient applause-generation timing
failure (116 ms). No audio threshold was changed. See `validation.md`; rerun checks
against your own final changes rather than inheriting this result.

**File path:** `/Users/marc/.t3/worktrees/mulassa-de-valls/t3-b0a52b07/HANDOFF.md`
**To continue:** Read this brief and its source documents, then implement and
validate the requested integration in this worktree. Do not stop at a plan.
