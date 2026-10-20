# Revisió local del moviment de les persones

Les variants de representació s'activen per defecte als hosts de loopback del joc local.
`?mute&representation=off` manté els models originals per comparar. No s'activen per defecte als hosts públics.
Els percentatges aprovats i les decisions de vestuari són a `src/dev/representation/population.js` i `models.js`.

## Cicle de treball

1. Conservar el vídeo del defecte i les fonts inicials fora del repo. Identificar si passa a portada, selector, joc o mode lliure.
2. Executar `node tests/representation-motion.mjs`: rig real a 30/60/120 Hz, oscil·lació prop del llindar de velocitat,
   reculades, girs de cadira, contacte final del bastó i separació després del suavitzat.
3. Amb un servidor local existent, executar `tools/representation-review.mjs`. No crea ni reinicia servidors.
   Fa servir una instal·lació existent de Playwright i Chromium. `PLAYWRIGHT_MODULE` i `BROWSER_BIN` permeten indicar-ne els camins.

   ```sh
   node tools/representation-review.mjs --output=/ruta/fora-del-repo/revisio
   ```

   Sempre navega amb `?mute`. Cada cas té un navegador propi, seed del món 424242, seed de població declarat, vídeo WebM,
   captures, dades i índex HTML. La prova sencera té nou casos curts: portada, selector, conducció amb culada, joc,
   finale, dos seeds addicionals, canvi de qualitat i viewport mòbil. La captura mòbil és emulació de viewport.
4. Llegir `after-manifest.json` i mirar els vídeos. El codi de sortida 1 assenyala errors de pàgina, velocitat de mà >9 m/s, velocitat d'arrel >10 m/s, interseccions aproximades de tronc, caigudes/arrossegament de variants
   protegides o dos renders diferents sense avançar el rellotge. Les distàncies de mà descompten la translació de l'arrel;
   conserven els girs del cos. La velocitat usa el rellotge d'animació, no el retard variable d'entrega del navegador.
5. Corregir la primera relació que falla. Repetir només el cas afectat amb `--case=quality`, `--case=drive`, `--case=play`,
   `--case=finale`, `--case=mobile` o `--case=selector`. El manifest conserva els altres casos i substitueix el repetit.
   Tornar a fer la passada completa si el canvi afecta tots els casos. `--quick` grava només la portada.
6. Quan les mesures passen, revisar també fotogrames adjacents al vídeo. No ampliar toleràncies per convertir un error en verd. El pas brut de mà es conserva com a dada: s'ha de llegir amb dt, ja que un fotograma de 50 ms pot recórrer més espai sense cap discontinuïtat. La prova de rig limita el pas a 18 cm a 30/60/120 Hz.
   Fer les comprovacions generals del projecte i conservar evidència final. No es fa commit ni desplegament automàtic.

`--baseline --quick` carrega una còpia inicial de l'adaptador des de
`<output>/before/src__dev__representation-preview.js`. Serveix per demostrar que el detector detecta el canvi brusc de postura.
Comparteix la física actual: és un contrast de l'adaptador, no un checkout històric complet.

## Què no certifica

Els límits són alarmes de diagnòstic, no estàndards universals de naturalitat. Les caixes del tronc són una aproximació;
no mesuren totes les interseccions de roba, cadires, instruments o dits. El render repetit comprova estabilitat amb el
rellotge quiet, no descarta tots els efectes de profunditat durant el moviment. Cal revisar clips de detall i la situació
original de Marc abans de donar un canvi per acabat. La sonda i la gravació afegeixen cost: no són un benchmark del joc.
