# Aprenentatge del model voxel del Drac: mètode reutilitzable per a altres figures

Recull de la recerca del 16-10-2026 sobre el model voxel del Drac de Valls (worktree `drac-de-valls`, commit `56b1bcc drac POC`).
Era una inspecció de només lectura, sense canvis al codi. Aquí hi ha el que es va demanar, els criteris, el que es va mesurar, les causes,
les dues opcions de reparació, l'estratègia de proves i el mètode per reaprofitar-ho amb una altra figura.

Documents relacionats, per no duplicar-los:
- `research/bestiari/pla-nova-figura.md`: el pla complet per estudiar i animar una figura nova.
- `.agents/skills/bestiari-reference-analysis/SKILL.md`: anàlisi de vídeo de referència i comparador sincronitzat.
- `.agents/skills/mulassacat-voxel/SKILL.md` (+ `references/drac-casebook.md`, `references/verification.md`): poliment i verificació de models voxel.

Avís: els fitxers i les mides citades són del POC d'aquella data. El Drac actual s'ha reorganitzat (`drac-rig.js`, `drac-pose.js`,
`drac-fire.js`…; vegeu AGENTS.md). Comprova el codi actual abans de fer servir cap número d'aquí.

---

## 1. Què es va demanar (criteris i preferències)

### L'encàrrec
- Refinar el model voxel del Drac de Valls **amb Opus** (si no és disponible, dir-ho, no substituir-lo en silenci).
- **Cap peça flotant**, **cap solapament visible** i **cap parpelleig**, **durant tot el ball**: no n'hi ha prou amb la pose de repòs.
- Mantenir la interfície: `buildDrac()` i `poseDrac(d, p, front)` amb el mateix objecte retornat
  `{ root, body, necks[{root, segs, head, jaw, flame}], wings[{root}], tail{base, flame}, legs, fire }`.
- Basar la forma en referències reals (UAF, Agrupació del Bestiari), no en suposicions.
- Investigar sobretot:
  - la semàntica de `y` a `Vox.box`;
  - varetes, crestes i dents petites que suren;
  - tires de l'ala que es desconnecten;
  - escut i taques fora del cos;
  - forats als colls articulats i a la frontissa de la mandíbula.
- Entregar: context breu, mecanismes geomètrics amb evidència exacta, **dues** solucions estructuralment diferents, **una** recomanació i
  una estratègia de proves.

### Restriccions de procés (aplicables a qualsevol figura)
- Només inspecció quan ho diu l'encàrrec: cap fitxer canviat, cap operació d'historial de Git, cap escriptura externa, cap accés a secrets,
  cap instal·lació ni canvi de serveis.
- Sense agents fills si no els demana. No enviar missatges a altres fils (AGENTS.md).
- Respostes concises, amb nombres mesurats, no impressions.
- Prosa en català o en la llengua de l'encàrrec, planera, en primera persona (skill `unslop`).
- Resum final amb el format de la skill `resum`: fet, problema, captures etiquetades, validació, pendent; les decisions per AskUserQuestion.
- Commits, push, PR i qualsevol escriptura a GitHub: sempre amb confirmació explícita al xat, una per operació.
- La música ha de quedar idèntica bit a bit si l'encàrrec no és de música.

### Criteris proposats per al POC inspeccionat

Les propietats a comprovar són reutilitzables; els llindars d'1, 3 i 5 cm i el pas de 0,1 temps són propostes d'aquell POC,
no toleràncies universals ni una prova contínua. Cal ajustar-los a l'escala, els angles de junta, la càmera i el renderitzador.
1. **Connectivitat estàtica**: dins de cada malla, totes les caixes toquen la component principal (cap illa).
2. **Juntes al llarg de tot el ball**: entre peces articulades, l'obertura màxima ≤ ~1 cm en coordenades de món, mostrejant tot el ball
   (≤ 0,1 temps). S'hi inclouen: coll–cos, segment–segment, cap–coll, mandíbula–cap, ala–cos, vareta–ala, flama–broquet i cua.
3. **Sense parpelleig**:
   - cap parell de cares paral·leles amb la mateixa normal, solapades i a menys de ~3 cm (per sobre del texel d'ombra), llevat que estiguin enterrades;
   - comprovar-ho també entre malles rígides germanes (cap i vareta, membrana i vareta).
4. **Sense col·lisions**: ni coll contra coll, ni cap contra cos o ala, ni cua contra cames, ni res sota el terra, en tot el ball.
5. **Fidelitat**: proporcions i elements contrastats amb fotos reals. Cada tria es marca com a observada, inferida o adaptació artística.
6. **Res invisible**: cap caixa completament enterrada (cost sense resultat) ni detall decoratiu que no es vegi mai.
7. **Prova al navegador**: `?mute`, temps congelats (`?beat=`) als moments extrems; mòbil (375×667, 393×852) i escriptori (1280×800).
8. **`npm run check` en verd** abans de lliurar.

---

## 2. Referències reals del Drac (què s'hi veu)

Fonts: [UAF](https://uaf.cat/seguici-ceremonial/drac/) (fotos 1–3 del 2017) i [Agrupació del Bestiari](https://www.bestiari.cat/figura/drac-de-valls/).
Les imatges no es guarden al repo (drets de tercers; només enllaços).

- **Colls curts i molt gruixuts**, anellats. El cap s'hi assenta gairebé directament: el coll amb prou feines és més llarg que el cap.
  El model en tenia 5 segments de 0,7 m amb el cap a escala ×1,8, massa llarg. Aquesta era la causa principal dels forats.
- **Cap**: musell gran, narius al capdavant, llavis i boca vermells, fileres de dents blanques, ulls bombats a dalt.
- **Cos**: rodó, amb costelles horitzontals i un gran «donut» arrodonit a la part de baix.
- **Taques**: una columna de discos taronja/vermells pel flanc, **arran de la superfície**.
- **Escut**: un rombe marró amb reixat al pit, entre els colls, **arran del cos**.
- **Ales**: petites, darrere dels colls, amb varetes pirotècniques a les puntes. La lectura inicial «verd fosc» va resultar errònia:
  la revisió posterior va adoptar el patró clar i rovellat a totes dues cares. No dedueixis la pintura de l'ombra o del contrallum;
  vegeu el cas de les ales a `.agents/skills/mulassacat-voxel/references/drac-casebook.md`. Les fotos no demostren valors de pintura idèntics.
- **Foc**: una vareta-suport fixada als llavis; la carretilla surt del seu extrem, no flota davant del morro.
- **Portador**: pantalons verds de camuflatge amb taques.

---

## 3. Mecanismes trobats (evidència mesurada)

El test existent (`tests/figures/drac/drac-parts.mjs`) **passava** (`zfight 0`, `collisions {}`) i no detectava res del que segueix. Només mirava:
- cares exactament coplanàries dins d'una mateixa malla, amb tolerància d'1 mm;
- col·lisions entre esferes aproximades.

**No mirava la connectivitat.** Lliçó: un test verd de z-fighting i col·lisions no demostra que el model estigui sencer.

### 3.1 Semàntica de `Vox.box` (`src/scene/models/voxel.js`)
`box(x, y, z, w, h, d)` centra la caixa en **x i z**, però **`y` és la base**.

Les taques es van escriure com si `y` i `z` fossin cantonades:
- anell: `box(x, y-0.2, z-0.2, …, 0.4, 0.4)`;
- nucli: `box(x+s·0.02, y-0.15, z-0.15, …, 0.2, 0.2)`.

Resultat: centre de l'anell (y, z) = (0,55, 0,10) i centre del nucli = (0,50, 0,15). El nucli vermell queda 5 cm avall i 5 cm endavant,
i es veu a la captura.

**Regla:** en una figura nova, comprova la convenció de cada eix abans de col·locar decoració.

### 3.2 Peces flotants en repòs
Distància a la caixa més propera de la mateixa malla, en unitats locals; el cap és ×1,8 al món.

| Peça | Caixa | Separació |
|---|---|---|
| travesser de la vareta de la boca | `(0,-0.37,1.22, 0.14,0.02,0.02)`; la vareta acaba a z 0,975 | 0,238 (≈0,43 m) |
| rebló de la barbeta | `(0,-0.5,0.86, 0.03…)` | 0,175 |
| cresta posterior | z −0,69…−0,61; el crani acaba a −0,575 | 0,035 |
| narius | z 0,82…0,84; la punta del nas acaba a 0,81 | 0,01 |
| escut | cara posterior z 1,465; el davant del cos és a 1,35 | 0,118 (rombe 0,188, flames 0,222) |

### 3.3 Juntes durant el ball (obertura màxima, metres de món)
| Junta | Obertura |
|---|---|
| espatlla de l'ala → cos | 0,12–0,15 **sempre**: l'arrel (±0,7, 0,95, −0,9) cau fora de la bola (1,63) i del gep (1,77) |
| peu de la vareta de l'ala → membrana | 0,09 sempre: la vareta comença a y 1,95, la tira 7 acaba a 1,66–1,71 |
| base de la flama de la boca → vareta | 0,22 |
| base de la flama de la cua → cua | 0,21 |
| base del coll (seg0) → cos | 0,47–0,87: l'arrel és a y 1,2 i el cos hi arriba a 0,71 |
| falques entre segments del coll (1→0, 2→1, 3→2, 4→3) | 0,14 / 0,20 / **0,24** / 0,18 |
| escletxa de la frontissa de la mandíbula | 0,045–0,10 |
| falca cua1 → cua0 | 0,046 |

**Mecanisme de les falques.** Cada segment gira sobre la seva cara inferior i només encavalca 0,042 (`0.06·LEN`) amb l'anterior.
Si es doblega un angle θ, s'obre ≈ `w/2·sinθ − 0,042` al costat exterior. Només la postura de repòs (REST) ja arriba a 0,5 rad.

**Mandíbula.** La frontissa és a y −0,36 i la llengua a −0,355, però el crani acaba a −0,30. Al darrere no hi ha res que tapi
l'escletxa, que s'eixampla en obrir la boca.

**Ales.** Cada tira es desplaça en z exactament el seu propi gruix (`-0.04*i`, d 0,04) i només encavalca 0,01 en x amb la del costat.
L'os del cantell d'atac fa salts de fins a 0,54 en y entre tires i fa 0,09 d'alt. Es llegeix com taulons solts.

**Taques sobre el cos esglaonat.** El cos és una pila de llosques rectangulars, no una esfera:
- taca 0: cara interior a x 0,961 i llosca a 0,835 a dalt → **sura 0,13**;
- taca 3: 0,83 contra 0,67 a baix → **sura 0,16**;
- taca 1: enterrada 0,027 → només es veuen 3 dels 6 cm de l'anell.

**Caixes invisibles.** La cella (y 0,08–0,14) és dins de l'ull (fins a 0,20). El nucli groc de la flama (0,28 d'ample) és tot dins del
taronja: mai es veu.

### 3.4 Parpelleig (hipòtesi, pendent de confirmar)
No hi havia cares exactament coplanàries. Causes probables:
1. **El visor (`drac-preview.js`) no tenia `shadow.bias`**; el joc fa servir `-0.0005` (`stage.js`). L'acne d'ombra sobre un model en
   moviment parpelleja. La captura de referència era del visor.
2. **Capes primes per sota del texel d'ombra.** El texel és de 52 m / 2048 ≈ 2,5 cm (5 cm a 1024). Hi ha capes massa properes:
   anell de taca a llosca 2 mm, morro–cella–ull 5–10 mm, mandíbula–llengua 5 mm, llosques del ventre 10 mm.
   Les peces primes fan 2–7 cm i totes llancen ombra: tires d'ala 4 cm, plaques del coll 3 cm, escut 7 cm, varetes 2–4 cm.
3. **Varetes de 2–4 cm més petites que un píxel** a distància de joc: espurnegen, i encara més si suren.

**Com confirmar-ho:** congela `?beat=` i fes lliscar la línia de temps amb el mapa d'ombres activat i desactivat.

---

## 4. Dues reparacions (preservant la interfície)

### A. Pedaç in situ (es mantenen 5 segments)
- **Coll i cua**: un collaret per sota de cada pivot d'alçada ≥ `w/2·tan(θmax)` (encavalcament ≈ 0,3 en lloc de 0,042).
  L'arrel `seg0` s'enfonsa dins del cos (y ≈ 0,75).
- **Cap i mandíbula**: un bloc de gola entra dins de seg4. Galtes i bloc de frontissa des de sota del crani (−0,30) fins a la frontissa,
  que puja a −0,30.
- **Varetes i flames**: travesser, flames i varetes d'ala a la punta de la seva vareta. Arrel de l'ala dins del gep.
- **Decoració**: taques i escut calculats amb la funció de llosques; nucli de la taca centrat.
- **Ala**: tires coplanàries (mateixa z) o encavalcament ≥ 0,06.
- **Moviment**: límit d'angle per junta a `poseDrac`.
- Pros i contres: el diff més petit, però els forats es tornen a obrir si mai l'amplitud supera el collaret.

### B. Cadena de nusos amb proporcions reals (recomanada)
- **Coll**: 3 segments gruixuts. Cada junta és un nus esglaonat fet amb `ball()` i **centrat al pivot**: girar al voltant del centre d'una
  esfera no obre cap forat. Els segments van de nus a nus. El nus d'arrel queda enterrat al cos i l'últim dins de la gola. La cua igual.
- **Rig**: `segs` s'escurça i `REST` (`drac-motion.js`) ha de seguir `segs.length`. Les signatures i la forma de l'objecte no canvien.
- **Superfície**: un sol `surf(y, z)` dins de `drac.js`, derivat de les mides de `ball()`, col·loca taques, escut i arrels d'ala sobre la
  superfície esglaonada amb un encastat fix ≥ 0,02 m. Cares frontals separades ≥ 0,03 m.
- **Mandíbula**: frontissa a sota del crani, galtes que la tapen pels dos costats.
- **Ala**: llarguer continu d'ossos encavalcats entre els cims de les tires; totes les tires a la mateixa z.
- **Foc**: vareta i flama en un grup amb l'origen a la punta de la vareta.
- **Neteja**: treure la cella i el nucli de flama ocults (o fer-los visibles) i el rebló. Varetes ≥ 0,05 de gruix.
- **Per què**: elimina els forats per construcció, no per ajust. A més, s'assembla a les fotos.
- **Cost**: revisar les comprovacions coll–coll i coll–ala i l'enquadrament de càmera (`DRAC_SIZE.h`).

---

## 5. Estratègia de proves (plantilla per a qualsevol figura)

S'afegeix al test de peces de la figura, sense treure les comprovacions d'esferes i de terra:

1. **Illes estàtiques.** Interceptar `Vox.mesh` per etiquetar cada malla amb les seves caixes. Amb union-find per contacte d'AABB
   (≤ 1e-6), cada caixa ha d'arribar a la caixa més gran de la seva malla.
2. **Obertures de junta en tot el ball.** Per a cada fill, mostrejar el perímetre de la cara que encaixa (cantonades i punts mitjos)
   cada ≤ 0,1 temps, passar-lo al marc del pare i mesurar la distància a les seves caixes: màxim ≤ 0,01 m. Tots dos costats si és simètric.
3. **Gairebé coplanàries.** Cares paral·leles amb la mateixa normal i àrea solapada: separació ≥ 0,03 m o enterrades.
   També entre malles germanes rígides.
4. **Caixes enterrades.** Avisar si una caixa decorativa queda tota dins d'una altra.
5. **Navegador.** Congelar els extrems del ball (al POC inspeccionat: 66 alçat, 130 ajupit, 168 la falca més ampla, 231 cop final),
   a mòbil i escriptori. Remapejar aquests instants amb l'arranjament actual: un número antic pot acabar provant una figura ja aturada.
   Alinear la configuració d'ombres del visor amb la del joc i fer una comparació amb ombres i sense abans d'atribuir-hi el parpelleig.
6. **Demostrar que el test falla** amb el model d'abans (que detecti el travesser, l'escut, les falques…) i passa amb el d'ara.

### Sonda reutilitzable (Node, només lectura)
Executa-la des del worktree, amb `node --input-type=module < sonda.mjs` (així `three` es resol des del repo). Adapta-hi els noms de
mòduls i de nodes de la figura. La distància següent és una cota superior en metres de món: transforma un punt de la caixa
al món, també amb escala no uniforme o cisallament. Amb aquestes transformacions pot sobreestimar l'obertura; no és una distància
exacta a la superfície. Reté el màxim cru i arrodoneix només quan el mostres.

```js
import * as THREE from 'three';
const { Vox } = await import(process.cwd() + '/src/scene/models/voxel.js');
const om = Vox.prototype.mesh, ob = Vox.prototype.box;
Vox.prototype.box = function (x, y, z, w, h, d, c, j) { (this.L ||= []).push({ x, y, z, w, h, d, c }); return ob.call(this, x, y, z, w, h, d, c, j); };
Vox.prototype.mesh = function () { const m = om.call(this); m.userData.boxes = this.L; return m; };
const { buildDrac } = await import(process.cwd() + '/src/scene/models/drac.js');   // ← la figura
const { dracPose, newDracPose } = await import(process.cwd() + '/src/game/dance-drac.js');
const { poseDrac } = await import(process.cwd() + '/src/scene/drac-motion.js');
const fig = buildDrac();
const lo = b => [b.x - b.w / 2, b.y, b.z - b.d / 2], hi = b => [b.x + b.w / 2, b.y + b.h, b.z + b.d / 2]; // y = base!
const gap = (a, b) => Math.hypot(...[0, 1, 2].map(k => Math.max(0, lo(b)[k] - hi(a)[k], lo(a)[k] - hi(b)[k])));
// 1) illes per malla
fig.root.traverse(m => { const L = m.userData?.boxes; if (!L || L.length < 2) return;
  const p = L.map((_, i) => i), f = i => p[i] === i ? i : (p[i] = f(p[i]));
  L.forEach((a, i) => L.forEach((b, j) => { if (j > i && gap(a, b) < 1e-6) p[f(i)] = f(j); }));
  const big = f(L.reduce((bi, b, i) => b.w * b.h * b.d > L[bi].w * L[bi].h * L[bi].d ? i : bi, 0));
  L.forEach((b, i) => f(i) !== big && console.log('flota', b.c, b, Math.min(...L.filter((_, k) => f(k) === big).map(o => gap(b, o))).toFixed(3)));
});
// 2) obertura d'una junta: punts del fill (marc local) → distància a les caixes del pare, en món
const inv = new THREE.Matrix4(), V = new THREE.Vector3(), C = new THREE.Vector3();
const dist = (pW, m) => { V.copy(pW).applyMatrix4(inv.copy(m.matrixWorld).invert());
  return Math.min(...m.userData.boxes.map(b => { const a = lo(b), z = hi(b);
    C.set(...[0, 1, 2].map(k => Math.max(a[k], Math.min(z[k], V.getComponent(k)))));
    return C.applyMatrix4(m.matrixWorld).distanceTo(pW); })); };
const rect = (w, d, y) => [...Array(5).keys()].flatMap(i => [[i / 4, 0], [i / 4, 1], [0, i / 4], [1, i / 4]].map(([u, v]) => new THREE.Vector3(-w / 2 + w * u, y, -d / 2 + d * v)));
const JOINTS = [ // [nom, node fill, punts al marc del fill, malla pare]
  ['coll seg1 → seg0', fig.necks[0].segs[1], rect(0.93, 0.93, 0), fig.necks[0].segs[0].children[0]],
];
const pose = newDracPose(), worst = {};
for (let beat = 0; beat < 236; beat += 0.1) {
  dracPose(pose, beat); poseDrac(fig, pose, 0); fig.root.updateMatrixWorld(true);
  for (const [n, A, pts, B] of JOINTS) { const mx = Math.max(...pts.map(p => dist(p.clone().applyMatrix4(A.matrixWorld), B)));
    if (mx > (worst[n]?.mx ?? 0)) worst[n] = { mx, beat }; }
}
console.log(worst);
```

---

## 6. Lliçons per a la propera figura

1. **Primer les referències**, abans de tocar geometria: com a mínim tres fotos (davant, costat, en moviment). Anota què és observat i
   què és adaptació. Les proporcions errònies (aquí, colls massa llargs) creen problemes de geometria que cap ajust arregla.
2. **Les juntes es pivoten al centre d'un nus**, no a la cara d'un bloc. Un bloc que gira sobre la seva aresta sempre obre una falca.
3. **La decoració es col·loca sobre la superfície real** (la funció que genera les llosques), mai amb un radi d'el·lipse més un marge a ull.
4. **El foc neix a la punta del seu broquet**: el grup de la flama té l'origen al broquet i escala des d'allà.
5. **Mesura el detall a la distància de joc.** Els ~5 cm de gruix i ~3 cm de separació eren propostes del POC, no regles universals.
   La resolució del mapa d'ombres no imposa una separació mínima entre totes les superfícies: confirma la causa de l'artefacte.
6. **Un test verd no vol dir model sencer**: cal que el test mesuri la connectivitat al llarg de **tot** el ball, no només en repòs.
7. **Alinea el visor amb el joc** (bias d'ombra, mida del mapa, càmera) abans de jutjar artefactes. Si no, persegueixes bugs del visor.
8. **Comprova la convenció de cada eix** de l'ajudant de caixes (`y` = base, `x/z` = centre) abans d'escriure decoració.
9. **No canviïs música, coreografia ni càmera** per fer passar un test de geometria, llevat que l'encàrrec ho demani.
10. **Informa del que no s'ha pogut verificar** (aquí: el parpelleig era una hipòtesi sense captura A/B).
