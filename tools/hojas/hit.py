"""Hoja de Hit (sprites de OrdoMandalore, estilo Legacy of Goku / Buu's Fury) al formato del juego.
Entrada: la hoja original de 480x480 (celdas de 32x32, 15x15). Salida:
  assets/sprites/fusion/hitp.png   filas perfil / frente / espaldas; columnas 0 reposo, 1-4 caminar, 5-6 golpe,
                                   7-9 golpe recibido, tirado y levantándose
  assets/sprites/fusion/hitp-retrato.png  la cara, para las escenas del Modo Historia
  assets/sprites/fx/hit_salto.png  tira del Salto en el tiempo: 4 cuadros con el aura (frente) + 2 del destello (perfil)
Uso: python3 hit.py hoja_hit.png"""
import os, sys
from PIL import Image

src = Image.open(sys.argv[1]).convert('RGBA')
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'src', 'main', 'assets', 'www', 'dbzsurvivor', 'assets', 'sprites')
cell = lambda r, c: src.crop((c * 32, r * 32, c * 32 + 32, r * 32 + 32))
# (fila, columna) de la hoja original para cada cuadro
PERFIL = [(0, 3), (0, 7), (0, 3), (1, 0), (0, 11), (2, 9), (4, 7), (2, 8), (2, 1), (0, 3)]
FRENTE = [(0, 1), (0, 5), (0, 1), (0, 9), (0, 13), (7, 12), (7, 12), (2, 8), (2, 1), (0, 1)]
ESPALDA = [(0, 2), (0, 6), (0, 2), (0, 10), (0, 14), (0, 2), (0, 2), (2, 8), (2, 1), (0, 2)]
hoja = Image.new('RGBA', (32 * 10, 96), (0, 0, 0, 0))
for fila, lista in enumerate([PERFIL, FRENTE, ESPALDA]):
    for col, rc in enumerate(lista):
        hoja.paste(cell(*rc), (col * 32, fila * 32))
hoja.save(os.path.join(OUT, 'fusion', 'hitp.png'))
tira = Image.new('RGBA', (32 * 6, 32), (0, 0, 0, 0))
for i, rc in enumerate([(8, 13), (8, 14), (12, 5), (13, 10), (9, 9), (9, 5)]):
    tira.paste(cell(*rc), (i * 32, 0))
tira.save(os.path.join(OUT, 'fx', 'hit_salto.png'))
cell(0, 0).save(os.path.join(OUT, 'fusion', 'hitp-retrato.png'))   # retrato de las escenas (32x32)
print('ok')
