"""Herramientas para hojas 'Overworld' de Harukanaru (Metal-Franky)."""
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage

def load(path):
    im = Image.open(path).convert('RGB'); a = np.array(im)
    bg = a[2, 2].astype(int)
    m = np.abs(a.astype(int) - bg).sum(2) > 24
    return im, a, m, bg

DIL = 2
def blobs(path, region, min_h=20):
    im, a, m, bg = load(path)
    x0, y0, x1, y1 = region
    sub = m[y0:y1, x0:x1]
    lab, n = ndimage.label(ndimage.binary_dilation(sub, iterations=DIL))
    out = []
    for s in ndimage.find_objects(lab):
        h = s[0].stop - s[0].start
        if h >= min_h: out.append((s[1].start + x0, s[0].start + y0, s[1].stop + x0, s[0].stop + y0))
    out.sort(key=lambda b: (round(b[1] / 25), b[0]))
    return out

def sheet(path, boxes, out, z=4):
    im, a, m, bg = load(path)
    fr = [im.crop(b) for b in boxes]
    H = max(f.height for f in fr); W = sum(f.width + 14 for f in fr)
    o = Image.new('RGB', (W, H + 14), (40, 40, 40)); d = ImageDraw.Draw(o); x = 0
    for i, f in enumerate(fr):
        o.paste(f, (x, H - f.height)); d.text((x, H + 1), str(i), fill=(255, 255, 0)); x += f.width + 14
    o.resize((o.width * z, o.height * z), Image.NEAREST).save(out)

def split_tall(path, boxes):
    """Separa los recuadros que juntaron dos sprites uno encima de otro (busca una fila vacía en medio)."""
    im, a, m, bg = load(path)
    hs = sorted(b[3] - b[1] for b in boxes); med = hs[len(hs) // 2]
    out = []
    for b in boxes:
        h = b[3] - b[1]
        if h > med * 1.6:
            rows = m[b[1]:b[3], b[0]:b[2]].any(1)
            mid = h // 2; cut = None
            for d in range(0, h // 2):
                for y in (mid - d, mid + d):
                    if 0 < y < h and not rows[y]: cut = y; break
                if cut: break
            if not cut:   # sin fila vacía: se corta donde hay menos dibujo, cerca de la mitad
                cnt = m[b[1]:b[3], b[0]:b[2]].sum(1)
                lo, hi = int(h * 0.35), int(h * 0.65)
                cut = lo + int(np.argmin(cnt[lo:hi]))
            if cut:
                out += [(b[0], b[1], b[2], b[1] + cut), (b[0], b[1] + cut, b[2], b[3])]; continue
        out.append(b)
    return [tight(m, b) for b in out]

def tight(m, b):
    sub = m[b[1]:b[3], b[0]:b[2]]
    ys = np.where(sub.any(1))[0]; xs = np.where(sub.any(0))[0]
    return (b[0] + xs[0], b[1] + ys[0], b[0] + xs[-1] + 1, b[1] + ys[-1] + 1)

def cut_frame(path, box):
    """El sprite sin fondo (los huecos interiores del color del fondo se respetan como transparentes solo si tocan el borde)."""
    im, a, m, bg = load(path)
    x0, y0, x1, y1 = box
    sub = a[y0:y1, x0:x1]; mm = m[y0:y1, x0:x1].copy()
    # sombra del juego original: el color oscuro más común de las últimas filas (el juego dibuja la suya)
    H = sub.shape[0]
    low = sub[-4:].reshape(-1, 3); lm = mm[-4:].reshape(-1)
    cols, cnt = np.unique(low[lm], axis=0, return_counts=True) if lm.any() else (np.zeros((0, 3)), [])
    if len(cnt):
        sh = cols[np.argmax(cnt)]
        if sh.sum() < 140:
            zone = np.zeros_like(mm); zone[int(H * 0.72):] = True
            mm &= ~(zone & (np.abs(sub.astype(int) - sh).sum(2) < 6))
    # fondo = lo que no es dibujo y está conectado con el borde
    lab, n = ndimage.label(~mm)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fondo = np.isin(lab, list(edge))
    rgba = np.dstack([sub, np.where(fondo, 0, 255).astype(np.uint8)])
    f = Image.fromarray(rgba)
    return f.crop(f.getbbox())

def build(path, boxes11, out=None, flip_side=False, extra=None):
    """11 cuadros (0-1 frente quieto, 2-4 caminar de frente en diagonal, 5-7 espaldas, 8-10 poses)
    → hoja del juego 10x3 (filas perfil / frente / espaldas; col 0 quieto, 1-4 caminar, 5-6 lanzar ki)."""
    F = [cut_frame(path, b) for b in boxes11]
    side = [f.transpose(Image.FLIP_LEFT_RIGHT) if flip_side else f for f in F]
    rows = [
        [side[3], side[2], side[3], side[4], side[3], side[8], side[9], side[3], side[3], side[3]],
        [F[0], F[2], F[3], F[4], F[3], F[8], F[9], F[0], F[0], F[0]],
        [F[6], F[5], F[6], F[7], F[6], F[6], F[6], F[6], F[6], F[6]],
    ]
    W = max(f.width for r in rows for f in r) + 2; H = max(f.height for r in rows for f in r) + 1
    o = Image.new('RGBA', (W * 10, H * 3), (0, 0, 0, 0))
    for ri, r in enumerate(rows):
        for ci, f in enumerate(r):
            o.paste(f, (ci * W + (W - f.width) // 2, ri * H + H - f.height), f)
    if out: o.save(out)
    return o, W, H
