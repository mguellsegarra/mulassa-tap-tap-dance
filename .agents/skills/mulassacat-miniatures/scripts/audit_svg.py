"""Check static standalone SVG contracts, without claiming visual fidelity."""
import argparse
import json
from pathlib import Path
import xml.etree.ElementTree as ET

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('files', type=Path, nargs='+')
args = p.parse_args()
for path in args.files:
    root = ET.fromstring(path.read_text())
    box = [float(n) for n in root.attrib['viewBox'].split()]
    assert len(box) == 4 and box[2] > 0 and box[3] > 0, path
    assert root.get('preserveAspectRatio', 'xMidYMid meet') != 'none', 'Nonuniform root stretch'
    ids = []
    for el in root.iter():
        tag = el.tag.split('}')[-1]
        assert tag not in {'script', 'foreignObject', 'animate', 'animateTransform', 'animateMotion', 'set', 'image'}, tag
        assert 'animation' not in el.get('style', ''), 'Inline motion'
        assert tag != 'style', 'Static master must not depend on CSS'
        if el.get('id'): ids.append(el.get('id'))
        for key, value in el.attrib.items():
            assert not key.lower().startswith('on'), key
            if key.endswith('href'): assert value.startswith('#'), 'External dependency'
    assert len(ids) == len(set(ids)), 'Duplicate IDs'
    print(json.dumps({'file': str(path), 'bytes': path.stat().st_size, 'viewBox': box, 'nodes': sum(1 for _ in root.iter()), 'static': True}))
