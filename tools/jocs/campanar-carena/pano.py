# Valls's skyline in every direction, from the AWS terrain tiles (terrarium, z12): for each half degree of azimuth, the
# highest elevation angle seen from the Plaça del Blat (eye 20 m over the ground) within 1, 2 ... 30 km. The tuner
# (index.html) and bake.mjs draw the game's carena-<device>.svg from it.
# uv run --python 3.12 --with numpy --with pillow python tools/jocs/campanar-carena/pano.py <tile cache dir>
import math, sys, json, os, urllib.request
import numpy as np
from PIL import Image
cache_dir = sys.argv[1]
Z = 12; N = 2 ** Z
tiles = {}
def elev(lat, lon):
    x = (lon + 180) / 360 * N
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * N
    tx, ty = int(x), int(y)
    if (tx, ty) not in tiles:
        p = f'{cache_dir}/t{tx}_{ty}.png'
        if not os.path.exists(p):
            req = urllib.request.Request(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png', headers={'User-Agent': 'generic-client'})
            open(p, 'wb').write(urllib.request.urlopen(req, timeout=60).read())
        a = np.asarray(Image.open(p).convert('RGB')).astype(float)
        tiles[(tx, ty)] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
    return tiles[(tx, ty)][min(255, int((y - ty) * 256)), min(255, int((x - tx) * 256))]
V = (41.2866, 1.2497)  # the Plaça del Blat, Valls
eye = elev(*V) + 20
R = 6371000 / 0.87  # the earth's curve, less the refraction
rays = []
for k in range(720):
    az = k / 2
    best, cum = -90.0, []
    for s in range(1, 241):
        d = s * 125.0
        lat = V[0] + d * math.cos(math.radians(az)) / 111000
        lon = V[1] + d * math.sin(math.radians(az)) / (111000 * math.cos(math.radians(V[0])))
        best = max(best, math.degrees(math.atan2(elev(lat, lon) - d * d / (2 * R) - eye, d)))
        if d % 1000 == 0: cum.append(round(best, 3))  # the highest within each whole km
    rays.append(cum)
json.dump({'from': 'Plaça del Blat, Valls', 'eye': round(eye), 'step': 0.5, 'km': 30, 'rays': rays}, open(os.path.join(os.path.dirname(__file__), 'pano.json'), 'w'), separators=(',', ':'))
print('eye', round(eye), 'rays', len(rays), 'per ray', len(rays[0]))
