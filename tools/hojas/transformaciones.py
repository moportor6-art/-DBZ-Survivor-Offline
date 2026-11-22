"""Transformaciones cuadro a cuadro de las hojas de Buu's Fury (ripeadas por SpYn) → tiras para js/mods/animaciones.js.
Cada hoja es una cuadrícula de celdas de un solo color de fondo (que se borra). Salida: assets/sprites/fx/tr_<id>.png,
una fila de celdas del mismo tamaño, en el orden de la animación. Uso: transformaciones.py <dir_hojas> <dir_salida>
Hojas (nombres como los subió el usuario): goku_ssj3, vegeta, gogeta, vegito (celdas 32), superbuu, broly (64),
kidbuu (sección azul, celdas 32×48)."""
import sys, os
from PIL import Image
IN, OUT = sys.argv[1], sys.argv[2]

def celda(im, x, y, w, h):
    c = im.crop((x, y, x + w, y + h)).convert('RGBA'); px = c.load()
    bgs = {px[0, 0][:3], px[0, h - 1][:3], (71, 145, 255), (52, 109, 188)}   # el fondo de la celda (y los azules de la sección de Kid Buu)
    for j in range(h):
        for i in range(w):
            if px[i, j][:3] in bgs: px[i, j] = (0, 0, 0, 0)
    return c

def tira(nombre, hoja, w, h, y, cols):
    im = Image.open(os.path.join(IN, hoja + '.png'))
    out = Image.new('RGBA', (w * len(cols), h))
    for k, col in enumerate(cols): out.alpha_composite(celda(im, col * w, y, w, h), (k * w, 0))
    out.save(os.path.join(OUT, f'tr_{nombre}.png')); print(nombre, len(cols), w, h)

tira('goku_ssj3', 'goku_ssj3', 32, 32, 32, [45, 44, 43, 42, 41, 40, 41])
tira('vegeta_ssj', 'vegeta', 32, 32, 32, [51, 52, 52, 53, 54, 55])
tira('gogeta', 'gogeta', 32, 32, 32, [52, 54, 55, 49, 50, 46, 45])
tira('vegito', 'vegito', 32, 32, 32, [32, 33, 34, 35, 36, 37, 31, 29])
tira('superbuu', 'superbuu', 64, 64, 64, [35, 36, 37, 38, 39, 40])
tira('broly', 'broly', 64, 64, 64, [27, 28, 29, 30, 31, 32])
tira('kidbuu', 'kidbuu', 32, 48, 192, [18, 19, 20, 21, 22, 23, 24])
