"""Genera hojas recoloreadas completas para las formas sin sprite propio. Uso: make.py <dir_sprites>"""
import sys, colorsys
import numpy as np
from PIL import Image
SP = sys.argv[1]

def recolor(src, dst, fn):
    im = Image.open(f'{SP}/{src}').convert('RGBA'); a = np.array(im).astype(float)
    out = a.copy(); H, W = a.shape[:2]
    for y in range(H):
        for x in range(W):
            r, g, b, al = a[y, x]
            if al < 10: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            res = fn(h, s, v, x, y)
            if res: out[y, x, :3] = [c * 255 for c in colorsys.hsv_to_rgb(*res)]
    Image.fromarray(out.astype('uint8')).save(f'{SP}/{dst}')
    print('ok', dst, im.size)

# Goku Super Saiyajin Dios: todo el pelo amarillo (también los brillos claros) a rojo carmesí
def dios(h, s, v, x, y):
    if 0.09 <= h <= 0.2 and (s > 0.25 and v > 0.45 or s > 0.06 and v > 0.75):
        return (0.985, max(0.55, min(1, s * 1.3)), min(1, v * 0.82))
    if y % 32 < 10 and s < 0.12 and v > 0.8:   # brillos blancos del pelo
        return (0.985, 0.4, 0.92)
recolor('goku-ssj.png', 'fusion/goku-dios.png', dios)
# Vegeta Ego Superior: pelo Blue a morado
def ego(h, s, v, x, y):
    if 0.45 <= h <= 0.62 and s > 0.15 and v > 0.35: return (0.78, s, v * 0.95)
# recolor('fusion/vegeta~3-ssj.png', 'fusion/vegeta-ego.png', ego)   # ya no: el Ego Superior tiene dibujo propio (tools/hojas/dbs_poses.py)
# Orange Piccolo: piel verde a naranja
def naranja(h, s, v, x, y):
    if 0.22 <= h <= 0.42 and s > 0.2 and v > 0.25: return (0.075, min(1, s * 1.05), min(1, v * 1.12))
recolor('piccolo-ssj.png', 'fusion/piccolo-naranja.png', naranja)
# Gohan Bestia: el pelo negro del Místico a blanco plateado (solo la parte de arriba de cada cuadro: el pelo)
FW, FH = 34, 32
def bestia(h, s, v, x, y):
    if y % FH < 12 and v < 0.42 and s < 0.7:
        return (0.62, 0.1, min(1, 0.64 + v * 1.2))
recolor('fusion/gohan~2-ssj.png', 'fusion/gohan-bestia.png', bestia)
