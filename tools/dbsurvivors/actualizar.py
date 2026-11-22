"""Actualiza la copia de DB Survivors (app/src/main/assets/www/dbsurvivors) con la de dbsurvivors.xyz.
Baja index.html y assets.js, más la música, los sonidos y las fuentes nuevas que nombre el juego, y vuelve a
poner el único cambio de la app: window.DBS_OFFLINE (su modo sin servidor). Si algo falla, no toca nada.
Lo corre todos los días .github/workflows/actualizar-dbsurvivors.yml. Uso: python3 actualizar.py"""
import os, re, sys, urllib.request

SITE = 'https://www.dbsurvivors.xyz/'
DST = os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'src', 'main', 'assets', 'www', 'dbsurvivors')
UA = {'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36'}

def get(path):
    with urllib.request.urlopen(urllib.request.Request(SITE + path, headers=UA), timeout=60) as r:
        if r.status != 200: raise RuntimeError(f'{path}: HTTP {r.status}')
        return r.read()

html = get('').decode('utf-8')
assets = get('assets.js')
# Que de verdad sea el juego y no una página de error
if 'DBS_ASSETS' not in assets.decode('utf-8', 'ignore')[:200] or '<canvas' not in html or len(html) < 200_000:
    sys.exit('La descarga no parece el juego: no se cambia nada')
if 'window.DBS_OFFLINE' not in html:
    html = html.replace('<head>', '<head><script>window.DBS_OFFLINE=1</script>', 1)
cambios = []
def escribir(rel, data):
    p = os.path.join(DST, rel)
    viejo = open(p, 'rb').read() if os.path.exists(p) else None
    if viejo != data:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'wb').write(data); cambios.append(rel)
escribir('index.html', html.encode('utf-8'))
escribir('assets.js', assets)
# Música, sonidos y fuentes que nombra el juego y que todavía no están
for rel in sorted(set(re.findall(r'''["'`]((?:music|sfx|fonts)/[\w./-]+\.(?:mp3|ogg|m4a|wav|woff2?|ttf))["'`]''', html))):
    if not os.path.exists(os.path.join(DST, rel)):
        try: escribir(rel, get(rel))
        except Exception as e: print('no se pudo bajar', rel, e)
print('\n'.join(cambios) if cambios else 'sin cambios')
