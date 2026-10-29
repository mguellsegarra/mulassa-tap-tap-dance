---
name: mulassacat-nova-figura
description: "Mulassa project only. Entry point for bringing a new festive figure (beast, giant, group) into the game: viability, reference dance, music, chart, voxel model, dance on the model, colla and festa, thumbnails, cameras, integration and validation, in that order. Use whenever a new figure is started, resumed or audited, and to find which skill owns each phase."
---

# A new figure, end to end

Apply only to Mulassa and its checkouts. This skill orders the work and names the owner skill of each phase; it does not repeat their rules. It does not authorize delegation, publication, production data or Git history operations.

Read first:

- [research/bestiari/pla-nova-figura.md](../../../research/bestiari/pla-nova-figura.md): the owner's full brief for a new figure (Catalan): references, plain-words phases, compass marks, music, model identity, legs, comparator, colla, full review, integration and the "ready for review" criterion. It is the acceptance contract.
- [references/metode-mulassa-drac.md](references/metode-mulassa-drac.md): the method learnt on the Mulassa and the Drac (identity before modelling, original music before arranging, observation apart from adaptation).
- The figure's own folder under `research/bestiari/` if it exists. Research dossiers for about 34 more figures (DOSSIER, MUSICA, RECURSOS, PROMPT) live outside the repo in the owner's `Bestiari de Valls - I+D` folder; ask for it if the figure has one.

The Bou Tradicional is the first figure taken through every phase; when unsure how a phase looks finished, look at its files (`src/figures/bou/`, `music/bou-tradicional/`, `research/bestiari/bou-tradicional/`). The human guide with every asset and where it goes, and the fill-in template for a PR, is [docs/figures/nova-figura.md](../../../docs/figures/nova-figura.md).

## Phases

Each phase ends with something the owner can open (a URL on the LAN address, an HTML page, a phone preview) and an explicit go-ahead. Do not start integrating a phase the owner has not reviewed.

| # | Phase | Owner skill | Done when the owner can… |
| --- | --- | --- | --- |
| 0 | Viability | this skill | see whether the figure has its own music and dance, a score, full-length videos and a colla, and agree to go on |
| 1 | Reference dance | `bestiari-reference-analysis` | read the dance phase by phase in plain words and watch video, 3D and overhead map at the same instant |
| 2 | Music | `mulassacat-musica` | hear the festive version on the phone, at about 90–120 s, with the shared count-in |
| 3 | Chart and game words | `mulassacat-musica` | play the three levels; see the figure's own button words, drumroll element and final chant |
| 4 | Voxel model | `mulassacat-voxel` | orbit the model on the phone, faithful and readable, without holes, blinks or floating parts |
| 5 | Dance on the model | `mulassacat-voxel`, `bestiari-reference-analysis` | see the dance with the comic beat layer, planted feet, weighty tail, and its free-play keys |
| 6 | Colla, crowd and festa | `mulassacat-colla-festa` | see the documented attendants, the crowd making way and the figure's own festa |
| 7 | Thumbnails | `mulassacat-miniatures` | compare vector and pixel portraits against real photos and mark redos |
| 8 | Cameras | `mulassacat-camera` | watch the selector showreel and play without dizziness, the figure always framed |
| 9 | Integration | `mulassacat-integracio-figura` | pick the figure on the selector and play, practise, free-play and see results, records and help |
| 10 | Validation | `mulassacat-validacio-visual` | receive captures and videos at every size that the agent has already checked |

## Rules across phases

- **Nothing may assume the Mulassa.** Texts, statistics, help, HUD elements, effects and words belong to the figure that is playing. GUA·PA is the Mulassa's; every figure gets its own pair, chant, drumroll element and festa.
- **Faithful, then fun.** Each phase first reconstructs what the reference shows, labelled observed / inferred / adapted / pending, then adds the festive exaggeration the game needs, as a separate, reversible layer.
- **Work in a worktree from the main game worktree**, keep the previous version reachable for comparison (a `&model=v1`-style switch), and integrate into the main worktree once approved. One dev server per worktree.
- **Preserve what is approved.** A later phase never changes an approved model's proportions, an approved song or approved art to suit itself; if it must, ask.
- **One timeline.** Dance, notes, effects and camera read the song's own beat grid; the same instant always gives the same pose, whatever the seek.
- **Show, then ask.** Offer 3–5 visual proposals when a design is open, and collect decisions with short questions, not long reports (see `mulassacat-revisio-amb-marc`).

## Viability (phase 0)

Before any model or code:

1. Confirm the figure, town, edition and owning colla. Do not confuse a figure with a namesake (the UAF's Bou Tradicional is not the Turba's Bou) or with a newer or older edition (the Àliga is the 1991 one).
2. Check whether it has its own music and dance at all. Some figures only have a drum call or walk in parades; say so instead of inventing a dance.
3. Look for a score (association, music schools, gralla groups) and at least two complete, continuous videos with audible music. Record URL, author, event, date, duration and what is visible.
4. Find the colla's dress, helpers and roles from photos.
5. Report what exists, what is missing and the proposed order, and wait for the owner's go-ahead.
