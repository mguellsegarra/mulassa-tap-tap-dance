# Murdoku del Seguici: regles i textos

Joc a `/jocs/murdoku/`, accessible només per URL. Codi a `src/jocs/games/murdoku/`. `rules.js` és el solucionador, sense pantalla.

## Regles

Murdoku és de Manuel Garand. No he trobat el reglament oficial a la web: les regles surten de guies de tercers que coincideixen ([Culpable](https://culpable.cat/blog/en/how-to-play-murdoku/), [Murdoku Online](https://murdokuonline.org/how-to-play/), [murdx](https://murdx.com/murdoku)).

- Tauler N×N dividit en zones, amb N-1 figures i l'objecte robat, que fa el paper de la víctima.
- Una sola peça per fila i per columna, objecte inclòs.
- La font, l'arbre, la parada i el campanar ocupen la casella. El banc es pot ocupar.
- El culpable és l'única figura a la zona de l'objecte.
- "Tocant" vol dir la casella del costat, sense diagonals. Com que són places i carrers, a diferència de l'original no hi ha parets que ho impedeixin.

`tools/jocs/murdoku-levels.mjs` genera `levels.json` a partir de `plans.js`. Cada cas ha de tenir una sola solució (cerca exhaustiva) i s'ha de poder resoldre només deduint (`deduce`), sense provar i desfer. A més, els 10 casos actuals necessiten la regla del culpable.

## Escenaris

Cada cas passa en un sol lloc de Valls, dividit en parts: plaça del Blat (dos casos), carrer de la Cort, Sant Joan (dos casos), el Pati, Museu Casteller, plaça de l'Oli i Mas Miquel (dos casos). Els plànols són esquemàtics i els objectes són decoració inventada. La posició dels edificis i de les parts encara s'ha de contrastar. De Mas Miquel no he trobat cap font a Valls, així que és un mas abandonat genèric.

## Imatges

`public/jocs/murdoku/cards/`, fetes amb l'imagegen de Codex. L'estil s'inspira en els llibres de Murdoku (terres amb patró, parets gruixudes, retrats quadrats), sense copiar-ne cap dibuix. Les figures parteixen de les cartes del Memory (`memory-sources.md`). El campanar és una interpretació aproximada del de Sant Joan.

## Textos per escriure (Codex)

Tots són provisionals, a `src/jocs/games/murdoku/text.js`. Idioma font: català. Encara pot canviar segons el prototip.

| Clau | Pantalla | Context | Límit |
| --- | --- | --- | --- |
| `OBJECT_NAMES`, `OBJECT_SHORT` | Fulls, fitxes | Què s'ha robat. Codex proposa la llista, que Marc revisa perquè tingui sentit | Curt: 10 caràcters |
| `CASES.*.title` | HUD, full | Títol de cada cas | 18 caràcters |
| `CASES.*.story` | Inici del cas | Situa el lloc i el robatori | 3 línies a 320 px |
| `UI.rule` | Inici del cas | Regles | 3 línies a 320 px |
| `CLUES.*` | Fitxes | Fets d'una figura, units amb "i". Les figures poden ser plurals | 2 línies a 320 px per fitxa |
| `PART_NAMES` | Tauler, fitxes | Parts de cada lloc | 8 caràcters |
| `THING_NAMES` | Fitxes | Objectes del plànol | 10 caràcters |
| `UI.guide*` | Cas guiat | Explica el pas actual | 2 línies a 320 px |
| `UI.accuse`, `solved`, `wrong`, `noCulprit`, `next`, `allDone`, `menu`, `investigate` | Acusació i fulls | | 1 o 2 línies a 320 px |
| `UI.hintWrong`, `hintNext` | Pista | | 1 línia a 320 px |
| `UI.mark`, `cell`, `marked`, Desfés, Pista, Casos | Lector de pantalla | | |
