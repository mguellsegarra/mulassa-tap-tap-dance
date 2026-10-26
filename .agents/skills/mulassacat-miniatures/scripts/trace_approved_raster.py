"""Trace an approved raster without redrawing its silhouette.

Run with uv --with pillow --with vtracer==0.6.15. Requires npx for pinned SVGO.
Bounds must come from getBBox() on the optimized native-size SVG, not PNG padding.
The intermediate PNG is tracing input only; the approved raster is never edited.
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
import xml.etree.ElementTree as ET

from PIL import Image
import vtracer

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('input', type=Path)
p.add_argument('output', type=Path)
p.add_argument('--bounds', nargs=4, type=float, metavar=('X', 'Y', 'WIDTH', 'HEIGHT'))
args = p.parse_args()
args.output.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='bestiari-trace-') as temp:
    temp = Path(temp)
    im = Image.open(args.input).convert('RGBA')
    # VTracer treats faint nonzero alpha as paint. Trace the visible contour,
    # discarding hidden RGB outside it. SVG supplies its own edge antialiasing.
    im.putalpha(im.getchannel('A').point(lambda a: 255 if a >= 128 else 0))
    im.save(temp / 'input.png')
    vtracer.convert_image_to_svg_py(
        str(temp / 'input.png'), str(temp / 'trace.svg'),
        colormode='color', hierarchical='stacked', mode='spline',
        filter_speckle=4, color_precision=6, layer_difference=24,
        corner_threshold=60, length_threshold=4, max_iterations=10,
        splice_threshold=45, path_precision=2,
    )
    subprocess.run([
        'npx', '--yes', 'svgo@4.0.0', '--precision', '2',
        '-i', str(temp / 'trace.svg'), '-o', str(temp / 'optimized.svg'),
    ], check=True)
    ET.register_namespace('', 'http://www.w3.org/2000/svg')
    root = ET.fromstring((temp / 'optimized.svg').read_text())
    ns = '{http://www.w3.org/2000/svg}'
    if args.bounds:
        x, y, w, h = args.bounds
        assert w > 0 and h > 0
        scale = 100 / h
        tx, ty = 80 - (x + w / 2) * scale, 4 - y * scale
        assert w * scale < 160, 'Illustration needs a wider viewBox'
        new = ET.Element(ns + 'svg', {
            'viewBox': '0 0 160 112', 'preserveAspectRatio': 'xMidYMid meet',
            'role': 'img', 'aria-label': 'Drac de Valls',
        })
        group = ET.SubElement(new, ns + 'g', {
            'transform': f'translate({tx:.9f} {ty:.9f}) scale({scale:.12f})',
        })
        group.extend(list(root))
        root = new
    else:
        root.set('viewBox', f'0 0 {im.width} {im.height}')
        root.set('preserveAspectRatio', 'xMidYMid meet')
        root.attrib.pop('width', None)
        root.attrib.pop('height', None)
    args.output.write_text(ET.tostring(root, encoding='unicode') + '\n')
print(json.dumps({'output': str(args.output), 'bytes': args.output.stat().st_size,
                  'paths': sum(e.tag == ns + 'path' for e in root.iter())}))
