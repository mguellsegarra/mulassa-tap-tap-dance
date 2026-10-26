# Notes de la traducció ucraïnesa

- Traducció directa del català, amb tractament «ти»; GUA, PA, GUAPA!, CRE, MA i CREMA es mantenen en llatí.
- Tots els 13 plurals inclouen one/few/many/other; `other` usa el genitiu singular per als decimals. `meta.json` encara omet `other` per a uk; no l’he modificat perquè és compartit.
- «BÉ» es tradueix com «ДОБРЕ» (5 caràcters): superar la proporció de longitud és necessari per mantenir una paraula ucraïnesa natural. No he verificat visualment l’ajust ni la cobertura dels glifs ciríl·lics.
- Els noms de temporada interpolats es mantenen sense declinar, amb fórmules com «сезону {name}»; els noms propis de figures i els àlies també es conserven.
- El test global i18n s’ha aturat perquè falta `eu/html.json` al checkout compartit. A més, el comparador actual concatena els marcadors de totes les formes plurals, cosa que no permet comparar correctament dos plurals catalans amb quatre d’ucraïnesos. La validació específica de uk compara els marcadors de cada forma per separat.
- El test SEO global falla a «a single language adds no hreflang»: pressuposa que només existeix ca. La validació específica comprova l’estructura, els marcadors, els enllaços i la generació de la pàgina ucraïnesa.
