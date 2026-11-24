"""Soldados pequeños (hoja de 24x32 por cuadro, 3 colores, 4 direcciones de 6 cuadros) → hoja del juego:
3 variantes × 3 filas (perfil mirando a la derecha, de frente, de espaldas), 6 columnas. Uso: soldados.py <salida.png>"""
import sys, os
from PIL import Image
import numpy as np
src = Image.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hojas', 'gt_soldados_mini.png')).convert('RGBA')
a = np.array(src); fondo = a[0, 0, :3].astype(int)
a[(np.abs(a[:, :, :3].astype(int) - fondo).sum(2) < 30)] = 0
src = Image.fromarray(a)
W, H = 24, 32
out = Image.new('RGBA', (W * 6, H * 9), (0, 0, 0, 0))
for v, (c0, r0) in enumerate([(0, 0), (6, 0), (0, 4)]):
    for fila, r in enumerate([r0 + 3, r0 + 2, r0 + 0]):   # perfil, frente, espaldas
        for c in range(6):
            out.paste(src.crop(((c0 + c) * W, r * H, (c0 + c + 1) * W, (r + 1) * H)), (c * W, (v * 3 + fila) * H))
out.save(sys.argv[1])
