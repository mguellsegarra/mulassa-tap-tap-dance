# Revisió del Tombairot · 27 de novembre

Cap unió se separa ni cap peça travessa el terra en el cicle mostrejat. Cada malla té un sol component. La sonda ha mesurat 12 unions de Fable, 2 d’Astra i 12 de Neon. Les peces laterals de Neon i la mandíbula de Fable que es desenganxaven en versions intermèdies ara mantenen el contacte.

| Model | Amplada × alçada × fondària (m) | Triangles | Postures | Parells exposats / visibles des de càmera / visibles al mateix pla | Caixes enterrades dins la mateixa malla |
|---|---|---:|---:|---:|---:|
| fable | 1,344 × 3,376 × 1,831 | 8.820 | 577 | 24 / 24 / 13 | 0 |
| astra | 1,230 × 3,313 × 1,962 | 19.020 | 481 | 0 / 0 / 0 | 0 |
| neon | 1,270 × 3,013 × 1,688 | 6.876 | 481 | 28 / 24 / 0 | 9 |

## Resultats per prioritat

1. **Fable · risc de parpelleig.** Hi ha 13 parells de colors diferents al mateix pla visibles des d’almenys una càmera. Amb una tolerància de 3 mm, el recompte puja a 24. Per exemple, a rings i rings, les caixes 176 i 11 comparteixen 21,1 cm² en projecció, amb 0,20 mm de separació. Retallaria primer les cares coincidents que miren a la càmera. La sortida completa de cada parell es pot obtenir amb l’opció `--faces`.
2. **Neon · proporció i superposicions.** Fa 3,01 m. T19 suggereix 3,2–3,5 m a partir dels adults. A photo4 compto unes 21–23 anelles sota el llaç i 9–11 al coll. Neon en té 16 i 8. Augmentaria el nombre d’anelles sense eixamplar el setí. La sonda hi troba 0 parells exactament coplanaris visibles i 24 a menys de 3 mm o a 3 mm. Al cap, caixes 16 i 15, la separació és de 2,0 mm. Comprovaria aquest solapament en moviment abans de retocar-lo. [Captures de Neon](neon-review.jpg)
3. **Fable · cara i faldilla.** A t19 i a photo2 es distingeixen una cella arrodonida damunt de cada ull i la banya central. De cara, les celles de Fable es llegeixen com una V i la banya queda amagada. Al setí de photo1 es veuen plecs verticals fins. A la captura frontal de Fable dominen les tres franges horitzontals. Corbaria les celles amb un esglaó intermedi i allargaria els plecs daurats al llarg de tota la faldilla. [Frontal, tres quarts i perfil de Fable](fable-review.jpg)
4. **Astra · escates i cost.** En tres quarts, el feltre forma franges més regulars que les escates de photo4. El panell de l’espiell queda a 0,317 H del terra, en línia amb t19. Per al model final conservaria aquest frontal i reduiria la geometria dels flancs. Les tres malles d’Astra sumen 19.020 triangles. [Sis vistes d’Astra](sis-vistes.jpg)
5. **Volum interior.** La sonda troba 0 caixes totalment enterrades a Fable i 9 a Neon. Revisaria les caixes identificades al registre i repetiria la mesura de continuïtat després de retirar-les. Astra emet només la superfície del volum esculpit. [Índexs de les caixes i sortida íntegra](sonda.txt)

## Proporcions frontals

H és l’alçada total. La sonda pren els extrems dels vèrtexs grocs de la part baixa del con i dels vèrtexs foscos del panell frontal. El serrell pot ocultar-ne una part.

| Element / H | Referència t19 | Fable | Astra | Neon |
|---|---:|---:|---:|---:|
| Amplada groga a la base | ≈0,35 | 0,338 | 0,322 | 0,361 |
| Amplada de l’espiell | ≈0,070 | 0,071 | 0,074 | 0,080 |
| Alçada de l’espiell | ≈0,085 | 0,077 | 0,085 | 0,069 |
| Centre de l’espiell des del terra | ≈0,32 | 0,310 | 0,317 | 0,316 |

## Reproducció i límits

```sh
node tools/qa/tombairot-probe.mjs fable
node tools/qa/tombairot-probe.mjs astra
node tools/qa/tombairot-probe.mjs neon
node tools/qa/tombairot-probe.mjs astra --mutate
```

El control positiu puja el cap d’Astra 17 cm només en memòria. Detecta una obertura en 225/481 postures, amb almenys 8,55 mm a 3,542 s. Al model intacte hi ha contacte en totes 481.

He mostrejat 4,8 s de Fable i 4 s d’Astra i Neon a 120 Hz. Les pupil·les de Neon tenen períodes independents. Les unions es comproven amb caixes orientades. A t=0 i als tres quarts de cicle busco cares paral·leles amb superposició d’almenys 4 mm² i separació de fins a 3 mm. La taula dona les xifres de t=0. «Exposat» comprova que el centre del pedaç quedi fora dels sòlids. «Visible» comprova amb un raig si almenys una de 24 càmeres exteriors hi té línia de visió. El llindar de coincidència exacta és 0,01 mm. El parpelleig fotograma a fotograma i el rendiment del Galaxy S10 queden per verificar. Les caixes enterrades es comproven dins la mateixa malla amb un marge de 0,01 mm.

Les captures comparatives de Fable les he pres al seu visor amb t=0. L’alçada física és una inferència a partir d’adults. La volta posterior sencera no es veu en cap de les fotos. No he executat tests de render ni la suite del joc, pendents de validació visual.
