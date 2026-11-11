# Actius reutilitzables

Comprovat el 2026-11-01. `MTTD` és `/Volumes/development/projects/mulassa-tap-tap-dance`.

| Actiu | On | Serveix per a |
| --- | --- | --- |
| 10 retrats de píxels de Valls, com a graella i paleta | `bestiari-memory/src/figures.js` (copiats de `MTTD/src/game/figure-portraits.js`) | Pinta per números, Endreça, Seguici Crush, Suma de bèsties, Del Nan al Gegant |
| Figures de Valls al catàleg: Mulassa, Drac, Bou Tradicional, Ós, Nans, Cavallets, Basilisc, Àliga, Gegants i Gegantons, Diables | `MTTD/src/game/figure-catalog.json` | Contingut base |
| Siluetes dibuixades a mà de les figures pendents | `MTTD/src/ui/pending-silhouettes*.js` | Ombres. De Valls n'hi ha 5: Àliga, Ós, Gegants, Cavallets i Basilisc. Mulassa i Drac no hi són |
| Models voxel de Mulassa, Drac i Bou | `MTTD/src/figures/`, còpia a `pica-la-mulassa/src/models/` | Premi de "la figura balla", Travessa la cercavila |
| Calçot, campanar, carretilla, porró, petard | `pica-la-mulassa/src/rules.js` i `mula-art.js` | Talla calçots, Tronada, Seguici Crush |
| Cançons i charts | `MTTD/src/song-*.json`, `public/music/` | Duel GUA-PA, Compta a cop de tabal |
| Judici pur | `MTTD/src/game/judge-core.js` | Duel GUA-PA |
| Fonts Baloo 2 i Jersey 10 | `public/fonts/` dels dos minijocs | Tots |

## Observació

Aquests actius ja s'han copiat dues vegades, una a cada minijoc. Amb un tercer joc val la pena tenir-ne un sol paquet, o bé actualitzar un retrat voldrà dir retocar-lo a cada projecte. Per això recomano un repo únic (decisió D1 del handoff).

Si els jocs no fan servir three.js, carreguen molt més de pressa. Per als jocs 2D, només cal tenir els retrats i dibuixar sobre un canvas.
