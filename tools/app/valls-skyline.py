# Ronda 40: the home's skyline of Valls, an original silhouette (roofs, the tall bell tower of Sant Joan with its stepped
# tiers and cross, a lower square belfry, a bell gable, a few cypresses), drawn here as a mask (alpha only): the apps tint
# it with the sky's far tone. 1350 x 216, the 900 : 144 shape the apps lay out. Usage: uv run --with pillow python valls.py <out.png>
import random, sys
from PIL import Image, ImageDraw
W, H, K = 1350, 216, 4  # drawn K times bigger, then reduced: smooth edges
im = Image.new("L", (W * K, H * K), 0); d = ImageDraw.Draw(im)
def poly(pts, fill=255): d.polygon([(x * K, y * K) for x, y in pts], fill=fill)
def box(x, y, w, h, fill=255): d.rectangle([x * K, y * K, (x + w) * K, (y + h) * K], fill=fill)
def arch(cx, top, w, h): # an opening: a slot with a round head, cut out
    d.rectangle([(cx - w / 2) * K, (top + w / 2) * K, (cx + w / 2) * K, (top + h) * K], fill=0)
    d.ellipse([(cx - w / 2) * K, top * K, (cx + w / 2) * K, (top + w) * K], fill=0)
random.seed(7)
box(0, 176, W, 40)  # the town's mass
x = -10
while x < W:  # roofs: low houses, gabled or flat, never a street's own line of fronts
    w = random.randint(34, 78); h = random.randint(18, 52); top = 176 - h
    if random.random() < 0.62: poly([(x, 176), (x, top + 12), (x + w / 2, top), (x + w, top + 12), (x + w, 176)])
    else: box(x, top + 6, w, h)
    if random.random() < 0.3: box(x + w * 0.62, top - 4, 7, 16)  # a chimney
    x += w - random.randint(0, 8)
for cx in (318, 334, 1012, 1190):  # cypresses
    hgt = random.randint(52, 70); poly([(cx - 7, 176), (cx - 8, 176 - hgt * 0.45), (cx, 176 - hgt), (cx + 8, 176 - hgt * 0.45), (cx + 7, 176)])
# the church's nave beside the tower, and its tall tower: a square shaft, the bells' tier, two narrower tiers, a lantern, the cross
poly([(742, 176), (742, 112), (800, 84), (858, 112), (858, 176)])
d.ellipse([(800 - 9) * K, 104 * K, (800 + 9) * K, 122 * K], fill=0)  # the rose
cx = 700
box(cx - 21, 78, 42, 100)
box(cx - 24, 74, 48, 6)                      # a cornice
box(cx - 18, 46, 36, 30); arch(cx - 8, 52, 9, 20); arch(cx + 8, 52, 9, 20)   # the bells
box(cx - 21, 42, 42, 5)
box(cx - 13, 22, 26, 21); arch(cx, 26, 8, 14)
box(cx - 16, 19, 32, 4)
poly([(cx - 9, 20), (cx - 6, 8), (cx + 6, 8), (cx + 9, 20)])
poly([(cx - 6, 9), (cx, -2 + 6), (cx + 6, 9)])
box(cx - 1, -1 + 1, 2, 8); box(cx - 4, 2, 8, 2)   # the cross
for sx in (-1, 1):                               # pinnacles at the shaft's corners
    poly([(cx + sx * 24 - 3, 76), (cx + sx * 24, 62), (cx + sx * 24 + 3, 76)])
# a lower square belfry with a pyramid roof
cx = 400
box(cx - 17, 96, 34, 82); box(cx - 20, 92, 40, 5); arch(cx, 104, 11, 24)
poly([(cx - 20, 93), (cx, 62), (cx + 20, 93)]); box(cx - 1, 54, 2, 10); box(cx - 3, 57, 6, 2)
poly([(432, 176), (432, 130), (476, 110), (520, 130), (520, 176)])
# a bell gable over a chapel
cx = 1100
poly([(cx - 52, 176), (cx - 52, 136), (cx, 116), (cx + 52, 136), (cx + 52, 176)])
poly([(cx - 22, 120), (cx - 22, 92), (cx, 76), (cx + 22, 92), (cx + 22, 120)]); arch(cx - 9, 94, 9, 18); arch(cx + 9, 94, 9, 18)
box(cx - 1, 66, 2, 12); box(cx - 4, 69, 8, 2)
a = im.resize((W, H), Image.LANCZOS)
out = Image.new("LA", (W, H), (255, 0)); out.putalpha(a); out.save(sys.argv[1], optimize=True)
