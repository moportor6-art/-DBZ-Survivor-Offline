"""Gohan Bestia (hoja SWL+ de BlackSanyT, con AlexKX29 y orumaitoobeso) → hoja del juego.
Una sola fila de perfil (mira a la derecha; el juego la voltea): 0-3 quieto, 4-7 volar, 8-9 lanzar ki,
10 golpeado, 11 tirado, 12 levantándose. Uso: gohan_bestia.py <hoja.png> <salida.png>"""
import sys
from PIL import Image
import numpy as np
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2]
im = Image.open(SRC).convert('RGBA')
a = np.array(im)
BG = np.array([39, 12, 66])
solid = (np.abs(a[:, :, :3].astype(int) - BG).sum(2) > 30) & (a[:, :, 3] > 0)
lab, _ = ndimage.label(ndimage.binary_dilation(solid, iterations=2))

def frame(box):
    """El sprite más grande dentro del rectángulo (x0, y0, x1, y1) de la hoja, sin fondo."""
    x0, y0, x1, y1 = box
    sub_l = lab[y0:y1, x0:x1]
    ids, cnt = np.unique(sub_l[sub_l > 0], return_counts=True)
    k = ids[cnt.argmax()]
    sub = a[y0:y1, x0:x1].copy()
    sub[~(solid[y0:y1, x0:x1] & (sub_l == k))] = 0
    f = Image.fromarray(sub)
    return f.crop(f.getbbox())

def centro_pies(f):
    """x del centro de los pies (para que el personaje no se corra de lado al cambiar de cuadro)."""
    m = np.array(f)[:, :, 3] > 0
    ys = np.where(m.any(1))[0]
    low = m[max(0, ys[-1] - 10): ys[-1] + 1]
    xs = np.where(low.any(0))[0]
    return (xs[0] + xs[-1]) / 2

# Rectángulos de cada cuadro elegido en la hoja original (1340x3398)
Q = {
    14: [115, 1307, 153, 1368], 15: [164, 1307, 200, 1368], 16: [209, 1307, 245, 1368],
    19: [415, 1305, 463, 1364], 142: [186, 2193, 238, 2254], 143: [248, 2191, 296, 2251],
    88: [12, 1763, 68, 1822], 106: [481, 1787, 551, 1821], 96: [424, 1773, 475, 1812],
}
ORDEN = [14, 15, 16, 15, 19, 19, 19, 19, 142, 143, 88, 106, 96]
BOB = [0, 0, 0, 0, 0, -1, -2, -1, 0, 0, 0, 0, 0]   # volar: flota arriba y abajo
frames = [frame(Q[i]) for i in ORDEN]
cx = [centro_pies(f) for f in frames]
left = max(c for c in cx); right = max(f.width - c for f, c in zip(frames, cx))
CW = int(np.ceil(left + right)) + 2
CH = max(f.height for f in frames) + 3
out = Image.new('RGBA', (CW * len(frames), CH), (0, 0, 0, 0))
for i, (f, c) in enumerate(zip(frames, cx)):
    out.paste(f, (i * CW + int(round(CW / 2 - c)), CH - f.height - 1 + BOB[i] - 0), f)
out.save(OUT)
print(f'cuadro {CW}x{CH}, {len(frames)} columnas')
