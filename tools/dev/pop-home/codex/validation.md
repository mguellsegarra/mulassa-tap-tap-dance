# Validació visual de les propostes

Captures reals amb Chrome headless, GPU Metal, DPR 1. Figures renderitzades amb createBoard().portraits(), logo SVG copiat sense canvis. Sense animació de la Mulassa.
32 portades i 32 fulls d'instruccions capturats a /tmp/pop-home-codex/.
Revisió visual de les 32 portades en quatre làmines de contacte i del full a 320×568.
Cap portada desborda en les vuit mides. Els fulls tenen desplaçament intern per llegir totes les regles i extres; el botó Tanca i Escape els tanquen.
Accés a instruccions, retorn al menú, selector A–D i persistència de notes comprovats al navegador.
No s'han executat tests ni npm run check. No s'ha modificat ni integrat el joc. No hi ha jurat extern ni prova en dispositiu físic.
El rècord 57 és una dada de mostra, sense llegir ni escriure pica-best. Música simula l'estat del control, sense reproduir àudio. Juga navega a /pop/.

## Mesures de composició
Caixes DOM en píxels CSS; no són mesures de tinta de les lletres.
Marges laterals iguals, controls de 44 px com a mínim, separació entre accions 8/12 px (més 4 px abans del secundari), interior de targeta 12/16/20/24/32 px segons mida.
Les composicions d'escriptori tenen dues columnes a A, B i D; C distribueix les tres regles en una fila.
La taula recull la caixa principal de cada variant. Les excepcions de separació són deliberades: rècord separat de les accions i botó principal amb relleu inferior.

| Proposta | Mida | Marge esquerre / dret del bloc | Alçada bloc | Desbordament |
|---|---|---|---|---|
| A | 320×568 | 16 / 16 | 204 | No |
| A | 375×667 | 16 / 16 | 204 | No |
| A | 393×852 | 24 / 24 | 228 | No |
| A | 430×932 | 25 / 25 | 228 | No |
| A | 1024×768 | 577 / 32 | 344 | No |
| A | 1280×800 | 710 / 112 | 344 | No |
| A | 1440×700 | 790 / 192 | 344 | No |
| A | 1920×1080 | 1030 / 432 | 344 | No |
| B | 320×568 | 16 / 16 | 245 | No |
| B | 375×667 | 16 / 16 | 245 | No |
| B | 393×852 | 24 / 24 | 283 | No |
| B | 430×932 | 25 / 25 | 283 | No |
| B | 1024×768 | 589 / 32 | 317 | No |
| B | 1280×800 | 723 / 112 | 317 | No |
| B | 1440×700 | 803 / 192 | 317 | No |
| B | 1920×1080 | 1043 / 432 | 317 | No |
| C | 320×568 | 16 / 16 | 394 | No |
| C | 375×667 | 16 / 16 | 394 | No |
| C | 393×852 | 24 / 24 | 505 | No |
| C | 430×932 | 24 / 24 | 505 | No |
| C | 1024×768 | 32 / 32 | 428 | No |
| C | 1280×800 | 160 / 160 | 428 | No |
| C | 1440×700 | 240 / 240 | 428 | No |
| C | 1920×1080 | 480 / 480 | 428 | No |
| D | 320×568 | 16 / 16 | 383 | No |
| D | 375×667 | 16 / 16 | 383 | No |
| D | 393×852 | 24 / 24 | 443 | No |
| D | 430×932 | 24 / 24 | 443 | No |
| D | 1024×768 | 32 / 32 | 434 | No |
| D | 1280×800 | 112 / 112 | 434 | No |
| D | 1440×700 | 192 / 192 | 434 | No |
| D | 1920×1080 | 432 / 432 | 434 | No |

## Captures

Noms: A-393x852.png, A-320x568.png, A-1024x768.png, A-1280x800.png; el mateix patró per B, C i D. També 375x667, 430x932, 1440x700 i 1920x1080. Els fulls porten el prefix A-help- (i B/C/D). A-overview.png fins a D-overview.png mostren tota la matriu. measurements.json conserva les caixes originals.
