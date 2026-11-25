"""Poses de DB Survivors (actualización del 25 de noviembre de 2026) para las hojas del juego que salen de ahí.

Lee el atlas de la copia de DB Survivors (app/.../www/dbsurvivors/assets.js) y arma:
  1. assets/sprites/poses/dbs_poses.png + dbs_poses.json: los cuadros de disparo (shoot), golpe recibido (hurt, hurts),
     carga de Ki (charge) y victoria (win) de cada personaje, con su punto de apoyo (los pies), y qué hoja nuestra
     corresponde a cada personaje (se busca píxel por píxel: un cuadro de la hoja igual a uno suyo).
     js/mods/poses.js los dibuja en lugar del cuadro de la hoja.
  2. Hojas nuevas con su dibujo (10 columnas de 32x32; filas perfil, frente, espaldas;
     0 quieto, 1-4 caminar, 5-6 disparo, 7 golpe recibido, 8 tirado, 9 levantándose):
     fusion/vegeta-ego.png (Ego Superior, antes el Blue recoloreado) y fusion/freezerp-negro.png (Black Freezer).
Uso: python3 tools/hojas/dbs_poses.py"""
import base64, glob, hashlib, io, json, os
from PIL import Image

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'app', 'src', 'main', 'assets', 'www')
SPR = os.path.join(RAIZ, 'dbzsurvivor', 'assets', 'sprites')
s = open(os.path.join(RAIZ, 'dbsurvivors', 'assets.js'), encoding='utf-8').read()
d = json.loads(s[s.index('{'):s.rstrip().rstrip(';').rindex('}') + 1])['spr']
atlas = Image.open(io.BytesIO(base64.b64decode(d['img'].split(',', 1)[1]))).convert('RGBA')
F, A = d['f'], d['a']
cuadro = lambda fr: atlas.crop((F[fr][0], F[fr][1], F[fr][0] + F[fr][2], F[fr][1] + F[fr][3]))
POSES = ['shoot', 'hurt', 'hurts', 'charge', 'win']

# ── 2. Hojas nuevas ──
def hoja(pers, salida):
    out = Image.new('RGBA', (320, 96), (0, 0, 0, 0))
    def poner(fr, col, fila):
        if not fr: return
        ax, ay = F[fr][4], F[fr][5]
        celda = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); c = cuadro(fr)
        celda.paste(c, (16 - ax, 32 - ay), c)   # el pie en el centro abajo, como las demás hojas (lo que sobra se recorta)
        out.alpha_composite(celda, (col * 32, fila * 32))
    sec = lambda n: A.get(f'{pers}.{n}', [])
    uno = lambda n, i=0: (sec(n)[i % len(sec(n))] if sec(n) else None)
    for fila, dirn in enumerate(['side', 'down', 'up']):
        quieto = uno('idle') if dirn == 'down' and uno('idle') else uno(dirn)
        poner(quieto, 0, fila)
        for i in range(4): poner(uno(dirn, i), 1 + i, fila)
        for i in range(2): poner(uno('shoot', i) if dirn == 'side' else quieto, 5 + i, fila)
        poner(uno('hurt') or quieto, 7, fila)
        poner(uno('ko') or uno('hurts') or quieto, 8, fila)
        poner(quieto, 9, fila)
    out.save(os.path.join(SPR, 'fusion', salida))
hoja('vegetas_ego', 'vegeta-ego.png')
hoja('freezerp_b', 'freezerp-negro.png')

# ── 1. Qué hoja nuestra es cada personaje ──
def clave(im):
    bb = im.getbbox()
    return (im.crop(bb).size, hashlib.md5(im.crop(bb).tobytes()).hexdigest()) if bb else None
suyos = {}
for fr in F:
    k = clave(cuadro(fr))
    if k: suyos.setdefault(k, set()).add(fr.split('.')[0])
con_poses = lambda p: sum(len(A.get(f'{p}.{q}', [])) for q in POSES)
hojas = {}
for ruta in sorted(glob.glob(os.path.join(SPR, '*.png')) + glob.glob(os.path.join(SPR, 'fusion', '*.png'))):
    im = Image.open(ruta).convert('RGBA')
    cand = set()
    tams = {(32, 32), (64, 64)} | {(im.width // 10, im.height // n) for n in (3, 6)}   # 10 columnas; 3 filas (o 6, normal y SSJ)
    for fw, fh in sorted(tams):   # los tamaños de cuadro de las hojas
        if im.width % fw or im.height % fh: continue
        for y in range(0, im.height, fh):
            for x in range(0, im.width, fw):
                k = clave(im.crop((x, y, x + fw, y + fh)))
                if k in suyos: cand |= suyos[k]
    cand = [p for p in cand if con_poses(p)]
    if cand: hojas[os.path.relpath(ruta, os.path.join(SPR, '..', '..')).replace(os.sep, '/')] = max(cand, key=con_poses)

# ── Atlas de poses (estantes de 64 px de ancho máximo por fila) ──
usados = sorted(set(hojas.values()))
lista = [(p, q, fr) for p in usados for q in POSES for fr in A.get(f'{p}.{q}', [])]
ANCHO, x, y, alto_fila, pos = 1024, 0, 0, 0, {}
for p, q, fr in lista:
    w, h = F[fr][2], F[fr][3]
    if x + w > ANCHO: x, y, alto_fila = 0, y + alto_fila + 1, 0
    pos[fr] = (x, y); x += w + 1; alto_fila = max(alto_fila, h)
img = Image.new('RGBA', (ANCHO, y + alto_fila + 1), (0, 0, 0, 0))
datos = {}
for p, q, fr in lista:
    img.paste(cuadro(fr), pos[fr])
    datos.setdefault(p, {}).setdefault(q, []).append([*pos[fr], F[fr][2], F[fr][3], F[fr][4], F[fr][5]])
os.makedirs(os.path.join(SPR, 'poses'), exist_ok=True)
img.save(os.path.join(SPR, 'poses', 'dbs_poses.png'))
json.dump({'hojas': hojas, 'poses': datos}, open(os.path.join(SPR, 'poses', 'dbs_poses.json'), 'w'), separators=(',', ':'))
print(f'{len(hojas)} hojas con poses, {len(usados)} personajes, {len(lista)} cuadros, atlas {img.size}')
