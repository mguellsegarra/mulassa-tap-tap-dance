# Bestiari: anàlisi i comparatives

Aquest directori conserva les dades, decisions i prototips de recerca. No és contingut del joc publicat.

- [Drac: versió revisada](drac/README.md)
- [Mulassa: anàlisi i comparativa](mulassa/README.md)
- [Skill comuna](../../.agents/skills/bestiari-reference-analysis/SKILL.md)

## Originals externs

Els vídeos, àudios, planxes i renders pesants es guarden al paquet de recerca extern. No van a `public/` ni a Git.
`media.json` enumera només els fitxers que el servidor de desenvolupament pot servir. El fitxer local ignorat
`.bestiari-media.json` associa cada arrel amb la ubicació física de l'arxiu:

```json
{ "drac": "/ruta/al/Drac/reference-media", "mulassa": "/ruta/a/Mulassa/revisio" }
```

L'endpoint `/_bestiari/media/<identificador>` només existeix en desenvolupament i admet salts de vídeo mitjançant
peticions Range. Un servidor nou llegeix la configuració local; no cal canviar el codi quan es mou l'arxiu.
L'àlies `/drac-reference/pm-lEViiPK0.mp4` conserva la compatibilitat amb el prototip del Drac.

## Què es conserva a Git

Fonts i hashes, anotacions temporals, marc espacial, hipòtesis, decisions de Marc, scripts, tests i codi del visor.
Cada revisió diferencia observat, inferit, adaptat i pendent. Una prova numèrica no valida l'aparença ni l'escolta.
Els manifestos permeten verificar integritat; no acrediten una còpia de seguretat externa ni drets de publicació.

## Estat de preservació, 19/10/2026

El Drac s'ha copiat des del worktree de prova conservant dependències antigues dins `drac/prototype/`, perquè el
selector actual pot tenir models diferents. És una mostra congelada per comparar, no un segon motor de producció.
La futura integració ha d'extreure els mòduls útils i conservar aquesta referència abans de retirar duplicacions.
Els originals i el worktree anterior no s'han eliminat. Desar aquests fitxers al checkout no equival a fer commit.

Les anàlisis noves han de tenir un dossier propi, sense heretar marques cardinals, nombre de portadors, tempos o
recomptes d'una altra figura. Primer font i anotació; després reconstrucció i contrast visual.
