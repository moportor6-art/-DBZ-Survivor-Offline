"""Efectos de DB Survivors (www/dbsurvivors/assets.js) → tiras PNG para DBZ Survivor (assets/sprites/fx).
aura.png (3 cuadros 32×32, llama dorada), ssj_goku.png (12 cuadros 32×34: Goku se transforma en SSJ),
impacto.png (2 cuadros), fuego.png (3 cuadros). Uso: dbs_fx.py <assets.js> <dir_salida>"""
import sys, json, base64, io
from PIL import Image
s = open(sys.argv[1], encoding='utf-8').read()
j = json.loads(s[s.index('{'):s.rindex('}') + 1])['spr']
atlas = Image.open(io.BytesIO(base64.b64decode(j['img'].split(',')[1]))).convert('RGBA')
F = j['f']
def strip(prefix, out):
    names = sorted([k for k in F if k.startswith(prefix + '.')], key=lambda k: int(k.rsplit('.', 1)[1]))
    fr = [atlas.crop((F[n][0], F[n][1], F[n][0] + F[n][2], F[n][1] + F[n][3])) for n in names]
    w, h = max(f.width for f in fr), max(f.height for f in fr)
    im = Image.new('RGBA', (w * len(fr), h))
    for i, f in enumerate(fr): im.alpha_composite(f, (i * w + (w - f.width) // 2, h - f.height))
    im.save(f'{sys.argv[2]}/{out}.png'); print(out, len(fr), w, h)
strip('fx_aura.a', 'aura'); strip('fx_ssjtr.a', 'ssj_goku'); strip('fx_imp.a', 'impacto'); strip('fx_fire.a', 'fuego')
