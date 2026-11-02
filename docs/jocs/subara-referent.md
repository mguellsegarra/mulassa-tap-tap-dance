# Vila del Seguici: regles i referent

Referent: SubaraCity (2015-2019, mòbil i consoles). No l'he jugat: les regles surten de ressenyes, que no expliquen la fórmula de punts. Consultades el 2026-11-02.

## Fonts

- [Nintendo World Report](https://nintendoworldreport.com/review/47971): tauler 5x6, 4 colors, grup mínim de 2, nivell 10 sense color, consell de construir a baix.
- [Pure Nintendo](https://purenintendo.com/review-subaracity-nintendo-switch/): cada moviment és un any, dos alcaldes inicials, un de nou cada 100 anys.
- [Digitally Downloaded](https://www.digitallydownloaded.net/?p=43581): el bloc resultant creix segons la suma, i la fórmula es veu poc clara.
- [Games Asylum](https://www.gamesasylum.com/?p=40729): la fusió deixa un sol bloc, rangs d'ocells de "baby duck" a "dragon".

## Regles que copio

- Tauler de 5 columnes i 6 files, amb 4 colors.
- Toques un grup de 2 o més blocs connectats del mateix color, en horitzontal o vertical. Es fusionen a la casella tocada amb la suma dels valors.
- La resta cau i entren blocs nous per dalt, de valor 1 i color a l'atzar.
- A valor 10, el bloc perd el color i només es pot fusionar amb altres del mateix tipus. Aquí és el campanar. Juntar-ne dóna molts punts.
- Cada moviment és un any. Sense temps ni reflexos.
- Quan no hi ha cap grup, es gasta un ajut per treure un bloc (allà, un alcalde; aquí, un enderroc). Sense ajuts, s'acaba.
- Rang final per punts. Aquí va de Nans a Gegant.

## Regles que canvio, i per què

- **2 enderrocs fixos.** Al referent se'n guanya un cada 100 anys, que aquí no s'arribaria a fer.
- **La fórmula de punts és meva**, perquè la del referent no és pública: suma × mida del grup × 5, més 100 si neix un campanar. Juntar campanars: campanars × mida × 100.
- **10 peces, una per valor:** casteller, caseta, casa, casa amb balcons, masia, casa pairal, plaça de l'Oli, Pati, plaça del Blat i campanar. Art de Codex a `public/vila/peces` i `terra`.
- **Vista prèvia.** Mentre prems, es marca el grup i surt el resultat, i si aixeques el dit fora, es cancel·la. Una ressenya es queixa que el referent no ho mostra.
- **Grups visibles i patró per color.** Els veïns que es fusionarien queden units, i cada color té el seu dibuix per si no es distingeixen els colors.
- **Sense** rànquing, personatges desbloquejables, models alternatius ni desar la partida. Només es desa la millor puntuació, al dispositiu.

## Simulació (amb un límit de 60 anys que en Marc va fer treure el 2026-11-02)

Sense límit, l'expert simulat fa 59 / 194 / 401+ anys, i els rangs s'han de tornar a calcular.

| Jugador | Anys (p10/p50/p90) | Punts (p10/p50/p90) | Campanars (p50) |
| --- | --- | --- | --- |
| A l'atzar | 29 / 48 / 60 | 1.500 / 3.210 / 5.380 | 2 |
| Sempre el grup més gran | 22 / 35 / 52 | 1.100 / 2.305 / 4.475 | 1 |
| Sempre parelles | 25 / 40 / 60 | 995 / 2.150 / 4.015 | 1 |
| Regla senzilla (valor alt, a baix) | 21 / 33 / 48 | 1.050 / 2.095 / 4.025 | 1 |
| Expert (prova cada jugada fins al final) | 60 / 60 / 60 | 6.775 / 11.710 / 16.595 | 9 |

Els rangs surten d'aquí: Cavallets 1.500, Mulassa 3.000, Àliga 6.000, Gegant 10.000.

Curiositat a vigilar: jugar a l'atzar supera les regles senzilles que he provat. Hi ha molt marge d'habilitat (l'expert fa 3,6 vegades més punts), però la jugada bona no és evident. Cal comprovar jugant si això es nota com a injust.

## Art

Casa, masia i Pati són píxels nous a `game.js`. El Pati és una plaça genèrica amb arbres i una estàtua, inspirada en l'escultura "El Casteller" de la plaça del Pati, però no és un retrat del lloc. El campanar és `public/campanar-valls.svg`. Les figures dels rangs són còpies de `public/crush/` a `public/vila/`.

## Revisió després del no d'en Marc al primer visual (2026-11-02)

Ara he mirat captures oficials de SubaraCity ([Nintendo](https://nintendo.com/games/detail/subaracity-switch)), que abans no havia vist. Tampoc l'he jugat. Diferències amb el que vaig fer:

- **Terreny, no color.** Els blocs són parcel·les gruixudes, amb volum, de gespa, terra, totxo i llamborda. Els colors surten del material.
- **El grup es llegeix com un sol terreny.** Les parcel·les veïnes s'uneixen en una forma contínua, com una L. El meu pontet de color n'és una versió pobra.
- **L'edifici és el protagonista.** Omple la parcel·la i els alts en surten per dalt, tapant la fila del darrere. Els meus són petits i iguals dins de cada categoria.
- **Sense números al tauler.** El nivell es llegeix per l'edifici. Cada nivell és un dibuix diferent, de persona a gratacel, i el nivell 1 és una persona, no una casa.
- **Encant i to.** Cel clar, ocells, avions i personatges que creuen la pantalla, música tranquil·la i una fanfàrria simpàtica en perdre ([Mike Drucker](https://mikedrucker.substack.com/p/ill-buy-that-for-5-subaracity)). La puntuació es mostra com a població, amb l'any al costat.
- **L'atzar pesa molt** en la durada de la partida, segons la mateixa font.

## Jocs semblants (per ressenyes i fitxes, sense jugar-los)

- [Triple Town](https://en.wikipedia.org/wiki/Triple_Town): tres iguals pugen de nivell en una cadena llarga (gespa, arbust, arbre, cabana, casa...). Idea útil: la cadena comença per coses petites i entranyables, i un os fa nosa amb gràcia.
- [Threes](https://en.wikipedia.org/wiki/Threes): les fitxes tenen cara i personalitat. Partides de pocs minuts.
- [Merge Town](https://www.androidauthority.com/best-merge-games-android-3263709/) i Merge Mayor: el vestit de ciutat amb encàrrecs. Massa economia per a aquest joc.
- [Tumble Time](https://www.androidauthority.com/best-merge-games-android-3263709/) i Blockfusion: connectar o fusionar grups, més a prop del toc de SubaraCity.

## Estil aprovat per en Marc (2026-11-02)

Maqueta 3D petita, generada amb Codex (`public/vila/peces`, `public/vila/terra`). Parcel·les quadrades i de cara, dibuixades per codi amb aquestes textures. Panell cian, targeta blau marí amb vora blanca i fons marró clar, com a SubaraCity. Substitueix l'apartat d'art anterior. Pendent: `public/vila/mostra*` és temporal i no s'ha de fer commit.

## Revisió de Sol 6.1 i Opus 5.5 (2026-11-02)

En Marc va rebutjar les textures i el moviment. Ara: terra pla i apagat sense imatges, un sol contorn per grup, una acció cada vegada, sense cortina fosca en prémer, un sol tauler en entrar i escala de 10 peces amb silueta i material propis. Cap dels revisors ni jo hem vist SubaraCity en moviment.

## Escala de 15 peces aprovada per en Marc (2026-11-02)

Art fet per Codex amb fotos de Wikimedia com a referència (`/tmp/vila-ref/fotos/index.json`, no es publiquen). Normals per suma 1-9. A 10 neix Mas Miquel; un bloc amb 2, 3, 4, 6 i 8 monuments passa a Oli, Pati, Blat, Museu i Campanar. Juntar-ne dóna monuments² × 100 veïns. Rangs: Cavallets 2.000, Mulassa 4.000, Àliga 8.000, Gegant 16.000. Humor sobre llocs, mai sobre persones.
