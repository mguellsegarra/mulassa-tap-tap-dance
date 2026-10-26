# i18n — punts oberts verificats (2026-10-21)

Fonts: docs de Cloudflare Turnstile (developers.cloudflare.com/turnstile/reference/supported-languages/), node v24.12.0 (ICU 77.1, V8 13.6), google/fonts (GitHub, OFL.txt i METADATA.pb), Google Fonts CSS API.

## 1. Paràmetre `language` de Turnstile

Per defecte és `auto` (idioma del navegador si és compatible). La doc no diu què passa si no ho és.

| Idioma | Codi a passar | Nota |
| --- | --- | --- |
| es | `es` (o `es-es`) | acceptat |
| en | `en` (`en-us`) | acceptat |
| fr | `fr` (`fr-fr`) | acceptat |
| it | `it` (`it-it`) | acceptat |
| ro | `ro` (`ro-ro`) | acceptat |
| pt-BR | `pt-br` (curt: `pt`) | acceptat; passar en minúscules |
| de | `de` (`de-de`) | acceptat |
| zh-Hans | `zh-cn` (curt: `zh`) | acceptat; zh-Hant seria `zh-tw` |
| ja | `ja` (`ja-jp`) | acceptat |
| uk | `uk` (`uk-ua`) | acceptat |
| ru | `ru` (`ru-ru`) | acceptat |
| ko | `ko` (`ko-kr`) | acceptat |
| ca | NO acceptat | fallback `es` (o `auto`; l'usuari català sol tenir navegador en ca/es) |
| eu | NO acceptat | fallback `es` |
| gl | NO acceptat | fallback `es` (alternativa `pt-br`; `es` és més proper per a un galaiquès) |
| oc / oc-ES (aranès) | NO acceptat | fallback `fr` (oc) / `es` (oc-ES, es parla a la Vall d'Aran) |

Recomanació: mapa propi `TURNSTILE_LANG` amb els codis de la taula; per als 4 no acceptats passar el fallback explícit (no `auto`, perquè depèn del navegador i no de l'idioma del joc). Un codi no acceptat no s'ha de passar: es comporta de manera no documentada.

## 2. Intl (node 24 / ICU 77)

| Locale | NumberFormat | DateTimeFormat | PluralRules | Exemple |
| --- | --- | --- | --- | --- |
| oc, oc-ES | sí | sí | **NO** (cau al locale per defecte, `en`) | `1 234 567,8` · `2026 d’octòbre 21` |
| gl | sí | sí | sí | `1.234.567,8` · `21 de outubro de 2026` |
| eu | sí | sí | sí | `1.234.567,8` · `2026(e)ko urriaren 21(a)` |
| ca, pt-BR, it, ro, uk, ru, ja, ko, zh-Hans | sí | sí | sí | |

Observacions:
- `oc` té format de nombres i dates (el format de dates en `oc` surt amb l'ordre any-mes-dia, "2026 d’octòbre 21": forma pròpia de les dades ICU, rara; revisar a mà o fixar el format de dates amb opcions explícites o delegar a `fr`/`ca`).
- Plural de `oc`: no hi és. La regla CLDR de l'occità és com la del francès (`one` per 0 i 1, `other` la resta): usar `new Intl.PluralRules('fr')` per a `oc` i `oc-ES`. En català i gallec `one` és només l'1; en francès també el 0.
- Les mateixes dades ICU les porten Chrome/Safari/Firefox actuals; per a `oc` en navegadors cal comprovar a l'execució amb `Intl.PluralRules.supportedLocalesOf('oc')`, i si és buit usar `fr`. Per a format de nombres/dates, si `supportedLocalesOf('oc')` és buit, usar `ca` (el més proper per a separadors i mesos) per a oc-ES, `fr` per a oc.
- `uk`/`ru` tenen 3 categories (`one, few, many`; `other` per als decimals): el catàleg ha d'admetre-les. `ja/ko/zh` només `other`; `ro` té `one, few, other`.

## 3. Fonts

### Cirílic (uk, ru)

Proposta: **Nunito** (variable `wght`, OFL 1.1). Tria raonada: arrodonida i càlida, com Baloo 2; té cirílic i cirílic-ext (Baloo 2 només té devanagari, latin, latin-ext, vietnamita; Jersey 10 només llatí). Comfortaa i Rubik també són OFL i arrodonides, però Nunito té millor to de text de joc i pesos 600–800 coherents amb Baloo 2.

Llicència: `ofl/nunito/OFL.txt` a google/fonts: "Copyright 2014 The Nunito Project Authors", SIL OFL 1.1 (93 línies, descarregada). El mateix per a Rubik i Comfortaa (OFL; Comfortaa amb Reserved Font Name).

Descàrrega de prova (directori nou `/tmp/i18n-font-test/`, res a src ni public):

| Fitxer | Mida | unicode-range (de Google) |
| --- | --- | --- |
| nunito-cyrillic.woff2 | 20.780 B | U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116 |
| nunito-cyrillic-ext.woff2 | 28.908 B | U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F |
| OFL-Nunito.txt | 93 línies | |

El cirílic bàsic (20,8 kB) cobreix uk i ru; el cirílic-ext (28,9 kB) no és necessari (només llengües no eslaves) i es pot ometre. Mateixa URL per al pes 600 i el 800: és una font variable, amb un sol `@font-face` amb `font-weight: 600 800;`.

### Canvis exactes per afegir una font a `public/fonts/` (no fets)

1. Copiar `nunito-cyrillic.woff2` i `OFL-Nunito.txt` a `public/fonts/`.
2. `tools/deploy/prepare-pages.mjs`: **cap canvi**. L'allowlist ja accepta `fonts/[\w-]+\.(woff2?|txt)` (línia 42).
3. `index.html` (bloc `@font-face` línies 46-51, inline perquè pinten abans de tot): afegir `@font-face { font-family: 'Nunito'; font-weight: 600 800; font-display: swap; src: url(/fonts/nunito-cyrillic.woff2) format('woff2'); unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }` i afegir `'Nunito'` com a segon element a la pila de cada `font-family` que ara comença per `'Baloo 2'` (el navegador només baixa el fitxer si hi ha caràcters cirílics, gràcies al unicode-range).
4. `tests/ui/privacy-fonts.mjs`: el test comprova que els `url(/fonts/*.woff2)` existeixen (ja cobreix el nou fitxer) i que `Baloo 2` i `Jersey 10` tenen `@font-face` i `OFL-<família amb guió>.txt` amb "SIL Open Font License". Afegir `'Nunito'` al bucle `for (const family of ['Baloo 2', 'Jersey 10'])` (el fitxer d'OFL s'ha de dir `OFL-Nunito.txt`; per a noms amb espai el test substitueix l'espai per guió). El `assert(fonts.length >= 4)` segueix valent.
5. Si es renderitza text al canvas HUD amb sprites cachejats (`src/hud/sprites.js`), assegurar que la pila de fonts del canvas inclou `Nunito` i esperar `document.fonts.load('600 16px Nunito', 'Д')` abans de l'èxit del canvi d'idioma cirílic; sense això el primer sprite es pinta amb la font del sistema i queda cachejat.
6. Documentar la font a Privadesa/«Sobre el joc» si el text de fonts locals en parla (no ho he mirat).

### CJK (ja, ko, zh-Hans)

No cal descarregar res: una pila de fonts del sistema, sense fitxers (un subconjunt CJK en WOFF2 pesa MB). Pila proposada per al text de cos i l'HUD:
`ui-rounded, 'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'PingFang SC', 'Apple SD Gothic Neo', 'Yu Gothic', 'Meiryo', 'Microsoft YaHei', 'Malgun Gothic', 'Noto Sans CJK SC', 'Noto Sans CJK JP', 'Noto Sans CJK KR', sans-serif`
Per idioma, posar el `lang` al `<html>` (`ja`, `ko`, `zh-Hans`) perquè el navegador triï la variant correcta dels glifs Han unificats, i ordenar la pila per idioma: ja → Hiragino/Yu Gothic/Noto JP; ko → Apple SD Gothic Neo/Malgun Gothic/Noto KR; zh → PingFang SC/Microsoft YaHei/Noto SC.
Cobertura: macOS/iOS (Hiragino, PingFang, Apple SD Gothic Neo), Windows 10+ (Yu Gothic, Microsoft YaHei, Malgun Gothic), Android i Linux (Noto Sans CJK / Droid Sans Fallback): tot el text raonable queda cobert. Només el pes 800 pot caure en 700 al sistema. Cal el test de tipus per amplada dels sprites del canvas: el text CJK és més ample que el català en caràcters però més curt en nombre.

## Conclusions

1. Turnstile accepta es, en, fr, it, ro, pt-br, de, zh-cn, ja, uk, ru, ko; NO accepta ca, eu, gl, oc: passar-hi `es` (oc → `fr`) explícitament.
2. Cal un mapa `TURNSTILE_LANG` en minúscules (`pt-br`, `zh-cn`) i no el codi BCP-47 del joc.
3. Node 24/ICU 77: oc, oc-ES, gl, eu tenen NumberFormat i DateTimeFormat; gl i eu tenen també PluralRules.
4. `oc`/`oc-ES` no tenen `Intl.PluralRules`: usar les regles de `fr` (0 i 1 = one); revisar el format de dates d'`oc` ("2026 d’octòbre 21") o fixar-ne les opcions.
5. Al navegador, detectar amb `supportedLocalesOf` i caure a `fr` (plurals) / `ca` (format) si falta.
6. `uk` i `ru` necessiten `one/few/many/other` al catàleg de plurals; `ro` `one/few/other`; CJK només `other`.
7. Cirílic: Nunito variable (OFL 1.1 verificada a google/fonts), 20,8 kB el subconjunt `cyrillic` (suficient per a uk/ru).
8. Afegir una font: copiar woff2 + OFL a `public/fonts/`, un `@font-face` a `index.html`, `Nunito` a les piles i al bucle de `tests/ui/privacy-fonts.mjs`; `prepare-pages.mjs` no canvia.
9. Cal precarregar la font abans de pintar sprites cirílics a canvas (la cache de sprites congela el primer pintat).
10. CJK: només pila de fonts del sistema + `lang` correcte al `<html>`; sense fitxers.
