import sys, json
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage
def seg(path, drop, region=None, dil=1, min_h=20):
    im = Image.open(path).convert('RGBA'); a = np.array(im)
    m = a[:, :, 3] > 0
    for c in drop: m &= ~(np.abs(a[:, :, :3].astype(int) - np.array(c)).sum(2) <= 3)
    if region: x0, y0, x1, y1 = region; z = np.zeros_like(m); z[y0:y1, x0:x1] = m[y0:y1, x0:x1]; m = z
    lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=dil))
    B = []
    for i, s in enumerate(ndimage.find_objects(lab)):
        if s[0].stop - s[0].start >= min_h: B.append([s[1].start, s[0].start, s[1].stop, s[0].stop])
    B.sort(key=lambda b: (round(b[1] / 30), b[0]))
    return im, a, m, B
def label(im, B, out, z=2):
    c = im.convert('RGB').copy(); d = ImageDraw.Draw(c)
    for i, b in enumerate(B): d.rectangle(b, outline=(0, 255, 0)); d.text((b[0], b[3]), str(i), fill=(255, 255, 0))
    c.resize((c.width * z, c.height * z), Image.NEAREST).save(out)
if __name__ == '__main__':
    im, a, m, B = seg('hojas/black_freezer.png', [(76, 65, 118), (32, 24, 62), (134, 68, 183)], (0, 80, 320, 440))
    json.dump(B, open('bf_boxes.json', 'w')); print(len(B))
    label(im.crop((0, 0, 320, 440)), B, 'bf_lab.png')
