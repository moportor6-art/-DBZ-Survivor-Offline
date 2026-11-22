"""Gohan Bestia v2 (hoja Ultimate LSW de Andresz2021) → hoja del juego (una fila de perfil, mira a la derecha):
0-2 quieto (respira), 3-6 caminar (armada desde el cuadro de pie), 7-8 lanzar ki, 9 golpeado, 10 tirado, 11 levantándose."""
import json, sys
from PIL import Image
import numpy as np
from scipy import ndimage
sys.path.insert(0, '.'); sys.path.insert(0)
SRC = sys.argv[1]; OUT = sys.argv[2]
im = Image.open(SRC).convert('RGBA'); a = np.array(im)
m = ~(np.abs(a[:, :, :3].astype(int) - np.array([132, 129, 169])).sum(2) <= 3)
B = json.load(open('gohan_bestia2_cuadros.json'))
def frame(box):
    x0, y0, x1, y1 = box
    lab, n = ndimage.label(m[y0:y1, x0:x1])
    ids, cnt = np.unique(lab[lab > 0], return_counts=True); k = ids[cnt.argmax()]
    mm = ndimage.binary_fill_holes(lab == k)
    sub = a[y0:y1, x0:x1].copy(); sub[~mm] = 0; sub[mm, 3] = 255
    f = Image.fromarray(sub); return f.crop(f.getbbox())
def pies(f):
    mm = np.array(f)[:, :, 3] > 0; ys = np.where(mm.any(1))[0]; low = mm[max(0, ys[-1] - 8):ys[-1] + 1]; xs = np.where(low.any(0))[0]
    return (xs[0] + xs[-1]) / 2
def caminata(img, y0, split, manos, manos_y):
    f = np.array(img); H, W = f.shape[:2]
    def paso(d, brazo):
        o = np.zeros((H + 2, W + 8, 4), np.uint8); OX = 4
        for y in range(H):
            for x in range(W):
                if f[y, x, 3] == 0: continue
                if y >= y0 and (y >= manos_y[1] - 2 or manos[0] <= x <= manos[1]):
                    k = round(d * (y - y0) / (H - 1 - y0))
                    for nx in (range(x - k, x + 1) if x < split else range(x, x + k + 1)): o[y + 1, nx + OX] = f[y, x]
                elif manos_y[0] <= y < manos_y[1] and (x < manos[0] or x > manos[1]):
                    o[y + 1, x + OX + (brazo if x < manos[0] else -brazo)] = f[y, x]
                else: o[y + 1, x + OX] = f[y, x]
        out = Image.fromarray(o); return out.crop(out.getbbox())
    return [paso(4, 1), paso(1, 0), paso(0, 0), paso(1, 0)]
quieto = [frame(B[i]) for i in (1, 2, 3)]
p = quieto[0]; H, W = p.height, p.width
cam = caminata(p, int(H * 0.6), W // 2, (int(W * 0.22), int(W * 0.78)), (int(H * 0.38), int(H * 0.72)))
frames = quieto + cam + [frame(B[55]), frame(B[57]), frame(B[74]), frame([731, 1048, 796, 1079]), frame(B[66])]
BOB = [0, 0, 0, 0, -1, 0, -1, 0, 0, 0, 0, 0]
cx = [pies(f) for f in frames]
L = max(cx); R = max(f.width - c for f, c in zip(frames, cx)); CW = int(np.ceil(L + R)) + 2; CH = max(f.height for f in frames) + 3
out = Image.new('RGBA', (CW * len(frames), CH), (0, 0, 0, 0))
for i, (f, c) in enumerate(zip(frames, cx)): out.paste(f, (i * CW + int(round(CW / 2 - c)), CH - f.height - 1 + BOB[i]), f)
out.save(OUT); print(CW, CH, len(frames))
