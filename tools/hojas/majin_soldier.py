"""Soldados Majin de Buu's Fury (hoja de SpYn en The Spriters Resource) → formato del juego.
Salida: 3 variantes (Majin, Élite, Súper) × 3 filas (perfil, frente, espaldas) × 10 columnas de 32 px:
0 quieto · 1-4 caminar · 5-6 atacar (como soldier.png, variants: 3, variantRows: 3).
Uso: majin_soldier.py <hoja.png> <salida.png>"""
import sys
from PIL import Image
BG = [(71, 255, 187), (52, 188, 136), (42, 150, 108), (35, 127, 90)]
src = Image.open(sys.argv[1]).convert('RGBA')
GROUPS = [32, 192, 352]            # y de la primera fila de cada variante
ROWS = {'down': 0, 'side': 2, 'up': 3}   # fila 2 de la hoja: perfil mirando a la derecha
COLS = {'down': [0, 1, 2, 3, 4, 6, 7], 'side': [0, 1, 2, 3, 4, 7, 8], 'up': [0, 2, 3, 4, 5, 7, 8]}

def cell(x, y):
    c = src.crop((x, y, x + 32, y + 32)); px = c.load()
    for j in range(32):
        for i in range(32):
            r, g, b, a = px[i, j]
            if any(abs(r - R) + abs(g - G) + abs(b - B) < 12 for R, G, B in BG): px[i, j] = (0, 0, 0, 0)
    return c

out = Image.new('RGBA', (320, 32 * 3 * len(GROUPS)), (0, 0, 0, 0))
for v, gy in enumerate(GROUPS):
    for r, d in enumerate(['side', 'down', 'up']):
        y = gy + ROWS[d] * 32
        for k, col in enumerate(COLS[d]):
            out.alpha_composite(cell(col * 32, y), (k * 32, (v * 3 + r) * 32))
out.save(sys.argv[2])
print('ok', out.size)
