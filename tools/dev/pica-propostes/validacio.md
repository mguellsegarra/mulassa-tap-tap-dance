# Validació visual de les propostes

Captures del 2 de novembre de 2026. Quatre conceptes × sis pantalles × set mides: 168 estats. Chromium sense finestra amb SwiftShader, DPR 1. No és una mesura de rendiment amb GPU real.

Mides: 320×568, 375×667, 393×852, 1024×768, 1280×800, 1440×700 i 1920×1080. Cap desbordament horitzontal mesurat. Controls visibles de 44 px o més. Mòbil amb tacte emulat comprovat a 393×852; cap telèfon ni iPad físic.

Notes: persistència després de recàrrega, canvi de marca, exportació de les 24 pantalles i alternativa de còpia sobre HTTP comprovats. Navegació menú → ajuda → joc → pausa → continua, canvi local/general i publicació simulada comprovats. No hi ha cap crida de publicació real.

Els menús de telèfon desplacen tota la pàgina quan cal. Els fitxers amb el sufix `-completa.png` mostren tot el contingut. La partida manté el tauler dins de la pantalla. Les captures normals conserven la mida exacta demanada.

He mirat els fulls de contacte i captures individuals. No he convocat jurat ni agents, segons l’encàrrec. No he executat tests del repositori, tests de render ni npm run check; falta la revisió del propietari.

## Separacions

Distàncies en píxels pintats, calculades de cada captura dins de les franges de contingut del panell. La primera i l’última són marge superior i inferior; la resta separen els blocs. Les ombres i el suavitzat de les lletres poden moure el límit 1–2 px. Els espais interiors dels botons no es confonen amb la separació entre blocs. El menú, l’ajuda, la pausa i el resultat tenen blocs diferents; no s’exigeix el mateix nombre de files.

| Proposta / pantalla | Mida | Marges laterals CSS | Separacions pintades | Separació entre blocs CSS | Radi panell |
| --- | --- | --- | --- | --- | --- |
| A / menu | 393×852 | 24px | 27, 31, 31, 24 | 16px | 20px |
| A / help | 393×852 | 24px | 27, 19, 20, 24 | 16px | 20px |
| A / pause | 393×852 | 24px | 27, 19, 19, 27 | 16px | 20px |
| A / end | 393×852 | 24px | 27, 33, 39, 31, 24 | 16px | 20px |
| A / rank | 393×852 | 24px | 27, 21, 28, 19, 18, 24 | 16px | 20px |
| B / menu | 393×852 | 24px | 32, 32, 31, 26 | 16px | 12px |
| B / help | 393×852 | 24px | 32, 19, 21, 25 | 16px | 12px |
| B / pause | 393×852 | 24px | 32, 19, 21, 26 | 16px | 12px |
| B / end | 393×852 | 24px | 32, 33, 39, 31, 25 | 16px | 12px |
| B / rank | 393×852 | 24px | 32, 21, 30, 22, 18, 25 | 16px | 12px |
| C / menu | 393×852 | 24px | 26, 30, 31, 23 | 16px | 28px |
| C / help | 393×852 | 24px | 26, 19, 22, 23 | 16px | 28px |
| C / pause | 393×852 | 24px | 26, 21, 19, 26 | 16px | 28px |
| C / end | 393×852 | 24px | 26, 33, 39, 32, 23 | 16px | 28px |
| C / rank | 393×852 | 24px | 26, 22, 28, 19, 19, 23 | 16px | 28px |
| D / menu | 393×852 | 24px | 28, 20, 31, 25 | 16px | 2px |
| D / help | 393×852 | 24px | 28, 19, 21, 25 | 16px | 2px |
| D / pause | 393×852 | 24px | 28, 19, 19, 28 | 16px | 2px |
| D / end | 393×852 | 24px | 28, 33, 28, 31, 25 | 16px | 2px |
| D / rank | 393×852 | 24px | 28, 21, 28, 19, 18, 25 | 16px | 2px |
| A / menu | 320×568 | 16px | 20, 26, 26, 16 | 12px | 20px |
| A / help | 320×568 | 16px | 20, 15, 15, 16 | 12px | 20px |
| A / pause | 320×568 | 16px | 20, 15, 15, 18 | 12px | 20px |
| A / end | 320×568 | 16px | 20, 29, 34, 26, 16 | 12px | 20px |
| A / rank | 320×568 | 16px | 20, 17, 24, 14, 17, 16 | 12px | 20px |
| B / menu | 320×568 | 16px | 25, 26, 26, 18 | 12px | 12px |
| B / help | 320×568 | 16px | 25, 15, 15, 18 | 12px | 12px |
| B / pause | 320×568 | 16px | 25, 15, 18, 18 | 12px | 12px |
| B / end | 320×568 | 16px | 25, 29, 34, 26, 18 | 12px | 12px |
| B / rank | 320×568 | 16px | 25, 18, 27, 17, 17, 18 | 12px | 12px |
| C / menu | 320×568 | 16px | 19, 25, 26, 15 | 12px | 28px |
| C / help | 320×568 | 16px | 19, 15, 15, 15 | 12px | 28px |
| C / pause | 320×568 | 16px | 19, 14, 15, 17 | 12px | 28px |
| C / end | 320×568 | 16px | 19, 29, 34, 26, 15 | 12px | 28px |
| C / rank | 320×568 | 16px | 19, 17, 24, 14, 17, 15 | 12px | 28px |
| D / menu | 320×568 | 16px | 21, 16, 26, 17 | 12px | 2px |
| D / help | 320×568 | 16px | 21, 15, 15, 17 | 12px | 2px |
| D / pause | 320×568 | 16px | 21, 15, 15, 20 | 12px | 2px |
| D / end | 320×568 | 16px | 21, 29, 24, 26, 17 | 12px | 2px |
| D / rank | 320×568 | 16px | 21, 17, 24, 14, 17, 17 | 12px | 2px |
| A / menu | 375×667 | 16px | 20, 27, 26, 16 | 12px | 20px |
| A / help | 375×667 | 16px | 20, 15, 16, 16 | 12px | 20px |
| A / pause | 375×667 | 16px | 20, 15, 15, 17 | 12px | 20px |
| A / end | 375×667 | 16px | 20, 29, 34, 26, 16 | 12px | 20px |
| A / rank | 375×667 | 16px | 20, 17, 24, 14, 15, 16 | 12px | 20px |
| B / menu | 375×667 | 16px | 25, 28, 26, 18 | 12px | 12px |
| B / help | 375×667 | 16px | 25, 15, 17, 18 | 12px | 12px |
| B / pause | 375×667 | 16px | 25, 15, 19, 17 | 12px | 12px |
| B / end | 375×667 | 16px | 25, 29, 34, 26, 18 | 12px | 12px |
| B / rank | 375×667 | 16px | 25, 18, 27, 18, 15, 19 | 12px | 12px |
| C / menu | 375×667 | 16px | 19, 26, 26, 15 | 12px | 28px |
| C / help | 375×667 | 16px | 19, 15, 17, 15 | 12px | 28px |
| C / pause | 375×667 | 16px | 19, 15, 15, 17 | 12px | 28px |
| C / end | 375×667 | 16px | 19, 29, 34, 26, 15 | 12px | 28px |
| C / rank | 375×667 | 16px | 19, 17, 24, 14, 15, 15 | 12px | 28px |
| D / menu | 375×667 | 16px | 21, 17, 26, 17 | 12px | 2px |
| D / help | 375×667 | 16px | 21, 15, 17, 17 | 12px | 2px |
| D / pause | 375×667 | 16px | 21, 14, 15, 19 | 12px | 2px |
| D / end | 375×667 | 16px | 21, 29, 24, 26, 17 | 12px | 2px |
| D / rank | 375×667 | 16px | 21, 17, 24, 14, 15, 17 | 12px | 2px |
| A / menu | 1024×768 | 24px | 27, 34, 37, 24 | 16px | 20px |
| A / help | 1024×768 | 24px | 27, 21, 20, 24 | 16px | 20px |
| A / pause | 1024×768 | 24px | 27, 21, 19, 26 | 16px | 20px |
| A / end | 1024×768 | 24px | 27, 40, 48, 37, 24 | 16px | 20px |
| A / rank | 1024×768 | 24px | 27, 19, 23, 15, 18, 24 | 12px | 20px |
| B / menu | 1024×768 | 24px | 32, 35, 37, 26 | 16px | 12px |
| B / help | 1024×768 | 24px | 32, 21, 22, 26 | 16px | 12px |
| B / pause | 1024×768 | 24px | 32, 21, 22, 25 | 16px | 12px |
| B / end | 1024×768 | 24px | 32, 40, 48, 37, 25 | 16px | 12px |
| B / rank | 1024×768 | 24px | 32, 19, 26, 19, 18, 26 | 12px | 12px |
| C / menu | 1024×768 | 24px | 26, 35, 37, 23 | 16px | 28px |
| C / help | 1024×768 | 24px | 26, 21, 20, 23 | 16px | 28px |
| C / pause | 1024×768 | 24px | 26, 22, 19, 26 | 16px | 28px |
| C / end | 1024×768 | 24px | 26, 40, 48, 38, 23 | 16px | 28px |
| C / rank | 1024×768 | 24px | 26, 19, 23, 15, 17, 23 | 12px | 28px |
| D / menu | 1024×768 | 24px | 28, 22, 37, 25 | 16px | 2px |
| D / help | 1024×768 | 24px | 28, 21, 20, 25 | 16px | 2px |
| D / pause | 1024×768 | 24px | 28, 21, 19, 27 | 16px | 2px |
| D / end | 1024×768 | 24px | 28, 40, 33, 37, 25 | 16px | 2px |
| D / rank | 1024×768 | 24px | 28, 19, 23, 15, 18, 25 | 12px | 2px |
| A / menu | 1280×800 | 24px | 27, 36, 37, 24 | 16px | 20px |
| A / help | 1280×800 | 24px | 27, 21, 21, 24 | 16px | 20px |
| A / pause | 1280×800 | 24px | 27, 21, 19, 26 | 16px | 20px |
| A / end | 1280×800 | 24px | 27, 40, 48, 37, 24 | 16px | 20px |
| A / rank | 1280×800 | 24px | 27, 19, 23, 15, 14, 24 | 12px | 20px |
| B / menu | 1280×800 | 24px | 32, 36, 37, 26 | 16px | 12px |
| B / help | 1280×800 | 24px | 32, 21, 22, 26 | 16px | 12px |
| B / pause | 1280×800 | 24px | 32, 21, 22, 25 | 16px | 12px |
| B / end | 1280×800 | 24px | 32, 40, 48, 37, 25 | 16px | 12px |
| B / rank | 1280×800 | 24px | 32, 19, 26, 19, 14, 26 | 12px | 12px |
| C / menu | 1280×800 | 24px | 26, 36, 37, 23 | 16px | 28px |
| C / help | 1280×800 | 24px | 26, 20, 21, 23 | 16px | 28px |
| C / pause | 1280×800 | 24px | 26, 22, 19, 26 | 16px | 28px |
| C / end | 1280×800 | 24px | 26, 40, 48, 38, 23 | 16px | 28px |
| C / rank | 1280×800 | 24px | 26, 19, 23, 15, 15, 23 | 12px | 28px |
| D / menu | 1280×800 | 24px | 28, 21, 37, 25 | 16px | 2px |
| D / help | 1280×800 | 24px | 28, 21, 21, 25 | 16px | 2px |
| D / pause | 1280×800 | 24px | 28, 21, 19, 27 | 16px | 2px |
| D / end | 1280×800 | 24px | 28, 40, 33, 37, 25 | 16px | 2px |
| D / rank | 1280×800 | 24px | 28, 19, 23, 15, 15, 25 | 12px | 2px |
| A / menu | 1440×700 | 24px | 27, 37, 37, 24 | 16px | 20px |
| A / help | 1440×700 | 24px | 27, 21, 20, 24 | 16px | 20px |
| A / pause | 1440×700 | 24px | 27, 21, 19, 26 | 16px | 20px |
| A / end | 1440×700 | 24px | 27, 40, 48, 37, 24 | 16px | 20px |
| A / rank | 1440×700 | 24px | 27, 19, 23, 15, 14, 24 | 12px | 20px |
| B / menu | 1440×700 | 24px | 32, 38, 37, 26 | 16px | 12px |
| B / help | 1440×700 | 24px | 32, 21, 22, 26 | 16px | 12px |
| B / pause | 1440×700 | 24px | 32, 21, 22, 25 | 16px | 12px |
| B / end | 1440×700 | 24px | 32, 40, 48, 37, 25 | 16px | 12px |
| B / rank | 1440×700 | 24px | 32, 19, 26, 19, 14, 26 | 12px | 12px |
| C / menu | 1440×700 | 24px | 26, 36, 38, 23 | 16px | 28px |
| C / help | 1440×700 | 24px | 26, 20, 20, 23 | 16px | 28px |
| C / pause | 1440×700 | 24px | 26, 22, 19, 26 | 16px | 28px |
| C / end | 1440×700 | 24px | 26, 40, 48, 38, 23 | 16px | 28px |
| C / rank | 1440×700 | 24px | 26, 19, 23, 15, 15, 23 | 12px | 28px |
| D / menu | 1440×700 | 24px | 28, 21, 37, 24 | 16px | 2px |
| D / help | 1440×700 | 24px | 28, 21, 20, 25 | 16px | 2px |
| D / pause | 1440×700 | 24px | 28, 21, 19, 27 | 16px | 2px |
| D / end | 1440×700 | 24px | 28, 40, 33, 37, 25 | 16px | 2px |
| D / rank | 1440×700 | 24px | 28, 19, 23, 15, 15, 24 | 12px | 2px |
| A / menu | 1920×1080 | 24px | 27, 35, 37, 24 | 16px | 20px |
| A / help | 1920×1080 | 24px | 27, 21, 20, 24 | 16px | 20px |
| A / pause | 1920×1080 | 24px | 27, 21, 19, 26 | 16px | 20px |
| A / end | 1920×1080 | 24px | 27, 40, 48, 37, 24 | 16px | 20px |
| A / rank | 1920×1080 | 24px | 27, 19, 23, 15, 14, 24 | 12px | 20px |
| B / menu | 1920×1080 | 24px | 32, 35, 37, 26 | 16px | 12px |
| B / help | 1920×1080 | 24px | 32, 21, 22, 26 | 16px | 12px |
| B / pause | 1920×1080 | 24px | 32, 21, 22, 25 | 16px | 12px |
| B / end | 1920×1080 | 24px | 32, 40, 48, 37, 25 | 16px | 12px |
| B / rank | 1920×1080 | 24px | 32, 19, 26, 19, 14, 26 | 12px | 12px |
| C / menu | 1920×1080 | 24px | 26, 35, 38, 23 | 16px | 28px |
| C / help | 1920×1080 | 24px | 26, 21, 20, 23 | 16px | 28px |
| C / pause | 1920×1080 | 24px | 26, 22, 19, 26 | 16px | 28px |
| C / end | 1920×1080 | 24px | 26, 40, 48, 38, 23 | 16px | 28px |
| C / rank | 1920×1080 | 24px | 26, 19, 23, 15, 15, 23 | 12px | 28px |
| D / menu | 1920×1080 | 24px | 28, 21, 37, 25 | 16px | 2px |
| D / help | 1920×1080 | 24px | 28, 21, 20, 25 | 16px | 2px |
| D / pause | 1920×1080 | 24px | 28, 21, 19, 27 | 16px | 2px |
| D / end | 1920×1080 | 24px | 28, 40, 33, 37, 25 | 16px | 2px |
| D / rank | 1920×1080 | 24px | 28, 19, 23, 15, 14, 25 | 12px | 2px |

Els blocs de mateixa funció comparteixen vora, radi i espai interior dins de cada proposta. A les mides amples es reserven 24 px als costats de la pàgina; als telèfons, 16 px. Les parelles de targetes tenen 12 px de separació en escriptori i 8 px en telèfon.

## Límits

La maqueta no executa la lògica de joc, no produeix puntuacions i no té àudio. No prova la comoditat de tocar caselles reals ni l’equitat entre orientacions. El contrast de les ales s’ha revisat visualment sobre els quatre terres; no és una prova amb persones amb baixa visió. Els botons de reinici i sortida mostren la destinació directament; la integració necessitarà les confirmacions habituals per no perdre una partida.