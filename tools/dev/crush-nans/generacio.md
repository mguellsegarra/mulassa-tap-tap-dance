# Mulassa Crush · tercera ronda

Generat amb image_gen.imagegen integrat i transparent_background: true. Quatre generacions individuals. Cap integració al joc; les sis peces de la ronda 2 es llegeixen sense modificar-les.

## Prompt comú

Redesign reference as original Valls festival match-3 gummy candy. Truly volumetric photoreal 3D gelatin confection, light transmitted through translucent flesh, darker saturated thick sections, pale thin sections, one broad clean softbox highlight. NO outline, NO colored rim, NO sticker border, NO neon glow. Friendly chubby proportions, large head, big kind dark eyes, no claws, no sharp horns, no aggression. Simple recognizable silhouette readable at 45px. Entire isolated piece centered on square transparent background, fills 85%. Clean alpha, no floating specks, no ground shadow. Not a King asset, no text. Reference is style only. Create just ONE candy.

## Prompts individuals

A: Nan festival big-head character. A huge rounded dark deep plum purple hat dominates 70% of silhouette and color, small peach face below, kind eyes and tiny smile. Rich dark purple NOT neon, no pink face.

B: Barret Verd, traditional Valls festival big-head: huge broad round green hat with a muted golden band, dark hair, peach big face, small white shirt collar. Hat should dominate. Cool dark teal emerald green clearly different from bright lime grass-green dragon reference. Friendly human NOT garden gnome, no pointy hat.

C: Sabater traditional Valls festival big-head shoemaker. Huge warm honey cream head, very prominent round dark brown glasses and small brown moustache, dark brown cap small, tiny brown apron and white collar joined under chin. Dominant cream/honey gelatin, not orange.

D: A Valls city Gegant king, a DIFFERENT figure from the nans. Serene peach face, short dark beard, broad rounded golden crown, long simple deep purple lilac robe dominates body, tiny joined arms. Compact broad entire figure silhouette not thin, all gelatin. No weapon.

## Referències

S'han inspeccionat les set peces de tools/dev/crush-gominoles/. Límit de l'eina: cinc referències per crida. A usa bou, lleó, Mulassa, nans i àliga; B/C/D usen drac, basilisc, lleó, nans i àliga. Són referències d'estil, no identitats que calgui copiar.
Identitat: src/game/figure-portraits.js, entrades nans-valls (Sabater amb ulleres i davantal; Barret Verd) i gegants-ciutat-valls (corones, barbes, vestits llargs), docs/figures/figure-catalog.md i src/game/figure-catalog.json (Gegant de la Porra, Geganta, Lladrefaves i Gegantona). D és una adaptació en lila, no una rèplica documental d'un vestit real.

## Alfa i normalització

Mateix procés de ronda 2: obertura de dos píxels a alfa >80, component principal, ompliment de màscara i dilatació d'un píxel limitada a alfa >12. Es conserva l'alfa original, sense pintar la figura. Retall i normalització al 85% de 1024×1024. Després del Lanczos es descarta alfa <=12 per treure l'anell residual del reescalat i es conserva un sol component. Resultat final: un component i zero forats en cadascuna de les quatre imatges. mesures.json registra píxels retirats abans del reescalat; prepara.py reprodueix la neteja, les composicions i les mesures. No dibuixa les peces.

## Color

Mateix mètode que generacio.md de la ronda 2: composició sRGB sobre #3d2417 i (255,220,170) al 8%; màscara alfa >0,1, transformació visual, mediana RGB, Lab D65 i CIEDE2000. Grisos Rec.709 lineal, deuteranopia Machado 2009 al 100% en RGB lineal, retall a gamut. Es mostra el mínim contra les altres sis peces i sobre els dos fons. No es compara A amb B, C o D: només una de les alternatives ocuparia la setena plaça. Taulers simulats de 315×450, 7×10, cel·la de 45 px, mateixa distribució per alternativa. PNG sense escalar; la pàgina redueix quan cal.

## Verificació visual · 2 novembre 2026

Captures de navegador en segon pla, sense finestres ni canvis de focus. Eines preview de T3; primera captura va esgotar el temps, el segon intent va funcionar. Cada peça s'ha mirat en captura sobre clar i fosc, gran i a 45 px CSS (A/B/C/D-captura-clar-fosc.png). També s'han mirat els quatre taulers en color i grisos a mida nativa a 1280. No ha calgut regenerar: les quatre són simpàtiques, sense contorns dibuixats; A dona la millor separació mesurada. El barret d'A conserva reflexos magenta, però la massa és lila pruna fosca. C s'acosta al lleó; D canvia la identitat de la peça.

Pàgina revisada a 320×568, 375×667, 393×852 i 1280×800, sense scroll horitzontal. Mesures DOM a layout.json. Estructura i espaiat comuns a les quatre targetes; botons de 44 px, ids únics. S'ha activat el botó A amb notes de prova i ha mostrat «Notes copiades.»; no s'ha comprovat el contingut enganxat en una altra aplicació.

| Ample | Marges laterals de targeta | Padding | Gap intern / entre targetes | Radi |
| --- | --- | --- | --- | --- |
| 320 | 8 / 8 | 16 | 16 / 24 | 16 |
| 375 | 8 / 8 | 16 | 16 / 24 | 16 |
| 393 | 8 / 8 | 16 | 16 / 24 | 16 |
| 1280 | 84 / 84 | 16 | 16 / 24 | 16 |

Gaps de figura a peu: 8 px; entre seccions de revisió: 16 px; entre capçalera i targetes: 32 px. Són mesures de caixes CSS confirmades amb captures, no una anàlisi exhaustiva de tinta de cada línia. No s'ha fet jurat extern ni delegació per instrucció de l'owner.

## Límits

Exploració visual estàtica. Sense proves de partida, animació, tacte real, persones amb daltonisme ni validació documental amb fotografies reals. La distància de mediana no mesura cada reflex ni la silueta. No s'han passat tests ni npm run check. Cap canvi fora de tools/dev/crush-nans.html i tools/dev/crush-nans/. Cap operació d'historial.


## E i F · Lladrefaves restaurat

Afegides amb image_gen.imagegen integrat, alfa transparent i B com a referència de material, no d'identitat. E: cap digne amb pell marró fosca natural, ulls proporcionats i somriure discret; tricorni fosc, perruca blanca i coll blau marí. F: emblema sense cara, només tricorni, perruca i coll. Gelatina volumètrica amb llum transmesa, sense contorn ni halo; reflexos clars al barret, sense alterar el to de pell per donar contrast. Prompts complets a prompts-ef.txt. Neteja i mesures amb prepara-ef.py, que reutilitza el codi de prepara.py i només afegeix E/F al JSON.

### Referència documental

La fotografia de TAC12 mostra casaca blau marí molt fosca (gairebé negra), guarniments daurats, perruca blanca i tricorni: https://tac12.tv/valls/arxiu-valls/item/29197-els-gegantons-de-valls-estrenen-vestits-i-renoven-imatge . Imatge: https://tac12.tv/media/k2/items/cache/51f456fad78697156314725eb7998597_XL.jpg . Consultada visualment. La notícia és del 9 de juny de **2023**, i l'article del Diari facilitat també està datat el 9–10 de juny de 2023; no de 2025. El catàleg local diu 2025: aquesta discrepància queda documentada sense modificar-lo. No s'ha confirmat una altra restauració específica de 2025. No s'ha usat la targeta antiga de vestit verd.

### Resultats i verificació E/F

E inicial descartada per pell massa caramel. Segona E generada amb correcció explícita del pigment a marró fosc natural, mantenint proporcions, expressió i llum. No s'ha aclarit la pell per compensar el tauler. En la versió final no hi veig llavis exagerats, ulls desorbitats ni trets grotescos; no és una validació cultural externa. Prefereixo F per evitar convertir un retrat humà en llaminadura, tot i que perd identitat i pot semblar una perruca genèrica.

ΔE00 mínima: E color 22,31 / grisos 12,02 / deuteranopia 22,91, sempre contra Mulassa. F color 9,70 / grisos 7,40 / deuteranopia 9,99, sempre contra Àliga. El blau marí petit no domina com el blau viu del basilisc. Els reflexos del tricorni i la perruca conserven la lectura sobre marró. Mesura de mediana, no prova de reconeixement humà.

Un component d'alfa per peça, ocupació màxima 870/1024 (~85%). E zero forats; F conserva un únic píxel de forat després de Lanczos (sense component separat). Taulers en color i grisos i peces amb alfa en grisos. A–D i les seves notes no s'han reescrit.

Captures de navegador en segon pla amb preview T3 (cap finestra visible), revisades a 320×568, 393×852 i 1280×800: scrollWidth igual a innerWidth. Targetes amb marges simètrics 8/8, 8/8 i 84/84 px, padding 16, gap 16 i radi 16; dades a layout-ef.json. Captures E/F-pagina-*.png. Revisió nativa de cada peça a 45 px, gran i sobre clar/fosc a E/F-captura-clar-fosc.png, amb taulers de 45 px sense escalar a revisio-ef.html. Tricorni llegible, detalls de cara limitats a aquesta mida. No s'han provat les notes noves, tacte real, animacions, partida ni reconeixement amb públic. Cap test ni npm run check, cap integració, commit ni push. El servidor existent 5320 continua actiu.

## G · Barret Verd a partir de les fotos · 2 novembre 2026

Generat amb image_gen.imagegen integrat i transparent_background: true. Una generació, sense retoc cromàtic posterior. Referències passades a l’eina: G-referencia-front.png i G-referencia-perfil.png, retalls de les dues fotografies de la UAF facilitades per l’owner; drac.png de crush-gominoles com a referència només del material. A–F i les seves notes es conserven.

Fonts: https://uaf.cat/wp-content/uploads/2019/10/Sant-Joan-2019-Nans-de-Valls-UAF.jpeg i https://uaf.cat/wp-content/uploads/2017/05/Els-Nans-de-Valls-7.jpg . S’han mirat les fotografies locals i els dos retalls, sense consulta web addicional. No s’ha usat la il·lustració del Memory. No hi distingeixo bigoti: G no en duu. La línia fosca damunt de les dents és el límit del somriure, no pèl.

Prompt: una sola peça original de gelatina del Barret Verd real de les fotos; cap allargat bronzejat simplificat, nas llarg arrodonit, celles arquejades, ulls amables, patilles fosques curtes, somriure molt ample amb una banda blanca de dents i sense bigoti. Barret verd de copa rodona, ala ampla una mica aixecada i cinta groga visible; verd bosc mitjà més fosc que el drac. Sota, només espatlles petites d’americana marró, coll blanc i corbata vermella. Cara de joguina, sense porus, ulls realistes ni dents individuals. Gelatina volumètrica translúcida amb llum transmesa i reflexos tous; sense contorns, halo, ombra de terra ni peces despreses. Vista gairebé frontal amb un petit gir; 85% del quadrat transparent. Sense text ni còpia de King.

prepara-g.py reutilitza prepara-ef.py i prepara.py: mateixa neteja d’alfa, normalització a 870/1024 (~85%), taulers i mètrica. Un component, zero forats. G-comparacio.png és un muntatge de la foto retallada i G a 45 px, sense dibuixar ni modificar la peça.

ΔE00 mínima contra les sis peces i les dues caselles: color **15,03 amb Bou**; grisos **0,54 amb Basilisc**; deuteranopia **1,00 amb Drac**. No és una proposta amb bona separació de mediana en aquestes dues simulacions. He mantingut el verd documental; la silueta del barret, la cinta i el somriure aporten la identitat. No s’ha mesurat separadament només el barret ni s’ha fet prova de reconeixement amb persones.

Revisió de navegador headless amb preview T3, sense finestres: 320×568, 393×852 i 1280×800, scrollWidth igual a innerWidth. Marges de targeta 8/8, 8/8 i 84/84; padding, gap intern i radi de 16 px com les altres alternatives. Captures G-pagina-*.png. Captura a mida nativa de la peça gran i a 45 px, clar/fosc, i taulers de cel·la 45 px: G-captura-clar-fosc.png, pàgina revisio-g.html. Hi reconec el barret, la cinta groga, les patilles i el somriure de la referència; la cara és estilitzada i més taronja que la foto, no un retrat fotogràfic.

El servidor existent 5320 retorna una versió anterior a la ruta habitual; la verificació ha usat /@fs/Volumes/development/worktrees/mulassa-tap-tap-dance/release-1.3.0/tools/dev/crush-nans.html#G del mateix servidor. No s’ha reiniciat ni se n’ha creat cap altre. No s’han provat les notes, tacte, animacions, partida, reconeixement extern ni daltonisme amb persones. Cap test ni npm run check, cap integració ni operació d’historial.

## H, I i J · Diable, Calçot i Ós · 2 novembre 2026

Tres generacions individuals amb image_gen.imagegen integrat, transparent_background: true. Referències locals inspeccionades i passades a l’eina: public/jocs/memory/cards/diables-valls.jpg, gegant-calcot.jpg i os-trabucaires-valls.jpg, respectivament, més tools/dev/crush-gominoles/drac.png per al material. Les tres primeres són il·lustracions del Memory, no fotografies documentals. No s’ha cercat cap foto addicional. Cap còpia de King ni integració al joc.

Prompt comú: una sola llaminadura original de la festa de Valls, gelatina comestible real translúcida amb llum transmesa, zones gruixudes més fosques i reflexos amples tous; sense plàstic, contorn, halo, ombra ni elements despresos. Cara de joguina amable i simple, sense pell fotogràfica. Un component d’alfa, quadrat transparent, ocupació del 85% i silueta compacta llegible a 45 px. Primera referència per a identitat; drac només per al material.

- H: només cap de diable infantil, caputxa ampla violeta profund, dues banyes curtes arrodonides, cara petita préssec i flama violeta arrodonida unida a la base. Sense bastó, mans ni cos. Lila dominant, no neó. **Llicència de color:** els Diables de Valls vesteixen vermell i negre; el lila evita repetir el vermell de la Mulassa.
- I: Gegant del Calçot curt i gras, bulb crema d’ivori ample amb cara petita somrient, ventall de cinc fulles gruixudes de verd turquesa fosc. Fulles obertes perquè ompli la cel·la; crema lletós per diferenciar-lo de l’àliga transparent, turquesa per allunyar-se del drac verd llima. Sense braços penjants ni cos prim.
- J: només cap d’Ós de Valls amb collar vermell unit i medalla daurada petita, orelles grans rodones, morro crema clar, ulls i nas petits foscos. Gelatina mel clara lluminosa, sense marró fosc, taronja viu, groc viu, cabell, crinera ni banyes.

prepara-hij.py reutilitza prepara-ef.py i prepara.py sense reescriure A–G: mateix alfa, normalització a 870/1024, composicions, taulers i mètrica. Les tres peces tenen un component d’alfa i zero forats. Una generació final per peça, sense repintat ni correcció de color posterior. El reflex d’H tira a magenta; J queda més ambre que el marró mel del prompt. Les dues desviacions són visibles a les captures.

| Peça | Color | Grisos | Deuteranopia |
| --- | --- | --- | --- |
| H | 32,63 · Mulassa | 10,66 · Mulassa | 22,11 · Basilisc |
| I | 22,09 · Lleó | 0,79 · Lleó | 14,30 · Lleó |
| J | 17,09 · Lleó | 7,37 · Àliga | 8,12 · Bou |

Són mínims de mediana contra les sis peces i els dos fons, amb el mètode descrit abans. H és la millor separada d’aquesta ronda. I depèn molt de la silueta en grisos; J continua prop dels tons càlids, especialment del bou en deuteranopia. No és una prova de reconeixement amb persones.

### Revisió visual H–J

Navegador headless de T3, visible:false, servidor existent al port 5320; cap servidor nou. Ruta usada: http://192.168.1.232:5320/@fs/Volumes/development/worktrees/mulassa-tap-tap-dance/release-1.3.0/tools/dev/crush-nans.html#H . A–G, textos i notes anteriors es conserven.

He mirat cada peça gran i a 45 px reals, sobre clar i fosc, i els taulers en color i grisos a mida nativa amb revisio-hij.html: captures H/I/J-captura-clar-fosc.png. Hi reconec banyes i caputxa, fulles i bulb, orelles i morro. El collar es veu; la medalla és un punt petit a 45 px. No ha calgut regenerar-les per llegibilitat.

Pàgina revisada i capturada a 320×568, 393×852 i 1280×800: H/I/J-pagina-320.png, -393.png i -1280.png. scrollWidth igual a innerWidth als tres amples. Marges de targeta simètrics 8/8, 8/8 i 84/84; padding, gap intern i radi 16 px. Dades a layout-hij.json. Mateix estil de targeta i jerarquia que A–G, imatges carregades sense errors. Als mòbils els taulers es redueixen per cabre; la revisió de 45 px es fa a la pàgina auxiliar d’escriptori.

No s’han provat les notes noves, tacte real, partida, animació, reconeixement extern ni daltonisme amb persones. No s’han passat tests ni npm run check. Cap canvi fora dels dos camins autoritzats, cap subagent, missatge extern ni operació d’historial.
