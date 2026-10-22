# Notes del coreà (ko)

- Traducció en 해요체; els judicis i les etiquetes breus fan servir formes nominals. Els plurals només tenen `other`, tal com indica `meta.json`.
- No queden dubtes de traducció pendents. Les variants de gènere i elisió catalanes tenen el mateix text coreà; les dates pròpies es mostren en ordre any, mes, dia.
- `node tests/i18n.mjs` s’ha aturat perquè falta `src/i18n/locales/eu/html.json` al checkout compartit. A més, la comparació actual suma marcadors de totes les formes plurals catalanes; cal comparar cada forma amb la referència semàntica per admetre el coreà amb només `other`. La validació específica de les 869 claus coreanes passa.
- `node tests/seo.mjs` falla a `a single language adds no hreflang`: la prova encara pressuposa un sol idioma. L’estructura, els enllaços, els marcadors i la sortida coreana s’han comprovat per separat.
- Integració pendent fora de l’abast: `tools/seo-pages.mjs` genera els identificadors de secció només amb caràcters ASCII; els encapçalaments coreans produeixen identificadors buits o repetits. Cal resoldre-ho al generador compartit, sense desnaturalitzar els títols traduïts.
- No s’han validat visualment les fonts ni la disposició coreanes; les fonts, el registre de l’idioma i la seva activació corresponen a la integració.
