"""Convert Pricedown's real glyphs to fixed SVG artwork (no webfont embedding).

uv run --with fonttools python lettering.py /path/to/Pricedown.otf
"""
import html
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path

font = TTFont(sys.argv[1])
glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
lines = {
    'dijous': 'dijous', '19': '19', 'novembre': 'de novembre',
    'el-joc': 'el joc', 'mes': 'més esperat', 'de-la': 'de la',
    'decada': 'dècada', 'el': 'el', 'bou': 'bou', 'tradicional': 'tradicional',
}
for name, text in lines.items():
    path, bounds = SVGPathPen(glyphs), BoundsPen(glyphs)
    x = 0
    for char in text:
        glyph = glyphs[cmap[ord(char)]]
        transform = (1, 0, 0, -1, x, 0)
        glyph.draw(TransformPen(path, transform))
        glyph.draw(TransformPen(bounds, transform))
        x += glyph.width
    left, top, right, bottom = bounds.bounds
    shape = path.getCommands()
    padding = 65
    viewbox = f'{left-padding} {top-padding} {right-left+padding*2} {bottom-top+padding*2}'
    stroke = 95
    if name in ('el', 'bou', 'tradicional'):
        # Normalize paths before outlining: every row has the same painted border.
        width = {'el': 18, 'bou': 50, 'tradicional': 88}[name] * 10.8
        sx = (width - 28) / (right - left)
        sy = sx * (1.8 if name == 'tradicional' else 1)
        normalized = SVGPathPen(None)
        parse_path(shape, TransformPen(normalized, (sx, 0, 0, sy, 14-left*sx, 14-top*sy)))
        shape = normalized.getCommands()
        viewbox = f'0 0 {width} {(bottom-top)*sy+28}'
        stroke = 24
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" role="img" aria-label="{html.escape(text)}"><path d="{shape}" fill="#fff9ef" stroke="#160c26" stroke-width="{stroke}" stroke-linejoin="round" paint-order="stroke fill"/></svg>'
    (Path(__file__).parent / 'assets' / f'{name}.svg').write_text(svg)

# Original geometric lettering, based on the VI's straight-sided construction.
# The official VI is artwork, not a serif typeface or a complete alphabet.
shape = ('M0 0H45L70 145 95 0H140L70 240Z '
         'M160 240 217 0H257L314 240H270L258 180H216L204 240Z M226 140H248L237 70Z '
         'M334 0H380V196H430V240H334Z M450 0H496V196H546V240H450Z '
         'M696 0H590L566 24V100L651 153V196H566V240H672L696 216V140L611 87V44H696Z')
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 736 280" role="img" aria-label="VALLS">
<defs><linearGradient id="sunset" x2="0" y2="1"><stop stop-color="#3952cf"/><stop offset=".35" stop-color="#a735ce"/><stop offset=".65" stop-color="#ff479d"/><stop offset="1" stop-color="#ffad4a"/></linearGradient></defs>
<path d="{shape}" fill="#160c26" fill-rule="evenodd" stroke="#160c26" stroke-width="31" stroke-linejoin="miter" stroke-miterlimit="2"/>
<path d="{shape}" fill="url(#sunset)" fill-rule="evenodd" stroke="#fff9ef" stroke-width="12.4" stroke-linejoin="miter" stroke-miterlimit="2" paint-order="stroke fill"/>
</svg>'''
(Path(__file__).parent / 'assets' / 'valls-vi.svg').write_text(svg)
