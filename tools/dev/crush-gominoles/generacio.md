# Mulassa Crush · segona ronda

Exploració amb `image_gen.imagegen`, eina integrada, `transparent_background: true`.
Set generacions individuals amb C-<figura>.png com a referència d'identitat.
L'àliga té una segona generació per reduir l'aspecte lletós. No hi ha integració al joc.

## Prompt comú

Redesign reference as original Valls festival match-3 gummy candy. Truly volumetric
photoreal 3D gelatin confection, light transmitted through translucent flesh, darker
saturated thick sections, pale thin sections, one broad clean softbox highlight.
NO outline, NO colored rim, NO sticker border, NO neon glow. Friendly chubby proportions,
large head, big kind dark eyes, no claws, no sharp horns, no aggression. Simple recognizable
silhouette readable at 45px. Entire isolated piece centered on square transparent
background, fills 85%. Clean alpha, no floating specks, no ground shadow. Not a King asset,
no text. Reference is identity only; remove its outlined flat style.

- Drac: verd, dos caps, boques tancades, ales petites.
- Basilisc: blau safir, cresta vermella i bec groc tancat. El blau separa la peça del drac.
- Bou: taronja caramel, morro ample, banyes curtes i romes, cos plàcid de bestiar de pagès.
- Lleó: groc llimona, corona, crinera arrodonida i ulls amables.
- Mulassa: vermell gerd més fosc, coll llarg i orelles altes, una sola massa, sense vora de roba.
- Nans: rosa, un sol cap gran, ulleres, bigoti, barret i somriure.
- Àliga: gairebé incolora, corona i tres lòbuls d'ala; cap lila.

## Alfa i mida

Neteja autoritzada amb Pillow, NumPy i SciPy: obertura morfològica de dos píxels sobre
alfa >80, component connex principal, ompliment de forats de la màscara i dilatació
mínima d'un píxel, limitada a alfa >12. Es conserva l'alfa original dins la màscara;
no es pinta la figura. Retall de la silueta i normalització al 85% de 1024×1024.
`mesures.json` registra els píxels eliminats. `alpha-fosc-clar.png` mostra totes les
peces compostes sobre marró i crema. Els detalls interiors que produeix el generador
poden conservar petites bombolles; no són píxels flotants fora de la figura.

## Color

Les mesures provenen dels PNG, no dels colors del prompt. C es mesura sense alterar-la.
Fons de `src/jocs/games/crush/view.js`: #3d2417 i blanc càlid (255,220,170) al 8%.
Mediana RGB per peça, després de compositar l'alfa en sRGB; màscara alfa >0,1.
Conversió sRGB → Lab D65 i CIEDE2000 per a les 21 parelles sobre cadascun dels dos fons.
Grisos per luminància Rec.709 en RGB lineal. Protanopia i deuteranopia: matrius Machado
2009 al 100% en RGB lineal, retall a gamut sRGB. Són simulacions, no una validació amb
persones amb daltonisme. S'inclouen totes les parelles a `mesures.json`.
La mediana resumeix la massa de color; no quantifica cada reflex ni la silueta.
Una distància més alta no demostra un òptim global ni substitueix una prova de joc.
L'àliga transparent canvia segons el fons; es calcula sobre tots dos, sense atribuir-li
un blanc fix. Les figures continuen distingint-se també per forma.

## Pàgina i captures

Taulers simulats amb 7 columnes i 10 files, cel·les de 45 i 56 px; PNG sense escalar.
La pàgina els redueix només quan no caben. No són captures d'una partida integrada.
Les captures headless i les mesures de layout es desen en aquesta carpeta.
No s'han passat tests ni `npm run check`, per instrucció de l'owner.

## Resultat mesurat

La pitjor parella de C era bou/Mulassa: ΔE00 3,87 en color, 0,36 en grisos,
1,48 en protanopia i 1,09 en deuteranopia. La ronda nova puja el mínim en les
quatre visions: 17,24 en color (bou/Mulassa), 0,56 en grisos (bou/àliga),
9,38 en protanopia (nans/àliga) i 4,55 en deuteranopia (drac/bou).
No és una paleta òptima demostrada. El principal canvi útil és enfosquir i portar
la Mulassa cap al gerd; també s'ha aprofundit el blau del basilisc. L'àliga clara
és fidel a la petició, però no aporta una categoria cromàtica estable.

## Verificació de la pàgina

Chrome headless, DPR 1, sense finestres visibles. S'han obert les captures finals
320, 393 i 1280 i els dos taulers a mida nativa, a més de la làmina clar/fosc.
S'ha comprovant també l'ample de document a 375, 430, 1024, 1440 i 1920:
cap desbordament horitzontal. La prova manual del botó agrupa els set camps en
un bloc; captura `notes-copiades.png`. `layout.json` conserva les mesures DOM.

| Ample | Marge lateral de targeta | Padding interior | Gap intern | Gap abans/després | Radi |
| --- | --- | --- | --- | --- | --- |
| 320 | 8 | 16 | 16 | 16 | 16 |
| 393 | 8 | 16 | 16 | 16 | 16 |
| 1280 | 24 dins del contenidor centrat | 16 | 16 | 16 | 16 |

Valors en píxels CSS; comprovats amb captures. Espai entre seccions: 32;
entre targetes: 16. Els taulers s'alineen a dalt, sense estirar el buit fins al peu.
La mida 56 es redueix a pantalles estretes i es pot obrir al 100%.
`alfa-final.json` comprova un únic component d'alfa no nul per PNG final.
No s'ha verificat una partida, animació, tacte real ni percepció amb usuaris amb
daltonisme. No s'han executat tests del projecte ni s'ha alterat música o `src/`.
