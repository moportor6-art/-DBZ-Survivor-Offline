"""Arma hojas formato DBZ Survivor (3 filas perfil/frente/espaldas x 10 cols) desde hojas sueltas.
Spec por personaje: src, bg, tol, flipSide, shadow, frames {side/down/up: {idle:[r], walk:[r,r,r,r], cast:[r,r]}, ko:[r,r,r]}
r = [x0,y0,x1,y1]"""
import json, sys
import numpy as np
from PIL import Image, ImageDraw

def load(spec):
    im = Image.open(spec['src']).convert('RGBA'); a = np.array(im)
    m = np.ones(a.shape[:2], bool)
    for c in spec['bg']:
        m &= np.abs(a[:, :, :3].astype(int) - np.array(c)).sum(2) > spec['tol']
    a[~m] = 0
    return Image.fromarray(a)

def piece(img, r, flip, shadow):
    p = img.crop(tuple(r)); bb = p.getbbox(); p = p.crop(bb)
    if flip: p = p.transpose(Image.FLIP_LEFT_RIGHT)
    a = np.array(p)
    if shadow:   # sombra negra ovalada bajo los pies, como en las hojas del GBA
        w = max(14, min(26, int(p.width * 0.55))); H = p.height + 3
        q = Image.new('RGBA', (max(p.width, w), H), (0, 0, 0, 0))
        ImageDraw.Draw(q).ellipse([(q.width - w) // 2, H - 6, (q.width - w) // 2 + w - 1, H - 1], fill=(0, 0, 0, 255))
        q.alpha_composite(p, ((q.width - p.width) // 2, 0)); p = q; a = np.array(p)
    # ancla: centro de lo opaco en las 4 filas de abajo (sombra / pies)
    ys, xs = np.where(a[-4:, :, 3] > 0)
    ax = int(round(xs.mean())) if len(xs) else p.width // 2
    return p, ax

def build(spec, out):
    img = load(spec); F = spec['frames']
    rows = ['side', 'down', 'up']; cells = {}
    for ri, d in enumerate(rows):
        fr = F[d]; seq = [fr['idle'][0]] + fr['walk'] + fr['cast'] + F.get('ko', [])
        for ci, r in enumerate(seq):
            cells[(ri, ci)] = piece(img, r, spec.get('flipSide') and d == 'side', spec.get('shadow'))
    W = max(max(ax, p.width - ax) for p, ax in cells.values()) * 2 + 2
    W = max(32, W + W % 2); H = max(32, max(p.height for p, _ in cells.values()))
    sheet = Image.new('RGBA', (W * 10, H * 3), (0, 0, 0, 0))
    for (ri, ci), (p, ax) in cells.items():
        sheet.alpha_composite(p, (ci * W + W // 2 - ax, ri * H + H - p.height))
    sheet.save(out)
    return W, H, bool(F.get('ko'))

if __name__ == '__main__':
    specs = json.load(open(sys.argv[1]))
    for name, s in specs.items():
        print(name, build(s, f"{sys.argv[2]}/{name}.png"))
