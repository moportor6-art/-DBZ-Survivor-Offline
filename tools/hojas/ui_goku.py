"""Transformación de Goku al Ultra Instinto, cuadro a cuadro, armada con los sprites del juego
(Blue: fusion/goku~3-ssj.png, Ultra Instinto: fusion/goku~4-ssj.png; de frente, columna 0).
Del Blue sale un contorno plateado, se vuelve una silueta de luz y aparece el Ultra Instinto con destellos.
Salida: assets/sprites/fx/tr_goku_ui.png (8 cuadros de 32x32)."""
import os, random
from PIL import Image, ImageChops, ImageFilter

BASE = os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'src', 'main', 'assets', 'www', 'dbzsurvivor', 'assets', 'sprites')
cuadro = lambda f: Image.open(os.path.join(BASE, 'fusion', f)).convert('RGBA').crop((0, 32, 32, 64))
blue, ui = cuadro('goku~3-ssj.png'), cuadro('goku~4-ssj.png')

def contorno(im, color, grosor=1):
    a = im.split()[3].point(lambda v: 255 if v > 0 else 0)
    borde = ImageChops.subtract(a.filter(ImageFilter.MaxFilter(1 + 2 * grosor)), a)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.paste(Image.new('RGBA', im.size, color), (0, 0), borde)
    out.alpha_composite(im); return out

def luz(im, k, color=(235, 242, 255)):   # mezcla el sprite con una silueta de luz (k: 0 nada, 1 silueta entera)
    sil = Image.new('RGBA', im.size, color + (0,)); sil.putalpha(im.split()[3])
    return Image.blend(im, sil, k)

def destellos(im, n, semilla):
    r = random.Random(semilla); out = im.copy()
    for _ in range(n):
        x, y = r.randrange(2, 30), r.randrange(2, 30)
        if im.getpixel((x, y))[3]: continue
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            if 0 <= x + dx < 32 and 0 <= y + dy < 32: out.putpixel((x + dx, y + dy), (255, 255, 255, 255 if dx == dy == 0 else 170))
    return out

PLATA = (214, 228, 255, 255)
cuadros = [
    blue,
    contorno(blue, PLATA),
    contorno(luz(blue, 0.45), PLATA),
    contorno(luz(blue, 0.9), (255, 255, 255, 255)),
    destellos(contorno(luz(ui, 0.85), (255, 255, 255, 255)), 5, 1),
    destellos(contorno(luz(ui, 0.4), PLATA), 6, 2),
    destellos(contorno(ui, PLATA), 4, 3),
    ui,
]
tira = Image.new('RGBA', (32 * len(cuadros), 32), (0, 0, 0, 0))
for i, c in enumerate(cuadros): tira.paste(c, (i * 32, 0))
tira.save(os.path.join(BASE, 'fx', 'tr_goku_ui.png'))
print('ok', len(cuadros))
