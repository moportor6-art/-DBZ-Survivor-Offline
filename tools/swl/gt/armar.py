"""Arma las hojas del juego de Dragon Ball GT desde las originales (tools/swl/gt/hojas), con los cuadros elegidos
por número (los de blobs.py). Una sola fila de perfil mirando a la derecha (el juego la voltea).
Uso: armar.py <salida_dir> [ids…]  → <id>.png en la carpeta y gt.json con { id: { w, h, anims } }.
Créditos de las hojas: ver hojas/LEEME.md."""
import sys, json, os
import numpy as np
from PIL import Image
from scipy import ndimage
from blobs import blobs

H = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hojas')
CACHE = {}

def figuras(hoja, dil=2, tol=18, islas=False):
    k = (hoja, dil, tol, islas)
    if k not in CACHE: CACHE[k] = blobs(os.path.join(H, hoja), dil=dil, tol=tol, islas=islas)
    return CACHE[k]

def cuadro(hoja, n, mirar=1, dil=2, tol=18, islas=False):
    im, a, solid, lab, res = figuras(hoja, dil, tol, islas)
    x0, y0, x1, y1, _, k = res[n]
    sub = a[y0:y1, x0:x1].copy()
    keep = solid[y0:y1, x0:x1] & (lab[y0:y1, x0:x1] == k)
    sub[~keep] = 0
    f = Image.fromarray(sub)
    f = f.crop(f.getbbox())
    return f if mirar > 0 else f.transpose(Image.FLIP_LEFT_RIGHT)

def pies(f):
    m = np.array(f)[:, :, 3] > 0
    ys = np.where(m.any(1))[0]
    low = m[max(0, ys[-1] - 8): ys[-1] + 1]
    xs = np.where(low.any(0))[0]
    return (xs[0] + xs[-1]) / 2

def recolor(f, mapa):
    """mapa: [((r,g,b) origen, (r,g,b) destino, tolerancia)] — cambia el tono de las zonas de ese color."""
    a = np.array(f).astype(int)
    for src, dst, tol in mapa:
        d = np.abs(a[:, :, :3] - np.array(src)).sum(2)
        m = (d <= tol) & (a[:, :, 3] > 0)
        # conserva el sombreado: desplaza el color manteniendo la diferencia de brillo
        lum = a[:, :, :3].mean(2) - np.mean(src)
        for c in range(3):
            a[:, :, c] = np.where(m, np.clip(dst[c] + lum, 0, 255), a[:, :, c])
    return Image.fromarray(a.astype(np.uint8))

def tono(f, reglas):
    """Recolorea por tono (HSV): los colores dentro de un rango giran y cambian de saturación y brillo."""
    a = np.array(f).astype(float) / 255
    rgb = a[:, :, :3]
    mx, mn = rgb.max(2), rgb.min(2); d = mx - mn
    h = np.zeros_like(mx)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    m = d > 1e-6
    h = np.where(m & (mx == r), ((g - b) / np.where(m, d, 1)) % 6, h)
    h = np.where(m & (mx == g), (b - r) / np.where(m, d, 1) + 2, h)
    h = np.where(m & (mx == b), (r - g) / np.where(m, d, 1) + 4, h)
    h = h * 60; s = np.where(mx > 0, d / np.where(mx > 0, mx, 1), 0); v = mx
    for h0, h1, giro, sm, vm in reglas:
        sel = (a[:, :, 3] > 0) & (s > 0.18) & (h >= h0) & (h <= h1)
        h = np.where(sel, (h + giro) % 360, h); s = np.where(sel, np.clip(s * sm, 0, 1), s); v = np.where(sel, np.clip(v * vm, 0, 1), v)
    c = v * s; x = c * (1 - np.abs((h / 60) % 2 - 1)); m0 = v - c
    k = (h // 60).astype(int) % 6
    rr = np.choose(k, [c, x, 0 * c, 0 * c, x, c]); gg = np.choose(k, [x, c, c, x, 0 * c, 0 * c]); bb = np.choose(k, [0 * c, 0 * c, x, c, c, x])
    out = np.dstack([rr + m0, gg + m0, bb + m0, a[:, :, 3]])
    return Image.fromarray((out * 255).round().astype(np.uint8))

def armar(id_, spec, out_dir):
    orden, anims, cuadros = ['idle', 'walk', 'cast', 'punch', 'kohit', 'kolie', 'koup'], {}, []
    mirar = spec.get('mirar', 1)
    for an in orden:
        if an not in spec: continue
        ids = spec[an]
        anims[an] = {'row': 0, 'col': len(cuadros), 'count': len(ids)}
        for n in ids:
            f = cuadro(spec['hoja'], n, mirar, spec.get('dil', 2), spec.get('tol', 18), spec.get('islas', False))
            if spec.get('tono'): f = tono(f, spec['tono'])
            if spec.get('sombra'):   # quita la sombra negra pintada bajo los pies (el juego pone la suya)
                q = np.array(f); hh = q.shape[0]; z = q[hh - 14:]
                z[(z[:, :, :3].astype(int).sum(2) < 60)] = 0; q[hh - 14:] = z
                f = Image.fromarray(q); f = f.crop(f.getbbox())
            cuadros.append(f)
    cx = [pies(f) for f in cuadros]
    left = max(cx); right = max(f.width - c for f, c in zip(cuadros, cx))
    CW = int(np.ceil(left + right)) + 2
    CH = max(f.height for f in cuadros) + 2
    out = Image.new('RGBA', (CW * len(cuadros), CH), (0, 0, 0, 0))
    for i, (f, c) in enumerate(zip(cuadros, cx)):
        out.paste(f, (i * CW + int(round(CW / 2 - c)), CH - f.height - 1), f)
    out.save(os.path.join(out_dir, id_ + '.png'))
    alto = max(f.height for f in cuadros[:anims['idle']['count']])   # alto del cuerpo de pie (para la escala)
    return {'w': CW, 'h': CH, 'anims': anims, 'alto': alto}

from specs import SPECS

def ozaru_dorado(out_dir):
    """Baby Ozaru dorado: la hoja del Ozaru del juego con el pelaje dorado."""
    src = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'app', 'src', 'main', 'assets', 'www', 'dbzsurvivor',
                       'assets', 'sprites', 'fusion', 'ozaru.png')
    tono(Image.open(src).convert('RGBA'), [(0, 50, 24, 1.05, 2.1)]).save(os.path.join(out_dir, 'babyozaru.png'))

if __name__ == '__main__':
    out_dir = sys.argv[1]
    ozaru_dorado(out_dir)
    quiero = sys.argv[2:] or list(SPECS)
    j = os.path.join(out_dir, 'gt.json')
    info = json.load(open(j)) if os.path.exists(j) else {}
    for k in quiero:
        info[k] = armar(k, SPECS[k], out_dir)
        print(k, info[k]['w'], info[k]['h'], {a: v['count'] for a, v in info[k]['anims'].items()})
    json.dump(info, open(j, 'w'), indent=1, sort_keys=True)
