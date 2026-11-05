# Mulassa Games picker images

Each game in the Mulassa Games picker (`#games-menu` in `index.html`) has two pictures:

| File | Shape | Final size | JPEG |
| --- | --- | --- | --- |
| `public/jocs/menu/cards/<id>.jpg` (the card, `img src`) | 4:5 | 720×900 | quality 84 |
| `public/jocs/menu/hero/<id>.jpg` (the banner, `data-hero`) | 8:3 | 3600×1350 | quality 80 |

`tests/ui/games-menu.mjs` reads every card the menu lists, so a card without its file fails the check.

## 1. Generate with Codex

Player-facing art is made by a Codex sub-agent with its built-in imagegen (`delegate_task`, a Codex model). It writes to a scratch folder such as `/tmp/jocs13/`, never to the repository. It runs no git and does not upscale. Codex returns about 1120×1400 for the card and 2048×768 for the banner. Brief it with:

- The existing cards and banners as style references, to read as images: chunky voxel 3D render, a sunny plaça with ochre buildings, green shutters and voxel trees.
- Believable scale: townspeople about one storey tall, a camera slightly above eye level, a consistent ground.
- **Card (4:5):** the subject centred, everything inside the frame with a margin at the top. Keep the lower third calm, because the name band sits there.
- **Banner (8:3):** the subject at about 68% of the width. Keep the left 45% calm, because the title and its dark fade sit there.
- No text, letters or numbers. No flags (when a senyera is needed, follow its rule: four red bars on yellow).
- Crop to the exact ratio, never stretch.

Look at both images before upscaling. Codex often makes the people too small next to the subject; ask it again.

## 2. Upscale ×4 with Real-ESRGAN

Use [Real-ESRGAN ncnn-vulkan](https://github.com/xinntao/Real-ESRGAN/releases) (the macOS zip carries the binary and its `models/`; run `chmod u+x` first). Use the `realesrgan-x4plus` model; `realesr-animevideov3` is the default, so name the model:

```sh
E=/tmp/jocs13/tools/esr   # unzipped release; it lives outside the repo
$E/realesrgan-ncnn-vulkan -i <id>.png      -o up-card-<id>.png -n realesrgan-x4plus -m $E/models
$E/realesrgan-ncnn-vulkan -i <id>-wide.png -o up-hero-<id>.png -n realesrgan-x4plus -m $E/models
```

## 3. Resize to the shipped size

Scale down with Pillow (LANCZOS) and save a progressive, optimised JPEG:

```sh
D=public/jocs/menu
uv run -q --with pillow python - <<EOF
from PIL import Image
def save(src, size, dst, q): Image.open(src).convert('RGB').resize(size, Image.LANCZOS).save(dst, quality=q, optimize=True, progressive=True)
save('up-card-<id>.png', (720, 900),   '$D/cards/<id>.jpg', 84)
save('up-hero-<id>.png', (3600, 1350), '$D/hero/<id>.jpg', 80)
EOF
```

Mulassa Pop's banner is the only one composed: the AI base has its right half replaced by a real board capture, blended over a 260 px left feather. Repeat that when the game itself has changed, not for teasers. Mulassa Memory's banner is a plain capture of its own board: `/jocs/memory/` at 1800×675, DPR 2, with `#hud` hidden and `#area` given a 50% left margin, on the 8-card level with two cards face up. Its card is the 1.2 card (600×750), upscaled with Real-ESRGAN and resized to 720×900.

Then check the picker at the viewport set (`.agents/skills/mulassacat-validacio-visual/SKILL.md`) and hand the captures to the owner.
