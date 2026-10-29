"""Add the 2026-10-19 ornament retouch to the approved normalized Drac trace."""
import argparse
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
source = args.source.read_text().strip()
assert 'viewBox="0 0 160 112"' in source
assert 'data-detail="photo-ornaments"' not in source, 'Already decorated'

# Normalized coordinates, deliberately inside the original silhouette. The trace is untouched.
# Oval rows follow the tail/body/neck volumes seen in pm-lEViiPK0 at 36.5 seconds.
# Counts and spacing adapt that observation to the approved A pose and small selector size.
rows = {
    'tail': [(28, 43, 1.6, 2.3, -15), (30, 50, 1.9, 2.6, -20),
             (34, 57, 2.2, 2.8, -30), (37, 63, 2.2, 2.7, -35)],
    'flank': [(64, 55, 2.6, 3.1, -12), (66, 64, 2.8, 3.3, -4),
              (66, 73, 2.8, 3.3, 4), (64, 81, 2.5, 2.8, 14)],
    'high-neck': [(96, 29, 1.5, 2.0, 30), (92, 35, 1.6, 2.1, 30),
                  (88, 41, 1.7, 2.2, 27), (84, 47, 1.8, 2.3, 24)],
    'low-neck': [(108, 50, 1.4, 1.9, 30), (104, 56, 1.5, 2.0, 25),
                 (101, 62, 1.6, 2.1, 18), (99, 69, 1.6, 2.1, 10)],
}
parts = ['<g data-detail="photo-ornaments">']
for name, ornaments in rows.items():
    parts.append(f'<g data-part="{name}">')
    for x, y, rx, ry, angle in ornaments:
        parts.append(f'<g transform="translate({x} {y}) rotate({angle})">'
                     f'<ellipse rx="{rx}" ry="{ry}" fill="#f6ad08"/>'
                     f'<ellipse rx="{rx * .56:.3f}" ry="{ry * .64:.3f}" fill="#dc0812"/></g>')
    parts.append('</g>')
parts.append('</g>')
assert source.endswith('</svg>')
args.output.write_text(source[:-6] + ''.join(parts) + '</svg>\n')
