# Deterministic clips of the fire lab: fixed 1/30 s steps from a fresh page, one PNG per step, then ffmpeg.
# uv run --with playwright python capture.py OUTDIR VIEW W H Q SECONDS [CALM] [VARIANTS]
import sys, os, subprocess
from playwright.sync_api import sync_playwright
out, view, W, H, q, secs = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5], float(sys.argv[6])
calm = len(sys.argv) > 7 and sys.argv[7] == '1'
vs = (sys.argv[8] if len(sys.argv) > 8 else 'base,A,B,C,D').split(',')
extra = sys.argv[9] if len(sys.argv) > 9 else ''
url = 'http://localhost:5179/research/bestiari/drac/fire-lab/index.html'
FPS = 30
os.makedirs(out, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1)
    for v in vs:
        d = f'{out}/{v}-{view}-{q}{"-calm" if calm else ""}{extra.replace("&", "-").replace("=", "")}'; os.makedirs(d, exist_ok=True)
        pg.goto(f'{url}?mute&v={v}&q={q}&view={view}&run=0{"&calm=1" if calm else ""}{extra}')
        pg.wait_for_function('window.lab && window.lab.ready', timeout=30000)
        for i in range(int(secs * FPS)):
            pg.evaluate(f'lab.step({60 // FPS}, 1/60)')
            pg.screenshot(path=f'{d}/{i:04d}.png')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-framerate', str(FPS), '-i', f'{d}/%04d.png', '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', f'{d}.mp4'], check=True)
        print('done', d, flush=True)
    b.close()
