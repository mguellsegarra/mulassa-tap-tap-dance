"""The end card's «de» and «valls» as fixed SVG paths from Pricedown Black (Typodermic; its desktop licence allows finished
graphics; the OTF is not kept or redistributed). «el», «bou» and «tradicional» are the announcement's (campaigns/bou-vi).
uv run --with fonttools python tools/social/instagram/campaigns/bou-teaser/lettering.py "/path/Pricedown Bl.otf" """
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
OUT = Path(__file__).resolve().parent/'assets'; f = TTFont(sys.argv[1]); g, c = f.getGlyphSet(), f.getBestCmap()
SUNSET = '<defs><linearGradient id="sunset" x2="0" y2="1"><stop stop-color="#3952cf"/><stop offset=".35" stop-color="#a735ce"/><stop offset=".65" stop-color="#ff479d"/><stop offset="1" stop-color="#ffad4a"/></linearGradient></defs>'
for name in ('de', 'valls'):
    p, b = SVGPathPen(g), BoundsPen(g); x = 0
    for ch in name:
        gl = g[c[ord(ch)]]; t = (1, 0, 0, -1, x, 0); gl.draw(TransformPen(p, t)); gl.draw(TransformPen(b, t)); x += gl.width
    l, t, r, bo = b.bounds; pad = 100 if name == 'valls' else 40; d = p.getCommands()
    # valls: the announcement's sunset and double outline; de: plain (the page turns it white)
    body = (f'{SUNSET}<path d="{d}" fill="#160c26" stroke="#160c26" stroke-width="110" stroke-linejoin="round"/>'
            f'<path d="{d}" fill="url(#sunset)" stroke="#fff5e6" stroke-width="34" stroke-linejoin="round" paint-order="stroke"/>') if name == 'valls' else f'<path d="{d}"/>'
    (OUT/f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{l-pad} {t-pad} {r-l+2*pad} {bo-t+2*pad}">{body}</svg>')
