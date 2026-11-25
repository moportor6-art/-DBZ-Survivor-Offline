"""Formas que compartían sprite: SSJ2 (Goku y Vegeta), Majin Vegeta, Super Trunks y Trunks de la Ira.
Se derivan de las hojas SSJ del juego (32×32, 7 columnas × 3 filas: perfil, frente, espaldas) para no mezclar estilos.
Uso: formas2.py <dir_sprites>"""
import sys, colorsys, random
import numpy as np
from PIL import Image
SP = sys.argv[1]; FW = FH = 32

def hsv(p): return colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)
def rgb(h, s, v): return [round(c * 255) for c in colorsys.hsv_to_rgb(h, s, v)]
def is_hair(p, y):   # amarillo del pelo (y sus brillos claros) en la parte de arriba del cuadro
    h, s, v = hsv(p)
    return p[3] > 10 and y % FH < 16 and (0.09 <= h <= 0.2 and s > 0.2 and v > 0.5 or s < 0.15 and v > 0.85)
def is_skin(p):
    h, s, v = hsv(p)
    return p[3] > 10 and 0.02 <= h <= 0.09 and 0.18 <= s <= 0.6 and v > 0.7

def load(n): return np.array(Image.open(f'{SP}/{n}').convert('RGBA')).astype(int)
def save(a, n): Image.fromarray(a.astype('uint8')).save(f'{SP}/fusion/{n}'); print('ok', n)

def hair_tint(a, fn):
    H, W = a.shape[:2]
    for y in range(H):
        for x in range(W):
            if is_hair(a[y, x], y):
                c = fn(*hsv(a[y, x]))
                if c: a[y, x, :3] = c

def sparks(a, color, n=2, seed=1):   # rayitos fijos alrededor del pelo, distintos en cada cuadro
    rnd = random.Random(seed)
    for fy in range(3):
        for fx in range(7):
            ox, oy = fx * FW, fy * FH
            hair = [(x, y) for y in range(oy, oy + 16) for x in range(ox, ox + FW) if is_hair(a[y, x], y)]
            if not hair: continue
            for _ in range(n):
                x, y = rnd.choice(hair)
                dx = rnd.choice((-1, 1))
                for k in range(6):   # zigzag de 6 píxeles hacia afuera
                    x += dx * (1 if k % 2 == 0 else 0); y += -1 if k % 2 else 0
                    if ox <= x < ox + FW and oy <= y < oy + FH and a[y, x, 3] < 10:
                        a[y, x] = color + [255]

# Super Saiyajin 2: pelo más brillante y dorado, con rayos eléctricos
def ssj2(src, dst, seed):
    a = load(src)
    hair_tint(a, lambda h, s, v: rgb(0.14, min(1, s * 1.15), min(1, v * 1.08)) if s > 0.2 else rgb(0.15, 0.08, 1))
    sparks(a, [150, 230, 255], 3, seed)
    save(a, dst)
ssj2('goku-ssj.png', 'goku-ssj2.png', 3)
ssj2('vegeta-ssj.png', 'vegeta-ssj2.png', 5)

# Majin Vegeta: SSJ2 con el contorno carmesí (el control de Babidi) y rayos rosados
a = load('vegeta-ssj.png')
hair_tint(a, lambda h, s, v: rgb(0.14, min(1, s * 1.15), min(1, v * 1.08)) if s > 0.2 else rgb(0.15, 0.08, 1))
# (la "M" de la frente no cabe a 32 px: el pelo tapa la frente) → contorno y sombras oscuras en carmesí
H, W = a.shape[:2]
for y in range(H):
    for x in range(W):
        if a[y, x, 3] > 10 and max(a[y, x, :3]) < 70: a[y, x, :3] = [80, 6, 40]
sparks(a, [255, 120, 200], 2, 7)
# save(a, 'vegeta-majin.png')   # ya no: el Majin Vegeta usa el dibujo de DB Survivors (tools/hojas/dbs_poses.py)

# Super Trunks: el cuerpo (de los hombros para abajo) un 25% más ancho
a = load('ftrunks-ssj.png'); out = np.zeros_like(a)
for fy in range(3):
    for fx in range(7):
        ox, oy = fx * FW, fy * FH
        for y in range(FH):
            k = 1.0 if y < 17 else 1.25
            for x in range(FW):
                sx = round(FW / 2 + (x - FW / 2) / k)
                if 0 <= sx < FW: out[oy + y, ox + x] = a[oy + y, ox + sx]
save(out, 'ftrunks-super.png')

# Trunks Super Saiyajin de la Ira: brillos del pelo celestes y rayos azules
a = load('ftrunks-ssj.png')
hair_tint(a, lambda h, s, v: rgb(0.14, min(1, s * 1.1), min(1, v * 1.05)) if s > 0.2 else rgb(0.55, 0.35, 1))
sparks(a, [120, 200, 255], 2, 11)
save(a, 'ftrunks-ira.png')
