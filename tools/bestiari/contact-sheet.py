#!/usr/bin/env python3
"""Timestamped video contact sheet. Requires ffmpeg and Pillow; no source changes."""
import argparse
import io
import math
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('video', type=Path)
p.add_argument('output', type=Path)
p.add_argument('--start', type=float, default=0)
p.add_argument('--end', type=float, required=True)
p.add_argument('--step', type=float, default=5)
p.add_argument('--columns', type=int, default=4)
a = p.parse_args()
if a.step <= 0 or a.end < a.start or a.columns < 1:
    p.error('Require positive step/columns and end >= start')
times = [a.start + i * a.step for i in range(math.floor((a.end-a.start)/a.step)+1)]
sheet = Image.new('RGB', (a.columns*320, math.ceil(len(times)/a.columns)*205), '#17191c')
draw = ImageDraw.Draw(sheet)
for i,t in enumerate(times):
    data = subprocess.check_output(['ffmpeg','-hide_banner','-loglevel','error','-ss',str(t),'-i',str(a.video),
        '-frames:v','1','-vf','scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2',
        '-f','image2pipe','-vcodec','mjpeg','-'])
    frame = Image.open(io.BytesIO(data)).convert('RGB')
    x,y = i % a.columns*320, i // a.columns*205
    sheet.paste(frame,(x,y)); draw.text((x+8,y+184),f'{t:.2f} s',fill='white')
a.output.parent.mkdir(parents=True,exist_ok=True)
sheet.save(a.output)
print(a.output)
