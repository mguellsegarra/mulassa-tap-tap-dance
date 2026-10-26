# The Bou's music: what each round taught

The approved package and its history are in `music/bou-tradicional/README.md` (Catalan). This file keeps the review lessons that apply to the next figure. Numbers are this song's, not rules.

## Source

- The first attempt worked from video recordings: filtering the audio and isolating the gralla's melody from the drumroll was not enough to get clean notes, and several recordings had to be compared. Once the owner supplied the score PDF, the instruction was to follow the score only and drop the recordings' variant ("Wind").
- Confirm the figure first: the UAF's Bou Tradicional, never the Turba's Bou, which has different music.
- The score still had an engraving error (bar 12, Gralla I, a missing natural). The owner heard it as out of tune against live performances; the fix went into `score.json` with a `notationNotes` entry, the PDF stayed as published.

## Arrangement rounds

| The owner said | What changed |
| --- | --- |
| The main voice should sound more, second voices less, more percussion, more like the Mulassa and the Drac | Lead on the shared instrument; second voices lowered repeatedly; taiko-style kit |
| It needs the intro the other songs have | The shared count-in plus the figure's own 8-beat intro after BALLA! |
| Add a more techno kick, but not from the start: it sounds monotonous | Kick from about 0:55; the final section techno |
| The kick cannot be heard on phones | A mobile mix (v14) with a kick that survives small speakers, approved separately from v13 |
| The ending goes down; end higher | Ascending close (sol–si–do) on the same instrument, simple fade |
| The final note hurts, sounds different | No special effect on the last note, shorter ring |
| Almost three minutes is too long; the cut phrase does not fit | Several shortened versions in one HTML with a phrase selector; cut only at repeated phrases; the opening phrases kept identical |
| The first note comes much later after 3·2·1 than on the Mulassa and the Drac | The first intro bar cut (`cutBeats` in `playback.json`) so the first note lands near the others' |

## Process lessons

- Every listening round went through a small HTML page served to the owner's phone, with the candidate versions side by side.
- `validation.json` records `listeningVerified: false` for the agent. The owner's acceptance is recorded separately in `approval.json`, per version; a new mix is not covered by an older approval.
- `source-v13.zip` freezes the generator and its inputs, so the approved audio can be rebuilt without the research worktree.
- The festa effects and the dance are timed on the same `timing.json` grid; after any tempo or form change, recheck the dance sync (a 1–2 s drift was reported once).
