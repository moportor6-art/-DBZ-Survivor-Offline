"""Gohan Bestia (hoja SWL+ de BlackSanyT, con AlexKX29 y orumaitoobeso) → hoja del juego.
Una sola fila de perfil (mira a la derecha; el juego la voltea): 0 quieto, 1-4 caminar, 5-6 lanzar ki,
7 golpeado, 8 tirado, 9 levantándose. Uso: gohan_bestia.py <hoja.png> <salida.png>
La hoja (de juego de pelea) no trae caminata: se arma desde el cuadro de pie, abriendo y cerrando las
piernas y balanceando las manos (caminata()).""" 
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
    keep = solid[y0:y1, x0:x1] & (sub_l == k)
    keep = ndimage.binary_fill_holes(keep)   # los huecos del color del fondo dentro del dibujo (sombras) se quedan
    sub[~keep] = 0
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
Q[13] = [25, 1302, 63, 1369]   # de pie, tranquilo

def caminata(img, y0, split, manos=(8, 32), manos_y=(26, 54)):
    """4 cuadros desde uno de pie: las piernas se abren y se cierran (cizalla desde la cintura y0, separadas en la
    columna split) y las manos se balancean al revés. Los píxeles se estiran para que no queden huecos."""
    f = np.array(img); H, W = f.shape[:2]
    def paso(d, brazo, sube):
        o = np.zeros((H + 2, W + 8, 4), np.uint8); OX = 4
        for y in range(H):
            for x in range(W):
                if f[y, x, 3] == 0: continue
                ny = y + 1 + sube
                if y >= y0 and (y >= manos_y[1] - 2 or manos[0] <= x <= manos[1]):
                    k = round(d * (y - y0) / (H - 1 - y0))
                    xs = range(x - k, x + 1) if x < split else range(x, x + k + 1)
                    for nx in xs: o[ny, nx + OX] = f[y, x]
                elif manos_y[0] <= y < manos_y[1] and (x < manos[0] or x > manos[1]):
                    o[ny, x + OX + (brazo if x < manos[0] else -brazo)] = f[y, x]
                else:
                    o[ny, x + OX] = f[y, x]
        out = Image.fromarray(o)
        return out.crop(out.getbbox())
    return [paso(3, 1, 0), paso(1, 0, -1), paso(0, 0, 0), paso(1, 0, -1)]

pie = frame(Q[13])
frames = [pie] + caminata(pie, 41, 19) + [frame(Q[i]) for i in (142, 143, 88, 106, 96)]
BOB = [0, 0, -1, 0, -1, 0, 0, 0, 0, 0]
cx = [centro_pies(f) for f in frames]
left = max(c for c in cx); right = max(f.width - c for f, c in zip(frames, cx))
CW = int(np.ceil(left + right)) + 2
CH = max(f.height for f in frames) + 3
out = Image.new('RGBA', (CW * len(frames), CH), (0, 0, 0, 0))
for i, (f, c) in enumerate(zip(frames, cx)):
    out.paste(f, (i * CW + int(round(CW / 2 - c)), CH - f.height - 1 + BOB[i] - 0), f)
out.save(OUT)
print(f'cuadro {CW}x{CH}, {len(frames)} columnas')
