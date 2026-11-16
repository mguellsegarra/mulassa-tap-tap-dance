# Bou Tradicional: musicians for the game

Research on 2026-11-05. No model, audio or runtime changes.

## Score evidence

Inspected both pages of `music/bou-tradicional/Bou-Tradicional.pdf`, rendered locally under `output/bou-musicians/`. Title: El Bou Tradicional de Valls; Francesc Bofarull; June 2012. The first system explicitly labels Gr. I, Gr. II and Gralla Baixa. These are three independent wind parts, retained throughout both pages. No percussion staff or named percussion instrument appears. `score.json` independently records the same three voice labels.

The lower part is expressly a gralla baixa, not merely an unspecified bass line. Gralla I leads, Gralla II supplies the second melodic/harmonic voice, and the gralla baixa supplies the lower foundation. The score does not specify how many players double each line, clothing or physical placement.

## External corroboration

- Agrupació del Bestiari, figure-specific technical sheet, accessed 2026-11-05: explicitly lists four musicians for the UAF Bou Tradicional. This establishes a documented headcount, not their individual instruments: https://www.bestiari.cat/figura/bou-tradicional-de-valls/
- Official Valls Santa Úrsula 2022 programme names grallers Blu's with the Bou Tradicional, while assigning mitja cobla Bufalodre to the dragons. This supports grallers as the ensemble family for this figure; a particular event does not establish a permanent contracted group: https://www.valls.cat/images/221004PROGRAMA_santaursula2.pdf
- UAF figure identity: https://uaf.cat/seguici-ceremonial/bou-tradicional/

## Conclusion and confidence

Recommended representation: four musicians, one playing Gralla I, one Gralla II, one gralla baixa and one timbal. Three gralla parts are observed in the score; four total musicians are externally documented. Assigning the fourth player to timbal is a strong practical inference and should remain labelled inferred until verified in a clear performance image/video. The score alone proves neither a percussion part nor a unique performance headcount.

The generated game's techno kick, kit and taiko accompaniment are arrangement additions. They are not evidence for a corresponding original stage ensemble. Keep the music intact while changing any visual musicians later.

Current code uses the default Mulassa wind-band roster for the Bou: BOU_SCENE has no band override. A future implementation should use its existing per-figure band hook; no shared figure-id branch is needed. Before modelling, verify gralla/timbal construction, musicians' clothes and positions against the chosen reference performance. This research does not claim those details are approved or implemented.

## Exploration prototype

`tools/dev/bou-musics.html` shows M1/Gralla I, M2/Gralla II, M3/Gralla baixa and M4/timbaler, with orbit, zoom, pause and individual focus. The owner supplied these appearance references: M1 is a white blond man; M3 is a woman with long brown hair and no veil. The overrides are local to `src/figures/bou/bou-musicians.js`, using the shared musician rig and representation bodies. Clothes and the precise timbal model remain provisional. These players are not yet added to the playable Bou's band.

The four-model review base was accepted. General checks pass 131/131 and existing real-GPU checks 3/3. The roster packs with `skinCrowd` into one mesh with 20 bones; it does not require a separate skinned mesh for each person. The prototype still renders standalone; physical-device cost after game-scene integration remains to be measured.
