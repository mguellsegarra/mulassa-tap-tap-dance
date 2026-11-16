# The Bou's banknote (public/textures/bitllet-bou.png) at twice its drawn size: the 1024x512 art is flat colours, so it is
# scaled 8x, smoothed, snapped back to its own six main colours (clean edges, no blur) and brought down to 2048x1024, then
# saved with a 32-colour palette (~350 KB). The game's close-up magnified the 1024 art nearly twice on a phone and its small
# print («REMOV · LA · TERRA», 12 px tall there) read as a blur (figures/bou/bou-end-shot.js).
# The 1024 art is in the history: git show 1e29b7fa^:public/textures/bitllet-bou.png > /tmp/bitllet-1024.png
#   uv run --python 3.11 --with pillow --with numpy tools/dev/bou-bitllet.py /tmp/bitllet-1024.png public/textures/bitllet-bou.png
import sys
import numpy as np
from PIL import Image, ImageFilter

src, out = sys.argv[1], sys.argv[2]
art = Image.open(src).convert('RGB')
assert art.size == (1024, 512), f'the 1024x512 art, not {art.size}'
colours = sorted(art.getcolors(1 << 20), reverse=True)[:6]
palette = np.array([c for _, c in colours], dtype=np.int32)
big = np.asarray(art.resize((art.width * 8, art.height * 8), Image.BICUBIC).filter(ImageFilter.GaussianBlur(3)), dtype=np.int32)
snapped = np.empty(big.shape, dtype=np.uint8)
for y in range(0, big.shape[0], 512):  # in bands: 8x is 8192x4096
    band = big[y:y + 512]
    snapped[y:y + 512] = palette[((band[:, :, None, :] - palette[None, None]) ** 2).sum(-1).argmin(-1)]
note = Image.fromarray(snapped).resize((art.width * 2, art.height * 2), Image.LANCZOS)
note.quantize(colors=32, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(out, optimize=True)
print(out, note.size)
