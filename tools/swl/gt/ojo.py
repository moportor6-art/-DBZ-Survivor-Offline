"""ojo.py hoja dil tol islas n1 n2 … → /home/claude/bf/ojo.png con esos cuadros en fila y su número"""
import sys
from PIL import Image, ImageDraw
import armar
h, dil, tol, isl = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4] == '1'
ns = [int(x) for x in sys.argv[5:]]
fs = []
for n in ns:
    try: fs.append(armar.cuadro(h, n, 1, dil, tol, isl))
    except Exception as e: fs.append(Image.new('RGBA', (10, 10)))
W = sum(f.width + 8 for f in fs); H = max(f.height for f in fs) + 14
o = Image.new('RGB', (W, H), (60, 110, 60)); d = ImageDraw.Draw(o); x = 0
for n, f in zip(ns, fs):
    o.paste(f, (x, 14), f); d.text((x, 0), str(n), fill=(255, 255, 0)); x += f.width + 8
s = max(1, min(3, 1800 // W))
o.resize((W * s, H * s), Image.NEAREST).save('/home/claude/bf/ojo.png')
