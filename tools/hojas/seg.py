"""Detecta sprites sueltos en una hoja (fondo de color liso) y genera vista numerada.
Uso: seg.py hoja.png salida_prefijo  [bg colores r,g,b;r,g,b] [tol]"""
import sys, json
from PIL import Image, ImageDraw
from scipy import ndimage
import numpy as np
src, out = sys.argv[1], sys.argv[2]
bgs = [tuple(map(int, c.split(','))) for c in sys.argv[3].split(';')]
tol = int(sys.argv[4]) if len(sys.argv) > 4 else 12
im = Image.open(src).convert('RGBA'); a = np.array(im).astype(int)
mask = np.ones(a.shape[:2], bool)
for c in bgs:
    d = np.abs(a[:, :, :3] - np.array(c)).sum(2)
    mask &= d > tol
lab, n = ndimage.label(ndimage.binary_dilation(mask, iterations=2))
boxes = []
for i, sl in enumerate(ndimage.find_objects(lab)):
    y, x = sl
    if (y.stop - y.start) * (x.stop - x.start) < 40: continue
    boxes.append([x.start, y.start, x.stop, y.stop])
boxes.sort(key=lambda b: (b[1] // 20, b[0]))
# vista
S = 2
v = im.resize((im.width * S, im.height * S), 0).convert('RGB'); dr = ImageDraw.Draw(v)
for k, (x0, y0, x1, y1) in enumerate(boxes):
    dr.rectangle([x0 * S, y0 * S, x1 * S, y1 * S], outline=(255, 0, 0))
    dr.text((x0 * S + 1, y0 * S + 1), str(k), fill=(255, 255, 0))
v.save(out + '_v.png')
json.dump({'boxes': boxes, 'mask_bg': bgs, 'tol': tol}, open(out + '.json', 'w'))
print(len(boxes), 'sprites')
for k, b in enumerate(boxes): print(k, b, b[2]-b[0], b[3]-b[1])
