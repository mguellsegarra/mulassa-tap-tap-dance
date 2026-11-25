#!/usr/bin/env python3
"""Bakes one slice of the Tomb del Poble (the Blat and carrer de la Cort) to slice.json. Dev only.
Sources: Catastro INSPIRE (footprints, floors) and OpenStreetMap (the route), in ETRS89/UTM31N metres.
Run: uv run --python 3.11 --with pyproj tools/dev/tomb-poble/bake.py <BU.BUILDINGPART.xml> <route.json>"""
import json, math, re, sys
from pathlib import Path
from pyproj import Transformer

PART, ROUTE = sys.argv[1:3]
OX, OZ = 353300.0, 4571600.0  # local origin; x east, z south, metres
CELL, RADIUS, FLOOR, PARAPET = 0.5, 38.0, 3.15, 0.5
to_utm = Transformer.from_crs(4326, 25831, always_xy=True).transform

def local(e, n): return (e - OX, OZ - n)
route = [local(*to_utm(lon, lat)) for lat, lon in json.load(open(ROUTE))]
# the slice: church door to the Blat, then up the Cort to where it opens on the Pati (the route's last stretch)
pati = local(*to_utm(1.24989, 41.28552))
turn = min(range(len(route) // 2, len(route)), key=lambda i: math.hypot(route[i][0] - pati[0], route[i][1] - pati[1]))
path = route[:9] + route[turn:][::-1]

def near(x, z):
    return min(math.hypot(x - a, z - b) for a, b in path)

src = Path(PART).read_text(errors='ignore')
parts = []
for m in re.finditer(r'<bu-ext2d:BuildingPart gml:id="ES\.SDGC\.BU\.([^"]+)">(.*?)</bu-ext2d:BuildingPart>', src, re.S):
    floors = re.search(r'numberOfFloorsAboveGround>(\d+)', m[2])
    ring = re.search(r'<gml:exterior>.*?<gml:posList[^>]*>([^<]+)', m[2], re.S)
    if not floors or not ring or int(floors[1]) < 1: continue
    n = [float(v) for v in ring[1].split()]
    pts = [local(n[i], n[i + 1]) for i in range(0, len(n), 2)]
    if min(near(x, z) for x, z in pts) > RADIUS: continue
    parts.append({'id': m[1].split('_')[0], 'h': int(floors[1]) * FLOOR + PARAPET, 'ring': [[round(x, 2), round(z, 2)] for x, z in pts[:-1]]})

xs = [p[0] for q in parts for p in q['ring']]; zs = [p[1] for q in parts for p in q['ring']]
xs += [p[0] for p in path]; zs += [p[1] for p in path]
x0, z0 = min(xs) - 2, min(zs) - 2
W, H = int((max(xs) + 2 - x0) / CELL) + 1, int((max(zs) + 2 - z0) / CELL) + 1
height = [0.0] * (W * H)
def scan(ring, h):  # even-odd fill of one part, keeping the tallest
    for j in range(H):
        z = z0 + (j + .5) * CELL; hits = []
        for (ax, az), (bx, bz) in zip(ring, ring[1:] + ring[:1]):
            if (az <= z) != (bz <= z): hits.append(ax + (z - az) / (bz - az) * (bx - ax))
        hits.sort()
        for a, b in zip(hits[::2], hits[1::2]):
            for i in range(max(0, int((a - x0) / CELL)), min(W, int((b - x0) / CELL) + 1)):
                if a <= x0 + (i + .5) * CELL <= b: height[j * W + i] = max(height[j * W + i], h)
for q in parts: scan(q['ring'], q['h'])

# Walkable: open cells joined to the route, within a tight band of it. Courtyards never connect, so their walls drop out.
walk = bytearray(W * H)
idx = lambda x, z: int((z - z0) / CELL) * W + int((x - x0) / CELL)
stack = []
for (ax, az), (bx, bz) in zip(path, path[1:]):
    for t in range(int(math.hypot(bx - ax, bz - az) / CELL) + 1):
        k = t / max(1, int(math.hypot(bx - ax, bz - az) / CELL)); c = idx(ax + (bx - ax) * k, az + (bz - az) * k)
        if height[c] == 0 and not walk[c]: walk[c] = 1; stack.append(c)
band = 24.0
while stack:
    c = stack.pop(); j, i = divmod(c, W)
    for n in (c - 1 if i else -1, c + 1 if i < W - 1 else -1, c - W if j else -1, c + W if j < H - 1 else -1):
        if n < 0 or walk[n] or height[n] > 0: continue
        nj, ni = divmod(n, W)
        if near(x0 + (ni + .5) * CELL, z0 + (nj + .5) * CELL) <= band: walk[n] = 1; stack.append(n)

def cell_at(x, z):
    i, j = int((x - x0) / CELL), int((z - z0) / CELL)
    return j * W + i if 0 <= i < W and 0 <= j < H else -1
walls, roofs, tris = [], [], 0
for q in parts:
    ring, h = q['ring'], q['h']
    area = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:] + ring[:1]))
    out = 1 if area > 0 else -1  # which side of the edge is outside
    for a, b in zip(ring, ring[1:] + ring[:1]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        if L < 0.15: continue
        nx, nz = (b[1] - a[1]) / L * out, -(b[0] - a[0]) / L * out
        street = 0; other = 99.0
        for t in (.15, .5, .85):
            c = cell_at(a[0] + (b[0] - a[0]) * t + nx * .75, a[1] + (b[1] - a[1]) * t + nz * .75)
            if c < 0: continue
            if walk[c]: street += 1
            other = min(other, height[c])
        if street: walls.append([a[0], a[1], b[0], b[1], 0, h, 1, round(nx, 3), round(nz, 3), q['id']])
        elif 0 < other < h - .4: walls.append([a[0], a[1], b[0], b[1], round(other, 2), h, 0, round(nx, 3), round(nz, 3), q['id']])
    roofs.append({'h': h, 'ring': ring, 'id': q['id']})
# Where the walkable band stops in the open, a false front closes the side street (merged along the run).
for axis in (0, 1):
    for sign in (-1, 1):
        lines = {}
        for c in range(W * H):
            if not walk[c]: continue
            j, i = divmod(c, W); nj, ni = (j, i + sign) if axis == 0 else (j + sign, i)
            if not (0 <= ni < W and 0 <= nj < H) or walk[nj * W + ni] or height[nj * W + ni] > 0: continue
            lines.setdefault(i if axis == 0 else j, []).append(j if axis == 0 else i)
        for line, cells in lines.items():
            cells.sort(); s = e = cells[0]
            for v in cells[1:] + [None]:
                if v == e + 1: e = v; continue
                edge = (line + (sign > 0)) * CELL; a, b = s * CELL, (e + 1) * CELL
                A = (x0 + edge, z0 + a) if axis == 0 else (x0 + a, z0 + edge); B = (x0 + edge, z0 + b) if axis == 0 else (x0 + b, z0 + edge)
                # the front faces back into the street
                walls.append([round(A[0], 2), round(A[1], 2), round(B[0], 2), round(B[1], 2), 0, 12.5, 2, (-sign if axis == 0 else 0), (-sign if axis == 1 else 0), 'front' + str(line)])
                if v is not None: s = e = v
keep = {w[9] for w in walls}
rows = []  # run-length rows of walkable cells: small, and O(1) once unpacked
for j in range(H):
    row = walk[j * W:(j + 1) * W]; runs = []; i = 0
    while i < W:
        if row[i]:
            s = i
            while i < W and row[i]: i += 1
            runs += [s, i - s]
        else: i += 1
    rows.append(runs)
json.dump({'source': 'Catastro INSPIRE; OpenStreetMap', 'cell': CELL, 'x0': round(x0, 2), 'z0': round(z0, 2), 'w': W, 'h': H,
           'start': [-38.0, -183.5], 'campanar': [round(v, 2) for v in local(*to_utm(1.2471107, 41.2840752))], 'path': [[round(a, 2), round(b, 2)] for a, b in path],
           'walls': walls, 'roofs': [{'h': r['h'], 'ring': r['ring']} for r in roofs if r['id'] in keep], 'walk': rows}, open(Path(__file__).with_name('slice.json'), 'w'), separators=(',', ':'))
print('parts', len(parts), 'walls', len(walls), 'street', sum(w[6] for w in walls), 'grid', W, H, 'walk cells', sum(walk))
