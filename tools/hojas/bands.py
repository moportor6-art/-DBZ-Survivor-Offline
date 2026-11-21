"""Separa sprites por filas (bandas de y) y columnas vacías. Uso: bands.py hoja pref bg tol"""
import sys, json
import numpy as np
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
bgs = [tuple(map(int, c.split(','))) for c in sys.argv[3].split(';')]
tol = int(sys.argv[4])
im = Image.open(src).convert('RGBA'); a = np.array(im).astype(int)
m = np.ones(a.shape[:2], bool)
for c in bgs: m &= np.abs(a[:, :, :3] - np.array(c)).sum(2) > tol
def runs(v, gap=1):
    r, s, z = [], None, 0
    for i, x in enumerate(list(v) + [False] * (gap + 1)):
        if x:
            if s is None: s = i
            z = 0
        elif s is not None:
            z += 1
            if z > gap: r.append((s, i - z + 1)); s = None; z = 0
    return r
boxes = []
for y0, y1 in runs(m.any(1), 0):
    for x0, x1 in runs(m[y0:y1].any(0), 0):
        sub = m[y0:y1, x0:x1]; ys = np.where(sub.any(1))[0]
        if sub.sum() < 30: continue
        boxes.append([int(x0), int(y0 + ys[0]), int(x1), int(y0 + ys[-1] + 1)])
S = 2; v = im.resize((im.width * S, im.height * S), 0).convert('RGB'); d = ImageDraw.Draw(v)
for k, (x0, y0, x1, y1) in enumerate(boxes):
    d.rectangle([x0 * S, y0 * S, x1 * S - 1, y1 * S - 1], outline=(255, 0, 0)); d.text((x0 * S + 1, y0 * S + 1), str(k), fill=(255, 255, 0))
v.save(out + '_v.png'); json.dump(boxes, open(out + '.json', 'w'))
print(len(boxes))
