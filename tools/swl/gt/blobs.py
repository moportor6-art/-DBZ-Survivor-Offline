"""Figuras sueltas de una hoja (sin fondo), numeradas por filas: para elegir cuadros por número.
Uso: blobs.py <hoja.png> [mapa.png]  → imprime "n x0 y0 x1 y1 área" y, si se pide, un mapa con los números.
El fondo son los colores que ocupan mucho de la hoja (los paneles de las hojas SWL/ULSW también cuentan)."""
import sys
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage

def cargar(path, tol=18, islas=False):
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    rgb = a[:, :, :3].reshape(-1, 3)
    cols, cnt = np.unique(rgb[:: max(1, len(rgb) // 400000)], axis=0, return_counts=True)
    q = a[:, :, :3].astype(int)
    solid = a[:, :, 3] > 0
    total = a.shape[0] * a.shape[1]
    # Fondo: colores frecuentes que forman una zona grande y seguida (el negro de los contornos es frecuente
    # pero está repartido en figuras sueltas, así que no cuenta)
    Hh, Ww = a.shape[:2]
    for c in cols[cnt > cnt.sum() * 0.003]:
        m = np.abs(q - c).sum(2) <= tol
        lab, n = ndimage.label(m)
        if not n: continue
        grande = np.bincount(lab.ravel())[1:].max() > total * 0.02
        # o líneas de los paneles: una pieza que cruza buena parte de la hoja
        largo = any(sl and (sl[1].stop - sl[1].start > Ww * 0.4 or sl[0].stop - sl[0].start > Hh * 0.4) and
                    (m[sl].sum() < (sl[1].stop - sl[1].start) * (sl[0].stop - sl[0].start) * 0.3)
                    for sl in ndimage.find_objects(lab))
        if grande or largo:
            if islas:   # solo las zonas grandes de ese color: las islas dentro de la figura (pelo del mismo tono) se quedan
                cnt_l = np.bincount(lab.ravel()); big = np.flatnonzero(cnt_l > 400); big = big[big > 0]
                solid &= ~np.isin(lab, big)
            else:
                solid &= ~m
    return im, a, solid

def blobs(path, min_area=60, dil=2, tol=18, islas=False):
    im, a, solid = cargar(path, tol, islas)
    lab, n = ndimage.label(ndimage.binary_dilation(solid, iterations=dil))
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None: continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        area = int((solid[sl] & (lab[sl] == i)).sum())
        if area < min_area or (y1 - y0) < 10: continue
        px = a[sl][(solid[sl]) & (lab[sl] == i)][:, :3].astype(int)
        if (px.sum(1) < 120).mean() > 0.85: continue   # texto de la hoja (casi todo negro)
        out.append([x0, y0, x1, y1, area, i])
    # por filas: agrupa por el centro vertical
    out.sort(key=lambda b: ((b[1] + b[3]) // 2, b[0]))
    filas, cur, last = [], [], None
    for b in out:
        cy = (b[1] + b[3]) / 2
        if last is not None and cy - last > 14: filas.append(cur); cur = []
        cur.append(b); last = cy if last is None or cy - last > 14 else last
    if cur: filas.append(cur)
    res = []
    for f in filas:
        res.extend(sorted(f, key=lambda b: b[0]))
    return im, a, solid, lab, res

if __name__ == '__main__':
    im, a, solid, lab, res = blobs(sys.argv[1], dil=int(sys.argv[3]) if len(sys.argv) > 3 else 2)
    for k, b in enumerate(res):
        print(k, *b[:5])
    if len(sys.argv) > 2:
        m = im.convert('RGB'); d = ImageDraw.Draw(m)
        for k, b in enumerate(res):
            d.rectangle(b[:4], outline=(0, 255, 0))
            d.text((b[0], max(0, b[1] - 9)), str(k), fill=(255, 255, 0))
        m.save(sys.argv[2])
