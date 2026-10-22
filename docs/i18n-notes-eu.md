# Notes de traducció eu

- `ui.seasons.of*` i `ui.board.withArticle.*`: el nom queda sol; la frase que el conté ja aporta el context i així no cal declinar un marcador variable.
- `ui.stats.since*` i `ui.seasons.since*`: he fet servir una etiqueta de data inicial per evitar sufixos enganxats als marcadors.
- Longitud: `ONDO` (4), `BERANDU` (7), `JOKATU` (6), `Argazkiak` (9), `Zuriunea` (8), `Ezkutatu` (8) i `Podiuma/Podiumak` (7/8) superen la proporció orientativa dels originals més curts; he preservat formes naturals. Cap etiqueta curta de HUD/joc que en català tenia fins a 24 caràcters supera els 24.
- Validació específica eu: 869 claus en el mateix ordre, plurals one/other, marcadors i etiquetes idèntics al català; cap sufix enganxat als marcadors. SEO amb la mateixa estructura, enllaços i marcadors; home conservat en català.
- Els tests globals executats s’aturen en comprovacions alienes a eu: `tests/i18n.mjs` compara el nombre agregat de marcadors del plural japonès amb el català; `tests/seo.mjs:54` pressuposa una sola llengua i rebutja els hreflang. No he modificat els tests ni altres llengües.
