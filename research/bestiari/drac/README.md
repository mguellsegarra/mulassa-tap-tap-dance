# Drac: referència revisada del 19/10/2026

Obre `/research/bestiari/drac/prototype/drac-compare.html?mute` al servidor Vite d'aquest checkout.

`prototype/` conserva els mòduls del visor, el model que realment instanciava, les dependències locals i les proves.
`snapshot.json` registra els hashes d'origen. S'ha adaptat només l'entrada HTML perquè carregui els mòduls relatius.
`evidence/` conserva les anotacions petites extretes del directori que abans estava ignorat sencer.
`music/` i `legacy-music-trial.md` documenten les dues candidates musicals i les incerteses pendents.
`legacy/` conserva també els generadors i el visor musical anterior amb les dependències; els dos MP3 són a
`music-candidates/` dins l'arxiu extern del Drac. Els seus hashes són a `legacy/snapshot.json`.
Les proves copiades mantenen supòsits del repositori antic. La verificació portable de la preservació és
`node tests/bestiari-research.mjs`, executada des de l'arrel d'aquest checkout.

## Decisions i límits

- 33 frases, 0–104,8 s de vídeo. 188 col·locacions: 40 observades, 4 probables, 4 de suport i 140 adaptades.
- Carcassa rígida portada; pelvis independent, peus amb contacte estable i pantalons continus al genoll/turmell.
- Flexió i balanceig còmics demanats per Marc, separats de la coreografia base.
- S és el primer avanç; N l'oposat, W/E l'eix perpendicular. La càmera té la seva pròpia marca.
- Posicions, distàncies i angles intermedis aproximats. La vista zenital mostra la reconstrucció del model.
- Música Austera/Festiva encara sense selecció definitiva verificada en aquest handoff; discrepància tardana de
  la coda documentada. El moviment de `drac-lab` és anterior al de `drac-compare`.

`handoff.md` és el prompt complet per integrar-ho amb Opus. Les seves rutes al worktree antic són històriques:
la còpia preservada ara és aquest dossier; consulta `prototype/src/dev/drac-compare/` com a font del moviment.
No s'ha integrat ni substituït el ball del joc en consolidar l'arxiu.
