# Link-preview images (og:image): the game's, public/og.jpg (the three figures, 16/11/2026), and the mini-games' pages'
# public/og-jocs.jpg (/jocs/) and public/og-pop.jpg (/pop/).
# One template (the owner's pick, 11 Nov 2026): the game's own art full bleed, the MULASSA lettering big on top with the page's
# word under it (GAMES / POP, as the pages' logos), the gold «mulassa.cat» pill at the foot. No other text: the page's
# og:title / og:description carry the words. A new game's page = one more entry in PAGES.
#   python3 tools/social/og/build.py            HTML in output/og/, rendered by headless Chrome, JPEGs into public/
#   python3 tools/social/og/build.py --html     only the HTML, to look at it in a browser
import pathlib, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = ROOT / 'output' / 'og'
P = '../../public'  # the art and fonts, relative to OUT
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

CSS = f"""@font-face{{font-family:'Baloo 2';src:url({P}/fonts/baloo-2-latin.woff2) format('woff2');font-weight:400 800}}
@font-face{{font-family:'Jersey 10';src:url({P}/fonts/jersey-10-latin.woff2) format('woff2')}}
*{{box-sizing:border-box;margin:0}}html,body{{width:1200px;height:var(--h);overflow:hidden;background:#15112a}}
.sq .logo{{top:56px}}.sq .logo svg{{width:900px}}.sq .word{{font-size:120px;-webkit-text-stroke:22px #2a1a10}}.sq .word.tap{{font-size:96px}}.sq .pill{{bottom:90px;font-size:56px;padding:10px 60px 8px}}
body{{position:relative;font-family:'Baloo 2',system-ui,sans-serif}}
.bg{{position:absolute;inset:0;background-size:cover}}
.split .a{{clip-path:polygon(0 0,58% 0,42% 100%,0 100%)}}.split .b{{clip-path:polygon(58% 0,100% 0,100% 100%,42% 100%)}}
.cut{{position:absolute;inset:0;background:linear-gradient(105deg,transparent 49.6%,#fff3d6 49.6%,#fff3d6 50.4%,transparent 50.4%)}}
.tri .a{{clip-path:polygon(0 0,37% 0,29% 100%,0 100%)}}.tri .b{{clip-path:polygon(37% 0,70% 0,62% 100%,29% 100%)}}.tri .c{{clip-path:polygon(70% 0,100% 0,100% 100%,62% 100%)}}
.tri .bg{{background-repeat:no-repeat}}
.shade{{position:absolute;inset:0;background:linear-gradient(#000a,#0000 45%,#0000 62%,#000a)}}
.logo{{position:absolute;top:34px;left:0;right:0;display:flex;flex-direction:column;align-items:center}}
.logo svg{{display:block;width:520px;height:auto;filter:drop-shadow(0 6px 14px #0008)}}
.word{{margin-top:6px;font:800 76px/1 'Baloo 2';letter-spacing:.06em;-webkit-text-stroke:15px #2a1a10;paint-order:stroke fill;filter:drop-shadow(0 6px 14px #0008)}}
.games,.tap{{color:#f5c518}}.pop{{color:#ff7ac6}}
.pill{{position:absolute;left:50%;bottom:46px;translate:-50% 0;padding:8px 44px 6px;border-radius:999px;
  background:linear-gradient(180deg,#ffe066 0%,#f5c518 55%,#dfad13 100%);color:#2a1a10;font:800 40px/1.2 'Baloo 2';
  border:3px solid #2a1a10;box-shadow:0 5px 0 #2a1a10,0 12px 28px #000a}}"""
# the pages' own lettering (jocs/index.html, pop/index.html)
LOGO = """<svg viewBox="0 -4 308.6 80" text-anchor="middle" stroke-linejoin="round"><g font-family="'Jersey 10'" font-size="100" stroke-width="12"><text x="154.3" y="66.6" textLength="300" lengthAdjust="spacingAndGlyphs" fill="#5e1514" stroke="#5e1514" style="paint-order:stroke">MULASSA</text><text x="154.3" y="60.6" textLength="300" lengthAdjust="spacingAndGlyphs" fill="#c0283c" stroke="#fff3d6" style="paint-order:stroke">MULASSA</text></g></svg>"""

# the cream lines between the slices (the same cut as og-jocs.jpg's, twice)
CUT2 = '<svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 100 100" preserveAspectRatio="none"><g stroke="#fff3d6" stroke-width="8" vector-effect="non-scaling-stroke"><line x1="37" y1="0" x2="29" y2="100" vector-effect="non-scaling-stroke"/><line x1="70" y1="0" x2="62" y2="100" vector-effect="non-scaling-stroke"/></g></svg>'
def tri(size, xs, ys):  # the three figures' share photos (public/share/), each on its own slice; xs, ys: each photo's top left
    # (a photo set lower leaves the night sky's colour above it, under the logo)
    figs = ['mulassa-valls', 'drac-valls', 'bou-tradicional-valls']
    return '<div class="tri">' + ''.join(f'<div class="bg {k}" style="background:#15112a url({P}/share/{f}.jpg) no-repeat {x}px {y}px/auto {size}px"></div>'
                                         for k, f, x, y in zip('abc', figs, xs, ys)) + '</div>' + CUT2
PAGES = {  # name → (art, word): the art is the games menu's own stills (public/jocs/menu/)
    'og': (tri(760, (-393, 65, 605), (0, 77, 0)), 'TAP TAP DANCE'),  # each face in its slice's middle, the Drac's under the logo
    'og-jocs': (f"""<div class="split"><div class="bg a" style="background-image:url({P}/jocs/menu/video/tap.jpg);background-position:30% 60%"></div><div class="bg b" style="background-image:url({P}/jocs/menu/video/pop.jpg);background-position:85% 50%"></div></div><div class="cut"></div>""", 'GAMES'),
    'og-pop': (f"""<div class="bg" style="background-image:url({P}/jocs/menu/hero/pop.jpg);background-position:70% 50%"></div>""", 'POP'),
}
# Google's result thumbnail is square, cut from the middle of og:image: each page also names a 1200×1200 one in its JSON-LD
# image
SQUARE = {
    'og-1x1': (tri(900, (-503, -35, 531), (310, 300, 300)) + '<div class="bg" style="background:linear-gradient(#15112a 300px,#15112a00 460px)"></div>', 'TAP TAP DANCE'),  # under the logo, not behind it
    'og-jocs-1x1': PAGES['og-jocs'],
    'og-pop-1x1': (f"""<div class="bg" style="background-image:url({P}/jocs/menu/hero/pop.jpg);background-position:48% 50%"></div>""", 'POP'),
}

def page(art, word, h):
    return f"""<!doctype html><html lang="ca" style="--h:{h}px"><meta charset="utf-8"><style>{CSS}</style><body class="{'sq' if h == 1200 else ''}">{art}<div class="shade"></div>
<div class="logo">{LOGO}<div class="word {word.split()[0].lower()}">{word}</div></div><div class="pill">mulassa.cat</div></body></html>"""

OUT.mkdir(parents=True, exist_ok=True)
SIZES = {**{n: (a, w, 630) for n, (a, w) in PAGES.items()}, **{n: (a, w, 1200) for n, (a, w) in SQUARE.items()}}
for name, (art, word, h) in SIZES.items():
    (OUT / f'{name}.html').write_text(page(art, word, h))
if '--html' in sys.argv:
    sys.exit(0)
with tempfile.TemporaryDirectory() as profile:
    for name, (_, _, h) in SIZES.items():
        png = OUT / f'{name}.png'
        # headless: never a window over the owner's (AGENTS.md); the fonts load from files, the budget lets them settle
        subprocess.run([CHROME, '--headless=new', '--hide-scrollbars', f'--user-data-dir={profile}', f'--window-size=1200,{h}',
                        '--virtual-time-budget=3000', f'--screenshot={png}', (OUT / f'{name}.html').as_uri()], check=True, capture_output=True)
        # shortcut: sips is macOS's (the square at 80: the three figures' at 85 went past 300 KB); on another system convert with any tool at JPEG quality 85
        subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80' if h == 1200 else '85', str(png), '--out', str(ROOT / 'public' / f'{name}.jpg')], check=True, capture_output=True)
        print(f'public/{name}.jpg')
