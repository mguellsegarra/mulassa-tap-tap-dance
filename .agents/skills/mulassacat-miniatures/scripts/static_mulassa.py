"""Extract the approved standing geometry without the loader's motion or FX."""
import argparse
import copy
from pathlib import Path
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, default=Path(__file__).resolve().parents[1] / 'assets/mulassa-approved-20261018.svg')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'assets/mulassa-static.svg')
parser.add_argument('--portrait', action='store_true', help='Omit cast shadow for a selector portrait')
parser.add_argument('--bounds', nargs=4, type=float, help='Measured x y width height; normalize to top 4, soles 104')
args = parser.parse_args()
ET.register_namespace('', 'http://www.w3.org/2000/svg')
root = ET.fromstring(args.source.read_text())
remove = {'ml-ground', 'ml-dust', 'ml-sweat', 'ml-clac', 'ml-sad'}
if root.tag.split('}')[-1] == 'div':
    # The current loader composes same-coordinate SVGs inside animated HTML layers.
    # Flatten only those wrappers, retaining the SVG's geometric translations.
    flattened = ET.Element('{http://www.w3.org/2000/svg}svg', {'viewBox': '0 0 220 168'})
    def flatten(node, target):
        if set(node.get('class', '').split()) & remove:
            return
        tag = node.tag.split('}')[-1]
        if tag in {'div', 'svg'}:
            if tag == 'svg':
                assert node.get('viewBox') == '0 0 220 168', 'Different coordinate system'
            for child in node:
                flatten(child, target)
        else:
            target.append(copy.deepcopy(node))
    flatten(root, flattened)
    root = flattened
def clean(node):
    for child in list(node):
        if set(child.get('class', '').split()) & remove or child.tag.split('}')[-1] in {'style', 'animate', 'animateTransform'}:
            node.remove(child)
        else:
            clean(child)
        if args.portrait and child.tag.split('}')[-1] == 'ellipse' and child.get('cx') == '100' and child.get('cy') == '147':
            node.remove(child)
    # These transforms position legs and knees; CSS motion is removed separately.
    node.attrib.pop('class', None)
    node.attrib.pop('style', None)
clean(root)
if args.bounds:
    x, y, width, height = args.bounds
    assert width > 0 and height > 0
    scale = 100 / height
    assert width * scale < 160, 'Portrait requires a wider viewBox'
    group = ET.Element('{http://www.w3.org/2000/svg}g', {
        'transform': f'translate({80-(x+width/2)*scale:.9f} {4-y*scale:.9f}) scale({scale:.12f})',
    })
    group.extend(list(root))
    for child in list(root):
        root.remove(child)
    root.append(group)
    root.set('viewBox', '0 0 160 112')
root.set('preserveAspectRatio', 'xMidYMid meet')
root.set('role', 'img')
root.attrib.pop('aria-hidden', None)
root.set('aria-label', 'Mulassa de Valls en repòs')
args.output.parent.mkdir(parents=True, exist_ok=True)
ET.ElementTree(root).write(args.output, encoding='unicode')
print(args.output)
