# Mulassa · Santa Úrsula 2017

Open `/mulassa-compare.html?mute` on this checkout's Vite server. The local media mapping described in
`../README.md` is required. This is a review prototype, not an integrated game dance.

## Source and coverage

Primary: [Balladeta de la Mulassa, El Camp Difusió, 22 October 2017](https://www.youtube.com/watch?v=D53pgXOeIL0).
The downloaded file is 166.324535 s, 1280×720, 50 fps, with original audio. Its hash and the two alternate
recordings are in `sources.json`. Source footage, dense contact sheets, audio analysis and browser captures stay
in the external Mulassa research folder. The original footage is not added to public/ or the production bundle.

This recording offers a continuous performance and readable headings. Musicians obstruct some feet and the
camera pans/tilts, so it cannot support a complete exact footfall count or a measured ground trajectory.
The 2021 and 2023 Arditproduccions recordings were compared by broad phase in `contrast-2021-2023.md`; exact footfalls and metric travel remain unannotated. No claim is made that one recording defines an invariant dance for every performance.

## Files and evidence levels

- `choreography.json`: 20 continuous windows covering 0–166.2 s, with plain Catalan actions and evidence limits.
- `reconstruction.json`: visually fitted unwrapped heading anchors, inferred floor path, sway envelope and two
  matched-frame tilt corrections. Angles, distances and amplitudes are estimates, not motion capture.
- `spatial-frame.json`: camera-relative reconstruction axes and approved rehearsal compass. W is the opening-facing direction; the camera is independent. These are not geographic directions.
- `audio-pulse.json`: spectral-flux periodicity candidates. Harmonics and subdivisions are ambiguous; these are
  not confirmed beat annotations, a tempo map, transcription or proof of listening.
- `src/dev/bestiari-compare/`: video-clock transport, reconstruction, actual game-model rendering and overhead.

The full source was inspected with a coarse 5 s sheet and dense sheets at 1 s, 0.5 s for the more active passages,
and 0.25 s around 138–146 s. This supports the broad orientation sequence and the two late reversals. It does
not certify exact sway phase or all carrier contacts. The overhead shows the same reconstructed path as the 3D;
it is not an independent measurement of the video.

## Plain-language sequence

1. 0–31.7 s: cap a l'esquerra, balanceig i petits canvis de pes sobre la mateixa zona.
2. 31.7–35.5 s: mitja volta passant de cara; acaba amb el cap cap a la dreta.
3. 35.5–66.5 s: repeteix el balanceig a l'altre costat.
4. 66.5–69.5 s: mitja volta pel darrere i torna al costat esquerre.
5. 69.5–86 s: s'acosta en diagonal, s'inclina més i travessa davant de càmera, girant cap a la dreta.
6. 86–121 s: s'allunya, recull el moviment i prepara una altra volta.
7. 121–138 s: passa pel darrere, torna de cara amb inclinacions grans i completa una volta.
8. 138–142.5 s: desfà mitja volta en el sentit contrari.
9. 142.5–145.5 s: torna a invertir el sentit.
10. 145.5–161.3 s: aproximadament quatre voltes seguides; després frena i acaba al costat esquerre.

These are source-time windows, not confirmed bar/phrase boundaries. Do not relabel them as four-step phrases.

## What the prototype does

The reference video's decoded-frame timestamp drives the proposal and overhead. Seek, pause and speed controls
share that clock. Original source audio can be enabled by the viewer; browser checks use mute. No generated
music replaces it. `Ball actual del joc` evaluates the existing pure dance and rig adapter on the original game's
beat grid, at the same elapsed seconds, with its original shorter duration. It is explicitly not phrase-aligned
or globally stretched to pretend to match the source. It also does not include gameplay hit accents.

The proposed shell retains the original game model. The accepted revision in `simple-carriers-v3.md` restores lateral body sway, emphasizes it by 15%, and adds a small artistic head-roll accent. The fitted camera follows a fraction of
the inferred travel. Feet use inferred alternating world-fixed stances and smooth lifted swings. Simple trouser cuffs meet the cloth while the shoes retain their size; hidden knee/hip geometry is omitted. They are a support approximation, not transcribed steps or a new
production rig. The model has a narrower body and a proportionally longer neck than the reference; camera fit
cannot remove that difference. Close approaches and some tilts still need refinement with Marc.

## Current accepted style

For the future plaza characters, see [helpers-design.md](helpers-design.md): timestamped clothing references, standing/seated variants and the distinction between approved N/W/S/E game marks and unverified traditional guide positions.

Marc chose fixed rehearsal marks, simple natural-looking legs, and slightly exaggerated body/head sway. These choices are applied only to the comparison prototype. See `simple-carriers-v3.md` for changes, evidence and limits. The inferred floor trajectory has not been replaced with an invented cardinal route.

## Next validation / integration

Review the matched instants 33, 76, 130, 140.75, 142, 144, 151 and 161.5 s. Confirm direction/order first, then
body sway, distance/camera, supports and proportions. Keep observed and inferred channels distinct. Musical
listening and manual beat/phrase annotation remain pending; automatic periodicity alone must not drive a new
tempo map. Do not port this prototype to the game until those choices are reviewed.

Run `node tests/bestiari-research.mjs`, `npm run check`, and `npm run build`. Consult `validation.md` for the
actual results, browser coverage and remaining limits. Production choreography, source score and music are
unchanged by this research task.
