# Instagram image editors

Local-only tools for the Mulassa Instagram images. The three editors reuse the game's Three.js models and build their PNGs in the browser. They do not run the game, connect to the leaderboard, or publish anything.

## Run

From the repository root:

```sh
npm ci
npm run dev:instagram
```

Open <http://127.0.0.1:5189/>. The server binds to localhost. Stop it with Ctrl+C.

- **Perfil**: six portrait presets, including the selected turquoise close-up. The circular preview is a mask; the exported image stays square at 1080 × 1080.
- **Els primers posts**: welcome, controls and rhythm challenge at 1080 × 1440 (3:4). Edit the copy and, on the last two posters, the Mulassa's angle, elevation, size and position. Camera adjustments persist separately in this browser's local storage. The reset button restores that poster's preset.
- **Cartes del bestiari**: the collectible card and its larger-text detail slide, both at 1080 × 1440. Edit the texts and camera. Save/load JSON to keep a configuration. Import another figure as a Three.js `Object3D.toJSON()` file with embedded geometry/materials; external textures must remain available. Configuration JSON does not include the imported model.

Wait for each preview to appear before exporting. Check the crop, ears, feet, text, and Instagram's profile preview before publishing. A large close-up intentionally crops the body; use the camera controls to change it.

The desktop `file://` HTML bundles were working copies. These source editors now require the local server; no generated HTML bundles or PNG exports belong in Git. Browser settings saved for an old `file://` editor are not transferred to localhost. The last chosen camera presets are included in the source.

## Optional static build

```sh
npm run build:instagram
```

This writes only the editor pages and their referenced assets to the ignored `dist-instagram/` directory. It does not copy `public/`, music, videos, production pages or deployment settings. Serve that directory with any static HTTP server. The normal `npm run build` and deployment workflow remain separate.

Exported PNGs can be saved anywhere; `tools/instagram/exports/` is ignored if a local project folder is useful.

## Source and shared assets

- `perfil/generator.js`, `primers-posts/posts.js`, `personatges/plantilla.js`: the three renderers and their controls. Each has one HTML entry point; the posts page links to the character editor instead of copying it.
- Game models: relative imports from `src/scene/models/`. Three.js comes from the repository's dependency.
- Original GUA/PA note artwork: the Vite virtual module in `vite.config.js` extracts the actual palette and drawing functions from `src/hud/sprites.js` and `primitives.js`. Nothing is copied into a second drawing implementation. Extraction fails clearly if the expected source boundaries change; changes to either file reload the editor. Only normal left/right notes are exposed; this adapter does not support GUAPA or live HUD effects.
- `shared/fonts.css`: the game's existing Baloo 2 and Jersey 10 files in `public/fonts/`, plus the card's Source Serif 4 font files in `assets/fonts/`. SIL OFL licenses are beside their respective fonts. Fonts are stored once as files, with no embedded base64 copies.
- UAF logo: the existing `public/uaf-logo.jpg`; the card uses its flame.
- `assets/escut-valls.svg`: the Valls crest drawing from Wikimedia Commons, [Escudo de Valls](https://commons.wikimedia.org/wiki/File:Escudo_de_Valls.svg), HansenBCN, public domain drawing. Official-symbol usage restrictions may still apply.

The note lane is a static illustrative composition. It does not represent a saved game, a score, or actual players. The posters and card rules text are editorial copy; changes to game mechanics should be checked against that copy.

## Captions

### 01 · Benvinguda

🐴🥁 Ja podeu fer ballar la Mulassa de Valls des del mòbil o l'ordinador!

Gratuït, en català i sense instal·lar res.

Amb la col·laboració de la @uafvalls ❤️

👉 Proveu-lo a mulassa.cat (enllaç a la bio)

#MulassaDeValls #Valls #SantaÚrsula #CulturaPopular #VideojocsEnCatalà

### 02 · Com es juga

🟠 GUA. 🟢 PA. I tots dos alhora: GUAPA!

Segueix el ritme del ball i fes ballar la Mulassa de Valls 🐴🥁

👉 Juga-hi a mulassa.cat · Enllaç a la bio

#MulassaDeValls #Valls #CulturaPopular #VideojocsEnCatalà

### 03 · El repte

Segueixes el ritme? 🐴🥁

Tria entre fàcil, normal i difícil, segueix la música i posa a prova els teus reflexos.

🏆 Fins on pots pujar a la classificació?

👉 Juga-hi a mulassa.cat · Enllaç a la bio

#MulassaDeValls #Valls #CulturaPopular #VideojocsEnCatalà

### 04 · La primera a sortir a ballar

La primera a sortir a ballar: la Mulassa de Valls 🐴🥁

Us imagineu poder fer ballar més figures del bestiari? Quina us agradaria trobar-hi? 🐉🐂🦁

Us llegeixo als comentaris 👇
