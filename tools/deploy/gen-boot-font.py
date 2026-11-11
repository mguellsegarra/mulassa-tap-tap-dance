# The loading screen's own copy of Baloo 2, inside index.html: its first line paints before any file can arrive, so on a
# first visit it showed in the system's font and changed under the eye (or waited, hidden). A subset at weight 800 with
# Latin-1 and the punctuation the loading lines use (~15 KB), written as a data: URL between the two markers of
# index.html's `boot-font` @font-face. Other scripts (latin-ext, Cyrillic, CJK) fall through to 'Baloo 2' as before.
# Run after changing public/fonts/baloo-2-latin.woff2 (tests/ui/loader.mjs checks the page carries it):
#   uv run --python 3.11 --with fonttools --with brotli tools/deploy/gen-boot-font.py
import base64, io, re, pathlib
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parents[2]
UNICODES = [*range(0x20, 0x7F), *range(0xA0, 0x100), 0x2013, 0x2014, 0x2019, 0x201C, 0x201D, 0x2026]
font = instancer.instantiateVariableFont(TTFont(ROOT / 'public/fonts/baloo-2-latin.woff2'), {'wght': 800})
options = subset.Options(); options.flavor = 'woff2'; options.layout_features = ['kern', 'liga']
sub = subset.Subsetter(options); sub.populate(unicodes=UNICODES); sub.subset(font)
out = io.BytesIO(); font.flavor = 'woff2'; font.save(out)
data = base64.b64encode(out.getvalue()).decode()
page = ROOT / 'index.html'; html = page.read_text()
new, n = re.subn(r'(/\* boot-font \*/url\(data:font/woff2;base64,)[A-Za-z0-9+/=]*(\)/\* boot-font:end \*/)', lambda m: m.group(1) + data + m.group(2), html)
assert n == 1, 'index.html: one boot-font @font-face expected'
page.write_text(new)
print(f'boot font: {len(out.getvalue())} bytes, {len(data)} in index.html')
