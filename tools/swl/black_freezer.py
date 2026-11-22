# Black Freezer (hoja de autor desconocido, tools/swl/hojas/black_freezer.png) → assets/sprites/fusion/freezerp-black.png
# Uso (desde tools/swl): python3 black_freezer.py ../../app/src/main/assets/www/dbzsurvivor/assets/sprites/fusion/freezerp-black.png
import json, sys
from PIL import Image
import numpy as np
from scipy import ndimage
sys.path.insert(0, '.')
from seg import seg
im, a, m, B = seg('hojas/black_freezer.png', [(76, 65, 118), (32, 24, 62), (134, 68, 183)], (0, 80, 320, 440))
def frame(i):
    x0, y0, x1, y1 = B[i]
    mm = ndimage.binary_fill_holes(m[y0:y1, x0:x1])
    sub = a[y0:y1, x0:x1].copy(); sub[~mm] = 0; sub[mm, 3] = 255
    f = Image.fromarray(sub); return f.crop(f.getbbox())
def pies(f):
    mm = np.array(f)[:, :, 3] > 0; ys = np.where(mm.any(1))[0]; low = mm[max(0, ys[-1] - 8):ys[-1] + 1]; xs = np.where(low.any(0))[0]
    return (xs[0] + xs[-1]) / 2
ORDEN = [7, 7, 7, 7, 7, 11, 12, 18, 21, 20]
BOB = [0, 0, -1, -2, -1, 0, 0, 0, 0, 0]
fr = [frame(i) for i in ORDEN]; cx = [pies(f) for f in fr]
L = max(cx); R = max(f.width - c for f, c in zip(fr, cx)); CW = int(np.ceil(L + R)) + 2; CH = max(f.height for f in fr) + 3
out = Image.new('RGBA', (CW * len(fr), CH), (0, 0, 0, 0))
for i, (f, c) in enumerate(zip(fr, cx)): out.paste(f, (i * CW + int(round(CW / 2 - c)), CH - f.height - 1 + BOB[i]), f)
out.save(sys.argv[1]); print(CW, CH)
