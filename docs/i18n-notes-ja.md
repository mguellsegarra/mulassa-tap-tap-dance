# Notes de japonès

- `ui.seasons.of` i `ui.seasons.ofElided` retornen només `{name}`: `ui.board.podiumOf` ja hi posa la partícula japonesa の; així no es duplica.
- `figures.practice.balloon.word.drac` i `html.legend.carretillesName`: 火花 (guspires) és una etiqueta curta per a les carretilles, no el nom d’un equivalent cultural japonès.
- Les cadenes mantenen noms, àlies i referències locals en llatí; les glosses de bestiari, seguici, colla i festa major apareixen als textos llargs on s’utilitzen.
- Falta verificar visualment la cobertura de glifs japonesos, les amplades reals de l’HUD i els fragments compostos; fonts i integració de l’idioma són fora de l’abast d’aquesta traducció.
- Validació específica: 869 claus, 13 plurals amb `other`, ordre, marcadors, etiquetes, estructura SEO, enllaços i generació HTML/Markdown japonesos correctes amb un script ESM temporal fora del repositori.
- `node tests/i18n.mjs` ha fallat perquè faltava `src/i18n/locales/eu/html.json`; `node tests/seo.mjs` ha fallat a «a single language adds no hreflang», una expectativa que encara assumeix una sola llengua. No s’han modificat els tests ni altres idiomes.
