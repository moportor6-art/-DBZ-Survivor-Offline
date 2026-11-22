import sys, json; sys.path.insert(0, '.')
from ow import *
OUT = sys.argv[1]
def blk(f, r, cond=lambda b: True, pick=None):
    b = split_tall(f, blobs(f, r, 18)); b = [x for x in b if cond(x)]
    b.sort(key=lambda q: (round(q[1] / 25), q[0]))
    if pick: b = [b[i] for i in pick]
    return b
SPEC = {
  'zarbonp':      ('zarbon.png', (360, 0, 640, 200), lambda b: b[0] < 500, None),
  'zarbonp-ssj':  ('zarbon.png', (360, 0, 640, 200), lambda b: b[0] >= 500, None),
  'dodoriap':     ('dodoria.png', (340, 40, 490, 250), lambda b: True, None),
  'nailp':        ('nail.png', (295, 35, 590, 220), lambda b: b[0] < 420, None),
  'namekiano':    ('nail.png', (295, 35, 590, 220), lambda b: b[0] >= 420, None),
  'coldp':        ('kingcold.png', (355, 25, 520, 230), lambda b: True, None),
  'suie':         ('cui_appule.png', (805, 30, 962, 255), lambda b: True, None),
  'cuip':         ('cui_appule.png', (805, 255, 962, 465), lambda b: True, None),
  'appulee':      ('cui_appule.png', (805, 465, 962, 690), lambda b: True, None),
  'banane':       ('cui_appule.png', (805, 690, 962, 890), lambda b: True, None),
  'gozue':        ('gozu_mezu.png', (540, 190, 830, 400), lambda b: b[0] < 690, None),
  'mezue':        ('gozu_mezu.png', (540, 190, 830, 400), lambda b: b[0] >= 690, None),
  'skin-vegeta-scouter': ('vegeta_scouter.png', (720, 25, 840, 335), lambda b: True, [0,1,2,3,4,5,6,7,9,12,13]),
}
for (i, (cx, cy)) in enumerate([(0, 0), (1, 0), (0, 1), (1, 1), (0, 2), (1, 2)]):
    ys = [(340, 575), (575, 775), (775, 965)][cy]
    SPEC[f'fz{i}'] = ('freezer.png', (1130 + cx * 160, ys[0], 1290 + cx * 160, ys[1]), lambda b: True, None)
info = {}
for k, (f, r, c, pick) in SPEC.items():
    b = blk(f, r, c, pick)
    if len(b) != 11: print('!!', k, len(b)); continue
    o, W, H = build(f, b, f'{OUT}/{k}.png'); info[k] = [W, H]
    bg = Image.new('RGBA', o.size, (90, 160, 90, 255)); bg.alpha_composite(o); bg.resize((o.width * 2, o.height * 2), Image.NEAREST).save(f'/home/claude/gb/out/prev_{k}.png')
print(json.dumps(info))
