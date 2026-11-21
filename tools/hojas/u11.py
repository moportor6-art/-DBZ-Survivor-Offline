"""Jiren y Toppo (paquete "Dragon Ball Sagas", estilo LSW, fondo blanco) → hoja del juego.
Filas: perfil, frente, espaldas · columnas: 0 quieto, 1-4 caminar, 5-6 atacar. Uso: u11.py <dir_sagas> <dir_salida>"""
import sys, os, glob
from PIL import Image
SAGAS, OUT = sys.argv[1], sys.argv[2]

def load(folder, num):
    cands = [p for p in glob.glob(os.path.join(SAGAS, folder, '*.png'))
             if os.path.splitext(os.path.basename(p))[0].rstrip('.').split('_')[-1].lstrip('0') == str(num).lstrip('0')]
    im = Image.open(cands[0]).convert('RGBA'); px = im.load(); W, H = im.size
    # quitar el blanco que toca el borde (relleno), no el de los guantes u ojos
    stack = [(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)]
    seen = set()
    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not (0 <= x < W and 0 <= y < H): continue
        seen.add((x, y)); r, g, b, a = px[x, y]
        if a < 10 or (r > 235 and g > 235 and b > 235):
            px[x, y] = (0, 0, 0, 0); stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return im.crop(im.getbbox())

def build(name, folder, rows, flip_side):
    frames = {d: [load(folder, n) for n in nums] for d, nums in rows.items()}
    if flip_side: frames['side'] = [f.transpose(Image.FLIP_LEFT_RIGHT) for f in frames['side']]
    cw = max(f.width for fs in frames.values() for f in fs); ch = max(f.height for fs in frames.values() for f in fs)
    out = Image.new('RGBA', (cw * 7, ch * 3))
    for r, d in enumerate(['side', 'down', 'up']):
        for c, f in enumerate(frames[d]): out.alpha_composite(f, (c * cw + (cw - f.width) // 2, r * ch + ch - f.height))
    out.save(os.path.join(OUT, name + '.png')); print(name, cw, ch)

build('jiren', 'Jiren', {'side': [4, 5, 6, 9, 10, 37, 38], 'down': [1, 2, 3, 2, 3, 37, 38], 'up': [1, 2, 3, 2, 3, 37, 38]}, True)
build('toppo', 'Toppo', {'side': [5, 25, 5, 25, 5, 20, 31], 'down': [1, 4, 1, 4, 1, 20, 21], 'up': [3, 2, 3, 2, 3, 3, 3]}, False)
